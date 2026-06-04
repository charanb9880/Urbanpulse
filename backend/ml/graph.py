"""
Graph builder — loads / caches OpenStreetMap road network for Bengaluru.
Ported from ml_engine/graph_builder.py — no Flask dependency.
"""

import os
import pickle
import networkx as nx

# Cache path lives next to the backend root
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRAPH_CACHE_FILE = os.path.join(_BACKEND_DIR, "bengaluru_graph.pkl")


def build_or_load_graph(
    place_name: str = "Koramangala, Bengaluru, India",
    network_type: str = "drive",
) -> nx.MultiDiGraph:
    """
    Returns a NetworkX graph.  Loads from pickle cache if available,
    otherwise downloads from OSM via osmnx.
    """
    if os.path.exists(GRAPH_CACHE_FILE):
        print(f"[graph] Loading cached graph from {GRAPH_CACHE_FILE} ...")
        with open(GRAPH_CACHE_FILE, "rb") as f:
            return pickle.load(f)

    import osmnx as ox  # heavy import only when downloading

    print(f"[graph] Downloading graph for {place_name} ...")
    try:
        G = ox.graph_from_place(place_name, network_type=network_type, simplify=True)
        G = ox.add_edge_speeds(G)
        G = ox.add_edge_travel_times(G)
    except Exception as e:
        print(f"[graph] Primary download failed ({e}), using fallback bounding-box …")
        point = (12.9345, 77.6265)  # Koramangala
        G = ox.graph_from_point(point, dist=1500, network_type=network_type, simplify=True)
        G = ox.add_edge_speeds(G)
        G = ox.add_edge_travel_times(G)

    with open(GRAPH_CACHE_FILE, "wb") as f:
        pickle.dump(G, f)
    print("[graph] Graph cached.")
    return G


def get_graph_stats(G: nx.MultiDiGraph) -> dict:
    return {
        "nodes": len(G.nodes),
        "edges": len(G.edges),
        "is_directed": nx.is_directed(G),
    }


def create_edge_index(G: nx.MultiDiGraph):
    """Convert NetworkX edges → PyTorch Geometric edge_index tensor + node mapping."""
    import torch

    node_mapping = {node: i for i, node in enumerate(G.nodes())}
    src, dst = [], []
    for u, v in G.edges():
        src.append(node_mapping[u])
        dst.append(node_mapping[v])
    edge_index = torch.tensor([src, dst], dtype=torch.long)
    return edge_index, node_mapping
