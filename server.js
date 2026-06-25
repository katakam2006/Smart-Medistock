const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { spawnSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize MySQL Connection Pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Hemasrikotha@07',
    database: 'smart_medistock',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Convert pool to use promises for cleaner async/await code
const db = pool.promise();

// Function to seed medicines from CSV if table is empty
async function seedMedicines() {
    try {
        const [rows] = await db.query('SELECT COUNT(*) as count FROM medicines');
        if (rows[0].count > 0) {
            console.log('Medicines table already has records. Skipping seeding.');
            return;
        }

        console.log('Seeding medicines from CSV... This may take a few seconds.');
        const csvPath = path.resolve(__dirname, 'medicine_dataset_250k-v2_fixed.csv');
        if (!fs.existsSync(csvPath)) {
            console.warn('Dataset CSV file not found at:', csvPath);
            return;
        }

        const content = fs.readFileSync(csvPath, 'utf8');
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        const chunkSize = 5000;
        let currentChunk = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(',').map(v => v.trim());
            if (values.length < headers.length) continue;

            const medicine_id = values[0];
            const medicine_name = values[1];
            const category = values[2];
            const dosage = values[3];
            const manufacture_date = values[4];
            const expiry_date = values[5];
            const price = parseFloat(values[6]) || 0.00;
            const no_of_units = parseInt(values[7], 10) || 0;
            const stock_out_units = parseInt(values[8], 10) || 0;

            currentChunk.push([
                medicine_id,
                medicine_name,
                category,
                dosage,
                manufacture_date,
                expiry_date,
                price,
                no_of_units,
                stock_out_units
            ]);

            if (currentChunk.length >= chunkSize) {
                await db.query(
                    `INSERT INTO medicines (medicine_id, medicine_name, category, dosage, manufacture_date, expiry_date, price, no_of_units, stock_out_units) VALUES ?`,
                    [currentChunk]
                );
                currentChunk = [];
            }
        }

        if (currentChunk.length > 0) {
            await db.query(
                `INSERT INTO medicines (medicine_id, medicine_name, category, dosage, manufacture_date, expiry_date, price, no_of_units, stock_out_units) VALUES ?`,
                [currentChunk]
            );
        }

        console.log('Seeding medicines completed successfully.');
    } catch (err) {
        console.error('Error seeding medicines from CSV:', err.message);
    }
}

// Create database tables matching your system structure
async function initializeDatabase() {
    try {
        // 1. Create table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100),
                password VARCHAR(100) NOT NULL,
                role VARCHAR(50) NOT NULL,
                address TEXT,
                hospital_name VARCHAR(100)
            )
        `);
        console.log('MySQL users table verified/created.');

        // Schema migration check for existing tables
        try {
            const [columns] = await db.query(`SHOW COLUMNS FROM users LIKE 'hospital_name'`);
            if (columns.length === 0) {
                await db.query(`ALTER TABLE users ADD COLUMN hospital_name VARCHAR(100)`);
                console.log("Migration: Added 'hospital_name' column to users table.");
            }
        } catch (migrationErr) {
            console.error('Error migrating users table schema:', migrationErr.message);
        }

        // 2. Create inventory_alerts table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS inventory_alerts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                alert_type VARCHAR(50) NOT NULL,
                medicine_name VARCHAR(100) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Pending',
                triggered_by VARCHAR(50),
                hospital_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('MySQL inventory_alerts table verified/created.');

        // Schema migration check for inventory_alerts
        try {
            const [columns] = await db.query(`SHOW COLUMNS FROM inventory_alerts LIKE 'hospital_name'`);
            if (columns.length === 0) {
                await db.query(`ALTER TABLE inventory_alerts ADD COLUMN hospital_name VARCHAR(100)`);
                console.log("Migration: Added 'hospital_name' column to inventory_alerts table.");
            }
        } catch (migrationErr) {
            console.error('Error migrating inventory_alerts table schema:', migrationErr.message);
        }

        // 3. Create purchase_orders table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS purchase_orders (
                order_id INT AUTO_INCREMENT PRIMARY KEY,
                medicine_name VARCHAR(100) NOT NULL,
                quantity_requested INT NOT NULL,
                vendor_id INT DEFAULT 1,
                vendor_name VARCHAR(100),
                placed_by VARCHAR(100),
                status ENUM('Pending', 'Accepted', 'Denied') DEFAULT 'Pending',
                hospital_name VARCHAR(100),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('MySQL purchase_orders table verified/created.');

        // Schema migration check for purchase_orders
        try {
            const [columns] = await db.query(`SHOW COLUMNS FROM purchase_orders LIKE 'hospital_name'`);
            if (columns.length === 0) {
                await db.query(`ALTER TABLE purchase_orders ADD COLUMN hospital_name VARCHAR(100)`);
                console.log("Migration: Added 'hospital_name' column to purchase_orders table.");
            }
        } catch (migrationErr) {
            console.error('Error migrating purchase_orders table schema:', migrationErr.message);
        }

        try {
            const [columns] = await db.query(`SHOW COLUMNS FROM purchase_orders LIKE 'vendor_name'`);
            if (columns.length === 0) {
                await db.query(`ALTER TABLE purchase_orders ADD COLUMN vendor_name VARCHAR(100)`);
                console.log("Migration: Added 'vendor_name' column to purchase_orders table.");
            }
        } catch (migrationErr) {
            console.error('Error migrating purchase_orders table schema (vendor_name):', migrationErr.message);
        }

        try {
            const [columns] = await db.query(`SHOW COLUMNS FROM purchase_orders LIKE 'placed_by'`);
            if (columns.length === 0) {
                await db.query(`ALTER TABLE purchase_orders ADD COLUMN placed_by VARCHAR(100)`);
                console.log("Migration: Added 'placed_by' column to purchase_orders table.");
            }
        } catch (migrationErr) {
            console.error('Error migrating purchase_orders table schema (placed_by):', migrationErr.message);
        }

        // 4. Seed a default CEO account if the table is completely empty
        const [rows] = await db.query('SELECT COUNT(*) as count FROM users');
        if (rows[0].count === 0) {
            await db.query(`
                INSERT INTO users (username, email, password, role, address) 
                VALUES ('admin', 'ceo@medistock.com', 'admin123', 'CEO', 'Main Campus')
            `);
            console.log("Default admin account seeded successfully: admin / admin123");
        }

        // 5. Seed sample alerts for testing if none exist
        const [alertRows] = await db.query('SELECT COUNT(*) as count FROM inventory_alerts');
        if (alertRows[0].count === 0) {
            await db.query(`
                INSERT INTO inventory_alerts (alert_type, medicine_name, status, triggered_by, hospital_name) 
                VALUES 
                ('LOW STOCK', 'Gabapentin', 'Pending', 'billing', 'sai hospital'),
                ('LOW STOCK', 'Citalopram Forte', 'Pending', 'billing', 'sai hospital'),
                ('LOW STOCK', 'Azithromycin Combo', 'Pending', 'billing', 'sai hospital'),
                ('EXPIRY', 'Gabapentin', 'Pending', 'billing', 'sai hospital'),
                ('EXPIRY', 'Pantoprazole', 'Pending', 'billing', 'sai hospital')
            `);
            console.log("Sample alerts seeded successfully.");
        }

        // 6. Create medicines table if it doesn't exist (migrate if old schema exists)
        try {
            const [cols] = await db.query(`SHOW COLUMNS FROM medicines LIKE 'stock_out_units'`).catch(() => [[]]);
            if (cols.length === 0) {
                console.log('Migrating: Dropping outdated medicines table.');
                await db.query(`DROP TABLE IF EXISTS medicines`);
            }
        } catch (e) {
            // Ignore if table does not exist
        }

        await db.query(`
            CREATE TABLE IF NOT EXISTS medicines (
                medicine_id VARCHAR(50) PRIMARY KEY,
                medicine_name VARCHAR(100) NOT NULL,
                category VARCHAR(100),
                dosage VARCHAR(50),
                manufacture_date DATE,
                expiry_date DATE,
                price DECIMAL(10, 2),
                no_of_units INT NOT NULL DEFAULT 0,
                stock_out_units INT NOT NULL DEFAULT 0,
                INDEX idx_medicine_name (medicine_name),
                INDEX idx_category (category)
            )
        `);
        console.log('MySQL medicines table verified/created.');

        // Seed medicines table
        await seedMedicines();

    } catch (err) {
        console.error('Error setting up database tables:', err.message);
    }
}
initializeDatabase();

// API: Register User
app.post('/api/register', async (req, res) => {
    const { username, email, password, role, address, hospital_name } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Missing mandatory fields' });
    }

    // ============================================
    // FIXED: Only validate hospital_name for roles that need it
    // Medicine Supplier does NOT need a hospital name
    // ============================================
    const rolesRequiringHospital = ['CEO', 'Stock In Manager', 'Billing Executive', 'Owner', 'Stocker'];

    if (rolesRequiringHospital.includes(role) && !hospital_name) {
        return res.status(400).json({ error: 'Hospital name is required for this role' });
    }

    const query = `INSERT INTO users (username, email, password, role, address, hospital_name) VALUES (?, ?, ?, ?, ?, ?)`;
    try {
        const [result] = await db.query(query, [username, email, password, role, address || '', hospital_name || '']);
        res.status(201).json({
            message: 'User registered successfully!',
            userId: result.insertId,
            hospital_name: hospital_name || ''
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// API: Login User
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    const query = `SELECT id, username, email, role, address, hospital_name FROM users WHERE username = ? AND password = ?`;
    try {
        const [rows] = await db.query(query, [username, password]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        res.json({
            message: 'Login successful',
            user: rows[0],
            hospital_name: rows[0].hospital_name
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Update User Settings
app.put('/api/user/settings', async (req, res) => {
    const { username, email, name, password } = req.body;
    if (!username) {
        return res.status(400).json({ error: 'Username is required to identify the user' });
    }
    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        let updateFields = [];
        let queryParams = [];

        if (email !== undefined) {
            updateFields.push('email = ?');
            queryParams.push(email);
        }
        if (name) {
            updateFields.push('username = ?');
            queryParams.push(name);
        }
        if (password) {
            updateFields.push('password = ?');
            queryParams.push(password);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE username = ?`;
        queryParams.push(username);

        await db.query(updateQuery, queryParams);

        const [updatedUser] = await db.query('SELECT id, username, email, role, address, hospital_name FROM users WHERE username = ?', [name || username]);
        res.json({ message: 'Settings updated successfully', user: updatedUser[0] });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'New username already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// API: Get Users by Hospital (for admin/CEO)
app.get('/api/users/hospital/:hospitalName', async (req, res) => {
    const { hospitalName } = req.params;
    const query = `SELECT id, username, email, role, address, hospital_name FROM users WHERE hospital_name = ?`;
    try {
        const [rows] = await db.query(query, [hospitalName]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// Intimate Alert API - Creates alert in database
// ============================================

app.post('/api/alerts/intimate', async (req, res) => {
    const { alert_type, medicine_name, status, triggered_by, hospital_name } = req.body;

    console.log('📝 Received alert request:', { alert_type, medicine_name, hospital_name });

    // Enhanced validation
    if (!alert_type || !medicine_name) {
        return res.status(400).json({ error: 'Missing mandatory fields alert_type or medicine_name' });
    }

    if (!hospital_name) {
        return res.status(400).json({ error: 'Hospital name is required for alert creation' });
    }

    // Verify that the triggered_by user belongs to this hospital
    if (triggered_by) {
        try {
            const [userCheck] = await db.query(
                'SELECT role, hospital_name FROM users WHERE username = ?',
                [triggered_by]
            );
            if (userCheck.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            if (userCheck[0].hospital_name !== hospital_name) {
                return res.status(403).json({ error: 'User does not belong to this hospital' });
            }
            const dbRole = (userCheck[0].role || '').toLowerCase();
            if (!['billing executive', 'ceo'].includes(dbRole)) {
                return res.status(403).json({ error: 'Only Billing Executives and CEO can create alerts' });
            }
        } catch (err) {
            console.error('Error verifying user:', err);
            return res.status(500).json({ error: 'Error verifying user' });
        }
    }

    // Check if alert already exists for this medicine and hospital
    try {
        const [existing] = await db.query(
            `SELECT id FROM inventory_alerts 
             WHERE medicine_name = ? AND hospital_name = ? AND alert_type = ? AND status = 'Pending'`,
            [medicine_name, hospital_name, alert_type]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                error: `An active ${alert_type} alert already exists for ${medicine_name}`
            });
        }
    } catch (err) {
        console.error('Error checking existing alerts:', err);
    }

    const query = `INSERT INTO inventory_alerts (alert_type, medicine_name, status, triggered_by, hospital_name) VALUES (?, ?, ?, ?, ?)`;
    try {
        const [result] = await db.query(query, [alert_type, medicine_name, status || 'Pending', triggered_by || 'Billing Executive', hospital_name]);

        // Get the created alert
        const [newAlert] = await db.query(
            `SELECT * FROM inventory_alerts WHERE id = ?`,
            [result.insertId]
        );

        console.log(`✅ Alert created: ${alert_type} for ${medicine_name} at ${hospital_name}`);
        res.status(201).json({
            message: 'Alert created successfully!',
            alertId: result.insertId,
            alert: newAlert[0],
            hospital_name: hospital_name
        });
    } catch (err) {
        console.error('Error creating alert:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// Get Active Alerts - Only shows Pending alerts
// ============================================

app.get('/api/alerts/active', async (req, res) => {
    const hospitalName = req.query.hospital_name;

    if (!hospitalName) {
        return res.status(400).json({ error: 'Hospital name is required' });
    }

    // Only get PENDING alerts
    let query = `SELECT * FROM inventory_alerts WHERE hospital_name = ? AND status = 'Pending'`;
    let params = [hospitalName];

    // Optional: filter by alert type if provided
    if (req.query.alert_type) {
        query += ` AND alert_type = ?`;
        params.push(req.query.alert_type);
    }

    query += ` ORDER BY created_at DESC`;

    try {
        const [rows] = await db.query(query, params);
        // console.log(`📊 Retrieved ${rows.length} active pending alerts for ${hospitalName}`);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching alerts:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// Get All Alerts (including resolved) for a hospital
// ============================================

app.get('/api/alerts/all', async (req, res) => {
    const hospitalName = req.query.hospital_name;

    if (!hospitalName) {
        return res.status(400).json({ error: 'Hospital name is required' });
    }

    const query = `SELECT * FROM inventory_alerts WHERE hospital_name = ? ORDER BY created_at DESC`;
    try {
        const [rows] = await db.query(query, [hospitalName]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// Get Dashboard Counters - Only counts Pending alerts
// ============================================

app.get('/api/dashboard/counters', async (req, res) => {
    const hospitalName = req.query.hospital_name;

    if (!hospitalName) {
        return res.status(400).json({ error: 'Hospital name is required' });
    }

    let lowStockQuery = `SELECT COUNT(*) as count FROM inventory_alerts WHERE alert_type = 'LOW STOCK' AND status = 'Pending' AND hospital_name = ?`;
    let expiryQuery = `SELECT COUNT(*) as count FROM inventory_alerts WHERE alert_type = 'EXPIRY' AND status = 'Pending' AND hospital_name = ?`;

    try {
        const [lowStockRows] = await db.query(lowStockQuery, [hospitalName]);
        const [expiryRows] = await db.query(expiryQuery, [hospitalName]);
        res.json({
            lowStockCount: lowStockRows[0].count,
            expiryCount: expiryRows[0].count,
            hospital_name: hospitalName
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// Update Alert Status - Mark as Resolved/Denied
// ============================================

app.put('/api/alerts/:id', async (req, res) => {
    const { id } = req.params;
    const { status, hospital_name, username } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Missing status' });
    }

    try {
        // Verify the user has permission to update this alert
        const [alertCheck] = await db.query(
            'SELECT hospital_name FROM inventory_alerts WHERE id = ?',
            [id]
        );

        if (alertCheck.length === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        // Check if the user belongs to the same hospital
        if (hospital_name && alertCheck[0].hospital_name !== hospital_name) {
            return res.status(403).json({ error: 'You do not have permission to update this alert' });
        }

        const query = `UPDATE inventory_alerts SET status = ? WHERE id = ?`;
        await db.query(query, [status, id]);

        console.log(`✅ Alert ${id} updated to ${status}`);
        res.json({ message: 'Alert status updated successfully!' });
    } catch (err) {
        console.error('Error updating alert:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// Delete Alert (for cleanup)
// ============================================

app.delete('/api/alerts/:id', async (req, res) => {
    const { id } = req.params;
    const { hospital_name } = req.body;

    try {
        const [alertCheck] = await db.query(
            'SELECT hospital_name FROM inventory_alerts WHERE id = ?',
            [id]
        );

        if (alertCheck.length === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        if (hospital_name && alertCheck[0].hospital_name !== hospital_name) {
            return res.status(403).json({ error: 'You do not have permission to delete this alert' });
        }

        await db.query('DELETE FROM inventory_alerts WHERE id = ?', [id]);
        res.json({ message: 'Alert deleted successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Fetch ML predictions with date range filter
app.get('/api/prediction/forecast', (req, res) => {
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || '12', 10)));
    const period = req.query.period || 'weekly';
    const hospitalName = req.query.hospital_name || '';

    let pythonCmd = 'python3';
    if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA;
        if (localAppData) {
            const path314 = path.join(localAppData, 'Programs', 'Python', 'Python314', 'python.exe');
            if (fs.existsSync(path314)) {
                pythonCmd = path314;
            } else {
                const path313 = path.join(localAppData, 'Programs', 'Python', 'Python313', 'python.exe');
                if (fs.existsSync(path313)) {
                    pythonCmd = path313;
                } else {
                    pythonCmd = 'python';
                }
            }
        } else {
            pythonCmd = 'python';
        }
    }

    const child = spawnSync(pythonCmd, ['train_model.py', 'forecast', String(limit), hospitalName], {
        cwd: __dirname,
        encoding: 'utf8'
    });

    if (child.error) {
        console.error('Prediction API error:', child.error);
        return res.status(500).json({ error: 'Python prediction engine is unavailable.' });
    }

    if (child.status !== 0) {
        console.error('Prediction script failed:', child.stderr || child.stdout);
        return res.status(500).json({ error: 'Prediction engine failed to run.' });
    }

    try {
        const payload = JSON.parse(child.stdout || '[]');
        const hospitalBlockOffset = getHospitalBlockOffset(hospitalName);
        const mappedPayload = payload.map(item => {
            if (item.id) {
                item.id = dbToClientMedId(item.id, hospitalBlockOffset);
            }
            return item;
        });
        res.json(mappedPayload);
    } catch (err) {
        console.error('Prediction JSON parse error:', err);
        res.status(500).json({ error: 'Prediction output could not be parsed.' });
    }
});

// ============================================
// Hospital Block Offsets and ID Virtualization Helpers
// ============================================
function getHospitalBlockOffset(hospitalName) {
    if (!hospitalName) return 0;
    const nameLower = hospitalName.toLowerCase().trim();
    if (nameLower.includes('sai hospital') || nameLower === 'sai hospital') {
        return 0;
    } else if (nameLower.includes('city medical clinic') || nameLower === 'city medical clinic') {
        return 4000;
    } else if (nameLower.includes('pules hospital') || nameLower === 'pules hospital') {
        return 8000;
    }
    return 0;
}

function parseMedNumber(medId) {
    if (!medId || typeof medId !== 'string') return 0;
    const match = medId.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
}

function formatMedId(num) {
    return 'MED-' + String(num).padStart(6, '0');
}

function dbToClientMedId(dbMedId, hospitalBlockOffset) {
    if (!dbMedId) return dbMedId;
    const num = parseMedNumber(dbMedId);
    if (num === 0) return dbMedId;
    if (num > hospitalBlockOffset && num <= hospitalBlockOffset + 4000) {
        return formatMedId(num - hospitalBlockOffset);
    }
    return dbMedId;
}

function clientToDbMedId(clientMedId, hospitalBlockOffset) {
    if (!clientMedId) return clientMedId;
    const num = parseMedNumber(clientMedId);
    if (num === 0) return clientMedId;
    if (num <= 4000) {
        return formatMedId(num + hospitalBlockOffset);
    }
    return clientMedId;
}

// API Endpoint to fetch medicine dataset rows from database
app.get('/api/medicines', async (req, res) => {
    const search = (req.query.search || '').trim();
    const limit = parseInt(req.query.limit, 10) || 100;
    const offset = parseInt(req.query.offset, 10) || 0;
    const hospitalName = (req.query.hospital_name || '').trim();

    // Determine the block offset for the hospital
    const hospitalBlockOffset = getHospitalBlockOffset(hospitalName);

    // 2. Define subquery that gets exactly 4,000 medicines for the hospital
    const subquery = `
        SELECT 
            medicine_id AS 'Medicine ID', 
            medicine_name AS 'Medicine Name', 
            category AS 'Category', 
            dosage AS 'Dosage', 
            DATE_FORMAT(manufacture_date, '%Y-%m-%d') AS 'Manufacture Date', 
            DATE_FORMAT(expiry_date, '%Y-%m-%d') AS 'Expiry Date', 
            price AS 'Price ($)', 
            no_of_units AS 'No. of Units', 
            stock_out_units AS 'Stock Out Units' 
        FROM medicines
        ORDER BY medicine_id ASC
        LIMIT 4000 OFFSET ?
    `;

    let dataQuery = `SELECT * FROM (${subquery}) AS hospital_meds`;
    let countQuery = `SELECT COUNT(*) AS total FROM (${subquery}) AS hospital_meds`;

    const dataParams = [hospitalBlockOffset];
    const countParams = [hospitalBlockOffset];

    if (search) {
        const searchClause = ` WHERE \`Medicine Name\` LIKE ? OR \`Category\` LIKE ? OR \`Medicine ID\` LIKE ?`;
        dataQuery += searchClause;
        countQuery += searchClause;

        const searchPattern = `%${search}%`;
        let idSearchPattern = searchPattern;
        if (/^MED-\d+$/i.test(search)) {
            const dbId = clientToDbMedId(search.toUpperCase(), hospitalBlockOffset);
            idSearchPattern = `%${dbId}%`;
        }
        dataParams.push(searchPattern, searchPattern, idSearchPattern);
        countParams.push(searchPattern, searchPattern, idSearchPattern);
    }

    if (search) {
        dataQuery += ` ORDER BY \`Medicine Name\` ASC LIMIT ? OFFSET ?`;
    } else {
        dataQuery += ` ORDER BY \`Medicine ID\` ASC LIMIT ? OFFSET ?`;
    }
    dataParams.push(limit, offset);

    try {
        const [countResult] = await db.query(countQuery, countParams);
        const totalCount = countResult[0].total;

        const [rows] = await db.query(dataQuery, dataParams);

        // Virtualize Medicine IDs to start from 1 for each hospital
        const mappedRows = rows.map(row => {
            if (row['Medicine ID']) {
                row['Medicine ID'] = dbToClientMedId(row['Medicine ID'], hospitalBlockOffset);
            }
            return row;
        });

        res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
        res.setHeader('X-Total-Count', totalCount.toString());
        res.json(mappedRows);
    } catch (err) {
        console.error('Error fetching medicines from database:', err);
        res.status(500).json({ error: 'Failed to retrieve medicines from database.' });
    }
});

// API: Dispatch/Deduct medicine stock (Billing Executive -> Customer)
app.post('/api/medicines/dispatch', async (req, res) => {
    const { medicine_id, medicine_name, quantity, hospital_name } = req.body;
    const qty = parseInt(quantity, 10);

    if ((!medicine_id && !medicine_name) || isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Missing medicine identifier or valid quantity.' });
    }

    const hospitalBlockOffset = getHospitalBlockOffset(hospital_name);

    try {
        let selectQuery = 'SELECT medicine_id, no_of_units, stock_out_units FROM medicines WHERE ';
        const params = [];
        if (medicine_id) {
            const dbMedId = clientToDbMedId(medicine_id, hospitalBlockOffset);
            selectQuery += 'medicine_id = ?';
            params.push(dbMedId);
        } else {
            // Scope query by name within the hospital's block
            selectQuery += 'LOWER(medicine_name) = LOWER(?) AND CAST(SUBSTRING(medicine_id, 5) AS UNSIGNED) > ? AND CAST(SUBSTRING(medicine_id, 5) AS UNSIGNED) <= ? LIMIT 1';
            params.push(medicine_name, hospitalBlockOffset, hospitalBlockOffset + 4000);
        }

        const [rows] = await db.query(selectQuery, params);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Medicine not found.' });
        }

        const med = rows[0];
        if (med.no_of_units < qty) {
            return res.status(400).json({ error: `Insufficient stock. Only ${med.no_of_units} units available.` });
        }

        const newUnits = med.no_of_units - qty;
        const newStockOut = med.stock_out_units + qty;

        await db.query(
            'UPDATE medicines SET no_of_units = ?, stock_out_units = ? WHERE medicine_id = ?',
            [newUnits, newStockOut, med.medicine_id]
        );

        res.json({
            message: 'Stock dispatched successfully.',
            medicine_id: dbToClientMedId(med.medicine_id, hospitalBlockOffset),
            remaining_units: newUnits,
            stock_out_units: newStockOut
        });
    } catch (err) {
        console.error('Error dispatching stock:', err);
        res.status(500).json({ error: 'Failed to dispatch stock.' });
    }
});

// API: Restock medicine (Stock-In Manager/Stocker -> Inventory)
app.post('/api/medicines/restock', async (req, res) => {
    const { medicine_id, medicine_name, quantity, dosage, price, category, mfg, expiry, hospital_name } = req.body;
    const qty = parseInt(quantity, 10);

    if (!medicine_name || isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Missing medicine_name or valid quantity.' });
    }

    const hospitalBlockOffset = getHospitalBlockOffset(hospital_name);

    try {
        let rows = [];
        if (medicine_id) {
            const dbMedId = clientToDbMedId(medicine_id, hospitalBlockOffset);
            const [r] = await db.query('SELECT medicine_id, no_of_units FROM medicines WHERE medicine_id = ?', [dbMedId]);
            rows = r;
        }
        if (rows.length === 0) {
            const [r] = await db.query(
                `SELECT medicine_id, no_of_units FROM medicines 
                 WHERE LOWER(medicine_name) = LOWER(?) 
                   AND (dosage = ? OR ? IS NULL OR dosage = '-')
                   AND CAST(SUBSTRING(medicine_id, 5) AS UNSIGNED) > ? 
                   AND CAST(SUBSTRING(medicine_id, 5) AS UNSIGNED) <= ? 
                 LIMIT 1`,
                [medicine_name, dosage || null, dosage || null, hospitalBlockOffset, hospitalBlockOffset + 4000]
            );
            rows = r;
        }

        if (rows.length > 0) {
            const med = rows[0];
            const newUnits = med.no_of_units + qty;

            let updateQuery = 'UPDATE medicines SET no_of_units = ?';
            const updateParams = [newUnits];

            if (mfg) {
                updateQuery += ', manufacture_date = ?';
                updateParams.push(mfg);
            }
            if (expiry) {
                updateQuery += ', expiry_date = ?';
                updateParams.push(expiry);
            }
            if (price) {
                updateQuery += ', price = ?';
                updateParams.push(parseFloat(price));
            }
            if (category) {
                updateQuery += ', category = ?';
                updateParams.push(category);
            }

            updateQuery += ' WHERE medicine_id = ?';
            updateParams.push(med.medicine_id);

            await db.query(updateQuery, updateParams);

            return res.json({
                message: 'Medicine restocked successfully.',
                medicine_id: dbToClientMedId(med.medicine_id, hospitalBlockOffset),
                new_quantity: newUnits
            });
        } else {
            const newId = `MED-${Math.floor(Math.random() * 900000) + 100000}`;
            const mfgDate = mfg || new Date().toISOString().split('T')[0];

            let expDate = expiry;
            if (!expDate) {
                const twoYearsLater = new Date();
                twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);
                expDate = twoYearsLater.toISOString().split('T')[0];
            }

            await db.query(
                `INSERT INTO medicines (medicine_id, medicine_name, category, dosage, manufacture_date, expiry_date, price, no_of_units, stock_out_units) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                [
                    newId,
                    medicine_name,
                    category || 'General',
                    dosage || '-',
                    mfgDate,
                    expDate,
                    parseFloat(price) || 0.00,
                    qty
                ]
            );

            return res.json({
                message: 'New medicine added and stocked successfully.',
                medicine_id: dbToClientMedId(newId, hospitalBlockOffset),
                new_quantity: qty
            });
        }
    } catch (err) {
        console.error('Error restocking medicine:', err);
        res.status(500).json({ error: 'Failed to restock medicine.' });
    }
});

// API: Place a new purchase order (Stock-In Executive -> Vendor)
app.post('/api/orders/place', async (req, res) => {
    const { medicine_name, quantity_requested, vendor_id, vendor_name, hospital_name, placed_by } = req.body;

    if (!medicine_name || !quantity_requested) {
        return res.status(400).json({ error: 'Missing medicine_name or quantity_requested' });
    }

    if (!hospital_name) {
        return res.status(400).json({ error: 'Hospital name is required' });
    }

    // Verify that the placed_by user belongs to this hospital and has correct role
    if (placed_by) {
        const userCheck = await db.query(
            'SELECT role, hospital_name FROM users WHERE username = ?',
            [placed_by]
        );
        if (userCheck[0].length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (userCheck[0][0].hospital_name !== hospital_name) {
            return res.status(403).json({ error: 'User does not belong to this hospital' });
        }
        const dbRole = (userCheck[0][0].role || '').toLowerCase();
        if (!['stock-in manager', 'stock in manager', 'ceo', 'stocker'].includes(dbRole)) {
            return res.status(403).json({ error: 'Only Stock-In Managers, CEO, and Stockers can place orders' });
        }
    }

    const query = `INSERT INTO purchase_orders (medicine_name, quantity_requested, vendor_id, vendor_name, placed_by, status, hospital_name) VALUES (?, ?, ?, ?, ?, 'Pending', ?)`;
    try {
        const [result] = await db.query(query, [medicine_name, quantity_requested, vendor_id || 1, vendor_name || null, placed_by || null, hospital_name]);
        res.status(201).json({
            message: 'Order placed successfully!',
            orderId: result.insertId,
            order: {
                order_id: result.insertId,
                medicine_name,
                quantity_requested,
                vendor_id: vendor_id || 1,
                vendor_name: vendor_name || null,
                status: 'Pending',
                hospital_name: hospital_name
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Fetch all purchase orders for a specific Medicine Supplier (Vendor)
app.get('/api/orders/vendor/orders', async (req, res) => {
    const vendorName = req.query.vendor_name;

    if (!vendorName) {
        return res.status(400).json({ error: 'Vendor name is required' });
    }

    let query = `SELECT * FROM purchase_orders WHERE vendor_name = ?`;
    let params = [vendorName];

    if (req.query.status) {
        query += ` AND status = ?`;
        params.push(req.query.status);
    }

    query += ` ORDER BY order_id DESC`;

    try {
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Fetch all pending purchase orders for the Medicine Supplier (Vendor)
app.get('/api/orders/vendor/pending', async (req, res) => {
    const hospitalName = req.query.hospital_name;

    if (!hospitalName) {
        return res.status(400).json({ error: 'Hospital name is required' });
    }

    const query = `SELECT * FROM purchase_orders WHERE status = 'Pending' AND hospital_name = ? ORDER BY order_id DESC`;
    try {
        const [rows] = await db.query(query, [hospitalName]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Update order response (Vendor accept/deny)
app.put('/api/orders/vendor/respond/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const { status, hospital_name, username } = req.body;

    if (!status || !['Accepted', 'Denied'].includes(status)) {
        return res.status(400).json({ error: 'Invalid or missing status (must be Accepted or Denied)' });
    }

    // Verify the user has permission to respond to this order
    const [orderCheck] = await db.query(
        'SELECT hospital_name FROM purchase_orders WHERE order_id = ?',
        [orderId]
    );

    if (orderCheck.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
    }

    // Check if the user belongs to the same hospital
    if (hospital_name && orderCheck[0].hospital_name !== hospital_name) {
        return res.status(403).json({ error: 'You do not have permission to respond to this order' });
    }

    const query = `UPDATE purchase_orders SET status = ? WHERE order_id = ?`;
    try {
        const [result] = await db.query(query, [status, orderId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ message: `Order status updated to ${status} successfully!` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Fetch all purchase orders with statuses for the Stock-In Executive tracking list
app.get('/api/orders/executive/status', async (req, res) => {
    const hospitalName = req.query.hospital_name;

    if (!hospitalName) {
        return res.status(400).json({ error: 'Hospital name is required' });
    }

    let query = `SELECT * FROM purchase_orders WHERE hospital_name = ?`;
    let params = [hospitalName];

    // Optional: filter by status if provided
    if (req.query.status) {
        query += ` AND status = ?`;
        params.push(req.query.status);
    }

    query += ` ORDER BY order_id DESC`;

    try {
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Get orders for CEO/Admin view
app.get('/api/orders/all', async (req, res) => {
    const query = `SELECT * FROM purchase_orders ORDER BY order_id DESC`;
    try {
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Debug endpoint to capture client-side state
app.post('/api/debug-log', (req, res) => {
    console.log('--- DEBUG LOG FROM CLIENT ---');
    console.log(JSON.stringify(req.body, null, 2));
    res.json({ status: 'ok' });
});

// Start standard HTTP Server on port 3000
app.listen(PORT, () => {
    console.log(`Backend server successfully running at http://localhost:${PORT}`);
});