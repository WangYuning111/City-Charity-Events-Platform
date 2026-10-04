// ============================================
// RESTful API Routes - events.js
// Handles all charity event related API requests
// Using MySQL (mysql2/promise)
// ============================================

const express = require('express');
const router = express.Router();
const { pool } = require('../event_db');

// ============================================
// GET /api/events
// Fetch all active and upcoming events (for homepage display)
// Excludes past and suspended events
// ============================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                e.event_id,
                e.event_name,
                e.short_description,
                e.event_date,
                e.event_time,
                e.location,
                e.image_url,
                e.ticket_price,
                e.goal_amount,
                e.current_amount,
                e.status,
                e.max_participants,
                c.category_name,
                c.category_id,
                c.icon_class,
                o.org_name,
                o.org_id
            FROM events e
            INNER JOIN categories c ON e.category_id = c.category_id
            LEFT JOIN organizations o ON e.org_id = o.org_id
            WHERE e.status IN ('upcoming', 'active')
            ORDER BY e.event_date ASC, e.event_time ASC
        `);

        res.json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        console.error('Failed to fetch events:', err);
        res.status(500).json({
            success: false,
            message: 'Server error: unable to fetch events'
        });
    }
});

// ============================================
// GET /api/events/search
// Search events by criteria (date, location, category)
// Supports multi-criteria combination filtering
// ============================================
router.get('/search', async (req, res) => {
    try {
        const { date, location, category } = req.query;

        // Build dynamic SQL query
        let sql = `
            SELECT 
                e.event_id,
                e.event_name,
                e.short_description,
                e.event_date,
                e.event_time,
                e.location,
                e.image_url,
                e.ticket_price,
                e.goal_amount,
                e.current_amount,
                e.status,
                c.category_name,
                c.category_id,
                c.icon_class,
                o.org_name
            FROM events e
            INNER JOIN categories c ON e.category_id = c.category_id
            LEFT JOIN organizations o ON e.org_id = o.org_id
            WHERE e.status IN ('upcoming', 'active')
        `;
        
        const params = [];

        // Date filter
        if (date) {
            sql += ' AND e.event_date = ?';
            params.push(date);
        }

        // Location filter (fuzzy search)
        if (location) {
            sql += ' AND (e.location LIKE ? OR e.address LIKE ?)';
            params.push(`%${location}%`, `%${location}%`);
        }

        // Category filter
        if (category) {
            sql += ' AND c.category_id = ?';
            params.push(parseInt(category));
        }

        sql += ' ORDER BY e.event_date ASC, e.event_time ASC';

        const [rows] = await pool.execute(sql, params);

        res.json({
            success: true,
            count: rows.length,
            filters: { date, location, category },
            data: rows
        });
    } catch (err) {
        console.error('Search failed:', err);
        res.status(500).json({
            success: false,
            message: 'Server error: search failed'
        });
    }
});

// ============================================
// GET /api/events/categories/list
// Fetch all event categories (for search page dropdown)
// ============================================
router.get('/categories/list', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                c.category_id,
                c.category_name,
                c.category_description,
                c.icon_class,
                COUNT(e.event_id) AS event_count
            FROM categories c
            LEFT JOIN events e ON c.category_id = e.category_id 
                AND e.status IN ('upcoming', 'active')
            GROUP BY c.category_id
            ORDER BY c.category_name ASC
        `);

        res.json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        console.error('Failed to fetch categories:', err);
        res.status(500).json({
            success: false,
            message: 'Server error: unable to fetch categories'
        });
    }
});

// ============================================
// GET /api/events/:id
// Fetch full details of a single event (for event detail page)
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);

        if (isNaN(eventId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid event ID'
            });
        }

        const [rows] = await pool.execute(`
            SELECT 
                e.*,
                c.category_name,
                c.category_description,
                c.icon_class,
                o.org_name,
                o.mission_statement,
                o.description AS org_description,
                o.contact_email AS org_email,
                o.contact_phone AS org_phone,
                o.website_url AS org_website
            FROM events e
            INNER JOIN categories c ON e.category_id = c.category_id
            LEFT JOIN organizations o ON e.org_id = o.org_id
            WHERE e.event_id = ?
        `, [eventId]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        const row = rows[0];

        // Calculate fundraising progress percentage
        row.progress_percentage = row.goal_amount > 0 
            ? Math.round((row.current_amount / row.goal_amount) * 100) 
            : 0;

        res.json({
            success: true,
            data: row
        });
    } catch (err) {
        console.error('Failed to fetch event detail:', err);
        res.status(500).json({
            success: false,
            message: 'Server error: unable to fetch event details'
        });
    }
});

module.exports = router;