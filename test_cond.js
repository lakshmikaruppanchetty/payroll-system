let mapIdx = { branch: 2 };
let hasBranchCol = (mapIdx && mapIdx.branch > -1);
console.log("hasBranchCol:", hasBranchCol);

let rows = ["Date,Employee,Branch,Shift 1,Shift 2,Shift 3,Total Hours,Hourly Rate,Total Pay"];
let mapIdx2 = null;
let headStr = rows[0].replace(/"/g, '').trim().toLowerCase();
if (headStr.includes('date') || headStr.includes('employee')) {
    mapIdx2 = {};
    let hCols = rows[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/"/g, '').trim().toLowerCase());
    mapIdx2.branch = hCols.findIndex(h => h.includes('branch'));
}
console.log("mapIdx2.branch:", mapIdx2.branch);

let hasBranchCol2 = (mapIdx2 && mapIdx2.branch > -1);
console.log("hasBranchCol2:", hasBranchCol2);
