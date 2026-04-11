const fs = require('fs');
const js = fs.readFileSync('app.js', 'utf8');

global.masterData = [];
global.appSettings = {};
global.document = {
    getElementById: function(id) {
        if (!this.elements) this.elements = {};
        if (!this.elements[id]) this.elements[id] = { checked: false, value: '', style: {} };
        return this.elements[id];
    }
};
global.alert = console.log;
global.confirm = () => false;
global.localStorage = { setItem: () => {} };
global.saveSettings = function() { console.log("saveSettings CALLED."); };
global.renderAll = function() { console.log("renderAll CALLED."); };
global.calcH = (s, e) => 0;

let funcStr = js.substring(js.indexOf('window.processPayrollCSV = function'), js.indexOf('window.importAuditCSV'));
eval(funcStr);

const testCSV = `"Date","Employee","Branch","Shift 1","Shift 2","Shift 3","Total Hours","Hourly Rate","Total Pay"\n"2026-05-15","Alice","Branch B","10:00-11:00","","","1.0","25.0","25.0"`;
processPayrollCSV(testCSV);

console.log("toggleBranch checked == ", document.getElementById("toggleBranch").checked);
