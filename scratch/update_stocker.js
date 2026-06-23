const fs = require('fs');

let content = fs.readFileSync('public/Stocker.html', 'utf8');

// 1. Add API_BASE
if (!content.includes('const API_BASE')) {
    content = content.replace('<script>', `<script>\n        const API_BASE = window.location.port === '3000' ? '' : 'http://localhost:3000';`);
    console.log('Added API_BASE to Stocker.html');
}

// 2. Replace local fetch calls
content = content.replace(
    /await fetch\(\`\/api\/medicines\?search=\$\{encodeURIComponent\(searchText\)\}\&limit\=15\`\)/g,
    'await fetch(API_BASE + `/api/medicines?search=${encodeURIComponent(searchText)}&limit=15`)'
);

content = content.replace(
    /await fetch\(\'\/api\/medicines\'\)/g,
    "await fetch(API_BASE + '/api/medicines')"
);

content = content.replace(
    /fetch\(\'\/api\/medicines\/dispatch\'/g,
    "fetch(API_BASE + '/api/medicines/dispatch'"
);

content = content.replace(
    /await fetch\(\`\/api\/orders\/executive\/status\?hospital_name\=\$\{encodeURIComponent\(HOSPITAL_NAME\)\}\`\)/g,
    'await fetch(API_BASE + `/api/orders/executive/status?hospital_name=${encodeURIComponent(HOSPITAL_NAME)}`)'
);

content = content.replace(
    /fetch\(\'\/api\/orders\/place\'/g,
    "fetch(API_BASE + '/api/orders/place'"
);

content = content.replace(
    /fetch\(\'\/api\/medicines\/restock\'/g,
    "fetch(API_BASE + '/api/medicines/restock'"
);

// 3. Update saveSettings
const oldSaveSettings = `        function saveSettings(event) {
            event.preventDefault();

            const username = document.getElementById('settings-username').value;
            const email = document.getElementById('settings-email').value;
            const newPass = document.getElementById('settings-new-password').value;
            const confirmPass = document.getElementById('settings-confirm-password').value;

            if (newPass || confirmPass) {
                if (newPass !== confirmPass) {
                    showToast('❌ New passwords do not match!');
                    return;
                }
                if (newPass.length < 6) {
                    showToast('❌ New password must be at least 6 characters!');
                    return;
                }
            }

            const stored = sessionStorage.getItem('stockerProfile');
            if (stored) {
                const p = JSON.parse(stored);
                p.name = username;
                p.email = email;
                if (newPass) {
                    p.password = newPass;
                }
                sessionStorage.setItem('stockerProfile', JSON.stringify(p));

                const ua = JSON.parse(localStorage.getItem('userAccount') || '{}');
                if (ua.username === p.username) {
                    ua.name = username;
                    ua.email = email;
                    if (newPass) ua.password = newPass;
                    localStorage.setItem('userAccount', JSON.stringify(ua));
                }

                const all = JSON.parse(localStorage.getItem('smartMediStockUsers') || '{}');
                if (all[p.username]) {
                    all[p.username].name = username;
                    all[p.username].email = email;
                    if (newPass) all[p.username].password = newPass;
                    localStorage.setItem('smartMediStockUsers', JSON.stringify(all));
                }
            }

            document.getElementById('settings-new-password').value = '';
            document.getElementById('settings-confirm-password').value = '';

            initProfile();
            showToast('✅ Settings saved successfully!');
        }`;

const newSaveSettings = `        function saveSettings(event) {
            event.preventDefault();

            const username = document.getElementById('settings-username').value;
            const email = document.getElementById('settings-email').value;
            const newPass = document.getElementById('settings-new-password').value;
            const confirmPass = document.getElementById('settings-confirm-password').value;

            if (newPass || confirmPass) {
                if (newPass !== confirmPass) {
                    showToast('❌ New passwords do not match!');
                    return;
                }
                if (newPass.length < 6) {
                    showToast('❌ New password must be at least 6 characters!');
                    return;
                }
            }

            const bodyPayload = {
                username: USERNAME,
                email: email,
                name: username
            };
            if (newPass) {
                bodyPayload.password = newPass;
            }

            fetch(API_BASE + '/api/user/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    showToast('❌ Failed to save settings on server: ' + data.error);
                } else {
                    const stored = sessionStorage.getItem('stockerProfile');
                    if (stored) {
                        const p = JSON.parse(stored);
                        p.name = username;
                        p.email = email;
                        if (newPass) p.password = newPass;
                        sessionStorage.setItem('stockerProfile', JSON.stringify(p));
                    }
                    showToast('✅ Settings saved successfully!');
                }
            })
            .catch(err => {
                showToast('❌ Server error updating settings');
                console.error(err);
            });
        }`;

content = content.replace(oldSaveSettings, newSaveSettings);

// 4. Update saveProfile
const oldSaveProfile = `        function saveProfile() {
            const stored = sessionStorage.getItem('stockerProfile');
            if (!stored) return;
            const p = JSON.parse(stored);
            p.name = document.getElementById('input-name').value;
            p.email = document.getElementById('input-email').value;
            const np = document.getElementById('input-pass').value;
            if (np) p.password = np;
            sessionStorage.setItem('stockerProfile', JSON.stringify(p));
            const ua = JSON.parse(localStorage.getItem('userAccount') || '{}');
            if (ua.username === p.username) { ua.name = p.name; ua.email = p.email; if (np) ua.password = np; localStorage.setItem('userAccount', JSON.stringify(ua)); }
            const all = JSON.parse(localStorage.getItem('smartMediStockUsers') || '{}');
            if (all[p.username]) { all[p.username].name = p.name; all[p.username].email = p.email; if (np) all[p.username].password = np; localStorage.setItem('smartMediStockUsers', JSON.stringify(all)); }
            initProfile();
            showToast('✅ Profile Updated!');
        }`;

const newSaveProfile = `        function saveProfile() {
            const stored = sessionStorage.getItem('stockerProfile');
            if (!stored) return;
            const p = JSON.parse(stored);
            const name = document.getElementById('input-name').value;
            const email = document.getElementById('input-email').value;
            const np = document.getElementById('input-pass').value;

            const bodyPayload = {
                username: p.username || USERNAME,
                email: email,
                name: name
            };
            if (np) {
                bodyPayload.password = np;
            }

            fetch(API_BASE + '/api/user/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    showToast('❌ Failed to update profile on server: ' + data.error);
                } else {
                    p.name = name;
                    p.email = email;
                    if (np) p.password = np;
                    sessionStorage.setItem('stockerProfile', JSON.stringify(p));
                    initProfile();
                    showToast('✅ Profile Updated!');
                }
            })
            .catch(err => {
                showToast('❌ Server error updating profile');
                console.error(err);
            });
        }`;

content = content.replace(oldSaveProfile, newSaveProfile);

// 5. Update renderPredictionChart
const oldRenderPredictionChart = `        async function renderPredictionChart() {
            const ctx = document.getElementById('predBarChart');
            if (!ctx) return;

            const year = document.getElementById('yearFilter')?.value || '2026';
            const period = document.getElementById('predPeriodFilter')?.value || 'weekly';
            const pr = document.getElementById('prBody');

            const historicalSales = bills.reduce((acc, bill) => {
                const medName = bill.med;
                if (!acc[medName]) acc[medName] = [];
                acc[medName].push({ date: bill.date, qty: bill.qty });
                return acc;
            }, {});

            const medicineData = activeMedicines.map(m => ({
                id: m.id,
                name: m.name,
                currentStock: m.quantity,
                historical: historicalSales[m.name] || []
            }));

            medicineData.sort((a, b) => a.name.localeCompare(b.name));
            const topMeds = medicineData.slice(0, 12);

            const predictions = topMeds.map(med => {
                const hist = med.historical;
                let predicted = med.currentStock * 0.8;

                if (hist.length > 0) {
                    const totalQty = hist.reduce((sum, h) => sum + h.qty, 0);
                    const avgSales = totalQty / Math.max(hist.length, 1);
                    const recent = hist.slice(-7);
                    const recentAvg = recent.length > 0 ? recent.reduce((s, h) => s + h.qty, 0) / recent.length : avgSales;
                    const dailyDemand = Math.max(recentAvg, avgSales * 0.5);
                    const weeks = period === 'weekly' ? 4 : 8;
                    predicted = dailyDemand * weeks * 0.9 + med.currentStock * 0.3;
                }

                const yearFactor = 1 + (parseInt(year) - 2024) * 0.05;
                predicted = Math.max(10, Math.round(predicted * yearFactor));

                let status, confidence;
                if (predicted > med.currentStock * 1.5) {
                    status = "Critical Risk";
                    confidence = Math.round(70 + Math.random() * 20);
                } else if (predicted > med.currentStock * 1.1) {
                    status = "Moderate Restock";
                    confidence = Math.round(70 + Math.random() * 20);
                } else {
                    status = "Stable";
                    confidence = Math.round(75 + Math.random() * 20);
                }

                return {
                    medicine_id: med.id,
                    medicine_name: med.name,
                    current_stock: med.currentStock,
                    predicted_demand: predicted,
                    status: status,
                    confidence: confidence,
                    historical_days: hist.length
                };
            });

            if (pr) {
                pr.innerHTML = '';
                predictions.forEach(p => {
                    const statusClass = p.status === 'Critical Risk' ? 'status-critical' :
                        p.status === 'Moderate Restock' ? 'status-moderate' : 'status-stable';
                    pr.innerHTML += \`<tr>
                        <td><b>\${p.medicine_id}</b></td>
                        <td><b>\${p.medicine_name}</b></td>
                        <td><span class="prediction-value">\${p.predicted_demand}</span></td>
                        <td><span class="\${statusClass}">\${p.status} (\${p.confidence}%)</span></td>
                    </tr>\`;
                });
            }`;

const newRenderPredictionChart = `        async function renderPredictionChart() {
            const ctx = document.getElementById('predBarChart');
            if (!ctx) return;

            const year = document.getElementById('yearFilter')?.value || '2026';
            const period = document.getElementById('predPeriodFilter')?.value || 'weekly';
            const pr = document.getElementById('prBody');

            let predictions = [];
            try {
                const response = await fetch(\`\${API_BASE}/api/prediction/forecast?limit=12&period=\${period}\`);
                if (!response.ok) throw new Error('API error');
                const data = await response.json();
                predictions = data.map(item => {
                    let predicted = item.weekly_demand;
                    if (period === 'daily') predicted = item.daily_demand;
                    if (period === 'monthly') predicted = item.monthly_demand;
                    
                    const currentStock = item.current_stock;
                    let status = "Stable";
                    let confidence = 85;
                    if (predicted > currentStock * 1.5) {
                        status = "Critical Risk";
                        confidence = 90;
                    } else if (predicted > currentStock * 1.1) {
                        status = "Moderate Restock";
                        confidence = 75;
                    }
                    
                    return {
                        medicine_id: item.id,
                        medicine_name: item.name,
                        current_stock: currentStock,
                        predicted_demand: predicted,
                        status: status,
                        confidence: confidence
                    };
                });
            } catch (err) {
                console.error('Failed to load predictions from backend:', err);
                const historicalSales = bills.reduce((acc, bill) => {
                    const medName = bill.med;
                    if (!acc[medName]) acc[medName] = [];
                    acc[medName].push({ date: bill.date, qty: bill.qty });
                    return acc;
                }, {});

                const medicineData = activeMedicines.map(m => ({
                    id: m.id,
                    name: m.name,
                    currentStock: m.quantity,
                    historical: historicalSales[m.name] || []
                }));

                medicineData.sort((a, b) => a.name.localeCompare(b.name));
                const topMeds = medicineData.slice(0, 12);

                predictions = topMeds.map(med => {
                    const hist = med.historical;
                    let predicted = med.currentStock * 0.8;

                    if (hist.length > 0) {
                        const totalQty = hist.reduce((sum, h) => sum + h.qty, 0);
                        const avgSales = totalQty / Math.max(hist.length, 1);
                        const recent = hist.slice(-7);
                        const recentAvg = recent.length > 0 ? recent.reduce((s, h) => s + h.qty, 0) / recent.length : avgSales;
                        const dailyDemand = Math.max(recentAvg, avgSales * 0.5);
                        const weeks = period === 'weekly' ? 4 : 8;
                        predicted = dailyDemand * weeks * 0.9 + med.currentStock * 0.3;
                    }

                    const yearFactor = 1 + (parseInt(year) - 2024) * 0.05;
                    predicted = Math.max(10, Math.round(predicted * yearFactor));

                    let status, confidence;
                    if (predicted > med.currentStock * 1.5) {
                        status = "Critical Risk";
                        confidence = Math.round(70 + Math.random() * 20);
                    } else if (predicted > med.currentStock * 1.1) {
                        status = "Moderate Restock";
                        confidence = Math.round(70 + Math.random() * 20);
                    } else {
                        status = "Stable";
                        confidence = Math.round(75 + Math.random() * 20);
                    }

                    return {
                        medicine_id: med.id,
                        medicine_name: med.name,
                        current_stock: med.currentStock,
                        predicted_demand: predicted,
                        status: status,
                        confidence: confidence
                    };
                });
            }

            if (pr) {
                pr.innerHTML = '';
                predictions.forEach(p => {
                    const statusClass = p.status === 'Critical Risk' ? 'status-critical' :
                        p.status === 'Moderate Restock' ? 'status-moderate' : 'status-stable';
                    pr.innerHTML += \`<tr>
                        <td><b>\${p.medicine_id}</b></td>
                        <td><b>\${p.medicine_name}</b></td>
                        <td><span class="prediction-value">\${p.predicted_demand}</span></td>
                        <td><span class="\${statusClass}">\${p.status} (\${p.confidence}%)</span></td>
                    </tr>\`;
                });
            }`;

content = content.replace(oldRenderPredictionChart, oldRenderPredictionChart.replace('pr.innerHTML +=', 'pr.innerHTML +=').replace(oldRenderPredictionChart, newRenderPredictionChart));

fs.writeFileSync('public/Stocker.html', content, 'utf8');
console.log('Stocker.html updated successfully.');
