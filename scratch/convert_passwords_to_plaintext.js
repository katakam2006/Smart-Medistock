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

async function convertPasswords() {
    try {
        console.log("Fetching all users...");
        const [users] = await db.query("SELECT id, username, password FROM users");
        
        console.log(`Found ${users.length} users. Converting hashed passwords to plain text...`);
        
        for (const user of users) {
            if (user.password && user.password.includes(':') && user.password.length > 50) {
                // If it is a hash, we replace it with their username in plain text
                const newPlainPassword = user.username;
                await db.query("UPDATE users SET password = ? WHERE id = ?", [newPlainPassword, user.id]);
                console.log(`Updated user '${user.username}' password to plain text: '${newPlainPassword}'`);
            } else {
                console.log(`User '${user.username}' password is already in plain text.`);
            }
        }
        console.log("✅ All hashed passwords converted successfully!");
    } catch (err) {
        console.error("Error converting passwords:", err);
    } finally {
        pool.end();
    }
}

convertPasswords();
