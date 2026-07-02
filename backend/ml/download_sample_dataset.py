import os
import urllib.request

# Define the sample images from public Wikimedia Commons
DATASET_MAP = {
    "accident": [
        "https://upload.wikimedia.org/wikipedia/commons/1/11/Car_accident_in_duala.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/5/5a/Car_accident_on_the_highway_in_Poland.jpg"
    ],
    "flood": [
        "https://upload.wikimedia.org/wikipedia/commons/b/b7/Flood_in_Limburg_2021.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/6/6b/Flooding_in_Manila_August_2012.jpg"
    ],
    "pothole": [
        "https://upload.wikimedia.org/wikipedia/commons/4/4b/Pothole_in_road.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/0/02/Pothole_detroit.jpg"
    ],
    "fallen_tree": [
        "https://upload.wikimedia.org/wikipedia/commons/2/25/Fallen_tree_in_road_near_Gillingham_-_geograph.org.uk_-_57002.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/8/87/Fallen_tree_blocking_road.jpg"
    ]
}

def download_sample_dataset():
    base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "custom_image_dataset")
    print(f"Creating dataset directories at: {base_dir}")
    
    # User-Agent header to prevent HTTP 403 Forbidden errors from Wikimedia
    opener = urllib.request.build_opener()
    opener.addheaders = [('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')]
    urllib.request.install_opener(opener)
    
    for category, urls in DATASET_MAP.items():
        category_dir = os.path.join(base_dir, category)
        os.makedirs(category_dir, exist_ok=True)
        
        for idx, url in enumerate(urls):
            file_name = f"{category}_{idx + 1}.jpg"
            target_path = os.path.join(category_dir, file_name)
            
            print(f"Downloading {category} image {idx + 1} from: {url} ...")
            try:
                urllib.request.urlretrieve(url, target_path)
                print(f"Saved to: {target_path}")
            except Exception as e:
                print(f"Failed to download {url}: {e}")

if __name__ == "__main__":
    download_sample_dataset()
