let masterData = JSON.parse(localStorage.getItem("payroll_v20")) || [];
let appSettings = JSON.parse(localStorage.getItem("settings_v20")) || {};
appSettings.showBranch = appSettings.showBranch ?? false;
appSettings.showSummary = appSettings.showSummary ?? false;
appSettings.showPdf = appSettings.showPdf ?? true;
appSettings.showCsv = appSettings.showCsv ?? true;
appSettings.showExportPdf = appSettings.showExportPdf ?? true;
appSettings.showLogo = appSettings.showLogo ?? false;
appSettings.companyLogo = appSettings.companyLogo ?? null;
appSettings.minRate = appSettings.minRate ?? 15;
appSettings.maxRate = appSettings.maxRate ?? 35;
appSettings.ocrEngine = appSettings.ocrEngine ?? 'free';
appSettings.llmApiKey = appSettings.llmApiKey ?? '';
appSettings.geminiApiKey = appSettings.geminiApiKey ?? '';
appSettings.securityPin = appSettings.securityPin ?? '1234';
appSettings.lastBackupDate = appSettings.lastBackupDate ?? null;
let editingId = null; let selectedId = null;
let employeeChartInstance = null;
let branchChartInstance = null;

window.getCurrencySymbol = function () {
    let pref = localStorage.getItem("preferredCurrency_v20");
    if (!pref) return "$";
    if (pref === "custom") return localStorage.getItem("customCurrency_v20") || "$";
    return pref;
};

window.handleCurrencyChange = function () {
    const val = document.getElementById("currencySelect").value;
    localStorage.setItem("preferredCurrency_v20", val);
    if (val === "custom") {
        document.getElementById("customCurrencyContainer").style.display = "block";
    } else {
        document.getElementById("customCurrencyContainer").style.display = "none";
        renderAll();
    }
    updateCurrencyLabels();
};

window.saveCustomCurrency = function () {
    localStorage.setItem("customCurrency_v20", document.getElementById("customCurrencyInput").value);
    renderAll();
    updateCurrencyLabels();
};

window.updateCurrencyLabels = function () {
    const sym = getCurrencySymbol();
    document.querySelectorAll(".currency-label").forEach(el => el.innerText = sym);
};

window.renderRates = function () {
    const rateSelect = document.getElementById("hourlyRate");
    const bulkRateSelect = document.getElementById("bulkRateSelect");
    const cR = rateSelect.value;
    const cBR = bulkRateSelect.value;
    rateSelect.innerHTML = ""; bulkRateSelect.innerHTML = "";

    let minR = parseInt(appSettings.minRate, 10);
    let maxR = parseInt(appSettings.maxRate, 10);
    if (isNaN(minR)) minR = 15;
    if (isNaN(maxR)) maxR = 35;
    if (minR > maxR) maxR = minR;

    for (let i = minR; i <= maxR; i++) {
        let opt1 = document.createElement("option"); opt1.value = i; opt1.text = getCurrencySymbol() + i;
        let opt2 = document.createElement("option"); opt2.value = i; opt2.text = getCurrencySymbol() + i;
        if (i === 17) { opt1.selected = true; opt2.selected = true; }
        rateSelect.appendChild(opt1); bulkRateSelect.appendChild(opt2);
    }

    if (cR && cR >= minR && cR <= maxR) rateSelect.value = cR;
    if (cBR && cBR >= minR && cBR <= maxR) bulkRateSelect.value = cBR;
};

window.onload = function () {
    renderRates();
    applySettings();
    toggleClockFormat();

    if (masterData.length > 0) {
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const cm = todayStr.substring(0, 7);
        const hasToday = masterData.some(e => e.date === todayStr);

        if (!hasToday) {
            const latestDate = masterData.reduce((max, e) => e.date > max ? e.date : max, "0000-00-00");
            if (latestDate.startsWith(cm)) {
                document.getElementById("dateFilterPreset").value = "current_month";
            } else if (latestDate !== "0000-00-00") {
                document.getElementById("dateFilterPreset").value = "custom";
                document.getElementById("customDateInputs").style.display = "flex";
                const lY = latestDate.substring(0, 4);
                const lM = latestDate.substring(5, 7);
                document.getElementById("filterStartDate").value = `${lY}-${lM}-01`;
                const lastDay = new Date(lY, parseInt(lM, 10), 0).getDate();
                document.getElementById("filterEndDate").value = `${lY}-${lM}-${String(lastDay).padStart(2, '0')}`;
            } else {
                document.getElementById("dateFilterPreset").value = "current_month";
            }
        } else {
            document.getElementById("dateFilterPreset").value = "today";
        }
    }

    applyDatePreset();
    if (typeof renderBackupReminder === "function") renderBackupReminder();

    if (!localStorage.getItem("onboardingComplete_v20")) {
        startUserTour();
    }
};

let currentTourStep = 0;
const tourSteps = [
    {
        tab: 'settings',
        targetId: 'logoUploadSection',
        title: "Branding",
        text: "Start by making it yours! Upload your company logo here."
    },
    {
        tab: 'payroll',
        targetId: 'setupCard',
        title: "Setup",
        text: "Add your team and branch locations to get started."
    },
    {
        tab: 'payroll',
        targetId: 'dummyTourRow',
        title: "Efficiency",
        text: "Save time by duplicating previous records with one click."
    },
    {
        tab: 'payroll',
        targetId: 'btnExportCsv',
        title: "Safety",
        text: "Always export your data at the end of the week to keep a safe backup."
    },
    {
        tab: 'settings',
        targetId: 'featureTogglesCard',
        title: "Customization",
        text: "You can toggle visibility of any module here to clean up your dashboard."
    },
    {
        tab: 'reports',
        targetId: 'employeeGraphCard',
        title: "Analytics",
        text: "Click any chart to automatically expand it into presentation mode."
    },
    {
        tab: 'about',
        targetId: 'aboutAppCard',
        title: "You're All Set!",
        text: "You can replay this tour anytime from the About pane. Enjoy!"
    }
];

window.startUserTour = function () {
    document.getElementById('tourOverlay').style.display = 'block';
    document.getElementById('tourBox').style.display = 'block';
    currentTourStep = 0;
    renderTourStep();
};

window.nextTourStep = function () {
    clearTourHighlight();
    currentTourStep++;
    if (currentTourStep >= tourSteps.length) {
        endTour();
    } else {
        renderTourStep();
    }
};

window.endTour = function () {
    clearTourHighlight();
    document.getElementById('tourOverlay').style.display = 'none';
    document.getElementById('tourBox').style.display = 'none';
    localStorage.setItem("onboardingComplete_v20", "true");
};

function clearTourHighlight() {
    document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
        if (el.id === 'floatingDupBtn') {
            el.style.display = 'none';
            el.style.top = '';
            el.style.left = '';
            el.style.transform = '';
        }
        if (el.id === 'dailyTable') {
            el.style.background = '';
            el.style.position = '';
        }
    });

    const dummyrow = document.getElementById("dummyTourRow");
    if (dummyrow) dummyrow.remove();
}

function renderTourStep() {
    const step = tourSteps[currentTourStep];
    switchTab(step.tab);

    setTimeout(() => {
        let el = document.getElementById(step.targetId);

        if (step.targetId === 'dummyTourRow') {
            const tbody = document.getElementById("dailyTableBody");
            const tr = document.createElement("tr");
            tr.id = "dummyTourRow";
            tr.className = "selected";
            tr.style.background = "#e8f4f8";
            tr.innerHTML = `<td>Sample Date</td><td>Sample Branch</td><td>09:00 - 17:00</td><td>--</td><td>--</td><td>8.00</td><td>${getCurrencySymbol()}20.00</td><td>${getCurrencySymbol()}160.00</td><td><button class="btn-warning" style="margin:0; padding: 2px 5px; font-size:10px; cursor: default;">✎ Diff</button></td>`;
            if (tbody.firstChild) tbody.insertBefore(tr, tbody.firstChild);
            else tbody.appendChild(tr);

            el = document.getElementById("dailyTable");
            el.style.background = "#fff";
            el.style.position = "relative";

            const dupBtn = document.getElementById('floatingDupBtn');
            dupBtn.style.display = 'block';
            dupBtn.style.setProperty('z-index', '10008', 'important'); // Ensure floating button natively pierces !important class override
            dupBtn.classList.add('tour-highlight');

            // Wait for smooth scrolling to mostly resolve before calculating absolute document pixel layout top for the button pop
            setTimeout(() => {
                const rect = tr.getBoundingClientRect();
                dupBtn.style.left = (rect.left + rect.width / 2) + "px";
                dupBtn.style.top = (rect.top + window.scrollY - 30) + "px";
                dupBtn.style.transform = "translate(-50%, 0)";
            }, 300);
        }

        if (step.targetId === 'logoUploadSection') el = el.parentElement;

        el.classList.add('tour-highlight');
        el.scrollIntoView({ behavior: "smooth", block: "center" });

        document.getElementById('tourTitle').innerText = step.title;
        document.getElementById('tourText').innerText = step.text;

        if (currentTourStep === tourSteps.length - 1) {
            document.getElementById('tourNextBtn').innerText = "Finish Tour";
        } else {
            document.getElementById('tourNextBtn').innerText = "Next Step";
        }
    }, 150);
}

function saveSettings() {
    appSettings.showBranch = document.getElementById("toggleBranch").checked;
    appSettings.showSummary = document.getElementById("toggleSummary").checked;
    appSettings.showBranchSummary = document.getElementById("toggleBranchSummary").checked;
    appSettings.showPdf = document.getElementById("togglePdf").checked;
    appSettings.showCsv = document.getElementById("toggleCsv").checked;
    appSettings.showExportPdf = document.getElementById("toggleExportPdf").checked;
    appSettings.showLogo = document.getElementById("toggleLogo").checked;
    appSettings.ocrEngine = document.getElementById("ocrEngineSelect").value;
    appSettings.llmApiKey = document.getElementById("llmApiKey").value;
    appSettings.geminiApiKey = document.getElementById("geminiApiKey").value;
    appSettings.securityPin = document.getElementById("securityPinSetting").value || '1234';
    appSettings.minRate = parseInt(document.getElementById("minRateSetting").value, 10) || 15;
    appSettings.maxRate = parseInt(document.getElementById("maxRateSetting").value, 10) || 35;
    localStorage.setItem("settings_v20", JSON.stringify(appSettings));
    applySettings();
    renderRates();
}

function applySettings() {
    const branchDisplay = appSettings.showBranch ? "" : "none";
    document.getElementById("branchSelectDropdown").style.display = branchDisplay;
    document.getElementById("branchName").style.display = branchDisplay;
    document.getElementById("branchFilterLabel").style.display = branchDisplay;
    document.getElementById("branchFilter").style.display = branchDisplay;
    document.getElementById("hdrBranch").style.display = branchDisplay;
    document.getElementById("setupHeaderLabel").innerText = appSettings.showBranch ? "1. Employee & Branch Setup" : "1. Employee Setup";

    if (appSettings.showBranchSummary === undefined) appSettings.showBranchSummary = true;

    document.getElementById("employeeSummarySection").style.display = appSettings.showSummary ? "" : "none";
    document.getElementById("branchSummarySection").style.display = appSettings.showBranchSummary ? "" : "none";
    document.getElementById("pdfCard").style.display = appSettings.showPdf ? "" : "none";
    document.getElementById("csvCard").style.display = appSettings.showCsv ? "" : "none";

    const topRow = document.getElementById("topFlexRow");
    const botRow = document.getElementById("botFlexRow");
    const setupCard = document.getElementById("setupCard");
    const bulkCard = document.getElementById("bulkCard");
    const csvCard = document.getElementById("csvCard");
    const pdfCard = document.getElementById("pdfCard");
    const entryCard = document.getElementById("entryCard");

    // UX: Shift Clock UI to the left if the PDF Card is disabled, otherwise let it center
    entryCard.style.margin = appSettings.showPdf ? "0 auto" : "0";

    if (!appSettings.showPdf && !appSettings.showCsv) {
        topRow.appendChild(setupCard);
        topRow.appendChild(bulkCard);
        botRow.appendChild(entryCard);
    } else {
        topRow.appendChild(setupCard);
        topRow.appendChild(bulkCard);
        topRow.appendChild(csvCard);
        botRow.appendChild(pdfCard);
        botRow.appendChild(entryCard);
    }

    const bGC = document.getElementById("branchGraphCard");
    if (bGC) bGC.style.display = appSettings.showBranch ? "" : "none";

    document.getElementById("toggleBranch").checked = appSettings.showBranch;
    document.getElementById("toggleSummary").checked = appSettings.showSummary;
    document.getElementById("toggleBranchSummary").checked = appSettings.showBranchSummary;
    document.getElementById("togglePdf").checked = appSettings.showPdf;
    document.getElementById("toggleCsv").checked = appSettings.showCsv;
    document.getElementById("toggleExportPdf").checked = appSettings.showExportPdf;
    document.getElementById("btnExportPdf").style.display = appSettings.showExportPdf ? "" : "none";
    document.getElementById("toggleLogo").checked = appSettings.showLogo;

    let engine = appSettings.ocrEngine;
    if (engine === 'llm') engine = 'openai';
    document.getElementById("ocrEngineSelect").value = engine;

    document.getElementById("llmApiSection").style.display = engine === 'openai' ? 'flex' : 'none';
    document.getElementById("geminiApiSection").style.display = engine === 'gemini' ? 'flex' : 'none';

    document.getElementById("llmApiKey").value = appSettings.llmApiKey || "";
    document.getElementById("geminiApiKey").value = appSettings.geminiApiKey || "";
    document.getElementById("securityPinSetting").value = appSettings.securityPin;
    document.getElementById("minRateSetting").value = appSettings.minRate;
    document.getElementById("maxRateSetting").value = appSettings.maxRate;

    const logoContainer = document.getElementById("logoContainer");
    const logoImg = document.getElementById("sidebarLogo");
    const logoPlaceholder = document.getElementById("sidebarLogoPlaceholder");
    const logoUploadSection = document.getElementById("logoUploadSection");

    if (appSettings.showLogo) {
        logoContainer.style.display = "block";
        logoUploadSection.style.display = "block";
        if (appSettings.companyLogo) {
            logoImg.src = appSettings.companyLogo;
            logoImg.style.display = "inline-block";
            logoPlaceholder.style.display = "none";
        } else {
            logoImg.style.display = "none";
            logoPlaceholder.style.display = "block";
        }
    } else {
        logoContainer.style.display = "none";
        logoUploadSection.style.display = "none";
    }

    let pref = localStorage.getItem("preferredCurrency_v20") || "$";
    document.getElementById("currencySelect").value = pref;
    if (pref === "custom") {
        document.getElementById("customCurrencyContainer").style.display = "block";
        document.getElementById("customCurrencyInput").value = localStorage.getItem("customCurrency_v20") || "";
    } else {
        document.getElementById("customCurrencyContainer").style.display = "none";
    }
    updateCurrencyLabels();
}

function handleLogoUpload() {
    const file = document.getElementById("logoUpload").files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            appSettings.companyLogo = e.target.result;
            const display = document.getElementById("sidebarLogo");
            if (display) display.src = e.target.result;
            saveSettings();
        };
        reader.readAsDataURL(file);
    }
}

function clearLogo() {
    appSettings.companyLogo = null;
    document.getElementById("logoUpload").value = "";
    saveSettings();
}

function switchTab(tab) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar-menu li').forEach(el => el.classList.remove('active'));
    document.getElementById(tab + 'View').classList.add('active');
    document.getElementById('menu' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');

    const shared = document.getElementById("sharedFilters");
    if (shared) {
        if (tab === 'payroll') {
            document.getElementById("payrollFiltersContainer").appendChild(shared);
        } else if (tab === 'reports') {
            document.getElementById("reportsFiltersContainer").appendChild(shared);
        }
    }

    if (tab === 'reports') {
        setTimeout(() => renderAll(), 50); // delay to let display:block apply fully
    }

    if (window.innerWidth <= 768) {
        document.getElementById("sidebar").classList.remove("mobile-open");
    }
}

function toggleSidebar() {
    if (window.innerWidth <= 768) {
        document.getElementById("sidebar").classList.toggle("mobile-open");
    } else {
        document.getElementById("sidebar").classList.toggle("collapsed");
    }
}

window.handleGlobalClick = function (e) {
    if (!e.target.closest('tr') && !e.target.closest('button') && !e.target.closest('.card')) {
        let activeRow = document.querySelector('tr.selected');
        if (activeRow) {
            activeRow.classList.remove('selected');
            selectedId = null;
            document.getElementById("floatingDupBtn").style.display = "none";
        }
    }
};

window.clearDateFilter = function () {
    document.getElementById("dateFilterPreset").value = "custom";
    document.getElementById("customDateInputs").style.display = "flex";
    document.getElementById("filterStartDate").value = "";
    document.getElementById("filterEndDate").value = "";
    renderAll();
};

window.applyDatePreset = function () {
    const preset = document.getElementById("dateFilterPreset").value;
    const customInputs = document.getElementById("customDateInputs");
    const startDate = document.getElementById("filterStartDate");
    const endDate = document.getElementById("filterEndDate");

    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const now = new Date();

    if (preset === "today") {
        customInputs.style.display = "none";
        startDate.value = formatDate(now);
        endDate.value = formatDate(now);
    } else if (preset === "current_month") {
        customInputs.style.display = "none";
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startDate.value = formatDate(firstDay);
        endDate.value = formatDate(lastDay);
    } else if (preset === "last_month") {
        customInputs.style.display = "none";
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
        startDate.value = formatDate(firstDay);
        endDate.value = formatDate(lastDay);
    } else if (preset === "custom") {
        customInputs.style.display = "flex";
    }
    renderAll();
};

window.selectRow = function (id, event) {
    event.stopPropagation(); selectedId = id; renderAll();
    const btn = document.getElementById("floatingDupBtn");
    btn.style.display = "block"; btn.style.left = (event.pageX + 10) + "px"; btn.style.top = (event.pageY - 20) + "px";
};

window.duplicateSelected = function (event) {
    event.stopPropagation();
    const e = masterData.find(x => x.id === selectedId);
    if (e) {
        document.getElementById("empName").value = e.name; document.getElementById("branchName").value = e.branch;
        document.getElementById("s1start").value = e.s1s; document.getElementById("s1end").value = e.s1e;
        document.getElementById("s2start").value = e.s2s; document.getElementById("s2end").value = e.s2e;
        document.getElementById("s3start").value = e.s3s; document.getElementById("s3end").value = e.s3e;
        document.getElementById("hourlyRate").value = e.rate;
        window.scrollTo(0, 0); selectedId = null; document.getElementById("floatingDupBtn").style.display = "none"; renderAll();
    }
};

window.addEntry = function () {
    const name = document.getElementById("empName").value;
    const date = document.getElementById("workDate").value;
    const branchInput = document.getElementById("branchName").value;
    const branch = appSettings.showBranch ? branchInput : (branchInput || "Main Branch");

    if (!name || !date || !branch) return alert("Fill Name, Date" + (appSettings.showBranch ? ", and Branch." : "."));
    const dup = masterData.find(e => e.name === name && e.date === date);
    if (dup && editingId !== dup.id) {
        if (dup.branch !== branch) {
            if (confirm(`Employee "${name}" already has a shift on ${date} at branch [${dup.branch}].\nDo you want to MERGE these new shifts into that existing record?\n(Click Cancel to create a separate shift log for branch [${branch}])`)) {
                const ns1s = document.getElementById("s1start").value;
                const ns1e = document.getElementById("s1end").value;
                if (!dup.s2s && ns1s) { dup.s2s = ns1s; dup.s2e = ns1e; }
                else if (!dup.s3s && ns1s) { dup.s3s = ns1s; dup.s3e = ns1e; }
                dup.total = calcH(dup.s1s, dup.s1e) + calcH(dup.s2s, dup.s2e) + calcH(dup.s3s, dup.s3e);
                dup.pay = (dup.total * dup.rate).toFixed(2);
                localStorage.setItem("payroll_v20", JSON.stringify(masterData));
                resetShifts(); renderAll(); return;
            }
        } else {
            if (confirm(`Existing record on ${date}. Edit?`)) editEntry(dup.id); return;
        }
    }
    if (editingId && !confirm(`Update record?`)) return;
    const h = calcH(document.getElementById("s1start").value, document.getElementById("s1end").value) + calcH(document.getElementById("s2start").value, document.getElementById("s2end").value) + calcH(document.getElementById("s3start").value, document.getElementById("s3end").value);
    const rate = parseFloat(document.getElementById("hourlyRate").value);
    const entry = { id: editingId || Date.now(), name, date, branch, s1s: document.getElementById("s1start").value, s1e: document.getElementById("s1end").value, s2s: document.getElementById("s2start").value, s2e: document.getElementById("s2end").value, s3s: document.getElementById("s3start").value, s3e: document.getElementById("s3end").value, total: h, rate, pay: (h * rate).toFixed(2) };
    if (editingId) masterData = masterData.filter(e => e.id !== editingId);
    masterData.push(entry); localStorage.setItem("payroll_v20", JSON.stringify(masterData));

    // Automatically ensure the newly saved entry is visible in the current filter bounds
    let sD = document.getElementById("filterStartDate").value;
    let eD = document.getElementById("filterEndDate").value;
    let empF = document.getElementById("viewFilter").value;
    let brF = document.getElementById("branchFilter").value;
    let changedFilter = false;

    if (sD && date < sD) { document.getElementById("filterStartDate").value = date; changedFilter = true; }
    if (eD && date > eD) { document.getElementById("filterEndDate").value = date; changedFilter = true; }
    if (empF !== "ALL" && empF !== name) { document.getElementById("viewFilter").value = "ALL"; changedFilter = true; }
    if (brF !== "ALL" && brF !== branch) { document.getElementById("branchFilter").value = "ALL"; changedFilter = true; }

    if (changedFilter) {
        document.getElementById("dateFilterPreset").value = "custom";
        document.getElementById("customDateInputs").style.display = "flex";
    }

    editingId = null; resetShifts(); renderAll();
};

window.importCSV = function () {
    const fileInput = document.getElementById('csvImport'); if (!fileInput.files[0]) return;
    const isExcel = fileInput.files[0].name.toLowerCase().endsWith('.xlsx');

    const processCSVText = (text) => {
        try {
            const rows = text.split(/\r?\n/).filter(r => r.trim()); let aC = 0, uC = 0;

            let isNewFormat = false;
            let headerCheck = "";
            if (rows.length > 0) {
                headerCheck = rows[0].replace(/["\s]/g, '').toLowerCase();
                if (headerCheck.includes('date,employee') || headerCheck.includes('date,name') || headerCheck.startsWith('date,')) {
                    isNewFormat = true;
                }
            }
            if (!isNewFormat && rows.length > 1) {
                const firstDataCols = rows[1].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                if (firstDataCols[0]) {
                    let c0 = firstDataCols[0].replace(/["\s]/g, '');
                    if (c0.includes('-') || c0.includes('/')) {
                        let numerals = c0.replace(/[^0-9]/g, '');
                        if (numerals.length >= 4 && numerals.length <= 8) {
                            isNewFormat = true;
                        }
                    }
                }
            }

            let askMerge = null;

            for (let i = 1; i < rows.length; i++) {
                if (rows[i].includes("Summary Data") || rows[i].includes("Employee,Branch,")) continue;

                const cols = [];
                let inQuotes = false, current = "";
                for (let j = 0; j < rows[i].length; j++) {
                    const char = rows[i][j];
                    if (char === '"') inQuotes = !inQuotes;
                    else if (char === ',' && !inQuotes) { cols.push(current); current = ""; }
                    else current += char;
                }
                cols.push(current);
                if (cols.length < 5) continue;
                const clean = (v) => v ? v.replace(/"/g, '').trim() : "";

                let name, rate, date, branch, s1, s2, s3;

                const normalizeDate = (dStr) => {
                    if (dStr.includes('/')) {
                        const parts = dStr.split('/');
                        if (parts.length >= 3) {
                            let p1 = parseInt(parts[0], 10) || 1;
                            let p2 = parseInt(parts[1], 10) || 1;
                            let y = parts[2].trim();
                            let m = '', d = '';
                            if (p1 > 12) {
                                m = p2.toString().padStart(2, '0');
                                d = p1.toString().padStart(2, '0');
                            } else {
                                m = p1.toString().padStart(2, '0');
                                d = p2.toString().padStart(2, '0');
                            }
                            if (y.length === 2 && parseInt(y) >= 0) y = parseInt(y) + 2000 + "";
                            return `${y}-${m}-${d}`;
                        }
                    } else if (dStr.includes('-')) {
                        const parts = dStr.split('-');
                        if (parts.length >= 3 && parts[0].length !== 4) {
                            let p1 = parseInt(parts[0], 10) || 1;
                            let p2 = parseInt(parts[1], 10) || 1;
                            let y = parts[2].trim();
                            let m = '', d = '';
                            if (p1 > 12) { m = p2.toString().padStart(2, '0'); d = p1.toString().padStart(2, '0'); }
                            else { m = p1.toString().padStart(2, '0'); d = p2.toString().padStart(2, '0'); }
                            if (y.length === 2 && parseInt(y) >= 0) y = parseInt(y) + 2000 + "";
                            return `${y}-${m}-${d}`;
                        }
                    }
                    return dStr;
                };

                if (isNewFormat) {
                    date = normalizeDate(clean(cols[0]));
                    name = clean(cols[1]);
                    branch = clean(cols[2]) || "Branch A";
                    s1 = clean(cols[3]).split('-');
                    s2 = clean(cols[4]).split('-');
                    s3 = clean(cols[5]).split('-');
                    let r = clean(cols[7]);
                    if (r && r.replace(/[0-9.]/g, '').length > 0) r = r.replace(/[^0-9.]/g, '');
                    rate = parseFloat(r) || 0;
                } else {
                    name = clean(cols[0]);
                    rate = parseFloat(clean(cols[1])) || 0;
                    date = normalizeDate(clean(cols[2]));
                    s1 = clean(cols[3]).split('-');
                    s2 = clean(cols[4]).split('-');
                    s3 = clean(cols[5]).split('-');
                    branch = clean(cols[8]) || "Branch A";
                }

                const h = calcH(s1[0], s1[1]) + calcH(s2[0], s2[1]) + calcH(s3[0], s3[1]);
                const entry = { id: Date.now() + i, name, date, branch, s1s: s1[0] || "", s1e: s1[1] || "", s2s: s2[0] || "", s2e: s2[1] || "", s3s: s3[0] || "", s3e: s3[1] || "", total: h, rate, pay: (h * rate).toFixed(2) };

                const exIdx = masterData.findIndex(ex => ex.name === name && ex.date === date);
                if (exIdx > -1) {
                    if (masterData[exIdx].branch !== branch) {
                        if (askMerge === null) {
                            askMerge = confirm(`Data contains overlapping dates on different branches. Do you want to MERGE overlapping shifts into single entries? (Cancel generates separate rows per branch)`);
                        }
                        if (askMerge) {
                            let old = masterData[exIdx];
                            if (!old.s2s && s1[0]) { old.s2s = s1[0] || ""; old.s2e = s1[1] || ""; }
                            else if (!old.s3s && s1[0]) { old.s3s = s1[0] || ""; old.s3e = s1[1] || ""; }
                            old.total = calcH(old.s1s, old.s1e) + calcH(old.s2s, old.s2e) + calcH(old.s3s, old.s3e);
                            old.pay = (old.total * old.rate).toFixed(2);
                            uC++;
                        } else {
                            masterData.push(entry); aC++;
                        }
                    } else {
                        masterData[exIdx] = entry; uC++;
                    }
                } else {
                    masterData.push(entry); aC++;
                }
            }
            localStorage.setItem("payroll_v20", JSON.stringify(masterData)); renderAll(); alert(`Synced: ${aC} new, ${uC} updated/merged.`);
        } catch (e) { alert("Format Error: " + e.message); }
        fileInput.value = '';
    };

    if (isExcel) {
        if (typeof XLSX === 'undefined') {
            alert('Excel parser library not loaded. Please ensure you are connected to the internet.');
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const firstSheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheet];
            const csv = XLSX.utils.sheet_to_csv(worksheet, { dateNF: 'yyyy-mm-dd' });
            processCSVText(csv);
        };
        reader.readAsArrayBuffer(fileInput.files[0]);
    } else {
        const reader = new FileReader();
        reader.onload = function (e) {
            processCSVText(e.target.result);
        };
        reader.readAsText(fileInput.files[0]);
    }
};

window.updateFilter = function () {
    const vEmp = document.getElementById("viewFilter").value;
    const vBranch = document.getElementById("branchFilter").value;

    if (vEmp === "ALL") {
        document.getElementById("empName").value = "";
    } else {
        document.getElementById("empName").value = vEmp;
    }

    if (vBranch === "ALL") {
        document.getElementById("branchName").value = "";
    } else {
        document.getElementById("branchName").value = vBranch;
    }

    renderAll();
};

window.renderAll = function () {
    const dailyBody = document.getElementById("dailyTableBody"); const summaryBody = document.querySelector("#summaryTable tbody");
    const vEmp = document.getElementById("viewFilter").value; const vBranch = document.getElementById("branchFilter").value;
    dailyBody.innerHTML = ""; summaryBody.innerHTML = "";
    let hasS3 = masterData.some(e => e.s3s && e.s3s.length >= 4); document.getElementById("shift3Header").style.display = hasS3 ? "" : "none";
    masterData.sort((a, b) => a.name.localeCompare(b.name) || a.date.localeCompare(b.date));
    const emps = [...new Set(masterData.map(e => e.name))], branches = [...new Set(masterData.map(e => e.branch))];
    const eS = document.getElementById("empSelect"), bS = document.getElementById("branchSelectDropdown"), bET = document.getElementById("bulkEmpTarget");
    const cE = eS.value, cB = bS.value, cBET = bET.value;
    eS.style.display = emps.length <= 1 ? "none" : "";
    eS.innerHTML = '<option value="">-- Select Employee --</option>';
    document.getElementById("viewFilter").innerHTML = emps.length > 1 || emps.length === 0 ? '<option value="ALL">All Employees</option>' : '';
    bET.innerHTML = emps.length > 1 ? '<option value="ALL">ALL Employees</option><option value="SELECTED">Selected Only</option>' : '<option value="SELECTED">Selected Only</option>';
    if (cBET && Array.from(bET.options).some(o => o.value === cBET)) bET.value = cBET;

    emps.forEach(n => { eS.innerHTML += `<option value="${n}">${n}</option>`; document.getElementById("viewFilter").innerHTML += `<option value="${n}">${n}</option>`; });
    bS.innerHTML = '<option value="">-- Select Branch --</option>'; document.getElementById("branchFilter").innerHTML = '<option value="ALL">All Branches</option>';
    branches.forEach(b => { bS.innerHTML += `<option value="${b}">${b}</option>`; document.getElementById("branchFilter").innerHTML += `<option value="${b}">${b}</option>`; });

    if (emps.length === 1) {
        eS.value = emps[0];
        document.getElementById("viewFilter").value = emps[0];
        if (!document.getElementById("empName").value) document.getElementById("empName").value = emps[0];
    } else {
        eS.value = (cE === "ALL" || !cE) ? "" : cE;
        document.getElementById("viewFilter").value = vEmp;
    }
    bS.value = (cB === "ALL" || !cB) ? "" : cB;
    document.getElementById("branchFilter").value = vBranch;

    let fStart = document.getElementById("filterStartDate").value;
    let fEnd = document.getElementById("filterEndDate").value;

    let display = masterData.filter(e => {
        let matchEmp = (vEmp === "ALL" || e.name === vEmp);
        let matchBranch = (vBranch === "ALL" || e.branch === vBranch);

        let matchDate = true;
        if (fStart || fEnd) {
            let rowDate = new Date(e.date);
            if (fStart) {
                let startDate = new Date(fStart);
                if (rowDate < startDate) matchDate = false;
            }
            if (fEnd) {
                let endDate = new Date(fEnd);
                if (rowDate > endDate) matchDate = false;
            }
        }
        return matchEmp && matchBranch && matchDate;
    });
    let curE = "";
    display.forEach(e => {
        if (e.name !== curE) {
            curE = e.name; let ent = display.filter(x => x.name === e.name);
            let h = ent.reduce((s, c) => s + c.total, 0), p = ent.reduce((s, c) => s + parseFloat(c.pay), 0);
            const brText = appSettings.showBranch ? ` (${e.branch}) ` : ' ';
            dailyBody.innerHTML += `<tr class="emp-separator-bar"><td colspan="${hasS3 ? 9 : 8}">${e.name}${brText}| Cumulative: ${decToT(h)} | Pay: ${getCurrencySymbol()}${p.toFixed(2)}</td></tr>`;
        }
        const d = e.date.split('-').slice(1).concat(e.date.split('-')[0]).join('-');
        const brCell = appSettings.showBranch ? `<td>${e.branch}</td>` : '<td style="display:none"></td>';
        dailyBody.innerHTML += `<tr ${selectedId === e.id ? 'class="selected"' : ''} onclick="selectRow(${e.id}, event)"><td>${d}</td>${brCell}<td>${e.s1s}-${e.s1e}</td><td>${e.s2s}-${e.s2e}</td><td style="display:${hasS3 ? '' : 'none'}">${e.s3s ? e.s3s + '-' + e.s3e : '-'}</td><td>${decToT(e.total)}</td><td>${getCurrencySymbol()}${e.rate}</td><td>${getCurrencySymbol()}${e.pay}</td><td><button class="btn-edit-small" onclick="event.stopPropagation(); editEntry(${e.id})">Edit</button><button class="btn-danger-x" onclick="event.stopPropagation(); deleteEntry(${e.id})">×</button></td></tr>`;
    });
    const filteredEmps = [...new Set(display.map(e => e.name))];
    filteredEmps.forEach(n => {
        let ent = display.filter(x => x.name === n); let h = ent.reduce((s, c) => s + c.total, 0), p = ent.reduce((s, c) => s + parseFloat(c.pay), 0);
        if (ent.length > 0) {
            summaryBody.innerHTML += `<tr style="background:#e8f5e9; font-weight:bold;"><td style="text-align:left; padding-left:15px;">${n}</td><td style="text-align:left; padding-left:15px;">${ent[0].branch}</td><td>${decToT(h)}</td><td>${getCurrencySymbol()}${p.toFixed(2)}</td><td><button class="btn-primary" style="padding: 4px 8px; font-size: 11px; background:#17a2b8;" onclick="generatePayStub('${n}')">📄 PDF</button></td><td><button class="btn-danger-x" onclick="deleteEmployeeBulk('${n}')">Clear All</button></td></tr>`;
        }
    });

    const branchSummaryBody = document.querySelector("#branchSummaryTable tbody");
    if (branchSummaryBody) {
        branchSummaryBody.innerHTML = "";
        const filteredBranches = [...new Set(display.map(e => e.branch))];
        filteredBranches.forEach(b => {
            let ent = display.filter(x => x.branch === b);
            if (ent.length > 0) {
                let h = ent.reduce((s, c) => s + c.total, 0), p = ent.reduce((s, c) => s + parseFloat(c.pay), 0);
                branchSummaryBody.innerHTML += `<tr><td>${b}</td><td>${decToT(h)}</td><td>${getCurrencySymbol()}${p.toFixed(2)}</td><td><button class="btn-danger-x" onclick="clearBranchSecure('${b}')">Clear All</button></td></tr>`;
            }
        });
    }

    const finalBranchFilter = document.getElementById("branchFilter").value;
    const clearBtn = document.getElementById("btnClearDatabase");
    if (clearBtn) {
        if (finalBranchFilter === "ALL" || !finalBranchFilter) {
            clearBtn.innerText = "Clear Database";
            clearBtn.onclick = clearAllTablesSecure;
        } else {
            clearBtn.innerText = "Clear Branch";
            clearBtn.onclick = function () { clearBranchSecure(finalBranchFilter); };
        }
    }

    renderCharts(filteredEmps, display);
};

function renderCharts(filteredEmps, displayData) {
    const ctxEmp = document.getElementById("employeeGraph");
    const ctxBranch = document.getElementById("branchGraph");
    if (!ctxEmp || !ctxBranch || typeof Chart === 'undefined') return;

    // Prepare Day Data
    const uniqueDates = [...new Set(displayData.map(e => e.date))].sort();
    const dayLabels = uniqueDates;
    const dayData = uniqueDates.map(d => {
        let ent = displayData.filter(x => x.date === d);
        return ent.reduce((s, c) => s + c.total, 0);
    });

    if (employeeChartInstance) employeeChartInstance.destroy();
    employeeChartInstance = new Chart(ctxEmp, {
        type: 'line',
        data: {
            labels: dayLabels,
            datasets: [{
                label: 'Total Hours Worked',
                data: dayData,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { right: 20 } },
            scales: { y: { beginAtZero: true } },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            }
        }
    });

    // Prepare Branch Data
    const filteredBranches = [...new Set(displayData.map(e => e.branch))];

    // Distinct vibrant color palette for Branches
    const colorPalette = [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(199, 199, 199, 0.7)',
        'rgba(83, 211, 151, 0.7)',
        'rgba(224, 74, 150, 0.7)',
        'rgba(102, 126, 255, 0.7)'
    ];

    const branchLabels = [];
    const branchColors = [];
    const branchBorderColors = [];
    const branchData = filteredBranches.map((b, index) => {
        let ent = displayData.filter(x => x.branch === b);
        let p = ent.reduce((s, c) => s + parseFloat(c.pay), 0);
        branchLabels.push(`${b} (${getCurrencySymbol()}${p.toFixed(2)})`);
        branchColors.push(colorPalette[index % colorPalette.length]);
        branchBorderColors.push(colorPalette[index % colorPalette.length].replace('0.7', '1'));
        return p;
    });

    if (branchChartInstance) branchChartInstance.destroy();

    branchChartInstance = new Chart(ctxBranch, {
        type: 'pie',
        data: {
            labels: branchLabels,
            datasets: [{
                label: `Total Gross Pay (${getCurrencySymbol()})`,
                data: branchData,
                backgroundColor: branchColors,
                borderColor: branchBorderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { right: 20 } },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            }
        }
    });
}

window.toggleExpandChart = function (cardId) {
    const card = document.getElementById(cardId);
    const overlay = document.getElementById('chartOverlay');

    if (card.classList.contains('chart-expanded')) {
        card.classList.remove('chart-expanded');
        overlay.style.display = 'none';
        renderAll();
    } else {
        document.querySelectorAll('.chart-expanded').forEach(el => el.classList.remove('chart-expanded'));
        card.classList.add('chart-expanded');
        overlay.style.display = 'block';

        // Let CSS apply, then complete redraw so Chart.js natively registers modal size
        setTimeout(() => renderAll(), 50);
    }
};

window.closeExpandedChart = function () {
    document.querySelectorAll('.chart-expanded').forEach(el => el.classList.remove('chart-expanded'));
    const overlay = document.getElementById('chartOverlay');
    if (overlay) overlay.style.display = 'none';

    setTimeout(() => renderAll(), 50);
};

window.checkExistingShifts = function () {
    const name = document.getElementById("empName").value, date = document.getElementById("workDate").value; if (!name || !date) return;
    const e = masterData.find(x => x.name === name && x.date === date);
    if (e) {
        if (editingId && editingId === e.id) return;
        document.getElementById("s1start").value = e.s1s; document.getElementById("s1end").value = e.s1e; document.getElementById("s2start").value = e.s2s; document.getElementById("s2end").value = e.s2e; document.getElementById("s3start").value = e.s3s; document.getElementById("s3end").value = e.s3e;
        document.getElementById("hourlyRate").value = e.rate; document.getElementById("branchName").value = e.branch;
        editingId = e.id; document.getElementById("mainBtn").innerText = "Update Log";
    } else {
        // Clear old timings since there's no entry for this date
        ["s1start", "s1end", "s2start", "s2end", "s3start", "s3end"].forEach(id => { if (document.getElementById(id)) document.getElementById(id).value = ""; });
        editingId = null;
        document.getElementById("mainBtn").innerText = "Save / Update Log";
    }
};

window.executeBulkUpdate = function () {
    const t = document.getElementById("bulkEmpTarget").value, sN = document.getElementById("empName").value, nB = document.getElementById("branchName").value, nR = parseFloat(document.getElementById("bulkRateSelect").value);
    if (t === "SELECTED" && !sN) return alert("Select Employee."); if (!nB) return alert("Enter Branch.");
    if (confirm(`Apply updates?`)) {
        masterData = masterData.map(e => (t === "ALL" || e.name === sN) ? { ...e, branch: nB, rate: nR, pay: (e.total * nR).toFixed(2) } : e);
        localStorage.setItem("payroll_v20", JSON.stringify(masterData)); renderAll();
    }
};

function decToT(d) { const h = Math.floor(d), m = Math.round((d - h) * 60); return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`; }
function calcH(s, e) { if (!s || !e || s.length < 5 || e.length < 5) return 0; let [h1, m1] = s.split(':').map(Number), [h2, m2] = e.split(':').map(Number), st = h1 + (m1 / 60), en = h2 + (m2 / 60); if (en < st) en += 24; return en - st; }

window.toggleClockFormat = function () {
    const f = document.getElementById("clockToggle").value;
    let vals = {};
    for (let i = 1; i <= 3; i++) {
        vals[`s${i}start`] = document.getElementById(`s${i}start`)?.value || "";
        vals[`s${i}end`] = document.getElementById(`s${i}end`)?.value || "";
    }
    for (let i = 1; i <= 3; i++) {
        const r = document.getElementById(`s${i}_row`);
        r.innerHTML = f === "24" ? `<input type="text" id="s${i}start" class="time-input-24" placeholder="00:00" maxlength="5"> <span>to</span> <input type="text" id="s${i}end" class="time-input-24" placeholder="00:00" maxlength="5">` : `<input type="time" id="s${i}start"> <span>to</span> <input type="time" id="s${i}end">`;
    }
    if (f === "24") setupMasks();
    for (let i = 1; i <= 3; i++) {
        if (document.getElementById(`s${i}start`)) document.getElementById(`s${i}start`).value = vals[`s${i}start`];
        if (document.getElementById(`s${i}end`)) document.getElementById(`s${i}end`).value = vals[`s${i}end`];
    }
};

function setupMasks() { document.querySelectorAll('.time-input-24').forEach(i => { i.addEventListener('input', (e) => { let v = e.target.value.replace(/\D/g, ''); if (v.length >= 3) e.target.value = v.slice(0, 2) + ":" + v.slice(2, 4); else e.target.value = v; }); }); }

window.resetShifts = function () { ["s1start", "s1end", "s2start", "s2end", "s3start", "s3end"].forEach(id => { if (document.getElementById(id)) document.getElementById(id).value = ""; }); editingId = null; document.getElementById("workDate").value = ""; document.getElementById("mainBtn").innerText = "Save / Update Log"; };
window.updateNameFromDropdown = function () {
    const s = document.getElementById("empSelect");
    if (s.value !== "") {
        document.getElementById("empName").value = s.value;
        const e = [...masterData].reverse().find(x => x.name === s.value);
        if (e && e.branch) {
            document.getElementById("branchName").value = e.branch;
            if (document.getElementById("branchSelectDropdown")) document.getElementById("branchSelectDropdown").value = e.branch;
        }
        checkExistingShifts();
        renderAll();
    }
};
window.updateBranchFromDropdown = function () { const s = document.getElementById("branchSelectDropdown"); if (s.value !== "") { document.getElementById("branchName").value = s.value; renderAll(); } };
window.deleteEntry = function (id) {
    const p = prompt("Security PIN required to delete this entry:");
    if (p === appSettings.securityPin) {
        if (confirm("Delete day?")) { masterData = masterData.filter(e => e.id !== id); localStorage.setItem("payroll_v20", JSON.stringify(masterData)); renderAll(); }
    } else if (p) { alert("Incorrect PIN."); }
};
window.deleteEmployeeBulk = function (n) {
    const p = prompt("Security PIN required to clear this employee history:");
    if (p === appSettings.securityPin) {
        if (confirm("Clear history for " + n + "?")) { masterData = masterData.filter(e => e.name !== n); localStorage.setItem("payroll_v20", JSON.stringify(masterData)); renderAll(); }
    } else if (p) { alert("Incorrect PIN."); }
};
window.clearBranchSecure = function (branch) {
    const p = prompt("Security PIN:");
    if (p === appSettings.securityPin) {
        if (confirm(`Permanently wipe all records for branch: ${branch}?`)) {
            masterData = masterData.filter(e => e.branch !== branch);
            localStorage.setItem("payroll_v20", JSON.stringify(masterData));
            renderAll();
        }
    } else if (p) {
        alert("Incorrect PIN.");
    }
};

window.clearAllTablesSecure = function () {
    const p = prompt("Security PIN:");
    if (p === appSettings.securityPin) {
        if (confirm("Permanently wipe database?")) {
            masterData = [];
            localStorage.removeItem("payroll_v20");
            renderAll();
        }
    } else if (p) {
        alert("Incorrect PIN.");
    }
};

window.exportToExcel = function () {
    let csv = "Date,Employee,Branch,Shift 1,Shift 2,Shift 3,Total Hours,Hourly Rate,Total Pay\n";
    const curFilter = document.getElementById("viewFilter").value;
    const curBranchFilter = document.getElementById("branchFilter").value;

    let curData = masterData.filter(d => {
        let ok = true;
        if (curFilter && curFilter !== "ALL") ok = d.name === curFilter;
        if (ok && curBranchFilter && curBranchFilter !== "ALL") ok = d.branch === curBranchFilter;
        const sD = document.getElementById("filterStartDate").value;
        const eD = document.getElementById("filterEndDate").value;
        if (ok && sD) ok = d.date >= sD;
        if (ok && eD) ok = d.date <= eD;
        return ok;
    });

    curData.forEach(d => {
        csv += `"${d.date}","${d.name}","${d.branch}","${d.s1s}-${d.s1e}","${d.s2s}-${d.s2e}","${d.s3s}-${d.s3e}",${decToT(d.total)},${d.rate},${d.pay}\n`;
    });

    csv += "\nSummary Data\n";
    csv += "Employee,Branch,Total Hours,Cumulative Pay\n";
    const emps = [...new Set(curData.map(e => e.name))];
    emps.forEach(n => {
        let ent = curData.filter(x => x.name === n);
        let h = ent.reduce((s, c) => s + c.total, 0);
        let p = ent.reduce((s, c) => s + parseFloat(c.pay), 0);
        csv += `"${n}","${ent[0].branch}",${decToT(h)},${p.toFixed(2)}\n`;
    });

    appSettings.lastBackupDate = Date.now();
    saveSettings();
    if (typeof renderBackupReminder === "function") renderBackupReminder();

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'payroll_report.csv';
    a.click(); window.URL.revokeObjectURL(url);
};

window.exportToPDF = function () {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header section
    let currentY = 15;

    // Add Logo if it exists in settings
    if (appSettings.companyLogo) {
        try {
            doc.addImage(appSettings.companyLogo, 'PNG', 14, currentY, 40, 40, '', 'FAST');
            currentY += 45;
        } catch (e) {
            console.error("Failed to inject logo into PDF:", e);
        }
    }

    doc.setFontSize(18);
    doc.text("Payroll & Shift Report", 14, currentY);
    doc.setFontSize(10);
    const dateStr = new Date().toLocaleDateString();
    currentY += 6;
    doc.text(`Generated on: ${dateStr}`, 14, currentY);

    // Add Active Filters to Header
    currentY += 6;
    let filterText = "Filters Active: ";
    const curFilter = document.getElementById("viewFilter").value;
    const curBranchFilter = document.getElementById("branchFilter").value;

    if (curFilter && curFilter !== "ALL") filterText += `Employee [${curFilter}]  `;
    if (curBranchFilter && curBranchFilter !== "ALL") filterText += `Branch [${curBranchFilter}]  `;
    const sD = document.getElementById("filterStartDate").value;
    const eD = document.getElementById("filterEndDate").value;
    if (sD || eD) filterText += `Date [${sD || 'Any'} to ${eD || 'Any'}]`;
    if (filterText === "Filters Active: ") filterText += "None";

    doc.text(filterText, 14, currentY);
    currentY += 10;

    // Gather filtered data identical to CSV export
    let curData = masterData.filter(d => {
        let ok = true;
        if (curFilter && curFilter !== "ALL") ok = d.name === curFilter;
        if (ok && curBranchFilter && curBranchFilter !== "ALL") ok = d.branch === curBranchFilter;
        if (ok && sD) ok = d.date >= sD;
        if (ok && eD) ok = d.date <= eD;
        return ok;
    });

    if (curData.length === 0) {
        alert("No data to export!");
        return;
    }

    // 1. Generate Main Shift Log Table
    const tableHeaders = [["Date", "Employee", "Branch", "Shift Timings", "Total Hrs", "Rate", "Total Pay"]];
    const tableRows = curData.map(d => [
        d.date,
        d.name,
        d.branch,
        `${d.s1s}-${d.s1e}${d.s2s ? '\n' + d.s2s + '-' + d.s2e : ''}${d.s3s ? '\n' + d.s3s + '-' + d.s3e : ''}`,
        decToT(d.total),
        `${getCurrencySymbol()}${d.rate}`,
        `${getCurrencySymbol()}${d.pay}`
    ]);

    doc.autoTable({
        startY: currentY,
        head: tableHeaders,
        body: tableRows,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [52, 58, 64] }
    });

    currentY = doc.lastAutoTable.finalY + 15;

    // 2. Generate Summary Table
    const emps = [...new Set(curData.map(e => e.name))];
    const summaryHeaders = [["Employee", "Branch", "Total Cumulative Hours", "Total Cumulative Pay"]];
    const summaryRows = emps.map(n => {
        let ent = curData.filter(x => x.name === n);
        let h = ent.reduce((s, c) => s + c.total, 0);
        let p = ent.reduce((s, c) => s + parseFloat(c.pay), 0);
        return [
            n,
            ent[0].branch,
            decToT(h),
            `${getCurrencySymbol()}${p.toFixed(2)}`
        ];
    });

    doc.setFontSize(14);
    doc.text("Employee Summary", 14, currentY);
    currentY += 5;

    doc.autoTable({
        startY: currentY,
        head: summaryHeaders,
        body: summaryRows,
        theme: 'grid',
        styles: { fontSize: 9, fontStyle: 'bold' },
        headStyles: { fillColor: [23, 162, 184] }
    });

    doc.save('payroll_report.pdf');
};
window.editEntry = function (id) { const e = masterData.find(x => x.id === id); if (!e) return; editingId = id; document.getElementById("empName").value = e.name; document.getElementById("branchName").value = e.branch; document.getElementById("workDate").value = e.date; document.getElementById("s1start").value = e.s1s; document.getElementById("s1end").value = e.s1e; document.getElementById("s2start").value = e.s2s; document.getElementById("s2end").value = e.s2e; document.getElementById("s3start").value = e.s3s; document.getElementById("s3end").value = e.s3e; document.getElementById("hourlyRate").value = e.rate; document.getElementById("mainBtn").innerText = "Update Log"; window.scrollTo(0, 0); };

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

window.previewPDF = async function () {
    const f = document.getElementById('pdfUpload').files[0];
    if (!f) return;

    document.getElementById('pdfViewer').innerHTML = "<p style='text-align:center; padding-top: 220px; color: #fff;'>Processing Document... 🤖</p>";

    if (f.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = async function () {
            const pdf = await pdfjsLib.getDocument(new Uint8Array(this.result)).promise;
            const page = await pdf.getPage(1);

            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.height = viewport.height; canvas.width = viewport.width;
            const v = document.getElementById('pdfViewer');

            await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
            v.innerHTML = ""; v.appendChild(canvas);

            const textContent = await page.getTextContent();
            const textStr = textContent.items.map(s => s.str).join(' ');
            let parsed = parseTimesAndDate(textStr);

            if (parsed.times.length >= 2 || parsed.dateStr) applyAutofill(parsed.times, parsed.dateStr);
            else if (appSettings.ocrEngine === 'openai' || appSettings.ocrEngine === 'llm') callOpenAI(canvas);
            else if (appSettings.ocrEngine === 'gemini') callGemini(canvas);
            else runOCR(canvas);
        };
        reader.readAsArrayBuffer(f);
        document.getElementById('pdfUpload').value = '';
    } else if (f.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                canvas.width = img.width; canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const displayCanvas = document.createElement('canvas');
                const scale = Math.min(1, 800 / img.width);
                displayCanvas.width = img.width * scale; displayCanvas.height = img.height * scale;
                displayCanvas.getContext('2d').drawImage(img, 0, 0, displayCanvas.width, displayCanvas.height);

                const v = document.getElementById('pdfViewer');
                v.innerHTML = ""; v.appendChild(displayCanvas);

                if (appSettings.ocrEngine === 'openai' || appSettings.ocrEngine === 'llm') callOpenAI(canvas);
                else if (appSettings.ocrEngine === 'gemini') callGemini(canvas);
                else runOCR(canvas);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(f);
        document.getElementById('pdfUpload').value = '';
    } else {
        document.getElementById('pdfViewer').innerHTML = "<p style='color:red; text-align:center; padding-top: 200px;'>Unsupported file type.</p>";
        document.getElementById('pdfUpload').value = '';
    }
};

function parseTimesAndDate(text) {
    let cleanedText = text.replace(/[l\|I]/g, '1').replace(/[oO]/g, '0').replace(/[sS]/g, '5');
    console.log("OCR Extracted Text:", cleanedText);

    const timeRegex = /\b(1[0-2]|0?[1-9]|2[0-3])[\s:;.,_\-]*([0-5][0-9])\s*([aA][mM]?|[pP][mM]?)?\b/gi;
    let matched = [...cleanedText.matchAll(timeRegex)];

    let times = matched.map(m => {
        let h = m[1], min = m[2], suffix = m[3] ? m[3].toLowerCase() : '';
        let isPM = suffix.startsWith('p'), isAM = suffix.startsWith('a');
        let hNum = parseInt(h, 10);
        if (isPM && hNum < 12) hNum += 12;
        if (isAM && hNum === 12) hNum = 0;
        return `${hNum.toString().padStart(2, '0')}:${min.padStart(2, '0')}`;
    }).filter(x => x);

    let dateRegex = /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](20\d{2}|\d{2})\b/;
    let dateMatch = cleanedText.match(dateRegex);
    let dateStr = null;
    if (dateMatch) {
        let y = dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3];
        dateStr = `${y}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
    }

    return { times, dateStr };
}

function applyAutofill(matches, dateStr) {
    let f = document.getElementById("clockToggle").value;
    if (f !== "24") { document.getElementById("clockToggle").value = "24"; window.toggleClockFormat(); }

    if (dateStr) {
        document.getElementById("workDate").value = dateStr;
    }

    ["s1start", "s1end", "s2start", "s2end", "s3start", "s3end"].forEach((id, i) => {
        if (matches[i]) document.getElementById(id).value = matches[i].padStart(5, '0');
    });

    alert("⚠️ AI Auto-Fill Complete!\n\nWe successfully detected data from the document.\n\nPlease CAREFULLY verify that the populated values are perfectly accurate before saving!");
}

async function runOCR(canvas) {
    document.getElementById('pdfViewer').insertAdjacentHTML('afterbegin', "<div id='ocrToast' style='position:absolute; top:10px; left:50%; transform:translateX(-50%); background:#ffc107; padding:5px 10px; border-radius:5px; font-weight:bold; color:#000; box-shadow: 0 4px 6px rgba(0,0,0,0.4);'>Running OCR Analysis... Please wait 🤖</div>");
    try {
        const result = await Tesseract.recognize(canvas, 'eng');
        document.getElementById('ocrToast')?.remove();
        let rawText = result.data.text;
        let parsed = parseTimesAndDate(rawText);
        if (parsed.times.length >= 2 || parsed.dateStr) {
            applyAutofill(parsed.times, parsed.dateStr);
        } else {
            alert("Could not detect clear shift timings from the document. Please enter manually.");
        }
    } catch (e) {
        document.getElementById('ocrToast')?.remove();
        console.log("OCR Error", e);
    }
}

async function callOpenAI(canvas) {
    if (!appSettings.llmApiKey || appSettings.llmApiKey.length < 10) return alert("Please enter a valid OpenAI API Key in Settings to use the Premium LLM engine.");
    document.getElementById('pdfViewer').insertAdjacentHTML('afterbegin', "<div id='ocrToast' style='position:absolute; top:10px; left:50%; transform:translateX(-50%); background:#007bff; padding:5px 10px; border-radius:5px; font-weight:bold; color:#fff; box-shadow: 0 4px 6px rgba(0,0,0,0.4);'>Running LLM Analysis... Please wait 🧠</div>");

    const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${appSettings.llmApiKey}` },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{
                    role: "user",
                    content: [
                        { type: "text", text: "Read this handwritten timesheet. Extract the shift date and chronological start and end times for up to 3 shifts. Return ONLY a JSON object with two keys: 'date' (YYYY-MM-DD format, or null) and 'times' (Array of 6 strings representing start/end times in 24-hour 'HH:MM' format. Example: [\"09:00\", \"13:00\", \"14:00\", \"18:00\", \"\", \"\"]). Output nothing else, no markdown formatting." },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                    ]
                }],
                max_tokens: 150
            })
        });

        const data = await response.json();
        document.getElementById('ocrToast')?.remove();

        if (data.error) return alert("LLM API Error: " + data.error.message);

        let content = data.choices[0].message.content.trim().replace(/```json/g, '').replace(/```/g, '').trim();
        let parsed = JSON.parse(content);
        let timesArray = parsed.times || [];
        let dateStr = parsed.date || null;
        let validMatches = timesArray.filter(t => t && t.length >= 4);

        if (validMatches.length >= 2 || dateStr) applyAutofill(timesArray, dateStr);
        else alert("LLM could not confidently detect clear shift timings. Please enter manually.");

    } catch (e) {
        document.getElementById('ocrToast')?.remove();
        console.error("LLM Error:", e);
        alert("Failed to communicate with LLM API. Ensure your API key is correct.");
    }
}

async function callGemini(canvas) {
    if (!appSettings.geminiApiKey || appSettings.geminiApiKey.length < 10) return alert("Please enter a valid Gemini API Key in Settings to use the Gemini engine.");
    document.getElementById('pdfViewer').insertAdjacentHTML('afterbegin', "<div id='ocrToast' style='position:absolute; top:10px; left:50%; transform:translateX(-50%); background:#8e24aa; padding:5px 10px; border-radius:5px; font-weight:bold; color:#fff; box-shadow: 0 4px 6px rgba(0,0,0,0.4);'>Running Gemini Analysis... Please wait ✨</div>");

    const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${appSettings.geminiApiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: "Read this handwritten timesheet. Extract the shift date and chronological start and end times for up to 3 shifts. Return ONLY a JSON object with two keys: 'date' (YYYY-MM-DD format, or null) and 'times' (Array of 6 strings representing start/end times in 24-hour 'HH:MM' format. Example: [\"09:00\", \"13:00\", \"14:00\", \"18:00\", \"\", \"\"]). Output nothing else, no markdown formatting." },
                        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                    ]
                }]
            })
        });

        const data = await response.json();
        document.getElementById('ocrToast')?.remove();

        if (data.error) return alert("Gemini API Error: " + data.error.message);

        let content = data.candidates[0].content.parts[0].text.trim().replace(/```json/g, '').replace(/```/g, '').trim();
        let parsed = JSON.parse(content);
        let timesArray = parsed.times || [];
        let dateStr = parsed.date || null;
        let validMatches = timesArray.filter(t => t && t.length >= 4);

        if (validMatches.length >= 2 || dateStr) applyAutofill(timesArray, dateStr);
        else alert("Gemini could not confidently detect clear shift timings. Please enter manually.");

    } catch (e) {
        document.getElementById('ocrToast')?.remove();
        console.error("Gemini Error:", e);
        alert("Failed to communicate with Gemini API. Ensure your API key is correct.");
    }
}

window.renderBackupReminder = function () {
    const reminder = document.getElementById("backupReminder");
    if (!reminder) return;
    if (!appSettings.lastBackupDate) {
        reminder.style.display = "inline";
    } else {
        const daysSince = (Date.now() - appSettings.lastBackupDate) / (1000 * 60 * 60 * 24);
        if (daysSince > 7) {
            reminder.style.display = "inline";
        } else {
            reminder.style.display = "none";
        }
    }
};

window.generatePayStub = function (employeeName) {
    let ent = masterData.filter(x => x.name === employeeName);
    if (ent.length === 0) return alert("No records for this employee.");

    // Check global filters to only include visible shifts
    const sD = document.getElementById("filterStartDate").value;
    const eD = document.getElementById("filterEndDate").value;
    if (sD) ent = ent.filter(e => e.date >= sD);
    if (eD) ent = ent.filter(e => e.date <= eD);

    if (ent.length === 0) return alert("No records for this employee in the selected date range.");

    let h = ent.reduce((s, c) => s + c.total, 0);
    let p = ent.reduce((s, c) => s + parseFloat(c.pay), 0);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let currentY = 15;

    if (appSettings.companyLogo) {
        try {
            doc.addImage(appSettings.companyLogo, 'PNG', 14, currentY, 40, 40, '', 'FAST');
            currentY += 45;
        } catch (e) {
            console.error("Logo inject failed:", e);
        }
    }

    doc.setFontSize(22);
    doc.text("Professional Pay Statement", 14, currentY);
    currentY += 10;

    doc.setFontSize(12);
    doc.text(`Employee Name: ${employeeName}`, 14, currentY);
    currentY += 7;
    doc.text(`Branch: ${ent[0].branch}`, 14, currentY);
    currentY += 7;
    const dateStr = new Date().toLocaleDateString();
    doc.text(`Generated on: ${dateStr}`, 14, currentY);
    currentY += 7;
    if (sD || eD) {
        doc.text(`Pay Period: ${sD || 'Beginning'} to ${eD || 'Present'}`, 14, currentY);
        currentY += 7;
    }

    currentY += 5;

    const tableHeaders = [["Date", "Shifts", "Daily Hrs", "Rate", "Daily Pay"]];
    const tableRows = ent.map(d => [
        d.date,
        `${d.s1s}-${d.s1e}${d.s2s ? ', ' + d.s2s + '-' + d.s2e : ''}${d.s3s ? ', ' + d.s3s + '-' + d.s3e : ''}`,
        decToT(d.total),
        `${getCurrencySymbol()}${d.rate}`,
        `${getCurrencySymbol()}${d.pay}`
    ]);

    doc.autoTable({
        startY: currentY,
        head: tableHeaders,
        body: tableRows,
        theme: 'striped',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [40, 167, 69] }
    });

    currentY = doc.lastAutoTable.finalY + 15;

    doc.setFontSize(14);
    doc.text("Summary Totals", 14, currentY);
    currentY += 8;
    doc.setFontSize(12);
    doc.text(`Total Hours Worked: ${decToT(h)}`, 14, currentY);
    currentY += 7;
    doc.setFontSize(14);
    doc.text(`Gross Pay: ${getCurrencySymbol()}${p.toFixed(2)}`, 14, currentY);

    doc.save(`PayStub_${employeeName.replace(/\s+/g, '_')}.pdf`);
};
