// ============================================
// Database Connection - event_db.js
// MySQL connection pool for charityevents_db
// ============================================

const mysql = require('mysql2/promise');

// ------------------------------------------------------------
// Connection settings are read from the environment so that the
// same source file works in every place it has to run:
//
//   local dev  -> api/.env   (copy .env.example, fill in root / '')
//   cPanel     -> Setup Node.js App > Environment variables
//
// Nothing secret is committed to Git. The fallbacks below keep the
// original local defaults (root, empty password) so an existing
// developer machine needs no .env file at all.
// ------------------------------------------------------------
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'charityevents_db',
    charset: 'utf8mb4',
    // Return DATE / DATETIME / TIMESTAMP columns as plain strings.
    // Without this, mysql2 converts a DATE such as '2026-10-18' into a JS Date
    // at local midnight, which JSON-serialises as '2026-10-17T16:00:00.000Z'
    // (UTC). The client would then read the UTC day and render the event one
    // day early, and countdown maths on the full ISO string yields NaN.
    dateStrings: true,
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