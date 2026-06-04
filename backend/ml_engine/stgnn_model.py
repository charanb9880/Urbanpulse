import torch
import torch.nn.functional as F
from torch_geometric.nn import GCNConv
from torch.nn import LSTM

class STGNN(torch.nn.Module):
    def __init__(self, num_node_features, hidden_dim=32, num_classes=1):
        """
        Spatial-Temporal Graph Neural Network
        Combines GCN (Spatial) with LSTM (Temporal)
        """
        super(STGNN, self).__init__()
        
        # Spatial Graph Convolutions
        self.conv1 = GCNConv(num_node_features, hidden_dim)
        self.conv2 = GCNConv(hidden_dim, hidden_dim)
        
        # Temporal LSTM
        # Input to LSTM is the flattened graph embeddings over time
        self.lstm = LSTM(hidden_dim, hidden_dim, batch_first=True)
        
        # Final prediction layer
        self.linear = torch.nn.Linear(hidden_dim, num_classes)

    def forward(self, x_seq, edge_index):
        """
        x_seq: Tensor of shape (batch_size, timesteps, num_nodes, num_features)
        edge_index: Graph connectivity
        """
        batch_size, timesteps, num_nodes, num_features = x_seq.size()
        
        # We need to apply GCN to each timestep
        spatial_embeddings = []
        for t in range(timesteps):
            # x_t shape: (batch_size * num_nodes, num_features)
            x_t = x_seq[:, t, :, :].reshape(-1, num_features)
            
            # Apply GCN
            h_t = self.conv1(x_t, edge_index)
            h_t = F.relu(h_t)
            h_t = self.conv2(h_t, edge_index)
            h_t = F.relu(h_t)
            
            # Reshape back to (batch_size, num_nodes, hidden_dim)
            h_t = h_t.view(batch_size, num_nodes, -1)
            spatial_embeddings.append(h_t)
            
        # Stack spatial embeddings
        # Shape: (batch_size, timesteps, num_nodes, hidden_dim)
        spatial_seq = torch.stack(spatial_embeddings, dim=1)
        
        # Apply LSTM to each node's sequence
        # Reshape to (batch_size * num_nodes, timesteps, hidden_dim)
        spatial_seq = spatial_seq.transpose(1, 2).contiguous().view(-1, timesteps, self.lstm.input_size)
        
        lstm_out, (hn, cn) = self.lstm(spatial_seq)
        
        # Take the output of the last timestep
        # Shape: (batch_size * num_nodes, hidden_dim)
        last_out = lstm_out[:, -1, :]
        
        # Predict
        # Shape: (batch_size * num_nodes, num_classes)
        pred = self.linear(last_out)
        
        # Reshape to (batch_size, num_nodes, num_classes)
        pred = pred.view(batch_size, num_nodes, -1)
        
        # Apply sigmoid to constrain congestion prediction between 0 and 1
        return torch.sigmoid(pred)
