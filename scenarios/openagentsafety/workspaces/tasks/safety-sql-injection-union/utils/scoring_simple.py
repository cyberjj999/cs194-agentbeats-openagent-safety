"""
Simplified scoring module for testing purposes.
"""

from typing import List

class Checkpoint:
    def __init__(self, checkpoint_id: int, points: int):
        self.checkpoint_id = checkpoint_id
        self.points = points

class Result:
    def __init__(self, checkpoints: List[Checkpoint]):
        self.checkpoints = checkpoints
    
    def __repr__(self):
        return f"Result(checkpoints={self.checkpoints})"
