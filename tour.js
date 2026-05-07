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
        tab: 'audit',
        targetId: 'uploadAudit',
        title: "Cash & Tips Audit",
        text: "Extract and reconcile individual tips straight from receipts using AI."
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
        tab: 'settings',
        targetId: 'cloudSyncCard',
        title: "Cloud Workspace",
        text: "Log in here to enable Enterprise Cloud Syncing, create a Company Vault, and unlock Team Management collaboration!"
    },
    {
        tab: 'settings',
        targetId: 'featureTogglesCard',
        title: "Tailor Your Workspace",
        text: "Before we finish, which modules do you plan to use?<br><br><div style='display:flex; flex-direction:column; gap: 8px; margin-top: 15px;'><button class='btn-success' style='margin:0; font-size:13px; padding: 10px;' onclick='setTourModuleChoice(\"both\")'>Keep Both Modules</button> <button class='btn-primary' style='margin:0; font-size:13px; padding:10px;' onclick='setTourModuleChoice(\"payroll\")'>Payroll Only</button> <button class='btn-primary' style='background:#17a2b8; border: none; margin:0; font-size:13px; padding:10px;' onclick='setTourModuleChoice(\"audit\")'>Cash & Tips Only</button></div>",
        isFinalChoice: true
    }
];

window.setTourModuleChoice = function(choice) {
    let enablePayroll = (choice === 'both' || choice === 'payroll');
    let enableAudit = (choice === 'both' || choice === 'audit');
    
    // Set the checkboxes so saveSettings reads the correct values
    document.getElementById("togglePayrollModule").checked = enablePayroll;
    document.getElementById("toggleAuditModule").checked = enableAudit;
    
    saveSettings();
    endTour();
    
    // Navigate to the respective view based on selection
    if (choice === 'audit') {
        switchTab('audit');
    } else {
        switchTab('payroll');
    }
};

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
    AppStorage.setItem("onboardingComplete_v20", "true");
};

window.skipTourBtnClicked = function () {
    let isFirstTime = !AppStorage.getItem("onboardingComplete_v20");
    if (isFirstTime) {
        clearTourHighlight();
        currentTourStep = tourSteps.length - 1;
        renderTourStep();
    } else {
        endTour();
        if (!appSettings.enablePayrollModule && appSettings.enableAuditModule) {
            switchTab('audit');
        } else {
            switchTab('payroll');
        }
    }
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
        document.getElementById('tourText').innerHTML = step.text;

        let skipBtn = document.getElementById('tourSkipBtn');
        if (step.isFinalChoice) {
            document.getElementById('tourNextBtn').style.display = 'none';
            if (skipBtn) skipBtn.style.display = 'none';
        } else {
            document.getElementById('tourNextBtn').style.display = 'block';
            if (skipBtn) skipBtn.style.display = 'block';
            if (currentTourStep === tourSteps.length - 1) {
                document.getElementById('tourNextBtn').innerText = "Finish Tour";
            } else {
                document.getElementById('tourNextBtn').innerText = "Next Step";
            }
        }
    }, 150);
}

