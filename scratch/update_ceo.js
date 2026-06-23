const fs = require('fs');

let content = fs.readFileSync('public/CEO dashboard.html', 'utf8');

// Normalize newlines
content = content.replace(/\r\n/g, '\n');

// 1. Add API_BASE
if (!content.includes('const API_BASE')) {
    content = content.replace('<script>', `<script>\n        const API_BASE = window.location.port === '3000' ? '' : 'http://localhost:3000';`);
    console.log('Added API_BASE to CEO dashboard.html');
}

// 2. Replace local fetch calls
content = content.replace(
    /await fetch\(\'\/api\/medicines\'\)/g,
    "await fetch(API_BASE + '/api/medicines')"
);

// 3. Update runPrediction
const startPredIdx = content.indexOf('function runPrediction() {');
const endPredIdx = content.indexOf('function updatePredictionChart() {');

if (startPredIdx !== -1 && endPredIdx !== -1) {
    const oldPredBlock = content.slice(startPredIdx, endPredIdx);
    const newPredBlock = `async function runPrediction() {
            const period = document.getElementById('pred-period').value;
            const limit = 15;
            try {
                const response = await fetch(\`\${API_BASE}/api/prediction/forecast?limit=\${limit}&period=\${period}\`);
                if (!response.ok) throw new Error('Prediction API failed');
                const data = await response.json();
                
                predictionData = data.map(item => {
                    let predicted = item.weekly_demand;
                    if (period === 'daily') predicted = item.daily_demand;
                    if (period === 'monthly') predicted = item.monthly_demand;
                    
                    const currentStock = item.current_stock;
                    const status = predicted > currentStock * 1.5 ? 'Critical' : predicted > currentStock * 1.2 ? 'Moderate' : 'Stable';
                    return {
                        name: item.name,
                        currentStock: currentStock,
                        predicted: predicted,
                        status: status
                    };
                });
            } catch (err) {
                console.error('Failed to run AI prediction:', err);
                // Fallback to mock prediction if API fails
                predictionData = inventoryData.map(m => {
                    const baseDemand = m.stock * 0.3 + 50;
                    const multiplier = period === 'weekly' ? 1.2 : period === 'monthly' ? 1.5 : 2.0;
                    const predicted = Math.round(baseDemand * multiplier + Math.random() * 20);
                    const status = predicted > m.stock * 1.5 ? 'Critical' : predicted > m.stock * 1.2 ? 'Moderate' : 'Stable';
                    return { name: m.name, currentStock: m.stock, predicted, status };
                });
            }
            updatePredictionChart();
            renderPredictionTable();
        }\n\n        `;
    content = content.replace(oldPredBlock, newPredBlock);
    console.log('Updated runPrediction block in CEO dashboard.html');
} else {
    console.error('runPrediction index not found in CEO dashboard.html');
}

// 4. Update saveSettings to also hit the /api/user/settings PUT route
const startSettingsIdx = content.indexOf('function saveSettings() {');
const endSettingsIdx = content.indexOf('function showSection(sectionId, el) {');

if (startSettingsIdx !== -1 && endSettingsIdx !== -1) {
    const oldSettingsBlock = content.slice(startSettingsIdx, endSettingsIdx);
    const newSettingsBlock = `function saveSettings() {
            const username = document.getElementById('settings-username').value;
            const email = document.getElementById('settings-email').value;
            const newPass = document.getElementById('settings-new-password').value;
            const confirmPass = document.getElementById('settings-confirm-password').value;

            if (newPass || confirmPass) {
                if (newPass !== confirmPass) {
                    showToast('❌ Passwords do not match!');
                    return;
                }
                if (newPass.length < 6) {
                    showToast('❌ Password must be at least 6 characters!');
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
                    const profile = { username, email, name: username, role: 'Chief Executive Officer' };
                    if (newPass) profile.password = newPass;
                    sessionStorage.setItem('ceoProfile', JSON.stringify(profile));

                    document.getElementById('ceo-name').innerText = username || 'CEO';
                    document.getElementById('ceo-avatar').src =
                        \`https://ui-avatars.com/api/?name=\${encodeURIComponent(username || 'CEO')}&background=3B82F6&color=fff\`;
                    document.getElementById('settings-new-password').value = '';
                    document.getElementById('settings-confirm-password').value = '';
                    showToast('✅ Settings saved successfully!');
                }
            })
            .catch(err => {
                showToast('❌ Server error updating settings');
                console.error(err);
            });
        }\n\n        `;
    content = content.replace(oldSettingsBlock, newSettingsBlock);
    console.log('Updated saveSettings block in CEO dashboard.html');
} else {
    console.error('saveSettings index not found in CEO dashboard.html');
}

// Convert all newlines back to CRLF before writing on Windows
content = content.replace(/\n/g, '\r\n');

fs.writeFileSync('public/CEO dashboard.html', content, 'utf8');
console.log('CEO dashboard.html robust update completed.');
