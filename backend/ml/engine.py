"""
Unified ML Engine — loads graph + STGNN model, runs background inference,
provides prediction cache, route optimization, and insights.
No Flask dependency. Designed to be embedded inside FastAPI main.py.
"""

import os
import time
import random
import threading
import numpy as np
import networkx as nx
import torch
from datetime import datetime
from typing import List, Dict, Optional, Any

from ml.graph import build_or_load_graph, create_edge_index, get_graph_stats
from ml.stgnn import STGNN
from ml.simulator import simulate_edge_features

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEIGHTS_PATH = os.path.join(_BACKEND_DIR, "stgnn_weights.pth")


class MLEngine:
    """Singleton-style ML engine.  Call `initialize()` once, then use the helpers."""

    def __init__(self):
        self.G: Optional[nx.MultiDiGraph] = None
        self.edge_index = None
        self.node_mapping: Dict[Any, int] = {}
        self.inv_node_mapping: Dict[int, Any] = {}
        self.num_nodes: int = 0
        self.model: Optional[STGNN] = None

        # Sliding-window context for STGNN  (batch=1, timesteps=6, nodes, features=2)
        self.current_context: Optional[torch.Tensor] = None
        self.cached_pred_array: np.ndarray = np.array([])
        self.fixed_subsample_indices: np.ndarray = np.array([])

        # Weather state (updated by background thread or weather service)
        self.weather_state: Dict[str, Any] = {
            "condition": "Clear",
            "penalty": 0.0,
            "temp": 28,
            "humidity": 50,
            "wind_speed": 5,
        }

        # Live incidents fed from SQLite
        self.live_incidents: List[dict] = []

        self._initialized = False
        self._bg_thread: Optional[threading.Thread] = None

    # ── lifecycle ──────────────────────────────────────────────
    def initialize(self):
        if self._initialized:
            return
        print("[MLEngine] Initializing …")

        # 1. Graph
        self.G = build_or_load_graph()
        self.edge_index, self.node_mapping = create_edge_index(self.G)
        self.inv_node_mapping = {v: k for k, v in self.node_mapping.items()}
        self.num_nodes = len(self.G.nodes)

        # 2. Model
        self.model = STGNN(num_node_features=2, hidden_dim=32, num_classes=1)
        if os.path.exists(WEIGHTS_PATH):
            self.model.load_state_dict(torch.load(WEIGHTS_PATH, map_location="cpu"))
            print("[MLEngine] Loaded STGNN weights.")
        else:
            print("[MLEngine] No weights file — using random init.")
        self.model.eval()

        # 3. Initial context tensor (batch=1, 6 timesteps, N nodes, 2 features)
        self.current_context = torch.rand((1, 6, self.num_nodes, 2))
        self.cached_pred_array = np.zeros(self.num_nodes)
        self.fixed_subsample_indices = np.random.choice(
            self.num_nodes, size=min(1000, self.num_nodes), replace=False
        )

        # 4. Background inference thread
        self._bg_thread = threading.Thread(target=self._inference_loop, daemon=True)
        self._bg_thread.start()

        self._initialized = True
        print(f"[MLEngine] Ready — {self.num_nodes} nodes loaded.")

    @property
    def initialized(self) -> bool:
        return self._initialized

    # ── background loop ────────────────────────────────────────
    def _inference_loop(self):
        """Runs every 5 s: update context window → run STGNN → cache predictions."""
        while True:
            try:
                self._step()
            except Exception as e:
                print("[MLEngine] inference error:", e)
            time.sleep(5)

    def _step(self):
        """Single inference step — also callable directly for testing."""
        # Slide context window
        new_frame = self.current_context[0, -1].clone()
        new_frame[:, 0] = new_frame[:, 0] * 0.9
        new_frame[:, 0] = torch.clamp(new_frame[:, 0] + self.weather_state["penalty"], 0, 1)

        # Inject incident spikes
        if self.live_incidents:
            for inc in self.live_incidents:
                if inc.get("severity") in ("High", "Critical"):
                    for _ in range(3):
                        idx = random.randint(0, self.num_nodes - 1)
                        new_frame[idx, 0] = 1.0
                        new_frame[idx, 1] = 0.0

        self.current_context = torch.cat(
            (self.current_context[:, 1:, :, :], new_frame.unsqueeze(0).unsqueeze(0)), dim=1
        )

        with torch.no_grad():
            pred = self.model(self.current_context, self.edge_index)
            self.cached_pred_array = pred.squeeze().numpy()

    def update_incidents(self, incidents: List[dict]):
        """Feed latest incidents from SQLite into the engine."""
        self.live_incidents = incidents

    def update_weather(self, weather: Dict[str, Any]):
        """Feed latest weather into the engine."""
        self.weather_state.update(weather)

    # ── public API ─────────────────────────────────────────────
    def predict_traffic(self) -> List[dict]:
        """Return STGNN congestion predictions for (subsampled) graph nodes."""
        results = []
        pred = self.cached_pred_array
        for i in self.fixed_subsample_indices:
            node_id = self.inv_node_mapping[i]
            nd = self.G.nodes[node_id]
            results.append({
                "id": node_id,
                "lat": nd["y"],
                "lng": nd["x"],
                "congestion": float(pred[i]) if i < len(pred) else 0.0,
            })
        return results

    def get_congestion_summary(self) -> dict:
        avg = float(np.mean(self.cached_pred_array)) if len(self.cached_pred_array) else 0.0
        critical = int(np.sum(self.cached_pred_array > 0.8)) if len(self.cached_pred_array) else 0
        return {
            "avg_congestion": round(avg, 4),
            "critical_junctions": critical,
            "total_nodes": self.num_nodes,
            "weather": self.weather_state,
            "timestamp": datetime.utcnow().isoformat(),
        }

    def optimize_route(self, origin: dict, destination: dict, emergency: bool = False) -> dict:
        """
        Graph-based shortest path weighted by congestion-aware travel time.
        origin / destination: {"lat": float, "lng": float}
        """
        import osmnx as ox

        if not self._initialized:
            return {"error": "ML engine not initialized"}

        try:
            orig_node = ox.nearest_nodes(self.G, X=origin["lng"], Y=origin["lat"])
            dest_node = ox.nearest_nodes(self.G, X=destination["lng"], Y=destination["lat"])
        except Exception as e:
            return {"error": f"Cannot find nearest nodes: {e}"}

        pred = self.cached_pred_array
        weight_attr = "time_weight"

        for u, v, k, edata in self.G.edges(keys=True, data=True):
            u_idx = self.node_mapping.get(u, 0)
            v_idx = self.node_mapping.get(v, 0)

            edge_congestion = 0.0
            if len(pred) > 0:
                edge_congestion = (
                    (pred[u_idx] if u_idx < len(pred) else 0.0)
                    + (pred[v_idx] if v_idx < len(pred) else 0.0)
                ) / 2.0

            length_m = edata.get("length", 10.0)
            base_speed = 11.0  # ~40 km/h in m/s
            actual_speed = max(1.0, base_speed * (1.0 - edge_congestion * 0.9))

            # Weather penalty
            wp = self.weather_state.get("penalty", 0.0)
            actual_speed = max(1.0, actual_speed * (1.0 - wp * 0.5))

            if emergency:
                actual_speed *= 1.3  # emergency vehicles go faster

            edata[weight_attr] = length_m / actual_speed

        try:
            route = nx.shortest_path(self.G, orig_node, dest_node, weight=weight_attr)
        except nx.NetworkXNoPath:
            return {"error": "No path found between origin and destination"}

        total_time = 0.0
        route_coords = []
        congestion_vals = []
        for i in range(len(route) - 1):
            u, v = route[i], route[i + 1]
            nd = self.G.nodes[u]
            route_coords.append([nd["y"], nd["x"]])
            ed = self.G.get_edge_data(u, v)
            if ed:
                best = min(ed.values(), key=lambda e: e.get(weight_attr, 999))
                total_time += best.get(weight_attr, 0)
                ui = self.node_mapping.get(u, 0)
                vi = self.node_mapping.get(v, 0)
                if len(pred) > 0:
                    congestion_vals.append(
                        ((pred[ui] if ui < len(pred) else 0) + (pred[vi] if vi < len(pred) else 0)) / 2
                    )

        route_coords.append([self.G.nodes[route[-1]]["y"], self.G.nodes[route[-1]]["x"]])

        distance_m = sum(
            self.G.get_edge_data(route[i], route[i + 1])[0].get("length", 0)
            for i in range(len(route) - 1)
            if self.G.get_edge_data(route[i], route[i + 1])
        )

        return {
            "route": route_coords,
            "eta_minutes": round(total_time / 60.0, 1),
            "distance_km": round(distance_m / 1000.0, 2),
            "avg_congestion": round(float(np.mean(congestion_vals)), 3) if congestion_vals else 0.0,
            "weather_impact": self.weather_state["condition"],
            "emergency": emergency,
            "num_nodes_in_route": len(route),
        }

    def get_graph_info(self) -> dict:
        if not self._initialized:
            return {"error": "ML engine not initialized"}
        stats = get_graph_stats(self.G)
        # Collect key junctions (high-degree nodes)
        junctions = []
        for node, degree in sorted(self.G.degree(), key=lambda x: x[1], reverse=True)[:20]:
            nd = self.G.nodes[node]
            junctions.append({"id": node, "lat": nd["y"], "lng": nd["x"], "degree": degree})
        return {**stats, "key_junctions": junctions}

    def generate_insights(self) -> dict:
        pred = self.cached_pred_array
        avg_cong = float(np.mean(pred)) if len(pred) else 0.0
        critical = int(np.sum(pred > 0.8)) if len(pred) else 0

        recommendation = "Traffic flows are normal. Maintain standard operations."
        if self.weather_state["condition"] in ("Heavy Rain", "Storm"):
            recommendation = (
                "High risk of localized flooding affecting major arterials. "
                "Pre-deploy emergency units to water-logging prone sectors."
            )
        elif critical > 100:
            recommendation = (
                f"Severe gridlock detected across {critical} junctions. "
                "Immediate traffic diversion recommended."
            )
        elif avg_cong > 0.5:
            recommendation = "City-wide congestion building. Monitor key choke points near tech parks."

        return {
            "avg_congestion": round(avg_cong, 4),
            "critical_junctions": critical,
            "recommendation": recommendation,
            "weather": self.weather_state["condition"],
            "active_incidents": len(self.live_incidents),
        }

    def model_metrics(self) -> dict:
        if not self._initialized:
            return {"error": "not initialized"}
        pred_tensor = torch.tensor(self.cached_pred_array).unsqueeze(0).unsqueeze(2)
        fake_target = self.current_context[0, -1, :, 0:1]
        mse = torch.nn.functional.mse_loss(pred_tensor, fake_target).item()
        mae = torch.nn.functional.l1_loss(pred_tensor, fake_target).item()
        return {"mse": round(mse, 4), "mae": round(mae, 4), "rmse": round(np.sqrt(mse), 4)}


# Module-level singleton
engine = MLEngine()
