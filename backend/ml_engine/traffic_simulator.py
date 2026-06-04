import networkx as nx
import random
import numpy as np
from datetime import datetime, timedelta

def simulate_edge_features(G, current_time=None, weather_condition='Clear'):
    """
    Generates dynamic traffic features for the graph edges.
    Features:
    - current_speed: km/h
    - congestion_level: 0.0 (empty) to 1.0 (standstill)
    - road_capacity: vehicles per hour
    """
    if current_time is None:
        current_time = datetime.now()
        
    hour = current_time.hour
    
    # Rush hour multipliers (higher = more congested)
    if 8 <= hour <= 11:
        rush_multiplier = 0.8
    elif 17 <= hour <= 20:
        rush_multiplier = 0.9
    elif 12 <= hour <= 16:
        rush_multiplier = 0.5
    else:
        rush_multiplier = 0.2
        
    # Weather multiplier
    weather_multiplier = 0.0
    if weather_condition.lower() == 'rain':
        weather_multiplier = 0.3
    elif weather_condition.lower() == 'storm':
        weather_multiplier = 0.6
        
    features = {}
    
    for u, v, k, data in G.edges(keys=True, data=True):
        # Base speed
        if 'speed_kph' in data:
            base_speed = float(data['speed_kph'])
        else:
            base_speed = 40.0
            
        # Add some random noise specific to this edge
        noise = random.uniform(0, 0.2)
        
        # Calculate congestion
        base_congestion = rush_multiplier + weather_multiplier + noise
        
        # Random severe incidents (1% chance)
        is_incident = random.random() < 0.01
        if is_incident:
            base_congestion += 0.5
            
        congestion_level = min(1.0, max(0.0, base_congestion))
        
        # Calculate actual speed
        current_speed = base_speed * (1.0 - (congestion_level * 0.8)) # Never goes below 20% of speed limit
        current_speed = max(5.0, current_speed)
        
        features[(u, v, k)] = {
            'congestion_level': congestion_level,
            'current_speed': current_speed,
            'has_incident': is_incident
        }
        
    # Aggregate to nodes
    node_features = {n: {'congestion': 0.0, 'speed': 0.0, 'count': 0} for n in G.nodes()}
    for (u, v, k), data in features.items():
        node_features[u]['congestion'] += data['congestion_level']
        node_features[u]['speed'] += data['current_speed']
        node_features[u]['count'] += 1
        node_features[v]['congestion'] += data['congestion_level']
        node_features[v]['speed'] += data['current_speed']
        node_features[v]['count'] += 1
        
    for n in G.nodes():
        if node_features[n]['count'] > 0:
            node_features[n]['congestion'] /= node_features[n]['count']
            node_features[n]['speed'] /= node_features[n]['count']
        else:
            node_features[n]['speed'] = 40.0
            
    return features, node_features

def generate_historical_dataset(G, days=1):
    """
    Generates a timeseries dataset for training the GNN.
    Output: Node sequence shape: (timesteps, num_nodes, num_features)
    """
    start_time = datetime.now() - timedelta(days=days)
    timesteps = days * 24 # Hourly data
    
    node_dataset = []
    
    for i in range(timesteps):
        t = start_time + timedelta(hours=i)
        _, node_features = simulate_edge_features(G, current_time=t)
        
        step_data = []
        for n in G.nodes():
            step_data.append([
                node_features[n]['congestion'],
                node_features[n]['speed']
            ])
        node_dataset.append(step_data)
        
    node_dataset = np.array(node_dataset)
    return node_dataset

if __name__ == "__main__":
    from graph_builder import build_or_load_graph
    G = build_or_load_graph()
    dataset = generate_historical_dataset(G, days=1)
    print(f"Generated historical dataset with shape: {dataset.shape}")
