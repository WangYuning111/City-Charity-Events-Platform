// ============================================
// RESTful API Routes - events.js
// Full C.R.U.D. for charity events (Assessment 3)
// Mounted at /api/events
// ============================================

const express = require('express');
const router = express.Router();
const { pool } = require('../event_db');

// ============================================
// Shared SQL fragments
// ============================================

// Columns returned by the client-facing list/search endpoints.
const LIST_COLUMNS = `
    e.event_id,
    e.event_name,
    e.short_description,
    e.event_date,
    e.event_time,
    e.location,
    e.address,
    e.latitude,
    e.longitude,
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
`;

// Extra columns used by the admin listing (all statuses, plus registration
// counts so staff can see at a glance which events are safe to delete).
const ADMIN_COLUMNS = `
    ${LIST_COLUMNS},
    e.full_description,
    e.organizer_contact,
    e.created_at,
    e.updated_at,
    (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.event_id) AS registration_count,
    (SELECT COALESCE(SUM(r.tickets_purchased), 0) FROM registrations r
        WHERE r.event_id = e.event_id) AS tickets_sold
`;

// ============================================
// Helpers
// ============================================

const VALID_STATUSES = ['upcoming', 'active', 'past', 'suspended'];

// Fields an administrator is allowed to write.
const WRITABLE_FIELDS = [
    'event_name', 'short_description', 'full_description', 'category_id', 'org_id',
    'event_date', 'event_time', 'location', 'address', 'latitude', 'longitude',
    'image_url', 'ticket_price', 'goal_amount', 'current_amount', 'status',
    'max_participants', 'organizer_contact'
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function fail(res, status, message, extra) {
    return res.status(status).json({ success: false, message, ...(extra || {}) });
}

// Convert '' / undefined / null to null, otherwise to a trimmed string.
function str(value) {
    if (value === undefined || value === null) return null;
    const s = String(value).trim();
    return s === '' ? null : s;
}

// Validate and normalise an event payload.
// `partial` = true when updating, so only the fields actually supplied are checked.
function validateEventPayload(body, partial) {
    const errors = [];
    const data = {};

    for (const field of WRITABLE_FIELDS) {
        if (body[field] === undefined) continue;

        let value = body[field];

        if (['event_name', 'short_description', 'full_description', 'location',
             'address', 'image_url', 'organizer_contact'].includes(field)) {
            value = str(value);
        }

        if (['category_id', 'org_id', 'max_participants'].includes(field)) {
            if (value === null || value === '') {
                value = null;
            } else {
                const n = Number(value);
                if (!Number.isInteger(n) || n <= 0) {
                    errors.push(`${field} must be a positive integer`);
                    continue;
                }
                value = n;
            }
        }

        if (['ticket_price', 'goal_amount', 'current_amount', 'latitude', 'longitude'].includes(field)) {
            if (value === null || value === '') {
                value = null;
            } else {
                const n = Number(value);
                if (!Number.isFinite(n)) {
                    errors.push(`${field} must be a number`);
                    continue;
                }
                value = n;
            }
        }

        data[field] = value;
    }

    // --- Required fields (always required when creating) ---
    if (!partial) {
        if (!data.event_name) errors.push('event_name is required');
        if (data.category_id === undefined || data.category_id === null) errors.push('category_id is required');
        if (!data.event_date) errors.push('event_date is required');
        if (!data.event_time) errors.push('event_time is required');
        if (!data.location) errors.push('location is required');
    } else {
        if ('event_name' in data && !data.event_name) errors.push('event_name cannot be empty');
        if ('location' in data && !data.location) errors.push('location cannot be empty');
    }

    // --- Format checks on whatever was supplied ---
    if (data.event_date && !DATE_RE.test(data.event_date)) {
        errors.push('event_date must use YYYY-MM-DD');
    }
    if (data.event_time) {
        if (!TIME_RE.test(data.event_time)) {
            errors.push('event_time must use HH:MM or HH:MM:SS');
        } else if (data.event_time.length === 5) {
            data.event_time += ':00';   // normalise for MySQL TIME
        }
    }
    if (data.status && !VALID_STATUSES.includes(data.status)) {
        errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    if (data.ticket_price !== undefined && data.ticket_price !== null && data.ticket_price < 0) {
        errors.push('ticket_price cannot be negative');
    }
    if (data.goal_amount !== undefined && data.goal_amount !== null && data.goal_amount < 0) {
        errors.push('goal_amount cannot be negative');
    }
    if (data.current_amount !== undefined && data.current_amount !== null && data.current_amount < 0) {
        errors.push('current_amount cannot be negative');
    }
    if (data.latitude !== undefined && data.latitude !== null && (data.latitude < -90 || data.latitude > 90)) {
        errors.push('latitude must be between -90 and 90');
    }
    if (data.longitude !== undefined && data.longitude !== null && (data.longitude < -180 || data.longitude > 180)) {
        errors.push('longitude must be between -180 and 180');
    }

    return { errors, data };
}

async function categoryExists(categoryId) {
    const [rows] = await pool.execute(
        'SELECT 1 FROM categories WHERE category_id = ?', [categoryId]
    );
    return rows.length > 0;
}

async function organizationExists(orgId) {
    if (orgId === null || orgId === undefined) return true;
    const [rows] = await pool.execute(
        'SELECT 1 FROM organizations WHERE org_id = ?', [orgId]
    );
    return rows.length > 0;
}

// ============================================
// GET /api/events
// Public listing: ongoing + upcoming events only.
// Excludes past and suspended, as required by the case study.
// ============================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT ${LIST_COLUMNS}
            FROM events e
            INNER JOIN categories c ON e.category_id = c.category_id
            LEFT JOIN organizations o ON e.org_id = o.org_id
            WHERE e.status IN ('upcoming', 'active')
            ORDER BY e.event_date ASC, e.event_time ASC
        `);

        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        console.error('Failed to fetch events:', err);
        fail(res, 500, 'Server error: unable to fetch events');
    }
});

// ============================================
// GET /api/events/search
// Multi-criteria, freely combinable filtering.
// All user values are bound parameters -> SQL-injection safe.
// ============================================
router.get('/search', async (req, res) => {
    try {
        const { date, location, category, freeOnly } = req.query;

        let sql = `
            SELECT ${LIST_COLUMNS}
            FROM events e
            INNER JOIN categories c ON e.category_id = c.category_id
            LEFT JOIN organizations o ON e.org_id = o.org_id
            WHERE e.status IN ('upcoming', 'active')
        `;

        const params = [];

        if (date) {
            sql += ' AND e.event_date = ?';
            params.push(date);
        }

        if (location) {
            sql += ' AND (e.location LIKE ? OR e.address LIKE ?)';
            params.push(`%${location}%`, `%${location}%`);
        }

        if (category) {
            sql += ' AND c.category_id = ?';
            params.push(parseInt(category, 10));
        }

        if (freeOnly === '1' || freeOnly === 'true') {
            sql += ' AND (e.ticket_price = 0 OR e.ticket_price IS NULL)';
        }

        sql += ' ORDER BY e.event_date ASC, e.event_time ASC';

        const [rows] = await pool.execute(sql, params);

        res.json({
            success: true,
            count: rows.length,
            filters: { date: date || null, location: location || null, category: category || null },
            data: rows
        });
    } catch (err) {
        console.error('Search failed:', err);
        fail(res, 500, 'Server error: search failed');
    }
});

// ============================================
// GET /api/events/categories/list
// Categories with a count of live events (search-page dropdown).
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
            GROUP BY c.category_id, c.category_name, c.category_description, c.icon_class
            ORDER BY c.category_name ASC
        `);

        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        console.error('Failed to fetch categories:', err);
        fail(res, 500, 'Server error: unable to fetch categories');
    }
});

// ============================================
// GET /api/events/admin/all
// Admin listing: EVERY event regardless of status, with registration
// counts. NOTE: this must be declared before GET /:id, otherwise
// Express would match "admin" as an :id.
// ============================================
router.get('/admin/all', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT ${ADMIN_COLUMNS}
            FROM events e
            INNER JOIN categories c ON e.category_id = c.category_id
            LEFT JOIN organizations o ON e.org_id = o.org_id
            ORDER BY e.event_date DESC, e.event_time DESC
        `);

        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        console.error('Failed to fetch admin events:', err);
        fail(res, 500, 'Server error: unable to fetch events');
    }
});

// ============================================
// GET /api/events/:id
// Full detail for one event INCLUDING its complete registration list,
// newest registration first (required by A3 Part 2 & 3).
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const eventId = parseInt(req.params.id, 10);

        if (isNaN(eventId)) {
            return fail(res, 400, 'Invalid event ID');
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
            return fail(res, 404, 'Event not found');
        }

        const event = rows[0];

        // Registrations, newest first — a single extra query, not N+1.
        const [registrations] = await pool.execute(`
            SELECT
                registration_id,
                event_id,
                attendee_name,
                attendee_email,
                attendee_phone,
                tickets_purchased,
                registration_date,
                special_requests
            FROM registrations
            WHERE event_id = ?
            ORDER BY registration_date DESC, registration_id DESC
        `, [eventId]);

        // Server-computed aggregates so every client renders the same numbers.
        const ticketsSold = registrations.reduce(
            (sum, r) => sum + Number(r.tickets_purchased || 0), 0
        );
        const goal = Number(event.goal_amount) || 0;
        const raised = Number(event.current_amount) || 0;

        event.progress_percentage = goal > 0
            ? Math.min(Math.round((raised / goal) * 100), 100)
            : 0;

        event.registrations = registrations;
        event.registration_count = registrations.length;
        event.tickets_sold = ticketsSold;
        event.tickets_remaining = event.max_participants
            ? Math.max(Number(event.max_participants) - ticketsSold, 0)
            : null;

        res.json({ success: true, data: event });
    } catch (err) {
        console.error('Failed to fetch event detail:', err);
        fail(res, 500, 'Server error: unable to fetch event details');
    }
});

// ============================================
// POST /api/events
// Create a new charity event (admin).
// ============================================
router.post('/', async (req, res) => {
    try {
        const { errors, data } = validateEventPayload(req.body, false);
        if (errors.length > 0) {
            return fail(res, 400, 'Validation failed', { errors });
        }

        if (!(await categoryExists(data.category_id))) {
            return fail(res, 400, 'Unknown category_id', { errors: ['Unknown category_id'] });
        }
        if (!(await organizationExists(data.org_id))) {
            return fail(res, 400, 'Unknown org_id', { errors: ['Unknown org_id'] });
        }

        const columns = [];
        const placeholders = [];
        const values = [];

        for (const [field, value] of Object.entries(data)) {
            columns.push(field);
            placeholders.push('?');
            values.push(value);
        }

        const [result] = await pool.execute(
            `INSERT INTO events (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
            values
        );

        const [created] = await pool.execute(
            `SELECT ${ADMIN_COLUMNS}
             FROM events e
             INNER JOIN categories c ON e.category_id = c.category_id
             LEFT JOIN organizations o ON e.org_id = o.org_id
             WHERE e.event_id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: created[0]
        });
    } catch (err) {
        console.error('Failed to create event:', err);
        fail(res, 500, 'Server error: unable to create event');
    }
});

// ============================================
// PUT /api/events/:id
// Update an existing event. Supports full or partial payloads:
// supplied fields are validated, omitted fields keep their value.
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const eventId = parseInt(req.params.id, 10);
        if (isNaN(eventId)) {
            return fail(res, 400, 'Invalid event ID');
        }

        const [existingRows] = await pool.execute(
            'SELECT event_id FROM events WHERE event_id = ?', [eventId]
        );
        if (existingRows.length === 0) {
            return fail(res, 404, 'Event not found');
        }

        const { errors, data } = validateEventPayload(req.body, true);
        if (errors.length > 0) {
            return fail(res, 400, 'Validation failed', { errors });
        }

        if ('category_id' in data && data.category_id !== null && !(await categoryExists(data.category_id))) {
            return fail(res, 400, 'Unknown category_id', { errors: ['Unknown category_id'] });
        }
        if ('org_id' in data && !(await organizationExists(data.org_id))) {
            return fail(res, 400, 'Unknown org_id', { errors: ['Unknown org_id'] });
        }

        const assignments = [];
        const values = [];

        for (const [field, value] of Object.entries(data)) {
            assignments.push(`${field} = ?`);
            values.push(value);
        }

        if (assignments.length === 0) {
            return fail(res, 400, 'No updatable fields supplied');
        }

        values.push(eventId);

        await pool.execute(
            `UPDATE events SET ${assignments.join(', ')} WHERE event_id = ?`,
            values
        );

        const [updated] = await pool.execute(
            `SELECT ${ADMIN_COLUMNS}
             FROM events e
             INNER JOIN categories c ON e.category_id = c.category_id
             LEFT JOIN organizations o ON e.org_id = o.org_id
             WHERE e.event_id = ?`,
            [eventId]
        );

        res.json({
            success: true,
            message: 'Event updated successfully',
            data: updated[0]
        });
    } catch (err) {
        console.error('Failed to update event:', err);
        fail(res, 500, 'Server error: unable to update event');
    }
});

// ============================================
// DELETE /api/events/:id
// Data-integrity rule: an event may only be deleted when it has NO
// registrations. Otherwise the request is refused with HTTP 409.
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const eventId = parseInt(req.params.id, 10);
        if (isNaN(eventId)) {
            return fail(res, 400, 'Invalid event ID');
        }

        const [existingRows] = await pool.execute(
            'SELECT event_id, event_name FROM events WHERE event_id = ?', [eventId]
        );
        if (existingRows.length === 0) {
            return fail(res, 404, 'Event not found');
        }

        const [countRows] = await pool.execute(
            `SELECT COUNT(*) AS count,
                    COALESCE(SUM(tickets_purchased), 0) AS tickets
             FROM registrations WHERE event_id = ?`,
            [eventId]
        );

        const { count, tickets } = countRows[0];

        if (Number(count) > 0) {
            return fail(
                res, 409,
                'This event cannot be deleted because it already has registrations.',
                { registration_count: Number(count), tickets_sold: Number(tickets) }
            );
        }

        await pool.execute('DELETE FROM events WHERE event_id = ?', [eventId]);

        res.json({
            success: true,
            message: `Event "${existingRows[0].event_name}" deleted successfully`
        });
    } catch (err) {
        // Belt and braces: the FK is ON DELETE RESTRICT, so the database
        // refuses too if registrations slipped in between the check and delete.
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return fail(res, 409, 'This event cannot be deleted because it has registrations.');
        }
        console.error('Failed to delete event:', err);
        fail(res, 500, 'Server error: unable to delete event');
    }
});

module.exports = router;
