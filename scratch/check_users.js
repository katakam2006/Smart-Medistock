const mysql = require('mysql2/promise');

async function run() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'Hemasrikotha@07',
            database: 'smart_medistock'
        });

        const [users] = await connection.query('SELECT username, role, hospital_name FROM users');
        console.log("=== USERS ===");
        console.log(JSON.stringify(users, null, 2));

        await connection.end();
    } catch (err) {
        console.error("Error querying users:", err);
    }
}

run();
