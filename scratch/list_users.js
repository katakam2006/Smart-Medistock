const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Hemasrikotha@07',
    database: 'smart_medistock',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const db = pool.promise();

async function listUsers() {
    try {
        console.log("Listing users...");
        const [users] = await db.query(
            "SELECT id, username, email, role, hospital_name FROM users"
        );
        console.table(users);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
listUsers();
