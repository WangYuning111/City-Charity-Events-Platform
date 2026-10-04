// ============================================
// Database Connection - event_db.js
// MySQL connection pool for charityevents_db
// ============================================

const mysql = require('mysql2/promise');

// MySQL connection pool configuration
const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'charityevents_db',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test connection
async function testConnection() {
    try {
        const [rows] = await pool.execute('SELECT COUNT(*) AS count FROM events');
        const [catRows] = await pool.execute('SELECT COUNT(*) AS count FROM categories');
        console.log('MySQL database connected successfully!');
        console.log(`  Events: ${rows[0].count} | Categories: ${catRows[0].count}`);
        return true;
    } catch (err) {
        console.error('MySQL database connection failed:', err.message);
        return false;
    }
}

module.exports = { pool, testConnection };