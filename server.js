const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const cors = require('cors');
const https = require('https'); 
const fs = require('fs');      

const app = express();
const PORT = 3000;

// HTTPS Server Configuration
const options = {
    pfx: fs.readFileSync(path.join(__dirname, 'security', 'key.pfx')),
    passphrase: 'password' 
};

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

        // 2. Seed a default CEO account if the table is completely empty
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

// Start the server using HTTPS wrapping
https.createServer(options, app).listen(PORT, () => {
    console.log(`Secure backend server running at https://localhost:${PORT}`);
});