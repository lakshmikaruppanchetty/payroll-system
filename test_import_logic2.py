import re
import json

def timeTo24(str_val):
    if not str_val or len(str_val) < 3: return str_val
    up = str_val.upper()
    if 'AM' not in up and 'PM' not in up:
        clean_str = ''.join(c for c in str_val if c.isdigit() or c == ':')
        return clean_str if len(clean_str) > 0 else str_val
    parts = ''.join(c for c in str_val if c.isdigit() or c == ':').split(':')
    if len(parts) != 2: return str_val
    h1 = int(parts[0])
    m1 = int(parts[1])
    if 'PM' in up and h1 != 12: h1 += 12
    if 'AM' in up and h1 == 12: h1 = 0
    return f'{h1:02d}:{m1:02d}'

def clean(v):
    return v.replace('"', '').strip() if v else ""

def extractShift(val):
    v = clean(val)
    if not v or v == '-': return ["", ""]
    v = v.replace('\n', ' ').replace('\r', ' ')
    match = re.match(r'^(.*?)\s*-\s*(.*)$', v)
    if not match: match = re.match(r'^(.*?)\s*to\s*(.*)$', v)
    if match: return [timeTo24(match.group(1).strip()), timeTo24(match.group(2).strip())]
    parts = v.split('-')
    if len(parts) == 1: return [timeTo24(parts[0].strip()), ""]
    return [timeTo24(parts[0].strip()), timeTo24(parts[1].strip())]

def extractMultipleShifts(val):
    v = clean(val)
    if not v or v == '-': return []
    shifts = re.split(r'[\n,;]+', v)
    res = []
    for s in shifts:
        ss = s.strip()
        if not ss or ss == '-': continue
        m = re.match(r'(.*?)\s*-\s*(.*)', ss)
        if not m: m = re.match(r'(.*?)\s*to\s*(.*)', ss)
        if m: res.append([timeTo24(m.group(1).strip()), timeTo24(m.group(2).strip())])
        else:
            p = ss.split('-')
            if len(p) == 1: res.append([timeTo24(p[0].strip()), ""])
            else: res.append([timeTo24(p[0].strip()), timeTo24(p[1].strip())])
    return [r for r in res if r[0] or r[1]]

def parse_with_app_js(rawText):
    rows = []
    inQ = False
    currentLine = ""
    for i in range(len(rawText)):
        char = rawText[i]
        if char == '"': inQ = not inQ
        if char == '\n' and not inQ:
            if currentLine.strip(): rows.append(currentLine)
            currentLine = ""
        elif char == '\r' and not inQ:
            if i+1 < len(rawText) and rawText[i+1] == '\n': continue
            if currentLine.strip(): rows.append(currentLine)
            currentLine = ""
        else:
            currentLine += char
    if currentLine.strip(): rows.append(currentLine)
    
    isNewFormat = False
    mapIdx = None
    if len(rows) > 0:
        headStr = rows[0].replace('"', '').strip().lower()
        if 'date' in headStr or 'employee' in headStr:
            isNewFormat = True
            mapIdx = {'s4': -1, 's5': -1, 'rate': -1}
            # simplified split for headers
            hCols = [v.replace('"', '').strip().lower() for v in re.split(r',(?=(?:(?:[^"]*"){2})*[^"]*$)', rows[0])]
            
            mapIdx['date'] = next((i for i, h in enumerate(hCols) if 'date' in h), -1)
            mapIdx['name'] = next((i for i, h in enumerate(hCols) if 'employee' in h or 'name' in h), -1)
            mapIdx['branch'] = next((i for i, h in enumerate(hCols) if 'branch' in h), -1)
            mapIdx['s1'] = next((i for i, h in enumerate(hCols) if 'shift 1' in h or 's1' in h or 'shift1' in h), -1)
            mapIdx['s2'] = next((i for i, h in enumerate(hCols) if 'shift 2' in h or 's2' in h or 'shift2' in h), -1)
            mapIdx['s3'] = next((i for i, h in enumerate(hCols) if 'shift 3' in h or 's3' in h or 'shift3' in h), -1)
            mapIdx['s4'] = next((i for i, h in enumerate(hCols) if 'shift 4' in h or 's4' in h or 'shift4' in h), -1)
            mapIdx['s5'] = next((i for i, h in enumerate(hCols) if 'shift 5' in h or 's5' in h or 'shift5' in h), -1)
            mapIdx['rate'] = next((i for i, h in enumerate(hCols) if 'rate' in h), -1)

    print("MapIdx:", mapIdx)

    for i in range(1, len(rows)):
        cols = []
        inQuotes = False
        current = ""
        for char in rows[i]:
            if char == '"': inQuotes = not inQuotes
            elif char == ',' and not inQuotes:
                cols.append(current)
                current = ""
            else: current += char
        cols.append(current)

        if len(cols) < 3: continue

        s1, s2, s3, s4, s5 = ["",""], ["",""], ["",""], ["",""], ["",""]
        rate = 0
        
        if isNewFormat:
            combinedStr = cols[mapIdx['s1']] if (mapIdx and mapIdx['s1'] > -1) else cols[3]
            multi = extractMultipleShifts(combinedStr)
            
            if len(multi) > 1:
                print(f"Row {i} - MULTIPLE PATH triggering")
                s1 = multi[0] if len(multi)>0 else ["",""]
                s2 = multi[1] if len(multi)>1 else ["",""]
                s3 = multi[2] if len(multi)>2 else ["",""]
                s4 = multi[3] if len(multi)>3 else ["",""]
                s5 = multi[4] if len(multi)>4 else ["",""]
            else:
                s1 = extractShift(cols[mapIdx['s1']]) if mapIdx['s1'] > -1 and cols[mapIdx['s1']] else extractShift(cols[3])
                
                s2Val = cols[mapIdx['s2']] if mapIdx['s2'] > -1 else (cols[4] if len(cols) > 4 else None)
                s2 = extractShift(s2Val) if s2Val is not None else ["", ""]
                
                s3Val = cols[mapIdx['s3']] if mapIdx['s3'] > -1 else (cols[5] if len(cols) > 5 else None)
                s3 = extractShift(s3Val) if s3Val is not None else ["", ""]
                
                s4Val = cols[mapIdx['s4']] if mapIdx['s4'] > -1 else (cols[6] if len(cols) > 6 else None)
                s4 = extractShift(s4Val) if s4Val is not None else ["", ""]
                
                s5Val = cols[mapIdx['s5']] if mapIdx['s5'] > -1 else (cols[7] if len(cols) > 7 else None)
                s5 = extractShift(s5Val) if s5Val is not None else ["", ""]

            r = clean(cols[mapIdx['rate']]) if mapIdx['rate'] > -1 and mapIdx['rate'] < len(cols) else ""
            if not r and len(cols) >= 7:
                if mapIdx['s5'] > -1 and len(cols) > mapIdx['s5'] + 1: r = clean(cols[mapIdx['s5'] + 1])
                elif mapIdx['s3'] > -1 and len(cols) > mapIdx['s3'] + 1: r = clean(cols[mapIdx['s3'] + 1])
                else: r = clean(cols[9 if len(cols) > 9 else 6])
            
            if r:
                r = re.sub(r'[^0-9.]', '', r)
                rate = float(r) if r else 0

        print(f"Row {i} resulting shifts:")
        print("  S1:", s1)
        print("  S2:", s2)
        print("  S3:", s3)
        print("  S4:", s4)
        print("  S5:", s5)
        print("  Rate:", rate)


csv_test1 = """Date,Employee,Branch,Shift 1,Total Hours,Hourly Rate,Total Pay
2026-05-15,Alice,A,10:00-11:00\n11:00-12:00\n12:00-13:00\n13:00-14:00\n14:00-15:00,5.0,25.0,125.0"""
print("TEST 1: 5 shifts in one cell (Newline)")
parse_with_app_js(csv_test1)

csv_test2 = """Date,Employee,Branch,Shift 1,Shift 2,Shift 3,Shift 4,Shift 5,Total Hours,Hourly Rate,Total Pay
2026-05-15,Alice,A,10:00-11:00,11:00-12:00,12:00-13:00,13:00-14:00,14:00-15:00,5.0,25.0,125.0"""
print("TEST 2: Proper 5 columns")
parse_with_app_js(csv_test2)

csv_test3 = """"Date","Employee","Branch","Shift 1","Shift 2","Shift 3","Shift 4","Shift 5","Total Hours","Hourly Rate","Total Pay"
"2026-05-15","Bob","A","10:00 - 11:00","","","","",1.0,25.0,25.0
"2026-05-15","Alice","A","10:00 - 11:00","11:00 - 12:00","12:00 - 13:00","13:00 - 14:00","14:00 - 15:00",5.0,25.0,125.0"""
print("TEST 3: Export format + quotes, where user has a row with 5 shifts and one row with 1 shift.")
parse_with_app_js(csv_test3)

csv_test4 = """Date,Employee,Branch,Shift 1,Shift 2,Shift 3,Total Hours,Hourly Rate,Total Pay
2026-05-15,Alice,A,10:00-11:00,11:00-12:00,12:00-13:00,13:00-14:00,14:00-15:00,25.0,125.0"""
print("TEST 4: User manually entered 5 shifts but the header only has Shift 1,2,3")
# Here Alice has 5 shifts WITHOUT quoting, just dumped as columns.
parse_with_app_js(csv_test4)
