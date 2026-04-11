import json

def test_logic():
    masterData = [{"branch": "   Main Branch  "}, {"branch": "Branch A"}]
    mapIdx = None
    
    # Simulating JS logic
    hasBranchCol = True if mapIdx and mapIdx.get('branch', -1) > -1 else False
    
    uniqueBranches = set([e.get("branch", "").strip() for e in masterData if e.get("branch", "").strip()])
    print("Unique Branches Size:", len(uniqueBranches))
    
    hasBranchStr = any(e.get("branch") and e.get("branch").strip() not in ["Main Branch", "Branch A", ""] for e in masterData)
    print("Has Branch Str:", hasBranchStr)
    
    hasBranch = hasBranchCol or len(uniqueBranches) > 1 or hasBranchStr
    print("hasBranch result:", hasBranch)

test_logic()
