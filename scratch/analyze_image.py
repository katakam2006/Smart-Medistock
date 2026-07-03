import cv2
import numpy as np
from sklearn.cluster import KMeans

def get_dominant_colors(image_path, k=5):
    try:
        # Load image
        img = cv2.imread(image_path)
        if img is None:
            print(f"Could not load image: {image_path}")
            return
        
        # Resize to speed up calculation
        img = cv2.resize(img, (200, 200), interpolation=cv2.INTER_AREA)
        
        # Convert from BGR to RGB
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Reshape to a list of pixels
        pixels = img.reshape((-1, 3))
        
        # Cluster colors
        clt = KMeans(n_clusters=k, random_state=42)
        clt.fit(pixels)
        
        # Get dominant colors
        colors = clt.cluster_centers_
        
        # Convert to hex
        hex_colors = []
        for color in colors:
            r, g, b = int(color[0]), int(color[1]), int(color[2])
            hex_colors.append(f"#{r:02x}{g:02x}{b:02x}")
            
        print(f"Dominant colors for {image_path}:")
        for hc in hex_colors:
            print(f"  {hc}")
            
    except Exception as e:
        print(f"Error analyzing {image_path}: {e}")

# Paths to the screenshots
paths = [
    r"C:\Users\KOTHAS\.gemini\antigravity\brain\dd0b606c-a875-460e-8855-811fdb650928\media__1783011236066.png",
    r"C:\Users\KOTHAS\.gemini\antigravity\brain\dd0b606c-a875-460e-8855-811fdb650928\media__1783010991333.png",
    r"C:\Users\KOTHAS\.gemini\antigravity\brain\dd0b606c-a875-460e-8855-811fdb650928\media__1783006280002.png"
]

for p in paths:
    get_dominant_colors(p)
