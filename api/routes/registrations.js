// ============================================
// RESTful API Routes - registrations.js
// Event registration (ticket purchase) endpoints
// Mounted at /api/registrations
// ============================================

const express = require('express');
const router = express.Router();
const { pool } = require('../event_db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\d][\d\s()+-]{5,29}$/;

function fail(res, status, message, extra) {
    return res.status(status).json({ success: false, message, ...(extra || {}) });
}

function str(value) {
    if (value === undefined || value === null) return null;
    const s = String(value).trim();
    return s === '' ? null : s;
}

// ============================================
// GET /api/registrations?eventId=3
// Registration list, optionally scoped to one event.
// ============================================
router.get('/', async (req, res) => {
    try {
        const { eventId } = req.query;
        const params = [];
        let sql = `
            SELECT r.*, e.event_name
            FROM registrations r
            INNER JOIN events e ON r.event_id = e.event_id
        `;

        if (eventId !== undefined) {
            const id = parseInt(eventId, 10);
            if (isNaN(id)) {
                return fail(res, 400, 'Invalid eventId');
            }
            sql += ' WHERE r.event_id = ?';
            params.push(id);
        }

        sql += ' ORDER BY r.registration_date DESC, r.registration_id DESC';

        const [rows] = await pool.execute(sql, params);

        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        console.error('Failed to fetch registrations:', err);
        fail(res, 500, 'Server error: unable to fetch registrations');
    }
});

// ============================================
// POST /api/registrations
// Create a registration (purchase tickets for an event).
// ============================================
router.post('/', async (req, res) => {
    try {
        const errors = [];

        const eventId = parseInt(req.body.event_id, 10);
        const attendeeName = str(req.body.attendee_name);
        const attendeeEmail = str(req.body.attendee_email);
        const attendeePhone = str(req.body.attendee_phone);
        const specialRequests = str(req.body.special_requests);
        const ticketsRaw = req.body.tickets_purchased;
        const tickets = ticketsRaw === undefined || ticketsRaw === null || ticketsRaw === ''
            ? 1
            : Number(ticketsRaw);

        // --- field validation ---
        if (isNaN(eventId) || eventId <= 0) {
            errors.push('A valid event_id is required');
        }
        if (!attendeeName) {
            errors.push('Full name is required');
        } else if (attendeeName.length > 150) {
            errors.push('Full name must be 150 characters or fewer');
        }
        if (!attendeeEmail) {
            errors.push('Email is required');
        } else if (!EMAIL_RE.test(attendeeEmail)) {
            errors.push('Please enter a valid email address');
        }
        if (attendeePhone && !PHONE_RE.test(attendeePhone)) {
            errors.push('Please enter a valid phone number');
        }
        if (!Number.isInteger(tickets) || tickets < 1) {
            errors.push('Number of tickets must be a whole number of at least 1');
        } else if (tickets > 10) {
            errors.push('A maximum of 10 tickets may be purchased per registration');
        }
        if (specialRequests && specialRequests.length > 255) {
            errors.push('Special requests must be 255 characters or fewer');
        }

        if (errors.length > 0) {
            return fail(res, 400, 'Validation failed', { errors });
        }

        // --- the event must exist and still be open for registration ---
        const [eventRows] = await pool.execute(
            `SELECT event_id, event_name, max_participants, status
             FROM events WHERE event_id = ?`,
            [eventId]
        );

        if (eventRows.length === 0) {
            return fail(res, 404, 'The selected event does not exist');
        }

        const event = eventRows[0];

        if (event.status === 'past') {
            return fail(res, 400, 'This event has already ended and is no longer accepting registrations');
        }
        if (event.status === 'suspended') {
            return fail(res, 400, 'This event is currently suspended and is not accepting registrations');
        }

        // --- capacity check against max_participants ---
        const [soldRows] = await pool.execute(
            `SELECT COALESCE(SUM(tickets_purchased), 0) AS sold
             FROM registrations WHERE event_id = ?`,
            [eventId]
        );
        const sold = Number(soldRows[0].sold);

        if (event.max_participants !== null) {
            const remaining = Number(event.max_participants) - sold;
            if (tickets > remaining) {
                return fail(
                    res, 409,
                    remaining > 0
                        ? `Only ${remaining} ticket(s) remaining for this event`
                        : 'This event is fully booked',
                    { tickets_remaining: Math.max(remaining, 0) }
                );
            }
        }

        // --- insert; the UNIQUE(event_id, email) constraint also protects us ---
        const [result] = await pool.execute(
            `INSERT INTO registrations
                (event_id, attendee_name, attendee_email, attendee_phone,
                 tickets_purchased, special_requests)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [eventId, attendeeName, attendeeEmail, attendeePhone, tickets, specialRequests]
        );

        const [created] = await pool.execute(
            `SELECT * FROM registrations WHERE registration_id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Registration completed successfully',
            data: { ...created[0], event_name: event.event_name }
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return fail(
                res, 409,
                'This email address is already registered for this event. Each person may register only once.'
            );
        }
        console.error('Failed to create registration:', err);
        fail(res, 500, 'Server error: unable to create registration');
    }
});

module.exports = router;
