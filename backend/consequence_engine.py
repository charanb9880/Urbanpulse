"""
AI Consequence Engine — predicts impact of incidents on the road network.
Uses graph distance, STGNN predictions, and weather to calculate cascading effects.
"""

import math
import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Optional


def analyze_incident_consequence(
    incident: dict,
    graph=None,
    node_mapping: Optional[Dict] = None,
    pred_array: Optional[np.ndarray] = None,
    weather: Optional[Dict] = None,
) -> Dict[str, Any]:
    """
    Given an incident, predict traffic impact, congestion spread,
    accessibility reduction, and recommended actions.
    """
    lat = incident.get("lat") or 12.9345
    lng = incident.get("lng") or 77.6265
    severity = incident.get("severity", "Medium")

    # Severity multiplier
    sev_mult = {"Low": 0.5, "Medium": 1.0, "High": 1.5, "Critical": 2.0}.get(severity, 1.0)

    # Weather amplification
    weather_penalty = 0.0
    weather_cond = "Clear"
    if weather:
        weather_penalty = weather.get("penalty", 0.0)
        weather_cond = weather.get("condition", "Clear")

    # Base impact radius (km) scales with severity
    base_radius = sev_mult * 0.5  # 0.5 km for Medium
    impact_radius = base_radius * (1 + weather_penalty)

    # Find affected nodes on graph
    affected_nodes = []
    affected_roads = []
    if graph is not None and node_mapping:
        import osmnx as ox
        try:
            nearest = ox.nearest_nodes(graph, X=lng, Y=lat)
            # BFS to find nodes within impact_radius
            visited = set()
            queue = [(nearest, 0)]
            while queue:
                node, dist = queue.pop(0)
                if node in visited:
                    continue
                visited.add(node)
                nd = graph.nodes[node]
                d = math.sqrt((nd["y"] - lat) ** 2 + (nd["x"] - lng) ** 2) * 111  # rough km
                if d <= impact_radius:
                    idx = node_mapping.get(node, -1)
                    cong = float(pred_array[idx]) if (pred_array is not None and idx >= 0 and idx < len(pred_array)) else 0.0
                    affected_nodes.append({
                        "id": node,
                        "lat": nd["y"],
                        "lng": nd["x"],
                        "distance_km": round(d, 3),
                        "current_congestion": round(cong, 3),
                        "predicted_congestion": round(min(1.0, cong + sev_mult * 0.3), 3),
                    })
                    # Get edge data for affected roads
                    for nbr in graph.neighbors(node):
                        ed = graph.get_edge_data(node, nbr)
                        if ed:
                            for k, e in ed.items():
                                affected_roads.append({
                                    "from": node,
                                    "to": nbr,
                                    "length_m": round(e.get("length", 0), 1),
                                    "name": e.get("name", "Unnamed Road"),
                                })
                    for pred_node in graph.predecessors(node) if graph.is_directed() else []:
                        queue.append((pred_node, dist + 1))
                    for succ_node in graph.successors(node) if graph.is_directed() else list(graph.neighbors(node)):
                        queue.append((succ_node, dist + 1))
        except Exception:
            pass

    # Limit to 50 nodes for response size
    affected_nodes = affected_nodes[:50]
    affected_roads = list({(r["from"], r["to"]): r for r in affected_roads[:30]}.values())

    # Congestion spread estimate
    avg_current_cong = np.mean([n["current_congestion"] for n in affected_nodes]) if affected_nodes else 0.3
    congestion_spread = round(min(1.0, avg_current_cong + sev_mult * 0.2 + weather_penalty * 0.3), 3)

    # Emergency delay estimate (minutes added)
    emergency_delay = round(sev_mult * 3.0 * (1 + weather_penalty) * (1 + avg_current_cong), 1)

    # Accessibility reduction (0-1, fraction of roads impacted)
    accessibility = round(min(1.0, sev_mult * 0.15 + weather_penalty * 0.2), 3)

    # Recommended actions
    actions = _generate_actions(severity, weather_cond, len(affected_nodes), congestion_spread)

    return {
        "incident_id": incident.get("id"),
        "severity": severity,
        "impact_radius_km": round(impact_radius, 2),
        "affected_nodes_count": len(affected_nodes),
        "affected_nodes": affected_nodes,
        "affected_roads": affected_roads,
        "congestion_spread": congestion_spread,
        "emergency_delay_minutes": emergency_delay,
        "accessibility_reduction": accessibility,
        "weather_amplification": weather_cond,
        "recommended_actions": actions,
        "confidence": round(0.75 + sev_mult * 0.05, 2),
        "timestamp": datetime.utcnow().isoformat(),
    }


def _generate_actions(severity: str, weather: str, affected_count: int, congestion: float) -> List[str]:
    actions = []
    if severity in ("High", "Critical"):
        actions.append("Dispatch emergency response units immediately to the incident location.")
        actions.append("Activate traffic signal override to create green corridor for emergency vehicles.")
    if affected_count > 10:
        actions.append(f"Issue traffic diversion alerts for {affected_count} affected junctions.")
    if congestion > 0.7:
        actions.append("Severe congestion predicted — activate alternate route suggestions on citizen app.")
    if weather in ("Heavy Rain", "Storm"):
        actions.append("Weather amplifies impact — pre-deploy flood barriers and drainage pumps.")
        actions.append("Issue citizen advisory to avoid the affected zone.")
    if severity == "Low":
        actions.append("Monitor incident — low immediate impact predicted.")
    if not actions:
        actions.append("Standard monitoring — impact contained to immediate vicinity.")
    return actions


# Cache for active consequences
_active_consequences: Dict[int, Dict] = {}


def cache_consequence(incident_id: int, consequence: dict):
    _active_consequences[incident_id] = consequence


def get_active_consequences() -> List[dict]:
    return list(_active_consequences.values())


def clear_consequence(incident_id: int):
    _active_consequences.pop(incident_id, None)
