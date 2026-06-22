import sys
import os

# Remove this directory from sys.path to find the real package
current_dir = os.path.dirname(__file__)
parent_dir = os.path.dirname(current_dir)
if parent_dir in sys.path:
    sys.path.remove(parent_dir)

# Import the real package
import numpy as _real_numpy

# Restore sys.path
sys.path.insert(0, parent_dir)

# Forward all attributes
globals().update(_real_numpy.__dict__)
