// ============================================
// Express Server Entry - server.js
// City Charity Events Dynamic Website - RESTful API
// Assessment 3: full C.R.U.D. + registrations + weather proxy
// ============================================

// Load .env before anything reads process.env (no-op when the file is absent,
// e.g. on cPanel where the variables are injected by the Node.js App panel).
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { testConnection } = require('./event_db');

// Import routes
const eventsRouter = require('./routes/events');
const registrationsRouter = require('./routes/registrations');
const organizationsRouter = require('./routes/organizations');
const weatherRouter = require('./routes/weather');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middleware
// ============================================

// CORS: the two Angular applications are served from their own origins
// (ng serve on :4200 for the client site, :4300 for the admin site),
// so cross-origin access to this API must be allowed.
app.use(cors());

// Body parsers for JSON and form submissions
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// API Routes
// ============================================
app.use('/api/events', eventsRouter);
app.use('/api/registrations', registrationsRouter);
app.use('/api/organizations', organizationsRouter);
app.use('/api/weather', weatherRouter);

// ============================================
// API Root / Service discovery
// ============================================
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Charity Events Management API is running',
        version: '2.0.0',
        endpoints: {
            events: 'GET /api/events',
            search: 'GET /api/events/search?date=&location=&category=&freeOnly=',
            categories: 'GET /api/events/categories/list',
            adminList: 'GET /api/events/admin/all',
            eventDetail: 'GET /api/events/:id  (includes registrations)',
            createEvent: 'POST /api/events',
            updateEvent: 'PUT /api/events/:id',
            deleteEvent: 'DELETE /api/events/:id  (blocked when registrations exist)',
            registrations: 'GET/POST /api/registrations',
            weather: 'GET /api/weather?lat=&lon=&timezone='
        }
    });
});

// Lightweight health probe used by the front ends and by cPanel monitoring.
app.get('/api/health', async (req, res) => {
    const connected = await testConnection();
    res.status(connected ? 200 : 503).json({ success: connected, database: connected ? 'connected' : 'unavailable' });
});

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Resource not found: ${req.method} ${req.originalUrl}`
    });
});

// ============================================
// Global Error Handler
// ============================================
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, message: 'Malformed JSON in request body' });
    }
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// ============================================
// Start Server
// ============================================
async function startServer() {
    const dbConnected = await testConnection();

    if (!dbConnected) {
        console.warn('WARNING: MySQL connection failed. API will not work properly.');
        console.warn('Please ensure MySQL is running and the database has been imported.');
    }

    app.listen(PORT, () => {
        console.log('========================================');
        console.log('  City Charity Events - API Server');
        console.log('========================================');
        console.log(`  API:       http://localhost:${PORT}/api`);
        console.log(`  Client:    http://localhost:4200  (ng serve clientside)`);
        console.log(`  Admin:     http://localhost:4300  (ng serve adminside)`);
        console.log('========================================');
    });
}

startServer();
