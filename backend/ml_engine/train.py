import torch
import torch.nn as nn
import numpy as np
import networkx as nx
import os

from graph_builder import build_or_load_graph
from traffic_simulator import generate_historical_dataset
from stgnn_model import STGNN

def create_edge_index(G):
    # Convert NetworkX edges to PyTorch Geometric edge_index format
    node_mapping = {node: i for i, node in enumerate(G.nodes())}
    source_nodes = []
    target_nodes = []
    
    for u, v in G.edges():
        source_nodes.append(node_mapping[u])
        target_nodes.append(node_mapping[v])
        
    edge_index = torch.tensor([source_nodes, target_nodes], dtype=torch.long)
    return edge_index, node_mapping

def prepare_data(G, days=3, history_length=6):
    print("Generating synthetic historical dataset...")
    # Shape: (timesteps, num_nodes, num_features)
    dataset = generate_historical_dataset(G, days=days)
    
    # We want to predict t+1 based on t-history_length to t
    X, Y = [], []
    for i in range(len(dataset) - history_length):
        X.append(dataset[i:i+history_length])
        # Target is just congestion level at t+1 (feature index 0)
        Y.append(dataset[i+history_length, :, 0:1]) 
        
    X = torch.tensor(np.array(X), dtype=torch.float32)
    Y = torch.tensor(np.array(Y), dtype=torch.float32)
    
    return X, Y

def train_model():
    G = build_or_load_graph()
    edge_index, _ = create_edge_index(G)
    
    # Small dataset for fast prototyping (3 days)
    X, Y = prepare_data(G, days=3, history_length=6)
    
    # Split train/test (80/20)
    split = int(0.8 * len(X))
    X_train, Y_train = X[:split], Y[:split]
    X_test, Y_test = X[split:], Y[split:]
    
    num_nodes = X.size(2)
    num_features = X.size(3)
    
    model = STGNN(num_node_features=num_features, hidden_dim=32, num_classes=1)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    criterion = nn.MSELoss()
    
    print(f"Starting training on {num_nodes} nodes...")
    epochs = 20
    
    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()
        
        # In a real scenario we'd batch this, but for proto we pass full train set
        # X_train shape: (batch_size, timesteps, num_nodes, num_features)
        pred = model(X_train, edge_index)
        
        loss = criterion(pred, Y_train)
        loss.backward()
        optimizer.step()
        
        if (epoch+1) % 5 == 0:
            model.eval()
            with torch.no_grad():
                test_pred = model(X_test, edge_index)
                test_loss = criterion(test_pred, Y_test)
                mae = torch.mean(torch.abs(test_pred - Y_test))
                
            print(f"Epoch {epoch+1}/{epochs} | Train Loss (MSE): {loss.item():.4f} | Test Loss (MSE): {test_loss.item():.4f} | Test MAE: {mae.item():.4f}")
            
    # Save the model
    torch.save(model.state_dict(), 'stgnn_weights.pth')
    print("Model training complete and saved to stgnn_weights.pth")

if __name__ == "__main__":
    train_model()
