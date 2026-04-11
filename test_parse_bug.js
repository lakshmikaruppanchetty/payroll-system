const fs = require('fs');

const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!DOCTYPE html><html><body>
<input type="checkbox" id="toggleBranch" />
<input type="checkbox" id="toggleBranchSummary" />
<input type="checkbox" id="toggleExtendedShifts" />
<script>
window.masterData = [{branch: "Branch A"}];
window.mapIdx = { branch: 2, s4: -1, s5: -1 };
window.saveSettings = function() { console.log('saveSettings called'); }

let hasBranchCol = (window.mapIdx && window.mapIdx.branch > -1);
let uniqueBranches = new Set(window.masterData.map(e => (e.branch || "").trim()).filter(b => b !== ""));
let hasBranch = hasBranchCol || uniqueBranches.size > 1 || window.masterData.some(e => e.branch && e.branch.trim() !== "Main Branch" && e.branch.trim() !== "Branch A" && e.branch.trim() !== "");

let settingsChanged = false;
if (hasBranch && !document.getElementById('toggleBranch').checked) {
    document.getElementById('toggleBranch').checked = true;
    document.getElementById('toggleBranchSummary').checked = true;
    settingsChanged = true;
}
if (settingsChanged) window.saveSettings();
console.log('toggleBranch checked:', document.getElementById('toggleBranch').checked);
</script>
</body></html>`, { runScripts: "dangerously" });
