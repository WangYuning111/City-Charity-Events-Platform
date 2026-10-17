// ============================================
// RESTful API Routes - organizations.js
// Read-only list of charitable organizations, used by the admin site
// when creating or editing an event.
// Mounted at /api/organizations
// ============================================

const express = require('express');
const router = express.Router();
const { pool } = require('../event_db');

// GET /api/organizations
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT org_id, org_name, mission_statement, contact_email, contact_phone, website_url
            FROM organizations
            ORDER BY org_name ASC
        `);

        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        console.error('Failed to fetch organizations:', err);
        res.status(500).json({ success: false, message: 'Server error: unable to fetch organizations' });
    }
});

module.exports = router;
