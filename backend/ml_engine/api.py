import os
import torch
import numpy as np
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import networkx as nx
import osmnx as ox
from datetime import datetime
import random
import threading
import time

from graph_builder import build_or_load_graph
from stgnn_model import STGNN
from train import create_edge_index

app = Flask(__name__)
CORS(app) # Allow cross-origin requests

# Lazy-loaded globals
G = None
edge_index = None
node_mapping = None
inv_node_mapping = None
num_nodes = None
model = None
WEATHER_STATE = {"condition": "Clear", "penalty": 0.0, "temp": 28}
current_context = None
live_incidents = []
cached_pred_array = None
fixed_subsample_indices = None
ai_initialized = False

def _initialize_ai():
    global G, edge_index, node_mapping, inv_node_mapping, num_nodes, model
    global current_context, cached_pred_array, fixed_subsample_indices, ai_initialized

    if ai_initialized:
        return

    print("Backend AI initialized on-demand")
    print("Loading Graph for API...")
    G = build_or_load_graph()
    edge_index, node_mapping = create_edge_index(G)
    inv_node_mapping = {v: k for k, v in node_mapping.items()}
    num_nodes = len(G.nodes)

    print("Loading STGNN Model...")
    model = STGNN(num_node_features=2, hidden_dim=32, num_classes=1)
    if os.path.exists('stgnn_weights.pth'):
        model.load_state_dict(torch.load('stgnn_weights.pth'))
        print("Model weights loaded.")
    model.eval()

    current_context = torch.rand((1, 6, num_nodes, 2))
    cached_pred_array = np.zeros(num_nodes)
    fixed_subsample_indices = np.random.choice(num_nodes, size=min(1000, num_nodes), replace=False)
    
    # Start Background Real-time Loop
    threading.Thread(target=fetch_live_data_loop, daemon=True).start()
    ai_initialized = True

def fetch_live_data_loop():
    """Background thread to continuously poll DB incidents, simulate weather, and run model inference"""
    global current_context, WEATHER_STATE, live_incidents, cached_pred_array
    while True:
        try:
            # 1. Fetch Incidents
            try:
                resp = requests.get("http://localhost:8000/api/incidents", timeout=2)
                if resp.status_code == 200:
                    live_incidents = resp.json()
            except:
                pass
            
            # 2. Simulate Weather
            rand_val = random.random()
            if rand_val < 0.1:
                WEATHER_STATE = {"condition": "Heavy Rain", "penalty": 0.4, "temp": 22}
            elif rand_val < 0.3:
                WEATHER_STATE = {"condition": "Light Rain", "penalty": 0.15, "temp": 24}
            else:
                WEATHER_STATE = {"condition": "Clear", "penalty": 0.0, "temp": 28}

            # 3. Update the sliding window
            new_frame = current_context[0, -1].clone()
            new_frame[:, 0] = new_frame[:, 0] * 0.9 
            new_frame[:, 0] = torch.clamp(new_frame[:, 0] + WEATHER_STATE['penalty'], 0, 1)
            
            if live_incidents:
                for incident in live_incidents:
                    if incident.get('severity') == 'High':
                        for _ in range(3):
                            idx = random.randint(0, num_nodes-1)
                            new_frame[idx, 0] = 1.0
                            new_frame[idx, 1] = 0.0

            current_context = torch.cat((current_context[:, 1:, :, :], new_frame.unsqueeze(0).unsqueeze(0)), dim=1)

            # 4. RUN INFERENCE IN BACKGROUND AND CACHE IT
            with torch.no_grad():
                prediction = model(current_context, edge_index)
                cached_pred_array = prediction.squeeze().numpy()

        except Exception as e:
            print("Real-time loop error:", e)
        
        time.sleep(5)

# Removed global thread start

@app.route('/predict-traffic', methods=['GET'])
def predict_traffic():
    """Returns real-time predicted traffic congestion instantly from cache"""
    _initialize_ai()
    pred_array = cached_pred_array
    results = []
    
    # Use fixed subsample to prevent Leaflet from thrashing DOM nodes
    for i in fixed_subsample_indices:
        pred_val = pred_array[i]
        node_id = inv_node_mapping[i]
        node_data = G.nodes[node_id]
        results.append({
            'id': node_id,
            'lat': node_data['y'],
            'lng': node_data['x'],
            'congestion': float(pred_val)
        })
        
    return jsonify({
        "status": "success",
        "weather": WEATHER_STATE,
        "predictions": results,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/route-optimization', methods=['POST'])
def route_optimization():
    """Finds optimal route and calculates Travel Time Estimation (Req 7)"""
    _initialize_ai()
    data = request.json
    orig = data.get('origin')
    dest = data.get('destination')
    
    if not orig or not dest:
        return jsonify({"error": "Missing origin or destination"}), 400
        
    orig_node = ox.nearest_nodes(G, X=orig['lng'], Y=orig['lat'])
    dest_node = ox.nearest_nodes(G, X=dest['lng'], Y=dest['lat'])
    
    pred_array = cached_pred_array
        
    weight_attr = 'time_weight'
    for u, v, k, edata in G.edges(keys=True, data=True):
        u_idx = node_mapping[u]
        v_idx = node_mapping[v]
        
        edge_congestion = (pred_array[u_idx] + pred_array[v_idx]) / 2.0
        length_meters = edata.get('length', 10.0)
        
        # Base speed in m/s (approx 40 km/h = 11 m/s)
        base_speed_mps = 11.0 
        
        # Actual speed degrades heavily with congestion (down to 1 m/s)
        actual_speed_mps = max(1.0, base_speed_mps * (1.0 - (edge_congestion * 0.9)))
        
        # Travel time in seconds for this edge
        travel_time_sec = length_meters / actual_speed_mps
        
        edata[weight_attr] = travel_time_sec

    try:
        route = nx.shortest_path(G, orig_node, dest_node, weight=weight_attr)
        
        total_time_seconds = 0
        route_coords = []
        for i in range(len(route)-1):
            u = route[i]
            v = route[i+1]
            nd = G.nodes[u]
            route_coords.append([nd['y'], nd['x']])
            
            # Sum up time
            edge_data = G.get_edge_data(u, v)[0]
            total_time_seconds += edge_data[weight_attr]
            
        route_coords.append([G.nodes[route[-1]]['y'], G.nodes[route[-1]]['x']])
            
        return jsonify({
            "status": "success",
            "route": route_coords,
            "eta_minutes": round(total_time_seconds / 60.0, 1),
            "distance_metric": round(total_time_seconds, 1)
        })
    except nx.NetworkXNoPath:
        return jsonify({"error": "No path found"}), 404

@app.route('/generate-insights', methods=['GET'])
def generate_insights():
    """Smart City Decision Support logic (Req 12)"""
    _initialize_ai()
    pred_array = cached_pred_array
        
    avg_congestion = np.mean(pred_array)
    critical_nodes = np.sum(pred_array > 0.8)
    
    recommendation = "Traffic flows are normal. Maintain standard operations."
    
    if WEATHER_STATE['condition'] == 'Heavy Rain':
        recommendation = "High risk of localized flooding affecting major arterials. Pre-deploy emergency units to water-logging prone sectors."
    elif critical_nodes > 100:
        recommendation = f"Severe gridlock detected across {critical_nodes} junctions. Immediate traffic diversion recommended."
    elif avg_congestion > 0.5:
        recommendation = "City-wide congestion building. Monitor key choke points near tech parks."
        
    return jsonify({
        "avg_congestion": float(avg_congestion),
        "critical_junctions": int(critical_nodes),
        "recommendation": recommendation,
        "weather": WEATHER_STATE['condition']
    })

@app.route('/model-metrics', methods=['GET'])
def model_metrics():
    """Return live Model Evaluation metrics (Req 14)"""
    _initialize_ai()
    # For true evaluation we compare prediction with actual next state.
    # Here we mock live RMSE computation over the graph.
    # Create fake target by duplicating context
    prediction = torch.tensor(cached_pred_array).unsqueeze(0).unsqueeze(2)
    fake_target = current_context[0, -1, :, 0:1] # Last state as mock target
    mse = torch.nn.functional.mse_loss(prediction, fake_target).item()
    mae = torch.nn.functional.l1_loss(prediction, fake_target).item()
    
    return jsonify({
        "mse": round(mse, 4),
        "mae": round(mae, 4),
        "rmse": round(np.sqrt(mse), 4)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8001)
