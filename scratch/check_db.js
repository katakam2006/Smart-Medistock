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

async function check() {
    try {
        const [rows] = await db.query('SELECT * FROM medicines WHERE price IN (134.44, 193.76, 186.70) LIMIT 10');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
check();
