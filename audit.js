window.importAuditCSV = function () {
    const fileInput = document.getElementById('auditCsvImport'); if (!fileInput.files[0]) return;
    const reader = new FileReader();
    reader.onload = function (e) { sharedCSVRoute(e.target.result); fileInput.value = ''; };
    reader.readAsText(fileInput.files[0]);
};

window.processAuditCSV = function (rawText) {
    try {
        const rows = [];
        let inQ = false; let currentLine = "";
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
            } else { currentLine += char; }
        }
        if (currentLine.trim()) rows.push(currentLine);

        function formatDate(str_val) {
            if (!str_val) return "";
            if (str_val.includes('T')) str_val = str_val.split('T')[0];
            let p;
            if (str_val.includes('/')) p = str_val.split('/');
            else if (str_val.includes('-')) p = str_val.split('-');
            else return str_val;

            if (p.length !== 3) return str_val;

            if (p[0].length === 4) {
                return `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`;
            }

            let y = parseInt(p[2], 10);
            if (y < 100) y += 2000;

            if (parseInt(p[0], 10) > 12) {
                return `${y.toString()}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
            }
            return `${y.toString()}-${p[0].padStart(2, '0')}-${p[1].padStart(2, '0')}`;
        }

        let aC = 0, uC = 0;
        if (rows.length > 0) {
            let hCols = rows[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/"/g, '').trim().toLowerCase());
            let mIdx = { date: 0, branch: 1, opening: 2, added: -1, closing: 3, sales: 5, exp: 7, indiv: -1 };
            
            hCols.forEach((h, idx) => {
                if (h.includes('date')) mIdx.date = idx;
                else if (h.includes('branch')) mIdx.branch = idx;
                else if (h.includes('opening')) mIdx.opening = idx;
                else if (h.includes('added')) mIdx.added = idx;
                else if (h.includes('closing')) mIdx.closing = idx;
                else if (h.includes('sales')) mIdx.sales = idx;
                else if (h.includes('expens')) mIdx.exp = idx;
                else if (h.includes('individual') || h.includes('transaction')) mIdx.indiv = idx;
            });

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.toLowerCase().includes("summary data") || row.toLowerCase().includes("accumulated branch") || row.toLowerCase().includes("totals")) break;

                const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/"/g, '').trim());
                if (cols.length < 3 || cols[0] === 'TOTALS' || cols[1] === 'TOTALS') continue;

                const date = formatDate(cols[mIdx.date]);
                if (!date || !date.includes('-')) continue;
                
                const branch = cols[mIdx.branch];
                const opening = parseFloat(cols[mIdx.opening]) || 0;
                const added = mIdx.added > -1 ? parseFloat(cols[mIdx.added]) || 0 : 0;
                const closing = parseFloat(cols[mIdx.closing]) || 0;
                const salesTotal = parseFloat(cols[mIdx.sales]) || 0;
                const expenses = parseFloat(cols[mIdx.exp]) || 0;

                let salesArray = [];
                if (mIdx.indiv > -1 && cols.length > mIdx.indiv && cols[mIdx.indiv].trim() !== '') {
                    salesArray = cols[mIdx.indiv].split('|').map(s => parseFloat(s)).filter(s => !isNaN(s));
                }
                if (salesArray.length === 0) {
                    salesArray = [salesTotal];
                }

                const entry = {
                    id: Date.now() + i,
                    date: date,
                    branch: branch,
                    opening: opening,
                    added: added,
                    closing: closing,
                    sales: salesArray,
                    expenses: expenses
                };

                const exIdx = auditData.findIndex(ex => ex.date === date && ex.branch === branch);
                if (exIdx > -1) {
                    auditData[exIdx] = entry; uC++;
                } else {
                    auditData.push(entry); aC++;
                }
            }
        }
        AppStorage.setItem("auditData_v20", JSON.stringify(auditData));

        let hasBranchAuditCol = (rows.length > 0 && rows[0].toLowerCase().includes('branch'));
        let uniqueAuditBranches = new Set(auditData.map(e => (e.branch || "").trim()).filter(b => b !== ""));
        let hasBranchAudit = hasBranchAuditCol || uniqueAuditBranches.size > 1 || auditData.some(e => e.branch && e.branch.trim() !== "Main Branch" && e.branch.trim() !== "Branch A" && e.branch.trim() !== "");

        let settingsChangedAudit = false;
        if (hasBranchAudit) {
            if (!document.getElementById('toggleBranch').checked) {
                document.getElementById('toggleBranch').checked = true;
                settingsChangedAudit = true;
            }
            if (!document.getElementById('toggleBranchSummary').checked) {
                document.getElementById('toggleBranchSummary').checked = true;
                settingsChangedAudit = true;
            }
        }
        if (settingsChangedAudit) saveSettings();

        renderAll();
        alert(`Audit Synced: ${aC} new, ${uC} updated.`);
    } catch (e) { alert("Format Error: " + e.message); }
};

window.updateAuditBranchFromDropdown = function () {
    const sel = document.getElementById("auditBranchSelectDropdown").value;
    if (sel !== "__SELECT__") {
        document.getElementById("auditBranchName").value = sel;
        if (typeof checkExistingAudit === 'function') checkExistingAudit();
    }
};

window.checkExistingAudit = function () {
    const branch = document.getElementById("auditBranchName").value;
    const date = document.getElementById("auditDate").value;
    if (!branch || !date) return;

    const e = auditData.find(x => x.branch === branch && x.date === date);
    if (!e && !editingAuditId) {
        const previousEntries = auditData.filter(x => x.branch === branch && x.date < date).sort((a, b) => b.date.localeCompare(a.date));
        if (previousEntries.length > 0 && document.getElementById("auditOpening").value === "") {
            const pe = previousEntries[0];
            const p_o = parseFloat(pe.opening) || 0;
            const p_ex = parseFloat(pe.expenses) || 0;
            const p_added = parseFloat(pe.added) || 0;
            const p_net = p_o - p_ex + p_added;
            document.getElementById("auditOpening").value = p_net.toFixed(2);
        }
    }

    if (e) {
        if (editingAuditId && editingAuditId === e.id) return;
        if (document.getElementById("auditOpening").value !== "" && !editingAuditId) {
            if (!confirm(`An existing audit record for ${branch} on ${date} was found. Would you like to load and overwrite your current form data?`)) return;
        }
        editingAuditId = e.id;
        document.getElementById('auditDate').value = e.date;
        document.getElementById('auditBranchName').value = e.branch || "";
        document.getElementById('auditOpening').value = e.opening || "";
        document.getElementById('auditAdded').value = e.added || "0.00";
        document.getElementById('auditClosing').value = e.closing || "";
        document.getElementById('auditExpenses').value = e.expenses || "0";

        const container = document.getElementById('sales-container-audit');
        container.innerHTML = "";

        if (e.sales && e.sales.length > 0) {
            e.sales.forEach(val => {
                const el = document.createElement('div');
                el.style.display = "flex"; el.style.alignItems = "center"; el.style.marginBottom = "5px";
                el.innerHTML = `
                <span style="font-weight:bold; color:#777; margin-right:5px;" class="currency-label">${getCurrencySymbol()}</span>
                <input type="number" class="sale-in-audit" step="0.01" value="${val}" oninput="calcAudit()" style="flex:1">
                <button onclick="this.parentElement.remove(); calcAudit()" style="background:none; border:none; color:red; cursor:pointer; margin-left:5px; font-weight:bold;">×</button>`;
                container.appendChild(el);
            });
        } else {
            addInputAudit();
        }
        calcAudit();
        document.getElementById("saveAuditBtn").innerText = "Update Audit Record";
    } else {
        if (editingAuditId !== null) {
            document.getElementById('auditOpening').value = "";
            document.getElementById('auditAdded').value = "0.00";
            document.getElementById('auditClosing').value = "";
            document.getElementById('auditExpenses').value = "0.00";
            document.getElementById('sales-container-audit').innerHTML = "";
            addInputAudit();
            editingAuditId = null;
            document.getElementById("saveAuditBtn").innerText = "Save / Update Audit Record";
            calcAudit();
        }
    }
};
function toggleImageViewAudit() {
    showPreprocessedAudit = !showPreprocessedAudit;
    const img = document.getElementById('preview-img-audit');
    const canvas = document.getElementById('preprocessed-preview-audit');
    const btn = document.getElementById('toggle-view-btn-audit');

    if (showPreprocessedAudit) {
        img.style.display = "none";
        canvas.style.display = "block";
        btn.innerText = "Show Original Image";
    } else {
        img.style.display = "block";
        canvas.style.display = "none";
        btn.innerText = "Show Pre-processed Image";
    }
}

function preprocessImageAudit(imgElement, callback) {
    const canvas = document.getElementById('preprocessed-preview-audit');
    const ctx = canvas.getContext('2d');

    let width = imgElement.naturalWidth;
    let height = imgElement.naturalHeight;
    const MAX_DIMENSION = 2000;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) { height = height * (MAX_DIMENSION / width); width = MAX_DIMENSION; }
        else { width = width * (MAX_DIMENSION / height); height = MAX_DIMENSION; }
    }
    canvas.width = width;
    canvas.height = height;
    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = '100%';
    ctx.drawImage(imgElement, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const contrast = 80;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2];
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        let val = factor * (gray - 128) + 128;
        val = Math.max(0, Math.min(255, val));
        data[i] = data[i + 1] = data[i + 2] = val;
    }
    ctx.putImageData(imageData, 0, 0);
    callback(canvas.toDataURL('image/png'));
}

function findAmountAudit(text, patterns) {
    for (let p of patterns) {
        const match = text.match(p);
        if (match && match[1]) {
            return match[1].replace(/[^\d.]/g, '');
        }
    }
    return null;
}

function processTextAudit(raw) {
    let txt = raw.replace(/,/g, '').replace(/O/g, '0').replace(/l/g, '1').replace(/I/g, '1');
    const startingPatterns = [/Starting[\s\w]*?Cash[\s\w:\.\-]*?\$?\s*([\d]+\.\d{2})/i, /St[a-z]*\s*Ca[a-z]*[\s\w:\.\-]*?\$?\s*([\d]+\.\d{2})/i, /5tarting[\s\w]*?Ca5h[\s\w:\.\-]*?\$?\s*([\d]+\.\d{2})/i, /Start[\s\w]*\$?\s*([\d]+\.\d{2})/i];
    let openVal = findAmountAudit(txt, startingPatterns);
    if (openVal) document.getElementById('auditOpening').value = openVal;

    const closeoutPatterns = [/Actual[\s\w]*?Closeout[\s\w:\.\-]*?\$?\s*([\d]+\.\d{2})/i, /Act[a-z]*\s*Clo[a-z]*[\s\w:\.\-]*?\$?\s*([\d]+\.\d{2})/i, /Actua1[\s\w]*?C1oseout[\s\w:\.\-]*?\$?\s*([\d]+\.\d{2})/i, /Closeout[\s\w]*?\$?\s*([\d]+\.\d{2})/i];
    let closeVal = findAmountAudit(txt, closeoutPatterns);
    if (closeVal) document.getElementById('auditClosing').value = closeVal;

    const timeRegex = /(?:\d{1,2}[\:\.]\d{2})\s*(?:AM|PM|A\.M\.|P\.M\.)?[\s\w]*?\$?\s*([\d]+[\.\ ]\d{2})/gi;
    let match;
    const container = document.getElementById('sales-container-audit');
    let found = [];
    while ((match = timeRegex.exec(txt)) !== null) { let amountStr = match[1].replace(' ', '.'); found.push(amountStr); }
    if (found.length > 0) {
        container.innerHTML = '';
        found.forEach(v => addInputAudit(v));
    }
    calcAudit();
}

function addInputAudit(val = "") {
    const div = document.createElement('div');
    div.className = "sale-row flex-container";
    const count = document.querySelectorAll('#sales-container-audit .sale-row').length + 1;
    div.innerHTML = `<span class="row-num" style="width:30px;font-weight:bold;color:#999;font-size:0.75rem;">#${count}</span>
        <input type="number" step="0.01" class="sale-in-audit" value="${val}" oninput="calcAudit()" style="flex:1;">
        <button class="btn-remove" onclick="removeInputAudit(this)" title="Remove Entry">✖</button>`;
    document.getElementById('sales-container-audit').appendChild(div);
}

function removeInputAudit(btn) {
    btn.parentElement.remove();
    const rows = document.querySelectorAll('#sales-container-audit .sale-row');
    rows.forEach((row, index) => { row.querySelector('.row-num').innerText = `#${index + 1}`; });
    calcAudit();
}

function calcAudit() {
    const open = parseFloat(document.getElementById('auditOpening').value) || 0;
    const added = parseFloat(document.getElementById('auditAdded').value) || 0;
    const close = parseFloat(document.getElementById('auditClosing').value) || 0;
    const exp = parseFloat(document.getElementById('auditExpenses').value) || 0;
    const manualSales = document.getElementById('auditRoundSales')?.value;
    const manualTips = document.getElementById('auditRoundTips')?.value;

    const rawCashOut = close - open;
    const sym = getCurrencySymbol();

    let sales = 0;
    document.querySelectorAll('.sale-in-audit').forEach(el => sales += (parseFloat(el.value) || 0));
    if (manualSales !== undefined && manualSales !== "") sales = parseFloat(manualSales) || 0;
    document.getElementById('st-sales').innerHTML = `<span class="currency-label">${sym}</span>${sales.toFixed(2)}`;

    let tips = rawCashOut - sales;
    if (Math.abs(tips) < 0.005) tips = 0;
    if (manualTips !== undefined && manualTips !== "") tips = parseFloat(manualTips) || 0;
    document.getElementById('st-tips').innerHTML = `<span class="currency-label">${sym}</span>${tips.toFixed(2)}`;
    document.getElementById('st-tips').style.color = tips === 0 ? "#777" : (tips < 0 ? "#e74c3c" : "#27ae60");

    const cashOut = sales + tips;
    document.getElementById('st-cashout').innerHTML = `<span class="currency-label">${sym}</span>${cashOut.toFixed(2)}`;

    // Net (Final Closing Balance to carry over)
    const net = close - cashOut - exp + added;
    document.getElementById('st-final').innerHTML = `<span class="currency-label">${sym}</span>${net.toFixed(2)}`;
}

function resetAuditForm(clearBranch = false) {
    document.getElementById('auditDate').value = "";
    if (clearBranch) {
        document.getElementById('auditBranchName').value = "";
        const dropdown = document.getElementById('auditBranchSelectDropdown');
        if (dropdown) dropdown.value = "";
    }
    document.getElementById('auditOpening').value = "";
    document.getElementById('auditAdded').value = "0.00";
    document.getElementById('auditClosing').value = "";
    document.getElementById('sales-container-audit').innerHTML = "";
    document.getElementById('auditExpenses').value = "0.00";
    if(document.getElementById('auditRoundSales')) document.getElementById('auditRoundSales').value = "";
    if(document.getElementById('auditRoundTips')) document.getElementById('auditRoundTips').value = "";
    document.getElementById('uploadAudit').value = "";
    document.getElementById('preview-img-audit').style.display = 'none';
    document.getElementById('preprocessed-preview-audit').style.display = 'none';
    document.getElementById('ocr-status-audit').innerText = '';
    document.getElementById('toggle-view-btn-audit').style.display = 'none';
    addInputAudit();
    calcAudit();
    editingAuditId = null;
    document.getElementById('saveAuditBtn').innerText = "Save / Update Audit Record";
}

window.saveAuditEntry = function () {
    const date = document.getElementById('auditDate').value;
    const branch = document.getElementById('auditBranchName').value;
    if (!date) { alert("Date is required."); return; }

    let targetId = editingAuditId;
    if (!targetId) {
        const existingExact = auditData.find(a => a.date === date && a.branch === branch);
        const existingEmpty = auditData.find(a => a.date === date && (!a.branch || a.branch.trim() === ""));
        if (existingExact) {
            if (!confirm(`An existing audit record for ${branch || 'the selected branch'} on ${date} already exists. Are you sure you want to overwrite it?`)) return;
            targetId = existingExact.id;
        } else if (existingEmpty && branch.trim() !== "") {
            if (confirm(`An unassigned record (empty branch) exists on ${date}. Do you want to update its branch to '${branch}'?`)) {
                targetId = existingEmpty.id;
            }
        }
    }

    const entry = {
        id: targetId || Date.now(),
        date: date,
        branch: branch,
        opening: document.getElementById('auditOpening').value,
        added: document.getElementById('auditAdded').value || "0",
        closing: document.getElementById('auditClosing').value,
        sales: Array.from(document.querySelectorAll('.sale-in-audit')).map(e => e.value),
        expenses: document.getElementById('auditExpenses').value,
        roundSales: document.getElementById('auditRoundSales')?.value || "",
        roundTips: document.getElementById('auditRoundTips')?.value || ""
    };

    if (targetId) {
        const ix = auditData.findIndex(a => a.id === targetId);
        if (ix > -1) auditData[ix] = entry;
    } else {
        auditData.push(entry);
    }

    let img = document.getElementById("preview-img-audit");
    if (img && img.style.display === "block" && img.src && window.saveImage) {
        window.saveImage(entry.id, img.src);
    }

    AppStorage.setItem("auditData_v20", JSON.stringify(auditData));
    resetAuditForm();
    renderAll();
};

window.deleteAuditEntry = function (id) {
    const p = prompt("Security PIN required:");
    if (p === appSettings.securityPin) {
        if (confirm("Delete audit record?")) {
            auditData = auditData.filter(e => e.id !== id);
            AppStorage.setItem("auditData_v20", JSON.stringify(auditData));
            renderAll();
        }
    } else if (p) { alert("Incorrect PIN."); }
};

window.editAuditEntry = function (id) {
    const entry = auditData.find(e => e.id == id); // Use loose equality since Date.now() is numeric but passed as string
    if (!entry) return;
    editingAuditId = entry.id;
    document.getElementById('auditDate').value = entry.date;
    document.getElementById('auditBranchName').value = entry.branch || "";
    document.getElementById('auditOpening').value = entry.opening || "";
    document.getElementById('auditAdded').value = entry.added || "0.00";
    document.getElementById('auditClosing').value = entry.closing || "";
    document.getElementById('auditExpenses').value = entry.expenses || "0";
    if(document.getElementById('auditRoundSales')) document.getElementById('auditRoundSales').value = (entry.roundSales === true) ? "" : (entry.roundSales || "");
    if(document.getElementById('auditRoundTips')) document.getElementById('auditRoundTips').value = (entry.roundTips === true) ? "" : (entry.roundTips || "");

    const cont = document.getElementById('sales-container-audit');
    cont.innerHTML = '';
    if (entry.sales && entry.sales.length > 0) {
        entry.sales.forEach(s => addInputAudit(s));
    } else {
        addInputAudit();
    }
    calcAudit();
    document.getElementById('saveAuditBtn').innerText = "Update Audit Record";
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (window.loadImage) {
        window.loadImage(id).then(img => {
            const preview = document.getElementById("preview-img-audit");
            const hint = document.getElementById("hintAudit");
            if (img && preview) {
                preview.src = img; preview.style.display = "block";
                if (hint) hint.style.display = "none";
            }
        });
    }
};

window.renderAuditData = function () {
    const body = document.getElementById('auditHistoryBody');
    if (!body) return;
    body.innerHTML = '';
    const sym = getCurrencySymbol();

    const vBranch = document.getElementById("branchFilter") ? document.getElementById("branchFilter").value : "ALL";
    let fStart = document.getElementById("filterStartDate") ? document.getElementById("filterStartDate").value : null;
    let fEnd = document.getElementById("filterEndDate") ? document.getElementById("filterEndDate").value : null;

    let display = auditData.filter(e => {
        let matchBranch = (vBranch === "ALL" || e.branch === vBranch);
        let matchDate = true;
        if (fStart || fEnd) {
            let rd = new Date(e.date);
            if (fStart && rd < new Date(fStart)) matchDate = false;
            if (fEnd && rd > new Date(fEnd)) matchDate = false;
        }
        return matchBranch && matchDate;
    });

    display.sort((a, b) => {
        let valA, valB;
        if (auditSortCol === 'date') {
            valA = a.date;
            valB = b.date;
        } else if (auditSortCol === 'branch') {
            valA = (a.branch || '').toLowerCase();
            valB = (b.branch || '').toLowerCase();
        }

        if (valA < valB) return auditSortAsc ? -1 : 1;
        if (valA > valB) return auditSortAsc ? 1 : -1;
        return 0;
    });

    const dIcon = document.getElementById("auditSortIconDate");
    const bIcon = document.getElementById("auditSortIconBranch");
    if (dIcon) {
        dIcon.innerText = auditSortCol === 'date' ? (auditSortAsc ? '▲' : '▼') : '↕';
        dIcon.style.color = auditSortCol === 'date' ? '#ffc107' : '#ffffff';
        dIcon.style.fontSize = '14px';
    }
    if (bIcon) {
        bIcon.innerText = auditSortCol === 'branch' ? (auditSortAsc ? '▲' : '▼') : '↕';
        bIcon.style.color = auditSortCol === 'branch' ? '#ffc107' : '#ffffff';
        bIcon.style.fontSize = '14px';
    }

    const hdrB = document.getElementById("hdrBranchAudit");
    if (hdrB) hdrB.style.display = appSettings.showBranch ? '' : 'none';
    const contB = document.getElementById("auditBranchContainer");
    if (contB) contB.style.display = appSettings.showBranch ? 'block' : 'none';

    let tCashOut = 0, tSales = 0, tTips = 0, tExp = 0, tNet = 0;

    display.forEach(a => {
        const o = parseFloat(a.opening) || 0;
        const added = parseFloat(a.added) || 0;
        const c = parseFloat(a.closing) || 0;
        const ex = parseFloat(a.expenses) || 0;
        let sTotal = (a.sales || []).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
        if (a.roundSales !== undefined && a.roundSales !== false && a.roundSales !== "") sTotal = (a.roundSales === true) ? Math.round(sTotal) : parseFloat(a.roundSales);
        const rawCout = c - o;
        let tips = rawCout - sTotal;
        if (Math.abs(tips) < 0.005) tips = 0;
        if (a.roundTips !== undefined && a.roundTips !== false && a.roundTips !== "") tips = (a.roundTips === true) ? Math.round(tips) : parseFloat(a.roundTips);
        const cout = sTotal + tips;
        const net = c - cout - ex + added;

        tCashOut += cout; tSales += sTotal; tTips += tips; tExp += ex; tNet += net;

        const d = a.date.split('-').slice(1).concat(a.date.split('-')[0]).join('-');

        let brCell = appSettings.showBranch ? `<td style="text-align: left; padding-left: 15px;">${a.branch}</td>` : '<td style="display:none"></td>';

        let tipsColor = tips === 0 ? '#777' : (tips < 0 ? '#e74c3c' : '#27ae60');

        body.innerHTML += `<tr>
            <td>${d}</td>
            ${brCell}
            <td>${sym}${o.toFixed(2)}</td>
            <td>${sym}${added.toFixed(2)}</td>
            <td>${sym}${c.toFixed(2)}</td>
            <td>${sym}${cout.toFixed(2)}</td>
            <td>${sym}${sTotal.toFixed(2)}</td>
            <td style="font-weight:bold; color:${tipsColor}">${sym}${tips.toFixed(2)}</td>
            <td>${sym}${ex.toFixed(2)}</td>
            <td style="font-weight:bold">${sym}${net.toFixed(2)}</td>
            <td>
                <button class="btn-edit-small" onclick="editAuditEntry('${a.id}')">Edit</button>
                <button class="btn-danger-x" onclick="deleteAuditEntry('${a.id}')">×</button>
            </td>
        </tr>`;
    });

    if (display.length > 0) {
        if (Math.abs(tTips) < 0.005) tTips = 0;
        let tTipsColor = tTips === 0 ? '#777' : (tTips < 0 ? '#e74c3c' : '#27ae60');

        body.innerHTML += `<tr class="totals-row" style="background:#eaeff5; font-weight:bold;">
            <td colspan="${appSettings.showBranch ? 5 : 4}" style="text-align:right">Audit Totals:</td>
            <td>${sym}${tCashOut.toFixed(2)}</td>
            <td>${sym}${tSales.toFixed(2)}</td>
            <td style="color:${tTipsColor}">${sym}${tTips.toFixed(2)}</td>
            <td>-</td>
            <td>-</td>
            <td></td>
        </tr>`;
    }
};

window.executeAuditBulkUpdate = function () {
    const sourceBranch = document.getElementById("auditBulkBranchSelect").value;
    const targetName = document.getElementById("auditBranchName").value.trim();
    if (sourceBranch === "__SELECT__") return alert("Select a Target Branch Record from the dropdown to apply changes to.");
    if (!targetName) return alert("Please type a new branch name in the 'Enter Branch' field to apply.");
    const p = prompt("Security PIN required for global update:");
    if (p === appSettings.securityPin) {
        if (confirm(`Change branch for ${sourceBranch === "ALL" ? "ALL Audit records" : "Audit records matching '" + sourceBranch + "'"} to '${targetName}'?`)) {
            let updated = 0;
            auditData.forEach(e => {
                if (sourceBranch === "ALL" || e.branch === sourceBranch) {
                    e.branch = targetName;
                    updated++;
                }
            });
            if (updated > 0) {
                AppStorage.setItem("auditData_v20", JSON.stringify(auditData));
                renderAll();
                alert(`Mass Update Complete. ${updated} records changed.`);
            } else {
                alert("No records found to update.");
            }
        }
    } else if (p) { alert("Incorrect PIN."); }
};

window.clearAuditBranchHistory = function (branch) {
    const p = prompt("Security PIN required to wipe Cash & Tips Branch history:");
    if (p === appSettings.securityPin) {
        if (confirm(`Permanently delete all Audit records for branch '${branch}'?`)) {
            auditData = auditData.filter(d => d.branch !== branch);
            AppStorage.setItem("auditData_v20", JSON.stringify(auditData));
            renderAll();
            alert(`Branch '${branch}' Cash & Tips data deleted.`);
        }
    } else if (p) { alert("Incorrect PIN."); }
};

window.generateAuditBranchPdf = function (branchName) {
    let display = auditData.filter(e => e.branch === branchName);

    const sD = document.getElementById("filterStartDate") ? document.getElementById("filterStartDate").value : null;
    const eD = document.getElementById("filterEndDate") ? document.getElementById("filterEndDate").value : null;
    if (sD) display = display.filter(e => e.date >= sD);
    if (eD) display = display.filter(e => e.date <= eD);

    if (display.length === 0) return alert("No audit records for this branch in the selected date range.");

    display.sort((a, b) => a.date.localeCompare(b.date));

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const sym = getCurrencySymbol();

    let currentY = 15;

    let logoToUse = appSettings.companyLogo;
    if (appSettings.showBranchLogos && appSettings.branchLogos && appSettings.branchLogos[branchName]) {
        logoToUse = appSettings.branchLogos[branchName];
    }

    if (logoToUse) {
        try {
            doc.addImage(logoToUse, 'PNG', 14, currentY, 40, 40, '', 'FAST');
            currentY += 45;
        } catch (e) {
            console.error("Logo inject failed:", e);
        }
    }

    doc.setFontSize(22);
    doc.text("Branch Audit Statement", 14, currentY);
    currentY += 10;

    doc.setFontSize(12);
    doc.text(`Branch: ${branchName}`, 14, currentY);
    currentY += 7;
    const dateStr = new Date().toLocaleDateString();
    doc.text(`Generated on: ${dateStr}`, 14, currentY);
    currentY += 7;
    if (sD || eD) {
        doc.text(`Audit Period: ${window.formatDisplayDate(sD) || 'Beginning'} to ${window.formatDisplayDate(eD) || 'Present'}`, 14, currentY);
    } else {
        doc.text(`Audit Period: All Time`, 14, currentY);
    }
    currentY += 7;

    currentY += 5;

    const tableHeaders = [["Date", "Opening", "Cash Out", "Sales", "Tips", "Actual Closeout", "Closing"]];
    const tableRows = display.map(d => {
        const o = parseFloat(d.opening) || 0;
        const c = parseFloat(d.closing) || 0;
        let sTotal = (d.sales || []).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
        if (d.roundSales !== undefined && d.roundSales !== false && d.roundSales !== "") sTotal = (d.roundSales === true) ? Math.round(sTotal) : parseFloat(d.roundSales);
        const rawCout = c - o;
        let tips = rawCout - sTotal;
        if (d.roundTips !== undefined && d.roundTips !== false && d.roundTips !== "") tips = (d.roundTips === true) ? Math.round(tips) : parseFloat(d.roundTips);
        const cout = sTotal + tips;

        const futureRecs = auditData.filter(item => item.branch === d.branch && item.date > d.date);
        futureRecs.sort((a, b) => a.date.localeCompare(b.date));
        const nextOp = futureRecs.length > 0 ? (parseFloat(futureRecs[0].opening) || 0) : null;
        const closingColText = nextOp !== null ? `${sym}${nextOp.toFixed(2)}` : '-';

        return [
            window.formatDisplayDate(d.date),
            `${sym}${o.toFixed(2)}`,
            `${sym}${cout.toFixed(2)}`,
            `${sym}${sTotal.toFixed(2)}`,
            `${sym}${tips.toFixed(2)}`,
            `${sym}${c.toFixed(2)}`,
            closingColText
        ];
    });

    doc.autoTable({
        head: tableHeaders,
        body: tableRows,
        startY: currentY,
        styles: { halign: 'left' },
        headStyles: { fillColor: [52, 152, 219] },
    });

    let tCO = 0, tS = 0, tTips = 0;
    display.forEach(r => {
        const o = parseFloat(r.opening) || 0;
        const c = parseFloat(r.closing) || 0;
        let sTotal = (r.sales || []).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
        if (r.roundSales !== undefined && r.roundSales !== false && r.roundSales !== "") sTotal = (r.roundSales === true) ? Math.round(sTotal) : parseFloat(r.roundSales);
        const rawCout = c - o;
        let tips = rawCout - sTotal;
        if (r.roundTips !== undefined && r.roundTips !== false && r.roundTips !== "") tips = (r.roundTips === true) ? Math.round(tips) : parseFloat(r.roundTips);
        const cout = sTotal + tips;
        tCO += cout;
        tS += sTotal;
        tTips += tips;
    });

    let finalY = doc.lastAutoTable.finalY + 15;
    if (finalY + 25 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        finalY = 20;
    }

    doc.setFontSize(14);
    doc.text(`Total Cash Out: ${sym}${tCO.toFixed(2)}`, 14, finalY);
    finalY += 8;
    doc.text(`Total Gross Sales: ${sym}${tS.toFixed(2)}`, 14, finalY);
    finalY += 8;
    doc.text(`Total Tips: ${sym}${tTips.toFixed(2)}`, 14, finalY);

    doc.save(`${branchName}_Audit_Statement.pdf`);
};

window.renderAuditReports = function () {
    const tableBody = document.querySelector("#auditBranchSummaryTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = '';
    const sym = getCurrencySymbol();

    const vBranch = document.getElementById("branchFilter") ? document.getElementById("branchFilter").value : "ALL";
    let fStart = document.getElementById("filterStartDate") ? document.getElementById("filterStartDate").value : null;
    let fEnd = document.getElementById("filterEndDate") ? document.getElementById("filterEndDate").value : null;

    let display = auditData.filter(e => {
        let matchBranch = (vBranch === "ALL" || e.branch === vBranch);
        let matchDate = true;
        if (fStart || fEnd) {
            let rd = new Date(e.date);
            if (fStart && rd < new Date(fStart)) matchDate = false;
            if (fEnd && rd > new Date(fEnd)) matchDate = false;
        }
        return matchBranch && matchDate;
    });

    display.sort((a, b) => a.date.localeCompare(b.date));

    // Sales Graph
    const ctxSales = document.getElementById("auditSalesGraph");
    const ctxTips = document.getElementById("auditTipsGraph");

    if (ctxSales && ctxTips && typeof Chart !== 'undefined') {
        const dates = [...new Set(display.map(d => d.date))].sort();
        const salesData = [];
        const tipsData = [];

        dates.forEach(d => {
            let dateRecords = display.filter(r => r.date === d);
            let dSales = 0, dTips = 0;
            dateRecords.forEach(r => {
                const o = parseFloat(r.opening) || 0;
                const c = parseFloat(r.closing) || 0;
                const ex = parseFloat(r.expenses) || 0;
                let sTotal = (r.sales || []).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
                if (r.roundSales !== undefined && r.roundSales !== false && r.roundSales !== "") sTotal = (r.roundSales === true) ? Math.round(sTotal) : parseFloat(r.roundSales);
                const rawCout = c - o;
                let tips = rawCout - sTotal;
                if (r.roundTips !== undefined && r.roundTips !== false && r.roundTips !== "") tips = (r.roundTips === true) ? Math.round(tips) : parseFloat(r.roundTips);
                const cout = sTotal + tips;
                dTips += tips;
                dSales += sTotal;
            });
            salesData.push(dSales);
            tipsData.push(dTips);
        });

        if (window.auditSalesChartInstance) window.auditSalesChartInstance.destroy();
        window.auditSalesChartInstance = new Chart(ctxSales, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [{
                    label: `Gross Sales (${sym})`,
                    data: salesData,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });

        if (window.auditTipsChartInstance) window.auditTipsChartInstance.destroy();
        window.auditTipsChartInstance = new Chart(ctxTips, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: `Tips (${sym})`,
                    data: tipsData,
                    backgroundColor: 'rgba(83, 211, 151, 0.2)',
                    borderColor: 'rgba(83, 211, 151, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.2
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // Branch Aggregation
    const branches = [...new Set(display.map(d => d.branch))];
    branches.sort((a, b) => auditBranchSortAsc ? (a || '').localeCompare(b || '') : (b || '').localeCompare(a || ''));

    const abIcon = document.getElementById("auditBranchSortIcon");
    if (abIcon) {
        abIcon.innerText = auditBranchSortAsc ? '▲' : '▼';
        abIcon.style.color = '#ffc107';
        abIcon.style.fontSize = '14px';
    }

    branches.forEach(b => {
        let bR = display.filter(r => r.branch === b);
        let tO = 0, tC = 0, tCO = 0, tS = 0, tTips = 0, tEx = 0, tNet = 0;

        bR.forEach(r => {
            const o = parseFloat(r.opening) || 0; tO += o;
            const c = parseFloat(r.closing) || 0; tC += c;
            const ex = parseFloat(r.expenses) || 0; tEx += ex;
            let sTotal = (r.sales || []).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
            if (r.roundSales !== undefined && r.roundSales !== false && r.roundSales !== "") sTotal = (r.roundSales === true) ? Math.round(sTotal) : parseFloat(r.roundSales);
            tS += sTotal;
            const rawCout = c - o;
            let tips = rawCout - sTotal;
            if (r.roundTips !== undefined && r.roundTips !== false && r.roundTips !== "") tips = (r.roundTips === true) ? Math.round(tips) : parseFloat(r.roundTips);
            const cout = sTotal + tips; tCO += cout;
            tTips += tips;
            const net = c - cout - ex; tNet += net;
        });

        if (Math.abs(tTips) < 0.005) tTips = 0;
        let branchTipsColor = tTips === 0 ? '#777' : (tTips < 0 ? '#e74c3c' : '#27ae60');

        tableBody.innerHTML += `<tr>
            <td style="text-align: left; padding-left: 15px;">${b || '<i>Unassigned</i>'}</td>
            <td>${sym}${tCO.toFixed(2)}</td>
            <td>${sym}${tS.toFixed(2)}</td>
            <td style="color:${branchTipsColor}">${sym}${tTips.toFixed(2)}</td>
            <td><button class="btn-primary" onclick="generateAuditBranchPdf('${b}')" style="margin:0; padding: 4px 8px; font-size:11px;">📄 PDF</button></td>
            <td><button class="btn-danger-x" onclick="clearAuditBranchHistory('${b}')" title="Clear Branch">×</button></td>
        </tr>`;
    });
};

window.toggleAuditSort = function (col) {
    if (auditSortCol === col) {
        auditSortAsc = !auditSortAsc;
    } else {
        auditSortCol = col;
        auditSortAsc = col === 'branch' ? true : false;
    }
    if (typeof renderAuditData === "function") renderAuditData();
};

window.toggleMainSort = function (col) {
    if (mainSortCol === col) {
        mainSortAsc = !mainSortAsc;
    } else {
        mainSortCol = col;
        mainSortAsc = col === 'branch' ? true : false;
    }
    renderAll();
};

window.toggleSummarySort = function () {
    summarySortAsc = !summarySortAsc;
    renderAll();
};

window.toggleBranchSort = function () {
    branchSortAsc = !branchSortAsc;
    renderAll();
};

window.toggleAuditBranchSort = function () {
    auditBranchSortAsc = !auditBranchSortAsc;
    renderAuditReports();
};

window.drawOcrHighlights = function (canvasId, words) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !words) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = 'rgba(46, 204, 113, 0.8)';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(46, 204, 113, 0.2)';
    words.forEach(w => {
        const b = w.bbox;
        ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
        ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    });
};

window.toggleTableCol = function (tableId, nTh, show) {
    let style = document.getElementById(`col-style-${tableId}-${nTh}`);
    if (!style) {
        style = document.createElement("style");
        style.id = `col-style-${tableId}-${nTh}`;
        document.head.appendChild(style);
    }
    style.innerHTML = show ? "" : `#${tableId} tr:not(.totals-row) td:nth-child(${nTh}), #${tableId} tr:not(.totals-row) th:nth-child(${nTh}) { display: none !important; }`;
};

const DB_NAME = "PayrollImagesDB";
const STORE_NAME = "images";
function getDB() {
    return new Promise((res, rej) => {
        let req = window.indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = e => { if (!e.target.result.objectStoreNames.contains(STORE_NAME)) e.target.result.createObjectStore(STORE_NAME); };
        req.onsuccess = e => res(e.target.result);
        req.onerror = e => rej(e.target.error);
    });
}
window.saveImage = async function (id, dataUrl) {
    try { let db = await getDB(); db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(dataUrl, id); } catch (e) { }
};
window.loadImage = async function (id) {
    return new Promise(async res => {
        try { let db = await getDB(); let req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id); req.onsuccess = () => res(req.result); req.onerror = () => res(null); } catch (e) { res(null); }
    });
};

window.prepareAuditPrint = function () {
    const selDate = document.getElementById("auditDate").value;
    const branch = document.getElementById("auditBranchName").value;
    let titleStr = "";

    if (selDate) {
        titleStr += new Date(selDate + 'T00:00:00').toLocaleDateString();
    } else {
        titleStr += "Current View";
    }

    if (branch) {
        titleStr += ` - ${branch}`;
    }

    document.getElementById("printAuditDate").innerText = titleStr;
    window.print();
};
