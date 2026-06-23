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

async function checkStockouts() {
    try {
        console.log("Checking for current stockouts (no_of_units = 0)...");
        const [currentStockouts] = await db.query(
            "SELECT medicine_id, medicine_name, category, dosage, no_of_units, stock_out_units FROM medicines WHERE no_of_units = 0 LIMIT 10"
        );
        const [[{ count: currentCount }]] = await db.query("SELECT COUNT(*) AS count FROM medicines WHERE no_of_units = 0");
        console.log(`Total medicines currently out of stock: ${currentCount}`);
        if (currentStockouts.length > 0) {
            console.log("Samples of current stockouts:");
            console.table(currentStockouts);
        } else {
            console.log("No medicines are currently out of stock.");
        }

        console.log("\nChecking for historical stockouts (stock_out_units > 0)...");
        const [historicalStockouts] = await db.query(
            "SELECT medicine_id, medicine_name, category, dosage, no_of_units, stock_out_units FROM medicines WHERE stock_out_units > 0 ORDER BY stock_out_units DESC LIMIT 10"
        );
        const [[{ count: historicalCount }]] = await db.query("SELECT COUNT(*) AS count FROM medicines WHERE stock_out_units > 0");
        console.log(`Total medicines with historical stockout units: ${historicalCount}`);
        if (historicalStockouts.length > 0) {
            console.log("Top 10 medicines with historical stockouts:");
            console.table(historicalStockouts);
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
checkStockouts();
