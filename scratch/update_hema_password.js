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

async function setHemaPassword() {
    try {
        await db.query("UPDATE users SET password = 'Hema@07' WHERE username = 'Hema'");
        console.log("✅ Successfully updated Hema's password to 'Hema@07' in the database!");
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

setHemaPassword();
