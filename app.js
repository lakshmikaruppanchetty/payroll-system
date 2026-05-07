// --- FIREBASE CLOUD SAAS CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyBL-lQ_IzADLKUi61b_FUwOCvj2lEyuggs",
    authDomain: "finance-operations-cloud.firebaseapp.com",
    projectId: "finance-operations-cloud",
    storageBucket: "finance-operations-cloud.firebasestorage.app",
    messagingSenderId: "31843882376",
    appId: "1:31843882376:web:f9f4c31fa2d7e16bba563d",
    measurementId: "G-43YEQ6DTF8"
};

let firebaseApp, auth, db, analytics;
let currentCompanyId = null;

window.handleBannerRemind = function(val) {
    if (!val) return;
    let t = 0;
    if (val === "WEEK") t = Date.now() + 7 * 24 * 60 * 60 * 1000;
    if (val === "MONTH") t = Date.now() + 30 * 24 * 60 * 60 * 1000;
    if (val === "NEVER") t = "NEVER";
    localStorage.setItem("offlineBannerReminder", t.toString());
    closeOfflineBanner();
};

window.closeOfflineBanner = function() {
    const b = document.getElementById("offlineBanner");
    if (b) {
        b.style.opacity = "0";
        setTimeout(() => b.style.display = "none", 300);
    }
};

window.evalOfflineBanner = function() {
    if (typeof auth !== 'undefined' && auth && auth.currentUser) {
        closeOfflineBanner();
        return;
    }
    const r = localStorage.getItem("offlineBannerReminder");
    if (r === "NEVER") return;
    if (r && !isNaN(parseInt(r)) && Date.now() < parseInt(r)) return;
    
    const b = document.getElementById("offlineBanner");
    if (b) {
        b.style.display = "flex";
        b.style.opacity = "1";
    }
};

function loadUserCompanyProfile(user) {
    db.collection("users").doc(user.uid).get().then(doc => {
        if (doc.exists) {
            currentCompanyId = doc.data().companyId;
            let cIDEl = document.getElementById("displayInviteCode");
            if(cIDEl) cIDEl.value = currentCompanyId;
            let tMC = document.getElementById("teamManagementCard");
            if(tMC) tMC.style.display = "block";
            
            appSettings.isCloudReady = true;
            AppStorage.isCloudReady = true;
            let badge = document.getElementById("cloudStatusBadge");
            if(badge) { badge.innerText = "Cloud Synced"; badge.style.background = "#28a745"; }
            let btn = document.getElementById("cloudLoginBtn");
            if(btn) { btn.innerText = "Disconnect Cloud Account"; btn.style.background = "#dc3545"; }
            saveSettings();
            AppStorage.pullFromCloud();
        }
    }).catch(err => console.error("Error loading profile:", err));
}

if (firebaseConfig.apiKey !== "YOUR_API_KEY" && window.firebase) {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    analytics = firebase.analytics();
    
    auth.onAuthStateChanged(user => {
        if (user && user.emailVerified) {
            loadUserCompanyProfile(user);
            evalOfflineBanner();
        } else {
            if (user && !user.emailVerified) {
                // Do not auto-signout here, as it interrupts db writes during register.
                // Explicit signout is handled in executeCloudRegister and performCloudLogin.
            }
            currentCompanyId = null;
            appSettings.isCloudReady = false;
            AppStorage.isCloudReady = false;
            let tMC = document.getElementById("teamManagementCard");
            if(tMC) tMC.style.display = "none";
            let badge = document.getElementById("cloudStatusBadge");
            if(badge) { badge.innerText = "Local Mode"; badge.style.background = "#6c757d"; }
            let btn = document.getElementById("cloudLoginBtn");
            if(btn) { btn.innerText = "Login to Cloud Account"; btn.style.background = "#28a745"; }
            saveSettings();
            evalOfflineBanner();
        }
    });
}

const AppStorage = {
    isCloudReady: false,
    getItem(key) { return window['localStorage'].getItem(key); },
    setItem(key, value) {
        window['localStorage'].setItem(key, value);
        if (this.isCloudReady) this.syncToCloud(key, value);
    },
    removeItem(key) {
        window['localStorage'].removeItem(key);
        if (this.isCloudReady) this.deleteFromCloud(key);
    },
    syncToCloud(key, value) { 
        if (db && auth && auth.currentUser && currentCompanyId) {
            console.log(`[Cloud Sync] Pushing ${key} to Firestore Vault: ${currentCompanyId}...`);
            let payload = { data: value, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
            db.collection("companies").doc(currentCompanyId).collection("appState").doc(key).set(payload)
                .catch(err => console.error("Cloud Sync Error:", err));
        }
    },
    deleteFromCloud(key) { 
        if (db && auth && auth.currentUser && currentCompanyId) {
            console.log(`[Cloud Sync] Deleting ${key} from Firestore Vault: ${currentCompanyId}...`);
            db.collection("companies").doc(currentCompanyId).collection("appState").doc(key).delete()
                .catch(err => console.error("Cloud Delete Error:", err));
        }
    },
    pullFromCloud() {
        if (db && auth && auth.currentUser && currentCompanyId) {
            // Only pull once per active browser session to prevent reload loops
            if (!sessionStorage.getItem("hasPulledCloudSync")) {
                sessionStorage.setItem("hasPulledCloudSync", "true");
                console.log(`[Cloud Sync] Downloading from Vault: ${currentCompanyId}...`);
                db.collection("companies").doc(currentCompanyId).collection("appState").get()
                    .then(snapshot => {
                        if (snapshot.empty) return;
                        let changesMade = false;
                        snapshot.forEach(doc => {
                            let cloudData = doc.data().data;
                            if (cloudData && window['localStorage'].getItem(doc.id) !== cloudData) {
                                window['localStorage'].setItem(doc.id, cloudData);
                                changesMade = true;
                            }
                        });
                        if (changesMade) {
                            console.log("[Cloud Sync] Download complete. Refreshing screen...");
                            location.reload();
                        } else {
                            console.log("[Cloud Sync] Database already entirely up to date.");
                        }
                    }).catch(err => console.error("Cloud Pull Error", err));
            }
        }
    }
};

let masterData = JSON.parse(AppStorage.getItem("payroll_v20")) || [];
let auditData = JSON.parse(AppStorage.getItem("auditData_v20")) || [];
let editingAuditId = null;
let appSettings = JSON.parse(AppStorage.getItem("settings_v20")) || {};
appSettings.isCloudReady = appSettings.isCloudReady ?? false;
appSettings.enablePayrollModule = appSettings.enablePayrollModule ?? true;
appSettings.enableAuditModule = appSettings.enableAuditModule ?? true;
appSettings.showBranch = appSettings.showBranch ?? false;
appSettings.showSummary = appSettings.showSummary ?? false;
appSettings.showBranchSummary = appSettings.showBranchSummary ?? false;
appSettings.showPdf = appSettings.showPdf ?? true;
appSettings.showCsv = appSettings.showCsv ?? true;
appSettings.showExportPdf = appSettings.showExportPdf ?? true;
appSettings.showAuditCsv = appSettings.showAuditCsv ?? true;
appSettings.showAuditPdf = appSettings.showAuditPdf ?? true;
appSettings.showAuditExportPdf = appSettings.showAuditExportPdf ?? true;
appSettings.showLogo = appSettings.showLogo ?? false;
appSettings.showBranchLogos = appSettings.showBranchLogos ?? false;
appSettings.branchLogos = appSettings.branchLogos || {};
appSettings.showExtendedShifts = appSettings.showExtendedShifts ?? false;
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
let auditTrendChartInstance = null;
let auditSortCol = 'date';
let auditSortAsc = false;
let mainSortCol = 'date';
let mainSortAsc = false;
let summarySortAsc = true;
let branchSortAsc = true;
let auditBranchSortAsc = true;

window.formatDisplayDate = function(dateStr) {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const p = dateStr.split('-');
    if (p.length === 3 && p[0].length === 4) return `${p[1]}-${p[2]}-${p[0]}`;
    return dateStr;
};

window.getCurrencySymbol = function () {
    let pref = AppStorage.getItem("preferredCurrency_v20");
    if (!pref) return "$";
    if (pref === "custom") return AppStorage.getItem("customCurrency_v20") || "$";
    return pref;
};

window.handleCurrencyChange = function () {
    const val = document.getElementById("currencySelect").value;
    AppStorage.setItem("preferredCurrency_v20", val);
    if (val === "custom") {
        document.getElementById("customCurrencyContainer").style.display = "block";
    } else {
        document.getElementById("customCurrencyContainer").style.display = "none";
        renderAll();
    }
    updateCurrencyLabels();
};

window.saveCustomCurrency = function () {
    AppStorage.setItem("customCurrency_v20", document.getElementById("customCurrencyInput").value);
    renderAll();
    updateCurrencyLabels();
};

window.updateCurrencyLabels = function () {
    const sym = getCurrencySymbol();
    document.querySelectorAll(".currency-label").forEach(el => el.innerText = sym);
};

window.toggleCloudLogin = function() {
    if (!window.firebase || firebaseConfig.apiKey === "YOUR_API_KEY") {
        alert("Firebase Configuration Missing.\n\nPlease copy your API credentials from the Firebase Console and paste them into app.js at the 'firebaseConfig' object to activate the Cloud Engine.");
        return;
    }

    if (appSettings.isCloudReady) {
        if (confirm("Disconnect from cloud account? You will return to Local Mode.")) {
            auth.signOut();
            alert("Disconnected! You are now in Free/Local-only mode.");
        }
    } else {
        document.getElementById('authModalOverlay').style.display = 'block';
        document.getElementById('authModal').style.display = 'block';
        document.getElementById('authErrorMsg').style.display = 'none';
        document.getElementById('authEmail').value = '';
        document.getElementById('authPassword').value = '';
        document.getElementById('authInviteCode').value = '';
    }
};

window.closeAuthModal = function() {
    document.getElementById('authModalOverlay').style.display = 'none';
    document.getElementById('authModal').style.display = 'none';
};

window.checkAuthInputs = function() {
    let em = document.getElementById('authEmail').value.trim();
    let pw = document.getElementById('authPassword').value.trim();
    let l_btn = document.getElementById('authLoginBtn');
    let r_btn = document.getElementById('authRegisterBtn');
    
    if (em.length > 3 && em.includes('@') && pw.length >= 6) {
        l_btn.disabled = false; r_btn.disabled = false;
        l_btn.style.opacity = "1"; l_btn.style.cursor = "pointer";
        r_btn.style.opacity = "1"; r_btn.style.cursor = "pointer";
    } else {
        l_btn.disabled = true; r_btn.disabled = true;
        l_btn.style.opacity = "0.5"; l_btn.style.cursor = "not-allowed";
        r_btn.style.opacity = "0.5"; r_btn.style.cursor = "not-allowed";
    }
};

function mapAuthError(errCode, defaultMsg) {
    if (errCode === 'auth/invalid-email') return "Please enter a valid email address.";
    if (errCode === 'auth/user-not-found') return "Email not registered. Please click Register New Account.";
    if (errCode === 'auth/wrong-password') return "Incorrect password.";
    if (errCode === 'auth/invalid-credential') return "Email not found / incorrect password. Please Register if you are new.";
    if (errCode === 'auth/email-already-in-use') return "An account with this email already exists. Try Logging In.";
    if (errCode === 'auth/weak-password') return "Password is too weak. Please use at least 6 characters.";
    return defaultMsg || "An error occurred with authentication.";
}

window.performCloudLogin = function() {
    let email = document.getElementById('authEmail').value.trim();
    let pwd = document.getElementById('authPassword').value.trim();
    document.getElementById('authErrorMsg').style.display = 'none';

    auth.signInWithEmailAndPassword(email, pwd)
        .then((cred) => {
            if (!cred.user.emailVerified) {
                auth.signOut();
                alert("Your email address is not verified yet.\n\nPlease check your inbox and click the verification link before logging in!");
                return;
            }
            closeAuthModal();
            alert("Successfully logged in to Cloud Account!");
        })
        .catch(err => {
            let msg = document.getElementById('authErrorMsg');
            msg.innerText = mapAuthError(err.code, err.message);
            msg.style.display = 'block';
        });
};

function generateCompanyId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

window.performCloudRegister = function() {
    let inviteInput = document.getElementById('authInviteCode').value.trim().toUpperCase();
    document.getElementById('authErrorMsg').style.display = 'none';

    if (!inviteInput) {
        document.getElementById('inviteConfirmModalOverlay').style.display = 'block';
        document.getElementById('inviteConfirmModal').style.display = 'block';
        return;
    }

    executeCloudRegister();
};

window.cancelAndFocusInvite = function() {
    document.getElementById('inviteConfirmModal').style.display = 'none';
    document.getElementById('inviteConfirmModalOverlay').style.display = 'none';
    let input = document.getElementById('authInviteCode');
    input.focus();
    input.style.border = "2px solid #3498db";
    setTimeout(() => { input.style.border = "1px solid #ccc"; }, 1500);
};

window.closeVerifyEmailModal = function() {
    document.getElementById('verifyEmailModal').style.display = 'none';
    document.getElementById('verifyEmailModalOverlay').style.display = 'none';
};

window.executeCloudRegister = function() {
    document.getElementById('inviteConfirmModal').style.display = 'none';
    document.getElementById('inviteConfirmModalOverlay').style.display = 'none';
    
    let email = document.getElementById('authEmail').value.trim();
    let pwd = document.getElementById('authPassword').value.trim();
    let inviteInput = document.getElementById('authInviteCode').value.trim().toUpperCase();
    let inviteCode = inviteInput || generateCompanyId();
    auth.createUserWithEmailAndPassword(email, pwd)
        .then((cred) => {
            cred.user.sendEmailVerification();
            return db.collection("users").doc(cred.user.uid).set({
                companyId: inviteCode,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            auth.signOut();
            closeAuthModal();
            document.getElementById('displayNewInviteCode').innerText = inviteCode;
            document.getElementById('verifyEmailModalOverlay').style.display = 'block';
            document.getElementById('verifyEmailModal').style.display = 'block';
        })
        .catch(err => {
            let msg = document.getElementById('authErrorMsg');
            msg.innerText = mapAuthError(err.code, err.message);
            msg.style.display = 'block';
        });
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
    if (typeof analytics !== "undefined") {
        let storageMode = appSettings.isCloudReady ? 'cloud' : 'local';
        analytics.logEvent('dashboard_loaded', { storage_mode: storageMode });
        console.log("Firebase Analytics Event Fired: dashboard_loaded, mode:", storageMode);
    }
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

    if (!AppStorage.getItem("onboardingComplete_v20")) {
        startUserTour();
    }

    const hash = window.location.hash.replace('#', '');
    if (hash && ['payroll', 'audit', 'reports', 'auditReports', 'settings', 'about'].includes(hash)) {
        switchTab(hash, false);
    }

    applySettings();
    setTimeout(() => evalOfflineBanner(), 500);
};

window.addEventListener('hashchange', () => {
    let h = window.location.hash.substring(1);
    if (['payroll', 'reports', 'audit', 'auditReports', 'settings', 'about'].includes(h)) {
        switchTab(h, false);
    }
});

function saveSettings() {
    appSettings.enablePayrollModule = document.getElementById("togglePayrollModule").checked;
    appSettings.enableAuditModule = document.getElementById("toggleAuditModule").checked;
    appSettings.showBranch = document.getElementById("toggleBranch").checked;
    appSettings.showSummary = document.getElementById("toggleSummary").checked;
    appSettings.showBranchSummary = document.getElementById("toggleBranchSummary").checked;
    appSettings.showPdf = document.getElementById("togglePdf").checked;
    appSettings.showCsv = document.getElementById("toggleCsv").checked;
    appSettings.showExportPdf = document.getElementById("toggleExportPdf").checked;
    appSettings.showAuditCsv = document.getElementById("toggleAuditCsv").checked;
    appSettings.showAuditPdf = document.getElementById("toggleAuditPdf").checked;
    appSettings.showAuditExportPdf = document.getElementById("toggleAuditExportPdf").checked;
    appSettings.showLogo = document.getElementById("toggleLogo").checked;
    appSettings.showBranchLogos = document.getElementById("toggleBranchLogos").checked;
    appSettings.showExtendedShifts = document.getElementById("toggleExtendedShifts").checked;
    appSettings.ocrEngine = document.getElementById("ocrEngineSelect").value;
    appSettings.llmApiKey = document.getElementById("llmApiKey").value;
    appSettings.geminiApiKey = document.getElementById("geminiApiKey").value;
    appSettings.securityPin = document.getElementById("securityPinSetting").value || '1234';
    appSettings.minRate = parseInt(document.getElementById("minRateSetting").value, 10) || 15;
    appSettings.maxRate = parseInt(document.getElementById("maxRateSetting").value, 10) || 35;
    AppStorage.setItem("settings_v20", JSON.stringify(appSettings));
    applySettings();
    renderRates();
    renderAll();
}

function applySettings() {
    AppStorage.isCloudReady = appSettings.isCloudReady;
    let cloudLoginBtn = document.getElementById("cloudLoginBtn");
    let cloudStatusBadge = document.getElementById("cloudStatusBadge");
    if (cloudLoginBtn && cloudStatusBadge) {
        if (appSettings.isCloudReady) {
            cloudLoginBtn.innerText = "Disconnect Cloud Account";
            cloudLoginBtn.style.background = "#dc3545";
            cloudStatusBadge.innerText = "Cloud Synced";
            cloudStatusBadge.style.background = "#28a745";
        } else {
            cloudLoginBtn.innerText = "Login to Cloud Account";
            cloudLoginBtn.style.background = "#28a745";
            cloudStatusBadge.innerText = "Local Mode";
            cloudStatusBadge.style.background = "#6c757d";
        }
    }

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

    let auditCsvCard = document.getElementById("auditCsvCard");
    if (auditCsvCard) auditCsvCard.style.display = appSettings.showAuditCsv ? "" : "none";

    let auditUploadCard = document.getElementById("uploadAudit")?.closest('.card');
    if (auditUploadCard) auditUploadCard.style.display = appSettings.showAuditPdf ? "" : "none";

    let auditVerificationCard = document.getElementById("auditVerificationCard");
    let workspaceGrid = document.querySelector(".workspace");
    if (workspaceGrid && auditVerificationCard) {
        if (!appSettings.showAuditPdf) {
            workspaceGrid.style.gridTemplateColumns = "1fr";
            auditVerificationCard.style.maxWidth = "800px";
            auditVerificationCard.style.margin = "0";
        } else {
            workspaceGrid.style.gridTemplateColumns = window.innerWidth <= 768 ? "1fr" : "1fr 1fr";
            auditVerificationCard.style.maxWidth = "none";
            auditVerificationCard.style.margin = "0";
        }
    }

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
        botRow.appendChild(entryCard);
    } else {
        topRow.appendChild(setupCard);
        topRow.appendChild(csvCard);
        botRow.appendChild(pdfCard);
        botRow.appendChild(entryCard);
    }

    const bGC = document.getElementById("branchGraphCard");
    if (bGC) bGC.style.display = appSettings.showBranch ? "" : "none";

    document.getElementById("togglePayrollModule").checked = appSettings.enablePayrollModule;
    document.getElementById("toggleAuditModule").checked = appSettings.enableAuditModule;
    
    const menuPayroll = document.getElementById("menuPayroll");
    if (menuPayroll) menuPayroll.style.display = appSettings.enablePayrollModule ? "" : "none";
    const menuReports = document.getElementById("menuReports");
    if (menuReports) menuReports.style.display = appSettings.enablePayrollModule ? "" : "none";
    
    const menuAudit = document.getElementById("menuAudit");
    if (menuAudit) menuAudit.style.display = appSettings.enableAuditModule ? "" : "none";
    const menuAuditReports = document.getElementById("menuAuditReports");
    if (menuAuditReports) menuAuditReports.style.display = appSettings.enableAuditModule ? "" : "none";

    // Auto-switch away from hidden tabs if they try to hide currently viewed tabs
    let activeTab = document.querySelector('.sidebar-menu li.active')?.id;
    if (activeTab === 'menuPayroll' || activeTab === 'menuReports') {
        if (!appSettings.enablePayrollModule) {
            switchTab(appSettings.enableAuditModule ? 'audit' : 'settings');
        }
    } else if (activeTab === 'menuAudit' || activeTab === 'menuAuditReports') {
        if (!appSettings.enableAuditModule) {
            switchTab(appSettings.enablePayrollModule ? 'payroll' : 'settings');
        }
    }

    document.getElementById("toggleBranch").checked = appSettings.showBranch;
    document.getElementById("toggleSummary").checked = appSettings.showSummary;
    document.getElementById("toggleBranchSummary").checked = appSettings.showBranchSummary;
    document.getElementById("togglePdf").checked = appSettings.showPdf;
    document.getElementById("toggleCsv").checked = appSettings.showCsv;
    document.getElementById("toggleExportPdf").checked = appSettings.showExportPdf;
    document.getElementById("toggleAuditCsv").checked = appSettings.showAuditCsv;
    document.getElementById("toggleAuditPdf").checked = appSettings.showAuditPdf;
    document.getElementById("toggleAuditExportPdf").checked = appSettings.showAuditExportPdf;

    activeTab = document.querySelector('.sidebar-menu li.active')?.id;
    if (activeTab === 'menuAudit' || activeTab === 'menuAuditReports') {
        document.getElementById("btnExportPdf").style.display = appSettings.showAuditExportPdf ? "" : "none";
    } else {
        document.getElementById("btnExportPdf").style.display = appSettings.showExportPdf ? "" : "none";
    }

    document.getElementById("toggleLogo").checked = appSettings.showLogo;
    document.getElementById("toggleBranchLogos").checked = appSettings.showBranchLogos;

    let branchLogoUploadSection = document.getElementById("branchLogoUploadSection");
    if (branchLogoUploadSection) branchLogoUploadSection.style.display = appSettings.showBranchLogos ? "block" : "none";

    if (document.getElementById("toggleExtendedShifts")) {
        document.getElementById("toggleExtendedShifts").checked = appSettings.showExtendedShifts;
    }
    document.getElementById("s4_container").style.display = appSettings.showExtendedShifts ? "block" : "none";
    document.getElementById("s5_container").style.display = appSettings.showExtendedShifts ? "block" : "none";

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

    let pref = AppStorage.getItem("preferredCurrency_v20") || "$";
    document.getElementById("currencySelect").value = pref;
    if (pref === "custom") {
        document.getElementById("customCurrencyContainer").style.display = "block";
        document.getElementById("customCurrencyInput").value = AppStorage.getItem("customCurrency_v20") || "";
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

window.loadBranchLogo = function () {
    const sel = document.getElementById("branchLogoSelect").value;
    const previewContainer = document.getElementById("branchLogoPreviewContainer");
    const previewImg = document.getElementById("branchLogoPreview");

    if (sel && appSettings.branchLogos && appSettings.branchLogos[sel]) {
        previewImg.src = appSettings.branchLogos[sel];
        previewContainer.style.display = "block";
    } else {
        previewImg.src = "";
        previewContainer.style.display = "none";
    }
};

window.handleBranchLogoUpload = function () {
    const sel = document.getElementById("branchLogoSelect").value;
    if (!sel) return alert("Select a branch first.");
    const file = document.getElementById("branchLogoUpload").files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            appSettings.branchLogos = appSettings.branchLogos || {};
            appSettings.branchLogos[sel] = e.target.result;
            saveSettings();
            loadBranchLogo();
        };
        reader.readAsDataURL(file);
    }
};

window.clearBranchLogo = function () {
    const sel = document.getElementById("branchLogoSelect").value;
    if (!sel) return alert("Select a branch first.");
    if (appSettings.branchLogos && appSettings.branchLogos[sel]) {
        delete appSettings.branchLogos[sel];
        saveSettings();
        loadBranchLogo();
        document.getElementById("branchLogoUpload").value = "";
    }
};

function switchTab(tab, updateHash = true) {
    if (updateHash) history.pushState(null, '', '#' + tab);

    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar-menu li').forEach(el => el.classList.remove('active'));
    document.getElementById(tab + 'View').classList.add('active');
    document.getElementById('menu' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');

    const shared = document.getElementById("sharedFilters");
    if (shared) {
        const empVal = document.getElementById("viewFilter") ? document.getElementById("viewFilter").value : null;
        const branchVal = document.getElementById("branchFilter") ? document.getElementById("branchFilter").value : null;
        const dateVal = document.getElementById("dateFilterPreset") ? document.getElementById("dateFilterPreset").value : null;
        const clockVal = document.getElementById("clockToggle") ? document.getElementById("clockToggle").value : null;

        if (tab === 'payroll') {
            document.getElementById("payrollFiltersContainer").appendChild(shared);
            if (document.getElementById("clockToggleContainer")) document.getElementById("clockToggleContainer").style.display = 'flex';
            if (document.getElementById("employeeFilterContainer")) document.getElementById("employeeFilterContainer").style.display = 'flex';
        } else if (tab === 'reports') {
            document.getElementById("reportsFiltersContainer").appendChild(shared);
            if (document.getElementById("clockToggleContainer")) document.getElementById("clockToggleContainer").style.display = 'flex';
            if (document.getElementById("employeeFilterContainer")) document.getElementById("employeeFilterContainer").style.display = 'flex';
        } else if (tab === 'audit') {
            document.getElementById("auditFiltersContainer").appendChild(shared);
            if (document.getElementById("clockToggleContainer")) document.getElementById("clockToggleContainer").style.display = 'none';
            if (document.getElementById("employeeFilterContainer")) document.getElementById("employeeFilterContainer").style.display = 'none';
        } else if (tab === 'auditReports') {
            document.getElementById("auditReportsFiltersContainer").appendChild(shared);
            if (document.getElementById("clockToggleContainer")) document.getElementById("clockToggleContainer").style.display = 'none';
            if (document.getElementById("employeeFilterContainer")) document.getElementById("employeeFilterContainer").style.display = 'none';
        }

        if (empVal && document.getElementById("viewFilter")) document.getElementById("viewFilter").value = empVal;
        if (branchVal && document.getElementById("branchFilter")) document.getElementById("branchFilter").value = branchVal;
        if (dateVal && document.getElementById("dateFilterPreset")) document.getElementById("dateFilterPreset").value = dateVal;
        if (clockVal && document.getElementById("clockToggle")) document.getElementById("clockToggle").value = clockVal;

        let pActiveTab = document.querySelector('.sidebar-menu li.active')?.id;
        if (pActiveTab === 'menuAudit' || pActiveTab === 'menuAuditReports') {
            document.getElementById("btnExportPdf").style.display = appSettings.showAuditExportPdf ? "" : "none";
        } else {
            document.getElementById("btnExportPdf").style.display = appSettings.showExportPdf ? "" : "none";
        }
    }

    setTimeout(() => renderAll(), 50); // delay to let display:block apply fully

    if (window.innerWidth <= 768) {
        document.getElementById("sidebar").classList.remove("mobile-open");
    }
}

window.toggleSubMenu = function (id, el) {
    const sm = document.getElementById(id);
    const m = el.querySelector('.nav-arrow');
    if (sm) {
        if (sm.style.display === 'none') {
            sm.style.display = 'block';
            if (m) m.style.transform = 'rotate(180deg)';
        } else {
            sm.style.display = 'none';
            if (m) m.style.transform = 'rotate(0deg)';
        }
    }
};

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

window.onStartDateChange = function () {
    let sD = document.getElementById("filterStartDate").value;
    if (sD) {
        const isAuditActive = document.getElementById('auditView').classList.contains('active') || document.getElementById('auditReportsView').classList.contains('active');
        const dataArr = isAuditActive ? auditData : masterData;
        if (dataArr.length > 0) {
            let maxDate = dataArr.reduce((max, d) => d.date > max ? d.date : max, "0000-00-00");
            if (maxDate && maxDate !== "0000-00-00") {
                if (maxDate >= sD) {
                    document.getElementById("filterEndDate").value = maxDate;
                } else {
                    document.getElementById("filterEndDate").value = sD;
                }
            }
        }
    }
    renderAll();
};

window.clearDateFilter = function () {
    document.getElementById("dateFilterPreset").value = "all_time";
    document.getElementById("customDateInputs").style.display = "none";
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

    if (preset === "all_time") {
        customInputs.style.display = "none";
        startDate.value = "";
        endDate.value = "";
        document.getElementById("dateFilterPreset").value = "all_time";
    } else if (preset === "today") {
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

// --- AUDIT TOOL LOGIC ---
let showPreprocessedAudit = false;

document.getElementById('uploadAudit').addEventListener('change', function (e) {
    const file = e.target.files[0];
    const status = document.getElementById('ocr-status-audit');
    if (!file) return;

    if (file.type === 'application/pdf') {
        status.innerText = "❌ PDFs not supported for Audit yet. Please upload an image format.";
        return;
    }

    status.innerText = "⏳ Loading image...";
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = document.getElementById('preview-img-audit');
        img.onload = function () {
            if (appSettings.ocrEngine === 'free') {
                preprocessImageAudit(img, function (processedDataUrl) {
                    document.getElementById('toggle-view-btn-audit').style.display = "inline-block";
                    status.innerText = "⏳ Processing Data with internal OCR...";

                    Tesseract.recognize(processedDataUrl, 'eng', {
                        logger: m => {
                            if (m.status === 'recognizing text') {
                                status.innerText = `⏳ Processing Punch Data... ${Math.round(m.progress * 100)}%`;
                            }
                        }
                    }).then(({ data: { text, words } }) => {
                        status.innerText = "✅ Scan Complete. Verify values below.";
                        processTextAudit(text);
                        if (words) window.drawOcrHighlights('preprocessed-preview-audit', words);
                    }).catch((err) => {
                        console.error("Tesseract Error", err);
                        status.innerText = "❌ Scan failed. Use viewer to enter manually.";
                    });
                });
            } else if (appSettings.ocrEngine === 'openai') {
                if (!appSettings.llmApiKey) {
                    status.innerText = "❌ Please enter OpenAI API Key in Settings.";
                    return;
                }
                status.innerText = "⏳ Processing Data with OpenAI Vision...";
                const base64 = ev.target.result.split(',')[1];

                fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${appSettings.llmApiKey}` },
                    body: JSON.stringify({
                        model: "gpt-4o",
                        messages: [{
                            role: "user",
                            content: [
                                { type: "text", text: "Extract the exact text from this cashout receipt document exactly as shown." },
                                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } }
                            ]
                        }],
                        max_tokens: 300
                    })
                }).then(res => res.json()).then(data => {
                    if (data.error) throw new Error(data.error.message);
                    status.innerText = "✅ AI Analysis Complete. Verify values.";
                    processTextAudit(data.choices[0].message.content);
                }).catch(err => {
                    console.error("OpenAI Error", err);
                    status.innerText = "❌ AI Analysis failed.";
                });
            } else if (appSettings.ocrEngine === 'gemini') {
                if (!appSettings.geminiApiKey) {
                    status.innerText = "❌ Please enter Gemini API Key in Settings.";
                    return;
                }
                status.innerText = "⏳ Processing Data with Google Gemini...";
                const base64 = ev.target.result.split(',')[1];

                fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${appSettings.geminiApiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: "Extract all the text from this cashout receipt document exactly as shown." },
                                { inline_data: { mime_type: "image/jpeg", data: base64 } }
                            ]
                        }]
                    })
                }).then(res => res.json()).then(data => {
                    if (data.error) throw new Error(data.error.message);
                    status.innerText = "✅ AI Analysis Complete. Verify values.";
                    processTextAudit(data.candidates[0].content.parts[0].text);
                }).catch(err => {
                    console.error("Gemini Error", err);
                    status.innerText = "❌ AI Analysis failed.";
                });
            }
        };
        img.src = ev.target.result;
        img.style.display = showPreprocessedAudit ? "none" : "block";
        document.getElementById('hintAudit').style.display = "none";
    };
    reader.onerror = () => { status.innerText = "❌ Failed to read file."; };
    reader.readAsDataURL(file);
});

