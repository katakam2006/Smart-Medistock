const mysql = require('mysql2');
const http = require('http');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Hemasrikotha@07',
    database: 'smart_medistock'
}).promise();

async function testAll() {
    console.log('🧪 Starting programmatic verification...');

    // 1. Test GET /api/prediction/forecast
    console.log('\n--- 1. Testing AI Prediction API ---');
    try {
        const pData = await new Promise((resolve, reject) => {
            http.get('http://localhost:3000/api/prediction/forecast?limit=3&period=weekly', (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(JSON.parse(data));
                    } else {
                        reject(new Error(`Status Code: ${res.statusCode}, Body: ${data}`));
                    }
                });
            }).on('error', reject);
        });
        console.log('✅ Prediction API success! Sample results:');
        console.log(JSON.stringify(pData, null, 2));
    } catch (err) {
        console.error('❌ Prediction API failed:', err.message);
    }

    // 2. Test PUT /api/user/settings (using user 'kumari')
    console.log('\n--- 2. Testing Settings Update API ---');
    try {
        // First get current email
        const [originalUser] = await pool.query('SELECT email FROM users WHERE username = ?', ['kumari']);
        const origEmail = originalUser[0] ? originalUser[0].email : '';
        console.log(`Original email for 'kumari': "${origEmail}"`);

        // Send settings update
        const postData = JSON.stringify({
            username: 'kumari',
            email: 'kumari_test_verified@medistock.com'
        });

        const updateResult = await new Promise((resolve, reject) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3000,
                path: '/api/user/settings',
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(JSON.parse(data));
                    } else {
                        reject(new Error(`Status Code: ${res.statusCode}, Body: ${data}`));
                    }
                });
            });
            req.on('error', reject);
            req.write(postData);
            req.end();
        });

        console.log('✅ PUT /api/user/settings response:', updateResult);

        // Verify in MySQL
        const [updatedUser] = await pool.query('SELECT email FROM users WHERE username = ?', ['kumari']);
        console.log(`Updated email in MySQL database: "${updatedUser[0].email}"`);
        if (updatedUser[0].email === 'kumari_test_verified@medistock.com') {
            console.log('✅ Success: Settings successfully persisted to MySQL database!');
        } else {
            console.error('❌ Failure: Settings did not match!');
        }

        // Restore original email
        await pool.query('UPDATE users SET email = ? WHERE username = ?', [origEmail, 'kumari']);
        console.log('🔄 Restored original email in database.');

    } catch (err) {
        console.error('❌ Settings Update API failed:', err.message);
    }

    pool.end();
}

testAll();
