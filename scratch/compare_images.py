import cv2
import numpy as np

img1 = cv2.imread(r"C:\Users\KOTHAS\.gemini\antigravity\brain\dd0b606c-a875-460e-8855-811fdb650928\media__1783010991333.png")
img2 = cv2.imread(r"C:\Users\KOTHAS\.gemini\antigravity\brain\dd0b606c-a875-460e-8855-811fdb650928\media__1783011236066.png")

if img1 is None or img2 is None:
    print("Could not load one of the images")
else:
    if img1.shape == img2.shape:
        diff = cv2.subtract(img1, img2)
        b, g, r = cv2.split(diff)
        if cv2.countNonZero(b) == 0 and cv2.countNonZero(g) == 0 and cv2.countNonZero(r) == 0:
            print("The screenshots are 100% IDENTICAL.")
        else:
            print("The screenshots are DIFFERENT.")
            # Print standard difference
            print(f"Non-zero diff count: {cv2.countNonZero(b) + cv2.countNonZero(g) + cv2.countNonZero(r)}")
    else:
        print(f"Shapes are different: {img1.shape} vs {img2.shape}")
