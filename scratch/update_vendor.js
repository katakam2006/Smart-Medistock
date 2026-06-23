const fs = require('fs');

let content = fs.readFileSync('public/Vendor (1).html', 'utf8');

// Normalize newlines
content = content.replace(/\r\n/g, '\n');

// 1. Add API_BASE
if (!content.includes('const API_BASE')) {
    content = content.replace('<script>', `<script>\n        const API_BASE = window.location.port === '3000' ? '' : 'http://localhost:3000';`);
    console.log('Added API_BASE to Vendor (1).html');
}

// 2. Replace local fetch calls
content = content.replace(
    /await fetch\(\`\/api\/orders\/vendor\/orders\?vendor_name\=\$\{encodeURIComponent\(vendorName\)\}\&status\=Pending\`\)/g,
    'await fetch(API_BASE + `/api/orders/vendor/orders?vendor_name=${encodeURIComponent(vendorName)}&status=Pending`)'
);

content = content.replace(
    /await fetch\(\`\/api\/orders\/vendor\/orders\?vendor_name\=\$\{encodeURIComponent\(vendorName\)\}\`\)/g,
    'await fetch(API_BASE + `/api/orders/vendor/orders?vendor_name=${encodeURIComponent(vendorName)}`)'
);

content = content.replace(
    /await fetch\(\`\/api\/orders\/vendor\/respond\/\$\{orderId\}\`\,/g,
    'await fetch(API_BASE + `/api/orders/vendor/respond/${orderId}`, '
);

// 3. Update saveVendorProfile to use /api/user/settings PUT route
const startSettingsIdx = content.indexOf('function saveVendorProfile() {');
const endSettingsIdx = content.indexOf('function showSection(sectionId, element) {');

if (startSettingsIdx !== -1 && endSettingsIdx !== -1) {
    const oldSettingsBlock = content.slice(startSettingsIdx, endSettingsIdx);
    const newSettingsBlock = `function saveVendorProfile() {
            // FIXED: Read from sessionStorage
            const stored = sessionStorage.getItem('vendorProfile') || localStorage.getItem('userAccount');
            if (!stored) return;
            const profile = JSON.parse(stored);

            const name = document.getElementById('vendor-input-name').value;
            const email = document.getElementById('vendor-input-email').value;
            const newPass = document.getElementById('vendor-input-pass').value;

            const bodyPayload = {
                username: profile.username || 'vendor',
                email: email,
                name: name
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
                    showToast("❌ Failed to save profile: " + data.error);
                } else {
                    profile.name = name;
                    profile.email = email;
                    if (newPass) profile.password = newPass;

                    sessionStorage.setItem('vendorProfile', JSON.stringify(profile));
                    localStorage.setItem('userAccount', JSON.stringify(profile));

                    initVendorProfile();
                    showToast("✅ Profile Updated Successfully!");
                    document.getElementById('vendor-input-pass').value = '';
                }
            })
            .catch(err => {
                showToast("❌ Server error updating profile");
                console.error(err);
            });
        }\n\n        `;
    content = content.replace(oldSettingsBlock, newSettingsBlock);
    console.log('Updated saveVendorProfile block in Vendor (1).html');
} else {
    console.error('saveVendorProfile index not found in Vendor (1).html');
}

// Convert all newlines back to CRLF before writing on Windows
content = content.replace(/\n/g, '\r\n');

fs.writeFileSync('public/Vendor (1).html', content, 'utf8');
console.log('Vendor (1).html robust update completed.');
