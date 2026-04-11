const cell = "-";
let hasTimeMatch = cell.match(/[0-9]{1,2}[:.]?[0-9]{0,2}\s*(am|pm|AM|PM)?\s*(to|-)\s*[0-9]{1,2}[:.]?[0-9]{0,2}\s*(am|pm|AM|PM)?/);

console.log("hasTimeMatch", hasTimeMatch);

const extractMultipleShifts = (val) => {
    // mock
    return [];
};
const extractShift = (val) => {
    // mock
    return ["", ""];
};

const cols = ["2026-05-15", "Alice", "A", "10:00-11:00", "-", "8.0", "25.0", "200.0"];

let rawShifts = [];
let potentialRates = [];

for (let k = 3; k < cols.length; k++) {
    let cell = cols[k];
    if (!cell || cell === '-') {
        if (k >= 3 && k <= 7) {
            rawShifts.push(["", ""]);  // IF we preserved blanks
        }
        // Actually wait, if we are looping all columns, how do we correctly pad the shifts?
        // If we just loop through and find shifts, we squeeze out the blank ones!
        // That means "Shift 3" might become "Shift 2".
    }
}
