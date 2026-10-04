// ============================================
// Express Server Entry - server.js
// City Charity Events Dynamic Website RESTful API Server
// ============================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const { testConnection } = require('./event_db');

// Import routes
const eventsRouter = require('./routes/events');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middleware
// ============================================

// CORS support - allows client website to access API
app.use(cors());

// JSON body parser
app.use(express.json());

// URL-encoded parser
app.use(express.urlencoded({ extended: true }));

// Static file serving - serves client website files
app.use(express.static(path.join(__dirname, '..', 'client')));

// ============================================
// API Routes
// ============================================

// Events API
app.use('/api/events', eventsRouter);

// ============================================
// API Root
// ============================================
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Charity Events Management API is running',
        version: '1.0.0',
        endpoints: {
            events: '/api/events',
            search: '/api/events/search?date=&location=&category=',
            eventDetail: '/api/events/:id',
            categories: '/api/events/categories/list'
        }
    });
});

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Resource not found'
    });
});

// ============================================
// Global Error Handler
// ============================================
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// ============================================
// Start Server
// ============================================
async function startServer() {
    // Test MySQL database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
        console.warn('WARNING: MySQL connection failed. API will not work properly.');
        console.warn('Please ensure MySQL service is running and the database is configured.');
    }

    app.listen(PORT, () => {
        console.log('========================================');
        console.log('  City Charity Events - API Server');
        console.log('========================================');
        console.log(`  Server:     http://localhost:${PORT}`);
        console.log(`  Website:    http://localhost:${PORT}/`);
        console.log(`  API:        http://localhost:${PORT}/api`);
        console.log('========================================');
    });
}

startServer();