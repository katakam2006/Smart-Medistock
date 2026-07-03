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

async function restorePasswords() {
    try {
        console.log("Fetching all users...");
        const [users] = await db.query("SELECT id, username FROM users");
        
        console.log(`Found ${users.length} users. Restoring passwords to format 'Username@07'...`);
        
        for (const user of users) {
            // Apply the 'Username@07' pattern (matching the case of the username)
            const originalPassword = `${user.username}@07`;
            await db.query("UPDATE users SET password = ? WHERE id = ?", [originalPassword, user.id]);
            console.log(`Updated user '${user.username}' password to: '${originalPassword}'`);
        }
        console.log("✅ All user passwords successfully restored!");
    } catch (err) {
        console.error("Error restoring passwords:", err);
    } finally {
        pool.end();
    }
}

restorePasswords();
