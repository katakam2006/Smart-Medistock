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
        const [rows] = await db.query('SELECT COUNT(*) AS count FROM medicines');
        console.log('Medicines count:', rows[0].count);
        if (rows[0].count > 0) {
            const [samples] = await db.query('SELECT * FROM medicines LIMIT 3');
            console.log('Sample medicines:', JSON.stringify(samples, null, 2));
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
check();
