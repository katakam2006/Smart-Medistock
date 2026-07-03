import cv2
import numpy as np

img1 = cv2.imread(r"C:\Users\KOTHAS\.gemini\antigravity\brain\dd0b606c-a875-460e-8855-811fdb650928\media__1783010991333.png")
img2 = cv2.imread(r"C:\Users\KOTHAS\.gemini\antigravity\brain\dd0b606c-a875-460e-8855-811fdb650928\media__1783011236066.png")

if img1 is not None and img2 is not None and img1.shape == img2.shape:
    diff = cv2.absdiff(img1, img2)
    gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 10, 255, cv2.THRESH_BINARY)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    print(f"Found {len(contours)} different regions:")
    for i, c in enumerate(contours):
        x, y, w, h = cv2.boundingRect(c)
        if w > 2 and h > 2:
            print(f"  Region {i}: x={x}, y={y}, w={w}, h={h}")
            # Crop and check average color of that region in both images
            crop1 = img1[y:y+h, x:x+w]
            crop2 = img2[y:y+h, x:x+w]
            print(f"    Img1 mean BGR: {np.mean(crop1, axis=(0,1))}")
            print(f"    Img2 mean BGR: {np.mean(crop2, axis=(0,1))}")
else:
    print("Cannot compare")
