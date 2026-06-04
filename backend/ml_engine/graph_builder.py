import osmnx as ox
import networkx as nx
import os
import pickle

GRAPH_CACHE_FILE = 'bengaluru_graph.pkl'

def build_or_load_graph(place_name="Koramangala, Bengaluru, India", network_type="drive"):
    """
    Builds a NetworkX graph using OpenStreetMap data for the given location.
    Caches the graph locally to avoid repeated downloads.
    """
    if os.path.exists(GRAPH_CACHE_FILE):
        print(f"Loading cached graph from {GRAPH_CACHE_FILE}...")
        with open(GRAPH_CACHE_FILE, 'rb') as f:
            G = pickle.load(f)
        return G

    print(f"Downloading graph for {place_name}...")
    try:
        # We use a relatively small bounding box or specific neighborhood to keep the graph small for real-time demo
        G = ox.graph_from_place(place_name, network_type=network_type, simplify=True)
        
        # Add travel times and speeds if missing
        G = ox.add_edge_speeds(G)
        G = ox.add_edge_travel_times(G)
        
        # Save to cache
        with open(GRAPH_CACHE_FILE, 'wb') as f:
            pickle.dump(G, f)
            
        print("Graph successfully built and cached.")
        return G
    except Exception as e:
        print(f"Failed to build graph: {e}")
        # Fallback to a tiny bounding box around a specific coordinate in Koramangala
        point = (12.9345, 77.6265) # Koramangala approx
        G = ox.graph_from_point(point, dist=1500, network_type=network_type, simplify=True)
        G = ox.add_edge_speeds(G)
        G = ox.add_edge_travel_times(G)
        
        with open(GRAPH_CACHE_FILE, 'wb') as f:
            pickle.dump(G, f)
        print("Fallback graph successfully built and cached.")
        return G

def get_graph_stats(G):
    return {
        "nodes": len(G.nodes),
        "edges": len(G.edges),
        "is_directed": nx.is_directed(G)
    }

if __name__ == "__main__":
    G = build_or_load_graph()
    stats = get_graph_stats(G)
    print(f"Graph stats: {stats}")
