const fs = require('fs');

const rawText = `Date,Employee,Branch,Shift 1,Shift 2,Shift 3,Shift 4,Shift 5,Total Hrs,Hourly Rate,Total Pay
2026-05-15,Alice,A,10:00 AM - 1:00 PM,2:00 PM - 3:00 PM,4:00 PM - 5:00 PM,6:00 PM - 7:00 PM,8:00 PM - 9:00 PM,5.0,25.0,125.0
2026-05-16,Bob,A,10:00-11:00,12:00-13:00,14:00-15:00,,,,,25.0,75.0`;

const rows = [];
let inQ = false;
let currentLine = "";
for (let i = 0; i < rawText.length; i++) {
    const char = rawText[i];
    if (char === '"') inQ = !inQ;

    if (char === '\n' && !inQ) {
        if (currentLine.trim()) rows.push(currentLine);
        currentLine = "";
    } else if (char === '\r' && !inQ) {
        if (rawText[i + 1] === '\n') i++;
        if (currentLine.trim()) rows.push(currentLine);
        currentLine = "";
    } else {
        currentLine += char;
    }
}
if (currentLine.trim()) rows.push(currentLine);

let isNewFormat = false;
let mapIdx = null;

if (rows.length > 0) {
    const headStr = rows[0].replace(/"/g, '').trim().toLowerCase();
    if (headStr.startsWith('date')) {
        isNewFormat = true;
        mapIdx = { s4: -1, s5: -1, rate: -1 };
        let hCols = rows[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/"/g, '').trim().toLowerCase());
        mapIdx.date = hCols.findIndex(h => h.includes('date'));
        mapIdx.name = hCols.findIndex(h => h.includes('employee') || h.includes('name'));
        mapIdx.branch = hCols.findIndex(h => h.includes('branch'));
        mapIdx.s1 = hCols.findIndex(h => h.includes('shift 1') || h.includes('s1') || h.includes('shift1'));
        mapIdx.s2 = hCols.findIndex(h => h.includes('shift 2') || h.includes('s2') || h.includes('shift2'));
        mapIdx.s3 = hCols.findIndex(h => h.includes('shift 3') || h.includes('s3') || h.includes('shift3'));
        mapIdx.s4 = hCols.findIndex(h => h.includes('shift 4') || h.includes('s4') || h.includes('shift4'));
        mapIdx.s5 = hCols.findIndex(h => h.includes('shift 5') || h.includes('s5') || h.includes('shift5'));
        mapIdx.rate = hCols.findIndex(h => h.includes('rate'));
    }
}

console.log("MapIdx:", mapIdx);

const clean = (v) => v ? v.replace(/"/g, '').trim() : "";

function formatDate(str_val) {
    if (!str_val) return "";
    let p;
    if (str_val.includes('/')) p = str_val.split('/');
    else if (str_val.includes('-')) p = str_val.split('-');
    else return str_val;
    if (p.length !== 3) return str_val;

    let y = parseInt(p[2], 10);
    if (y < 100) y += 2000;

    // Assumes M/D/Y or M-D-Y format generally in USA, but if it looks like Y-M-D it leaves it.
    if (str_val.includes('-') && p[0].length === 4) {
        return `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`;
    }
    return `${y.toString()}-${p[0].padStart(2, '0')}-${p[1].padStart(2, '0')}`;
}

function timeTo24(str_val) {
    if (!str_val || str_val.length < 3) return str_val;
    let up = str_val.toUpperCase();
    if (!up.includes('AM') && !up.includes('PM')) {
        let cleanStr = str_val.replace(/[^0-9:]/g, '');
        return cleanStr.length > 0 ? cleanStr : str_val;
    }
    let parts = str_val.replace(/[^0-9:]/g, '').split(':');
    if (parts.length !== 2) return str_val;
    let h1 = parseInt(parts[0], 10);
    let m1 = parseInt(parts[1], 10);
    if (up.includes('PM') && h1 !== 12) h1 += 12;
    if (up.includes('AM') && h1 === 12) h1 = 0;
    return [h1.toString().padStart(2, '0'), m1.toString().padStart(2, '0')].join(':');
}

const extractShift = (val) => {
    let v = clean(val);
    if (!v || v === '-') return ["", ""];
    v = v.replace(/\n|\r/g, ' '); // simple collapse as fallback natively
    let match = v.match(/^(.*?)\s*-\s*(.*)$/);
    if (!match) match = v.match(/^(.*?)\s*to\s*(.*)$/);
    if (match) return [timeTo24(match[1].trim()), timeTo24(match[2].trim())];
    let parts = v.split('-');
    if (parts.length === 1) return [timeTo24(parts[0].trim()), ""];
    return [timeTo24(parts[0].trim()), timeTo24(parts[1].trim())];
};

const extractMultipleShifts = (val) => {
    let v = clean(val);
    if (!v || v === '-') return [];
    let shifts = v.split(/[\n,;]+/);
    let res = [];
    shifts.forEach(s => {
        let ss = s.trim();
        if (!ss || ss === '-') return;
        let m = ss.match(/(.*?)\s*-\s*(.*)/);
        if (!m) m = ss.match(/(.*?)\s*to\s*(.*)/);
        if (m) res.push([timeTo24(m[1].trim()), timeTo24(m[2].trim())]);
        else {
            let p = ss.split('-');
            if (p.length === 1) res.push([timeTo24(p[0].trim()), ""]);
            else res.push([timeTo24(p[0].trim()), timeTo24(p[1].trim())]);
        }
    });
    return res.filter(r => r[0] || r[1]);
};

for (let i = 1; i < rows.length; i++) {
    const cols = [];
    let inQuotes = false, current = "";
    for (let j = 0; j < rows[i].length; j++) {
        const char = rows[i][j];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) { cols.push(current); current = ""; }
        else current += char;
    }
    cols.push(current);

    let name, rate, date, branch, s1, s2, s3, s4 = [""], s5 = [""];

    if (mapIdx && mapIdx.date > -1) {
        date = formatDate(clean(cols[mapIdx.date]));
        name = mapIdx.name > -1 ? clean(cols[mapIdx.name]) : clean(cols[1]);
        branch = mapIdx.branch > -1 ? clean(cols[mapIdx.branch]) : (clean(cols[2]) || "Branch A");

        let combinedStr = mapIdx.s1 > -1 ? cols[mapIdx.s1] : cols[3];
        let multi = extractMultipleShifts(combinedStr);
        if (multi.length > 1) {
            console.log("Multi fallback triggered. len=", multi.length);
            s1 = multi[0] || ["", ""];
            s2 = multi[1] || ["", ""];
            s3 = multi[2] || ["", ""];
            s4 = multi[3] || ["", ""];
            s5 = multi[4] || ["", ""];
        } else {
            // BUG: what if cols[mapIdx.s2] is present but undefined mapping? mapIdx.s2 could be -1!
            s1 = mapIdx.s1 > -1 && cols[mapIdx.s1] ? extractShift(cols[mapIdx.s1]) : extractShift(cols[3]);
            s2 = mapIdx.s2 > -1 && cols[mapIdx.s2] !== undefined ? extractShift(cols[mapIdx.s2]) : (cols.length > 4 ? extractShift(cols[4]) : ["", ""]);
            s3 = mapIdx.s3 > -1 && cols[mapIdx.s3] !== undefined ? extractShift(cols[mapIdx.s3]) : (cols.length > 5 ? extractShift(cols[5]) : ["", ""]);
            if (mapIdx.s4 > -1 && cols[mapIdx.s4] !== undefined) s4 = extractShift(cols[mapIdx.s4]);
            if (mapIdx.s5 > -1 && cols[mapIdx.s5] !== undefined) s5 = extractShift(cols[mapIdx.s5]);
        }

        let r = mapIdx.rate > -1 && cols[mapIdx.rate] !== undefined ? clean(cols[mapIdx.rate]) : "";
        if (!r && cols.length >= 7) {
            console.log("Fallback rate activated, using heuristic");
            if (mapIdx.s5 > -1 && cols[mapIdx.s5 + 1] !== undefined) r = clean(cols[mapIdx.s5 + 1]);
            else if (mapIdx.s3 > -1 && cols[mapIdx.s3 + 1] !== undefined) r = clean(cols[mapIdx.s3 + 1]);
            else r = clean(cols[6]);
        }
        if (r && r.replace(/[0-9.]/g, '').length > 0) r = r.replace(/[^0-9.]/g, '');
        rate = parseFloat(r) || 0;
    }

    console.log("Row", i, { s1, s2, s3, s4, s5, rate });
}
