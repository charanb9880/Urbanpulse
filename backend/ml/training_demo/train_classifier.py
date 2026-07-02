import os
import random
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from PIL import Image
from torchvision import transforms
from torchvision.models import mobilenet_v2, MobileNet_V2_Weights

# Configuration
USE_FULL_DATASET = False  # Set to True to train on the full dataset (takes longer)
BATCH_SIZE = 16
EPOCHS = 3
LEARNING_RATE = 0.001

# Resolve paths relative to the script location
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(os.path.dirname(SCRIPT_DIR))

CLASS_DIRS = {
    "mixed_issues": os.path.join(BACKEND_DIR, "Mixed Issues"),
    "damaged_road": os.path.join(BACKEND_DIR, "Damaged Road issues"),
    "potholes": os.path.join(BACKEND_DIR, "Pothole Issues")
}

class CustomIncidentDataset(Dataset):
    def __init__(self, image_paths, labels, transform=None):
        self.image_paths = image_paths
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        img_path = self.image_paths[idx]
        try:
            image = Image.open(img_path).convert("RGB")
        except Exception as e:
            # Fallback to a black image if loading fails
            image = Image.new("RGB", (224, 224), (0, 0, 0))
            
        label = self.labels[idx]
        if self.transform:
            image = self.transform(image)
        return image, label

def load_data_splits():
    all_files = {}
    
    # Scan files in directories
    for class_name, path in CLASS_DIRS.items():
        if not os.path.exists(path):
            print(f"Warning: Directory not found: {path}")
            continue
        
        valid_extensions = ('.jpg', '.jpeg', '.png')
        files = [os.path.join(path, f) for f in os.listdir(path) if f.lower().endswith(valid_extensions)]
        all_files[class_name] = files
        print(f"Scanned {len(files)} files for class '{class_name}'")

    train_paths, train_labels = [], []
    val_paths, val_labels = [], []
    
    class_to_idx = {"mixed_issues": 0, "damaged_road": 1, "potholes": 2}
    
    # Subsampling or full dataset split
    for class_name, files in all_files.items():
        random.shuffle(files)
        
        if not USE_FULL_DATASET:
            # Take a small subset for demonstration speed
            files = files[:65] # 50 for training, 15 for validation
            
        split_idx = int(0.8 * len(files))
        train_set = files[:split_idx]
        val_set = files[split_idx:]
        
        label_idx = class_to_idx[class_name]
        
        train_paths.extend(train_set)
        train_labels.extend([label_idx] * len(train_set))
        val_paths.extend(val_set)
        val_labels.extend([label_idx] * len(val_set))
        
    print(f"\nFinal dataset counts:")
    print(f" - Training samples: {len(train_paths)}")
    print(f" - Validation samples: {len(val_paths)}")
    
    return train_paths, train_labels, val_paths, val_labels

def main():
    # 1. Load data
    train_paths, train_labels, val_paths, val_labels = load_data_splits()
    
    if len(train_paths) == 0:
        print("Error: No training images found. Make sure the dataset folders are in the backend directory.")
        return

    # 2. Define transforms
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    # 3. Create datasets and loaders
    train_dataset = CustomIncidentDataset(train_paths, train_labels, transform=train_transform)
    val_dataset = CustomIncidentDataset(val_paths, val_labels, transform=val_transform)
    
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)

    # 4. Initialize pre-trained MobileNetV2
    print("\nLoading pre-trained MobileNetV2 model...")
    # Using modern torchvision weights argument
    weights = MobileNet_V2_Weights.DEFAULT
    model = mobilenet_v2(weights=weights)
    
    # 5. Modify classification head for 3 classes
    num_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_features, 3)
    
    # Transfer model to GPU if available (Metal Performance Shaders on Apple Silicon / CUDA on Linux/Windows)
    device = torch.device("mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training will run on device: {device}")
    model = model.to(device)

    # 6. Define loss and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)

    # 7. Training loop
    print("\nStarting model training...")
    for epoch in range(EPOCHS):
        model.train()
        running_loss = 0.0
        correct_train = 0
        total_train = 0
        
        for images, labels in train_loader:
            images = images.to(device)
            labels = labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * images.size(0)
            _, predicted = torch.max(outputs, 1)
            total_train += labels.size(0)
            correct_train += (predicted == labels).sum().item()
            
        epoch_loss = running_loss / len(train_dataset)
        train_acc = (correct_train / total_train) * 100
        
        # Validation phase
        model.eval()
        correct_val = 0
        total_val = 0
        val_loss = 0.0
        
        with torch.no_grad():
            for images, labels in val_loader:
                images = images.to(device)
                labels = labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * images.size(0)
                _, predicted = torch.max(outputs, 1)
                total_val += labels.size(0)
                correct_val += (predicted == labels).sum().item()
                
        epoch_val_loss = val_loss / len(val_dataset)
        val_acc = (correct_val / total_val) * 100
        
        print(f"Epoch {epoch+1}/{EPOCHS} | Train Loss: {epoch_loss:.4f} | Train Acc: {train_acc:.2f}% | Val Loss: {epoch_val_loss:.4f} | Val Acc: {val_acc:.2f}%")

    # 8. Save fine-tuned weights
    save_path = os.path.join(SCRIPT_DIR, "custom_incident_classifier.pth")
    torch.save(model.state_dict(), save_path)
    print(f"\nTraining Demo Completed! Model weights saved successfully to: {save_path}")

if __name__ == "__main__":
    main()
