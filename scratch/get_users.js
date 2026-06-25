const mysql = require('mysql2/promise');

async function main() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Hemasrikotha@07',
        database: 'smart_medistock'
    });

    const [rows] = await connection.query("SELECT * FROM medicines WHERE medicine_name = 'Valsartan'");
    console.log(JSON.stringify(rows, null, 2));
    await connection.end();
}

main().catch(console.error);
