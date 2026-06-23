const fs = require('fs');

let content = fs.readFileSync('public/Billing Exceutive.html', 'utf8');

// Normalize newlines
content = content.replace(/\r\n/g, '\n');

// 1. Add API_BASE
if (!content.includes('const API_BASE')) {
    content = content.replace('<script>', `<script>\n    const API_BASE = window.location.port === '3000' ? '' : 'http://localhost:3000';`);
    console.log('Added API_BASE to Billing Exceutive.html');
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
    /await fetch\(\`\/api\/alerts\/active\?hospital_name\=\$\{encodeURIComponent\(HOSPITAL_NAME\)\}\`\)/g,
    'await fetch(API_BASE + `/api/alerts/active?hospital_name=${encodeURIComponent(HOSPITAL_NAME)}`)'
);

// 3. Update saveSettings to also hit the /api/user/settings PUT route
const startSettingsIdx = content.indexOf('function saveSettings(event) {');
const endSettingsIdx = content.indexOf('function resetSettingsForm() {');

if (startSettingsIdx !== -1 && endSettingsIdx !== -1) {
    const oldSettingsBlock = content.slice(startSettingsIdx, endSettingsIdx);
    const newSettingsBlock = `function saveSettings(event) {
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
          const stored = sessionStorage.getItem('billingProfile');
          let profile = {};
          if (stored) {
            profile = JSON.parse(stored);
          }
          profile.name = username;
          profile.email = email;
          if (newPass) profile.password = newPass;
          sessionStorage.setItem('billingProfile', JSON.stringify(profile));

          showToast('✅ Settings saved successfully!');
        }
      })
      .catch(err => {
        showToast('❌ Server error updating settings');
        console.error(err);
      });
    }\n\n    `;
    content = content.replace(oldSettingsBlock, newSettingsBlock);
    console.log('Updated saveSettings block in Billing Exceutive.html');
} else {
    console.error('saveSettings index not found in Billing Exceutive.html');
}

// Convert all newlines back to CRLF before writing on Windows
content = content.replace(/\n/g, '\r\n');

fs.writeFileSync('public/Billing Exceutive.html', content, 'utf8');
console.log('Billing Exceutive.html robust update completed.');
