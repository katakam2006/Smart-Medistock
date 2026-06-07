const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3000;

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
                address TEXT
            )
        `);
        console.log('MySQL users table verified/created.');

        // 2. Create inventory_alerts table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS inventory_alerts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                alert_type VARCHAR(50) NOT NULL,
                medicine_name VARCHAR(100) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Pending',
                triggered_by VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('MySQL inventory_alerts table verified/created.');

        // 3. Create purchase_orders table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS purchase_orders (
                order_id INT AUTO_INCREMENT PRIMARY KEY,
                medicine_name VARCHAR(100) NOT NULL,
                quantity_requested INT NOT NULL,
                vendor_id INT DEFAULT 1,
                status ENUM('Pending', 'Accepted', 'Denied') DEFAULT 'Pending',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('MySQL purchase_orders table verified/created.');

        // 4. Seed a default CEO account if the table is completely empty
        const [rows] = await db.query('SELECT COUNT(*) as count FROM users');
        if (rows[0].count === 0) {
            await db.query(`
                INSERT INTO users (username, email, password, role, address) 
                VALUES ('admin', 'ceo@medistock.com', 'admin123', 'CEO', 'Main Campus')
            `);
            console.log("Default admin account seeded successfully: admin / admin123");
        }
    } catch (err) {
        console.error('Error setting up database tables:', err.message);
    }
}
initializeDatabase();

// API: Register User
app.post('/api/register', async (req, res) => {
    const { username, email, password, role, address } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Missing mandatory fields' });
    }

    const query = `INSERT INTO users (username, email, password, role, address) VALUES (?, ?, ?, ?, ?)`;
    try {
        const [result] = await db.query(query, [username, email, password, role, address || '']);
        res.status(201).json({ message: 'User registered successfully!', userId: result.insertId });
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

    const query = `SELECT username, email, role, address FROM users WHERE username = ? AND password = ?`;
    try {
        const [rows] = await db.query(query, [username, password]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        res.json({ message: 'Login successful', user: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Intimate Alert (Create alert)
app.post('/api/alerts/intimate', async (req, res) => {
    const { alert_type, medicine_name, status, triggered_by } = req.body;
    if (!alert_type || !medicine_name) {
        return res.status(400).json({ error: 'Missing mandatory fields alert_type or medicine_name' });
    }

    const query = `INSERT INTO inventory_alerts (alert_type, medicine_name, status, triggered_by) VALUES (?, ?, ?, ?)`;
    try {
        const [result] = await db.query(query, [alert_type, medicine_name, status || 'Pending', triggered_by || 'Billing Executive']);
        res.status(201).json({ message: 'Alert created successfully!', alertId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Get Active Alerts
app.get('/api/alerts/active', async (req, res) => {
    const query = `SELECT * FROM inventory_alerts ORDER BY id DESC`;
    try {
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Get Dashboard Counters
app.get('/api/dashboard/counters', async (req, res) => {
    try {
        const [lowStockRows] = await db.query(`SELECT COUNT(*) as count FROM inventory_alerts WHERE alert_type = 'LOW STOCK' AND status = 'Pending'`);
        const [expiryRows] = await db.query(`SELECT COUNT(*) as count FROM inventory_alerts WHERE alert_type = 'EXPIRY' AND status = 'Pending'`);
        res.json({
            lowStockCount: lowStockRows[0].count,
            expiryCount: expiryRows[0].count
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API Endpoint to fetch medicine dataset rows safely
app.get('/api/medicines', (req, res) => {
    const csvPath = path.resolve(__dirname, 'medicine_dataset_250k-v2.csv');

    fs.readFile(csvPath, 'utf8', (err, data) => {
        if (err) {
            console.error("CSV Read Error Details:", err);
            return res.status(500).json({ error: "Failed to read dataset file. Check file placement." });
        }

        const lines = data.split('\n');
        const headers = lines[0].split(',');
        const result = [];

        // Limit to first 100 rows for display performance so it loads instantly
        const maxRows = Math.min(lines.length, 101);

        for (let i = 1; i < maxRows; i++) {
            if (!lines[i].trim()) continue;
            const currentline = lines[i].split(',');
            const obj = {};
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j].trim()] = currentline[j] ? currentline[j].trim() : '';
            }
            result.push(obj);
        }

        res.json(result);
    });
});

// API: Update Alert Status
app.put('/api/alerts/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
        return res.status(400).json({ error: 'Missing status' });
    }

    const query = `UPDATE inventory_alerts SET status = ? WHERE id = ?`;
    try {
        await db.query(query, [status, id]);
        res.json({ message: 'Alert status updated successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Place a new purchase order (Stock-In Executive -> Vendor)
app.post('/api/orders/place', async (req, res) => {
    const { medicine_name, quantity_requested, vendor_id } = req.body;
    if (!medicine_name || !quantity_requested) {
        return res.status(400).json({ error: 'Missing medicine_name or quantity_requested' });
    }

    const query = `INSERT INTO purchase_orders (medicine_name, quantity_requested, vendor_id, status) VALUES (?, ?, ?, 'Pending')`;
    try {
        const [result] = await db.query(query, [medicine_name, quantity_requested, vendor_id || 1]);
        res.status(201).json({
            message: 'Order placed successfully!',
            orderId: result.insertId,
            order: {
                order_id: result.insertId,
                medicine_name,
                quantity_requested,
                vendor_id: vendor_id || 1,
                status: 'Pending'
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Fetch all pending purchase orders for the Medicine Supplier (Vendor)
app.get('/api/orders/vendor/pending', async (req, res) => {
    const query = `SELECT * FROM purchase_orders WHERE status = 'Pending' ORDER BY order_id DESC`;
    try {
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Update order response (Vendor accept/deny)
app.put('/api/orders/vendor/respond/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;
    if (!status || !['Accepted', 'Denied'].includes(status)) {
        return res.status(400).json({ error: 'Invalid or missing status (must be Accepted or Denied)' });
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
    const query = `SELECT * FROM purchase_orders ORDER BY order_id DESC`;
    try {
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start standard HTTP Server on port 3000
app.listen(PORT, () => {
    console.log(`Backend server successfully running at http://localhost:${PORT}`);
});