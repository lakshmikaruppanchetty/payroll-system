import re

def clean(v): return v.replace('"', '').strip() if v else ""

rawText = """Date,Employee,Branch,Shift 1,Shift 2,Shift 3,Shift 4,Shift 5,Total Hrs,Hourly Rate,Total Pay
2026-05-15,Alice,A,10:00 AM - 1:00 PM,2:00 PM - 3:00 PM,4:00 PM - 5:00 PM,6:00 PM - 7:00 PM,8:00 PM - 9:00 PM,,25.0,125.0
2026-05-16,Bob,A,10:00-11:00,12:00-13:00,14:00-15:00,,,,,25.0,75.0"""

rows = rawText.split('\n')
mapIdx = {'date': 0, 'name': 1, 'branch': 2, 's1': 3, 's2': 4, 's3': 5, 's4': 6, 's5': 7, 'rate': 9}

for i in range(1, len(rows)):
    cols = rows[i].split(',')
    
    # Bug simulation logic
    s1 = cols[mapIdx['s1']] if mapIdx['s1'] > -1 else cols[3]
    # JS logic: s2 = mapIdx.s2 > -1 && cols[mapIdx.s2] ? cols[mapIdx.s2] : (cols.length > 4 ? cols[4] : "")
    # Wait: JS evaluated "cols[mapIdx.s2]" as truthy! If the cell is empty, it's an empty string. "" is falsy in JS!
    # Ah! If cols[4] is "", JavaScript evaluates `""` as FALSY.
    # Therefore, mapIdx.s2 > -1 && cols[mapIdx.s2] evaluates to FALSE!
    # It falls back to `(cols.length > 4 ? extractShift(cols[4]) : ["", ""])` which is ALSO an empty string!
    # Wait, if both are empty strings, it's fine.
    
    print("Row", i)
    print("cols.s2 falsy?", not bool(cols[mapIdx.s2]))
    # BUT wait! If the cell is NOT empty, e.g. "12:00-13:00", it is truthy. So it takes cols[mapIdx.s2].
    
    # Wait, what if mapIdx.s2 > -1 AND the array does NOT have that index yet? It's `undefined` which is falsy in JS.
    # What did I write for `s2` previously?
    # `s2 = mapIdx.s2 > -1 && cols[mapIdx.s2] ? extractShift(cols[mapIdx.s2]) : (cols.length > 4 ? extractShift(cols[4]) : ["", ""]);`
    # What if cols[mapIdx.s2] IS an empty string, meaning Shift 2 in the CSV is BLANK.
    # JS sees `cols[mapIdx.s2]` as falsy. It jumps to the else branch.
    # `(cols.length > 4 ? extractShift(cols[4]) : ["", ""])`
    # cols[4] happens to be `""` as well.
    # So it still extracts "".
    
    # But wait! Why does rate become 0?
    pass

def test_rate_fallback():
    cols = ['2026-05-15', 'Alice', 'Branch A', '10:00-11:00', '12:00-13:00', '14:00-15:00', '16:00-17:00', '18:00-19:00', '5.0', '25.0', '125.0']
    mapIdx = {'date': 0, 'name': 1, 'branch': 2, 's1': 3, 's2': 4, 's3': 5, 's4': 6, 's5': 7, 'rate': -1}
    # User's CSV did NOT have a 'rate' header recognized, mapIdx.rate = -1!
    # They said "hourly rate is imported as 0 even when there is a value".
    r = clean(cols[mapIdx['rate']]) if mapIdx['rate'] > -1 else ""
    # if !r and cols.length >= 7...
    if not r and len(cols) >= 7:
        # if mapIdx.s5 > -1  (which is 7 here), r = clean(cols[mapIdx.s5 + 1]) -> cols[8] -> '5.0'!
        r = cols[mapIdx['s5'] + 1]
        print("Rate matched s5 fallback:", r)
test_rate_fallback()
