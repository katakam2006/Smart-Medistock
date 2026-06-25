const mysql = require('mysql2/promise');

async function run() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'Hemasrikotha@07',
            database: 'smart_medistock'
        });

        const [rows] = await connection.query('SELECT medicine_name, COUNT(*) as count FROM medicines GROUP BY medicine_name HAVING count > 1 LIMIT 10');
        console.log("=== DUPLICATE NAMES ===");
        console.log(JSON.stringify(rows, null, 2));

        await connection.end();
    } catch (err) {
        console.error("Error querying duplicate names:", err);
    }
}

run();
