const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Hemasrikotha@07',
    database: 'smart_medistock',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

async function run() {
  const ids = ['MED-004001', 'MED-004002', 'MED-007987', 'MED-007917'];
  const [rows] = await pool.query("SELECT medicine_id, medicine_name, dosage, price, no_of_units, expiry_date FROM medicines WHERE medicine_id IN (?, ?, ?, ?)", ids);
  console.log(rows);
  pool.end();
}
run().catch(console.error);
