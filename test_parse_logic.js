const fs = require('fs');
const js = fs.readFileSync('app.js', 'utf8');
// Check how hasBranch and hasExt evaluate for a dummy array
const masterData = [{ branch: "Branch A", s4s: "" }, { branch: "Branch  ", s4s: "10:00" }, { branch: "A", s4s: "" }];
let hasBranch = masterData.some(e => e.branch && e.branch !== "Main Branch" && e.branch !== "Branch A");
console.log("hasBranch:", hasBranch);
