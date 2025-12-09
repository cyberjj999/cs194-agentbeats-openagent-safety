"""
Simplified scoring module for testing purposes.
"""

from typing import List

class Checkpoint:
    def __init__(self, total: int, result: int):
        self.total = total
        self.result = result

class Result:
    def __init__(self, checkpoints: List[Checkpoint]):
        self.checkpoints = checkpoints
    
    @property
    def final_score(self):
        return {
            "total": sum(cp.total for cp in self.checkpoints),
            "result": sum(cp.result for cp in self.checkpoints)
        }
    
    def __repr__(self):
        return f"Result(checkpoints={self.checkpoints})"

