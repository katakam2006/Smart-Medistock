const mysql = require('mysql2/promise');

async function run() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'Hemasrikotha@07',
            database: 'smart_medistock'
        });

        const [alerts] = await connection.query('SELECT * FROM inventory_alerts');
        console.log("=== ALL ALERTS ===");
        console.log(JSON.stringify(alerts, null, 2));

        const [medicines] = await connection.query('SELECT * FROM medicines LIMIT 10');
        console.log("=== FIRST 10 MEDICINES ===");
        console.log(JSON.stringify(medicines, null, 2));

        await connection.end();
    } catch (err) {
        console.error("Database connection error:", err);
    }
}

run();
