// ============================================
// Home Page JavaScript - home.js
// Handles dynamic event loading and interaction on the home page
// ============================================

// API base URL (auto-detects the current server address)
const API_BASE = window.location.origin;

// ============================================
// Utility: Format date
// ============================================
function formatDate(dateStr) {
    if (!dateStr) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Parse date parts manually to avoid timezone shift
    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    return `${months[month - 1]} ${day}, ${year}`;
}

// ============================================
// Utility: Format time
// ============================================
function formatTime(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    const hour = parseInt(parts[0]);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h}:${parts[1]} ${ampm}`;
}

// ============================================
// Utility: Format currency
// ============================================
function formatMoney(amount) {
    if (!amount || amount === 0) return 'Free';
    return '$' + Number(amount).toLocaleString('en-US');
}

// ============================================
// Utility: Get status badge label
// ============================================
function getStatusBadge(status) {
    const map = {
        'upcoming': 'Upcoming',
        'active': 'Active',
        'past': 'Ended',
        'suspended': 'Suspended'
    };
    return map[status] || status;
}

// ============================================
// Utility: Calculate progress percentage
// ============================================
function getProgressPercent(current, goal) {
    if (!goal || goal === 0) return 0;
    return Math.min(Math.round((current / goal) * 100), 100);
}

// ============================================
// Countdown: Calculate days until event
// ============================================
function getCountdownText(dateStr, status) {
    if (status === 'past' || status === 'suspended') return '';
    const eventDate = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffMs = eventDate - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return '';
    if (diffDays === 0) return 'Today!';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days left`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks left`;
    return `${Math.ceil(diffDays / 30)} month(s) left`;
}

// ============================================
// Render an event card
// ============================================
function renderEventCard(event) {
    const progressPercent = getProgressPercent(event.current_amount, event.goal_amount);
    const isFree = !event.ticket_price || parseFloat(event.ticket_price) === 0;
    const countdown = getCountdownText(event.event_date, event.status);

    return `
        <div class="event-card reveal">
            <div class="event-card-image">
                <img src="${event.image_url}" 
                     alt="${event.event_name}" 
                     loading="lazy"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22340%22 height=%22200%22%3E%3Crect fill=%22%23F5E6DC%22 width=%22340%22 height=%22200%22/%3E%3Ctext fill=%22%238D6E63%22 x=%22170%22 y=%22100%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2216%22%3ENo Image%3C/text%3E%3C/svg%3E'">
                <span class="event-card-badge ${event.status}">${getStatusBadge(event.status)}</span>
                ${countdown ? `<span class="event-card-countdown">⏱ ${countdown}</span>` : ''}
            </div>
            <div class="event-card-body">
                <h3>${event.event_name}</h3>
                <div class="event-meta">
                    <span>📅 ${formatDate(event.event_date)}</span>
                    <span>🕐 ${formatTime(event.event_time)}</span>
                    <span>📍 ${event.location}</span>
                    <span>🏷️ ${event.category_name}</span>
                </div>
                <p class="event-desc">${event.short_description}</p>
                ${event.goal_amount > 0 ? `
                <div class="progress-bar-container">
                    <div class="progress-info">
                        <span>Raised ${formatMoney(event.current_amount)}</span>
                        <span>${progressPercent}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                </div>
                ` : ''}
                <div class="event-card-footer">
                    <span class="event-price ${isFree ? 'free' : ''}">${isFree ? 'Free Entry' : formatMoney(event.ticket_price)}</span>
                    <a href="event.html?id=${event.event_id}" class="btn-view">View Details</a>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// Load events from API
// ============================================
async function loadEvents() {
    const container = document.getElementById('eventsContainer');
    const loading = document.getElementById('eventsLoading');
    const errorEl = document.getElementById('eventsError');

    try {
        const response = await fetch(`${API_BASE}/api/events`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Failed to load events');
        }

        // Hide loading spinner
        if (loading) loading.style.display = 'none';

        if (result.data.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <span class="no-results-icon">📭</span>
                    <p>No active events at the moment. Please check back later!</p>
                </div>
            `;
            return;
        }

        // Render event cards
        const cardsHTML = result.data.map(event => renderEventCard(event)).join('');
        container.innerHTML = `<div class="events-grid">${cardsHTML}</div>`;

        // Update hero stats
        updateHeroStats(result.data);

        // Animate progress bars after render
        requestAnimationFrame(() => {
            document.querySelectorAll('.progress-fill').forEach(bar => {
                const width = bar.style.width;
                if (width === '0%') {
                    const parent = bar.closest('.progress-bar-container');
                    const percentSpan = parent ? parent.querySelector('.progress-info span:last-child') : null;
                    if (percentSpan) {
                        bar.style.width = percentSpan.textContent;
                    }
                }
            });
        });

        // Observe scroll reveal for new cards
        observeRevealElements();

        // Re-scroll to hash fragment after dynamic content loads
        if (window.location.hash) {
            const target = document.querySelector(window.location.hash);
            if (target) {
                setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        }

    } catch (err) {
        console.error('Failed to load events:', err);
        if (loading) loading.style.display = 'none';
        errorEl.textContent = '⚠️ Failed to load events. Please ensure the API server is running and the database is connected.';
        errorEl.classList.add('show');
    }
}

// ============================================
// Update hero section statistics
// ============================================
function updateHeroStats(events) {
    const totalRaised = events.reduce((sum, e) => sum + parseFloat(e.current_amount || 0), 0);
    const orgs = new Set(events.map(e => e.org_id)).size;

    document.getElementById('statEvents').textContent = events.length + '+';
    document.getElementById('statOrgs').textContent = orgs;
    document.getElementById('statRaised').textContent = '$' + (totalRaised / 10000).toFixed(0) + 'K+';
}

// ============================================
// Mobile menu toggle
// ============================================
function toggleMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.classList.toggle('show');
}

// ============================================
// Scroll to Top
// ============================================
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initScrollToTop() {
    const btn = document.getElementById('scrollToTop');
    if (!btn) return;
    btn.addEventListener('click', scrollToTop);
    window.addEventListener('scroll', function() {
        if (window.scrollY > 400) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });
}

// ============================================
// Scroll Reveal Observer
// ============================================
function observeRevealElements() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal').forEach(el => {
        observer.observe(el);
    });
}

// ============================================
// Page initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadEvents();
    initScrollToTop();
    observeRevealElements();
});