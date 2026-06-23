const fs = require('fs');

let content = fs.readFileSync('public/StockinManager.html', 'utf8');

// Normalize all newlines to LF for matching
content = content.replace(/\r\n/g, '\n');

// 1. Add API_BASE
if (!content.includes('const API_BASE')) {
    content = content.replace('<script>', `<script>\n        const API_BASE = window.location.port === '3000' ? '' : 'http://localhost:3000';`);
    console.log('Added API_BASE to StockinManager.html');
}

// 2. Replace local fetch calls
content = content.replace(
    /await fetch\(\`\/api\/medicines\?search=\$\{encodeURIComponent\(searchText\)\}\&limit\=15\`\)/g,
    'await fetch(API_BASE + `/api/medicines?search=${encodeURIComponent(searchText)}&limit=15`)'
);

content = content.replace(
    /await fetch\(\`\/api\/alerts\/active\?hospital_name\=\$\{encodeURIComponent\(HOSPITAL_NAME\)\}\`\)/g,
    'await fetch(API_BASE + `/api/alerts/active?hospital_name=${encodeURIComponent(HOSPITAL_NAME)}`)'
);

content = content.replace(
    /await fetch\(\'\/api\/medicines\'\)/g,
    "await fetch(API_BASE + '/api/medicines')"
);

content = content.replace(
    /fetch\(\'\/api\/medicines\/restock\'/g,
    "fetch(API_BASE + '/api/medicines/restock'"
);

content = content.replace(
    /fetch\(\'\/api\/orders\/place\'/g,
    "fetch(API_BASE + '/api/orders/place'"
);

content = content.replace(
    /fetch\(\`\/api\/alerts\/\$\{id\}\`/g,
    'fetch(API_BASE + `/api/alerts/${id}`'
);

content = content.replace(
    /await fetch\(\`\/api\/orders\/executive\/status\?hospital_name\=\$\{encodeURIComponent\(HOSPITAL_NAME\)\}\`\)/g,
    'await fetch(API_BASE + `/api/orders/executive/status?hospital_name=${encodeURIComponent(HOSPITAL_NAME)}`)'
);

// 3. Update saveSettings to also include password parameter
const startSettingsIdx = content.indexOf('function saveSettings(event) {');
const endSettingsIdx = content.indexOf('// Save settings on the backend database');

if (startSettingsIdx !== -1 && endSettingsIdx !== -1) {
    const startOfFetch = content.indexOf("fetch('/api/user/settings'", endSettingsIdx);
    const endOfFetchBlock = content.indexOf('})', startOfFetch) + 2;
    const fetchBlock = content.slice(startOfFetch, endOfFetchBlock);
    
    const newFetchBlock = `const bodyPayload = {
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
            })`;
            
    content = content.replace(fetchBlock, newFetchBlock);
    console.log('Updated saveSettings fetch block in StockinManager.html');
} else {
    console.error('saveSettings index not found in StockinManager.html');
}

// 4. Update runAIPrediction
const startPredIdx = content.indexOf('function runAIPrediction() {');
const endPredIdx = content.indexOf('function updatePredictionChart(');

if (startPredIdx !== -1 && endPredIdx !== -1) {
    const oldPredBlock = content.slice(startPredIdx, endPredIdx);
    const newPredBlock = `async function runAIPrediction() {
            const period = document.getElementById('predPeriodFilter')?.value || 'weekly';
            const year = parseInt(document.getElementById('predYearFilter')?.value || '2026');
            const resultsBody = document.getElementById('prediction-results-body');

            if (!inventoryData || inventoryData.length === 0) {
                if (resultsBody) {
                    resultsBody.innerHTML = \`<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:30px;">No inventory data available. Please add medicines first.</td></tr>\`;
                }
                return;
            }

            let predictions = [];
            try {
                const response = await fetch(\`\${API_BASE}/api/prediction/forecast?limit=15&period=\${period}\`);
                if (!response.ok) throw new Error('API error');
                const data = await response.json();
                predictions = data.map(item => {
                    let predicted = item.weekly_demand;
                    if (period === 'daily') predicted = item.daily_demand;
                    if (period === 'monthly') predicted = item.monthly_demand;
                    
                    const currentStock = item.current_stock;
                    let label = "Stable";
                    let classVal = "status-badge normal";
                    if (predicted > currentStock * 1.5) {
                        label = "Critical";
                        classVal = "status-badge critical";
                    } else if (predicted > currentStock * 1.1) {
                        label = "Moderate";
                        classVal = "status-badge low";
                    }
                    
                    return {
                        medicine_id: item.id,
                        medicine_name: item.name,
                        current_stock: currentStock,
                        predicted_demand: predicted,
                        confidence: 85,
                        status: label,
                        statusClass: classVal
                    };
                });
            } catch (err) {
                console.error('Failed to load predictions from backend:', err);
                if (!predictor) {
                    predictor = new DemandPredictor();
                }
                const medicineData = inventoryData.map(m => ({
                    id: m.id || \`MED-\${Math.floor(Math.random() * 9000) + 1000}\`,
                    name: m.name || 'Unknown',
                    currentStock: m.quantity || 0
                }));

                medicineData.sort((a, b) => a.name.localeCompare(b.name));
                const topMeds = medicineData.slice(0, 15);

                predictions = topMeds.map(med => {
                    const categoryCode = predictor.getCategoryCode(med.name);
                    const currentStock = Math.max(med.currentStock, 1);
                    const features = [categoryCode, currentStock];

                    let predicted = predictor.predict(features);
                    const yearFactor = 1 + (year - 2024) * 0.05;
                    const stockFactor = 0.6 + (Math.min(currentStock, 500) / 500) * 0.4;

                    let finalPrediction = Math.round(predicted * yearFactor * stockFactor);
                    finalPrediction = Math.max(50, Math.min(800, finalPrediction));

                    if (isNaN(finalPrediction) || finalPrediction < 10) {
                        finalPrediction = 50 + Math.floor(Math.random() * 100);
                    }

                    const confidence = Math.round(65 + Math.random() * 30);
                    const statusInfo = predictor.getStatus(finalPrediction, currentStock);

                    return {
                        medicine_id: med.id,
                        medicine_name: med.name,
                        current_stock: currentStock,
                        predicted_demand: finalPrediction,
                        confidence: confidence,
                        status: statusInfo.label,
                        statusClass: statusInfo.class
                    };
                });
            }

            predictions.sort((a, b) => b.predicted_demand - a.predicted_demand);
            predictionData = predictions;

            if (resultsBody) {
                resultsBody.innerHTML = '';
                if (predictions.length === 0) {
                    resultsBody.innerHTML = \`<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:30px;">No data available for prediction.</td></tr>\`;
                } else {
                    predictions.forEach(p => {
                        const statusDisplay = \`\${p.status} (\${p.confidence}%)\`;
                        const statusClass = p.statusClass;
                        resultsBody.innerHTML += \`
                            <tr>
                                <td>
                                    <div class="med-name">\${p.medicine_name}</div>
                                    <div style="font-size:0.75rem;color:#64748b;">ID: \${p.medicine_id}</div>
                                </td>
                                <td>\${p.current_stock}</td>
                                <td><span class="pred-value">+\${p.predicted_demand}</span></td>
                                <td><span class="\${statusClass}">\${statusDisplay}</span></td>
                            </tr>
                        \`;
                    });
                }
            }

            const yearLabel = document.getElementById('reportYearSelect');
            if (yearLabel) yearLabel.value = year;
            updatePredictionChart(predictions, year, period);
        }\n\n        `;
    content = content.replace(oldPredBlock, newPredBlock);
    console.log('Updated runAIPrediction block in StockinManager.html');
} else {
    console.error('runAIPrediction index not found in StockinManager.html');
}

// Convert all newlines back to CRLF before writing on Windows
content = content.replace(/\n/g, '\r\n');

fs.writeFileSync('public/StockinManager.html', content, 'utf8');
console.log('StockinManager.html robust update completed.');
