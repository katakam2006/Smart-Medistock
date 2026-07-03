import cv2
import numpy as np

def describe_image(path):
    print(f"\n--- Analyzing {path} ---")
    img = cv2.imread(path)
    if img is None:
        print("Failed to load image")
        return
    print(f"Dimensions: {img.shape}")
    
    # Resize to speed up
    img_small = cv2.resize(img, (100, 100))
    # Count unique colors (using flat pixels)
    pixels = img_small.reshape(-1, 3)
    unique_colors = np.unique(pixels, axis=0)
    print(f"Number of unique colors in downsampled: {len(unique_colors)}")
    
    # Print average color
    avg_color = np.mean(img, axis=(0,1))
    print(f"Average BGR color: {avg_color}")
    
    # We can also do a simple check for dominant colors
    from sklearn.cluster import KMeans
    clt = KMeans(n_clusters=4, random_state=0)
    clt.fit(pixels)
    for i, color in enumerate(clt.cluster_centers_):
        r, g, b = int(color[2]), int(color[1]), int(color[0])
        print(f"  Cluster {i}: #{r:02x}{g:02x}{b:02x}")

paths = [
    r"C:\Users\KOTHAS\.gemini\antigravity\brain\dd0b606c-a875-460e-8855-811fdb650928\media__1783002914406.png",
    r"C:\Users\KOTHAS\.gemini\antigravity\brain\dd0b606c-a875-460e-8855-811fdb650928\media__1783003984524.png",
    r"C:\Users\KOTHAS\.gemini\antigravity\brain\dd0b606c-a875-460e-8855-811fdb650928\media__1783004211254.png",
    r"C:\Users\KOTHAS\.gemini\antigravity\brain\dd0b606c-a875-460e-8855-811fdb650928\media__1783004506534.png",
    r"C:\Users\KOTHAS\.gemini\antigravity\brain\dd0b606c-a875-460e-8855-811fdb650928\media__1783006280002.png"
]

for p in paths:
    describe_image(p)
