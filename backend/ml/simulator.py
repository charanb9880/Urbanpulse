"""
Traffic simulator — generates dynamic edge/node features for the road graph.
Ported from ml_engine/traffic_simulator.py — no Flask dependency.
"""

import random
import numpy as np
import networkx as nx
from datetime import datetime, timedelta


def simulate_edge_features(G: nx.MultiDiGraph, current_time=None, weather_condition: str = "Clear"):
    """
    Generates dynamic traffic features for every edge.
    Returns (edge_features dict, node_features dict).
    """
    if current_time is None:
        current_time = datetime.now()

    hour = current_time.hour

    # Rush-hour multipliers
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
    wc = weather_condition.lower()
    if "rain" in wc:
        weather_multiplier = 0.3
    elif "storm" in wc:
        weather_multiplier = 0.6
    elif "flood" in wc:
        weather_multiplier = 0.7

    edge_features = {}
    for u, v, k, data in G.edges(keys=True, data=True):
        base_speed = float(data.get("speed_kph", 40.0))
        noise = random.uniform(0, 0.2)
        base_congestion = rush_multiplier + weather_multiplier + noise

        # 1 % chance of random incident
        is_incident = random.random() < 0.01
        if is_incident:
            base_congestion += 0.5

        congestion_level = min(1.0, max(0.0, base_congestion))
        current_speed = max(5.0, base_speed * (1.0 - congestion_level * 0.8))

        edge_features[(u, v, k)] = {
            "congestion_level": congestion_level,
            "current_speed": current_speed,
            "has_incident": is_incident,
        }

    # Aggregate to nodes
    node_features = {n: {"congestion": 0.0, "speed": 0.0, "count": 0} for n in G.nodes()}
    for (u, v, _), feat in edge_features.items():
        for node in (u, v):
            node_features[node]["congestion"] += feat["congestion_level"]
            node_features[node]["speed"] += feat["current_speed"]
            node_features[node]["count"] += 1

    for n in G.nodes():
        c = node_features[n]["count"]
        if c > 0:
            node_features[n]["congestion"] /= c
            node_features[n]["speed"] /= c
        else:
            node_features[n]["speed"] = 40.0

    return edge_features, node_features


def generate_historical_dataset(G: nx.MultiDiGraph, days: int = 1):
    """
    Generates a timeseries dataset: shape (timesteps, num_nodes, num_features).
    """
    start_time = datetime.now() - timedelta(days=days)
    timesteps = days * 24  # hourly
    node_list = list(G.nodes())

    dataset = []
    for i in range(timesteps):
        t = start_time + timedelta(hours=i)
        _, nf = simulate_edge_features(G, current_time=t)
        step = [[nf[n]["congestion"], nf[n]["speed"]] for n in node_list]
        dataset.append(step)

    return np.array(dataset)
