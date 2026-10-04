// ============================================
// Search Page JavaScript - search.js
// Handles event search form interaction and result display
// ============================================

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
// Highlight matching text in a string
// ============================================
function highlightText(text, query) {
    if (!query || !text) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

// ============================================
// Render a search result event card
// ============================================
function renderEventCard(event, searchLocation) {
    const progressPercent = getProgressPercent(event.current_amount, event.goal_amount);
    const isFree = !event.ticket_price || parseFloat(event.ticket_price) === 0;
    const countdown = getCountdownText(event.event_date, event.status);

    // Highlight location if search query matches
    const locationDisplay = searchLocation 
        ? highlightText(event.location, searchLocation) 
        : event.location;

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
                    <span>📍 ${locationDisplay}</span>
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
// Show error message
// ============================================
function showError(message) {
    const errorEl = document.getElementById('searchError');
    errorEl.textContent = '⚠️ ' + message;
    errorEl.classList.add('show');
    setTimeout(() => errorEl.classList.remove('show'), 5000);
}

// ============================================
// Hide error message
// ============================================
function hideError() {
    const errorEl = document.getElementById('searchError');
    errorEl.classList.remove('show');
}

// ============================================
// Load event categories for the dropdown
// ============================================
async function loadCategories() {
    const select = document.getElementById('filterCategory');

    try {
        const response = await fetch(`${API_BASE}/api/events/categories/list`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }

        const result = await response.json();

        if (result.success && result.data.length > 0) {
            result.data.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.category_id;
                option.textContent = `${cat.category_name} (${cat.event_count})`;
                select.appendChild(option);
            });
        }
    } catch (err) {
        console.error('Failed to load categories:', err);
        // Category loading failure should not block search functionality
    }
}

// ============================================
// Search events based on filter criteria
// ============================================
async function searchEvents(e) {
    e.preventDefault();
    hideError();

    // Get filter values
    const date = document.getElementById('filterDate').value.trim();
    const location = document.getElementById('filterLocation').value.trim();
    const category = document.getElementById('filterCategory').value;

    // Show loading spinner
    document.getElementById('searchLoading').style.display = 'block';
    document.getElementById('noResults').style.display = 'none';
    document.getElementById('eventsGrid').innerHTML = '';
    document.getElementById('resultsHeader').style.display = 'none';

    // Build query parameters
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (location) params.append('location', location);
    if (category) params.append('category', category);

    try {
        const response = await fetch(`${API_BASE}/api/events/search?${params.toString()}`);
        
        if (!response.ok) {
            throw new Error(`Search failed (HTTP ${response.status})`);
        }

        const result = await response.json();

        // Hide loading spinner
        document.getElementById('searchLoading').style.display = 'none';

        if (!result.success) {
            throw new Error(result.message || 'Search failed');
        }

        // Show results header
        document.getElementById('resultsHeader').style.display = 'flex';
        
        // Build filter description
        const filters = [];
        if (date) filters.push(`Date: ${date}`);
        if (location) filters.push(`Location: "${location}"`);
        if (category) {
            const catSelect = document.getElementById('filterCategory');
            const catName = catSelect.options[catSelect.selectedIndex].text.split(' (')[0];
            filters.push(`Category: ${catName}`);
        }
        
        const filterDesc = filters.length > 0 ? ` | Filters: ${filters.join(', ')}` : '';
        document.getElementById('resultsCount').textContent = `Found ${result.data.length} event(s)${filterDesc}`;

        if (result.data.length === 0) {
            document.getElementById('noResults').style.display = 'block';
            return;
        }

        // Render results with location highlighting
        const cardsHTML = result.data.map(event => renderEventCard(event, location)).join('');
        document.getElementById('eventsGrid').innerHTML = cardsHTML;

        // Animate progress bars
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

        // Observe scroll reveal
        observeRevealElements();

    } catch (err) {
        console.error('Search failed:', err);
        document.getElementById('searchLoading').style.display = 'none';
        showError('An error occurred while searching. Please check your network connection and try again.');
    }
}

// ============================================
// Clear all filter fields
// ============================================
function clearFilters() {
    document.getElementById('filterDate').value = '';
    document.getElementById('filterLocation').value = '';
    document.getElementById('filterCategory').value = '';
    hideError();
    
    // Clear results
    document.getElementById('eventsGrid').innerHTML = '';
    document.getElementById('resultsHeader').style.display = 'none';
    document.getElementById('noResults').style.display = 'none';
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
    // Load category data for the dropdown
    loadCategories();

    // Bind search form submit event
    document.getElementById('searchForm').addEventListener('submit', searchEvents);

    // Bind clear button event
    document.getElementById('btnClear').addEventListener('click', clearFilters);

    // Scroll to top button
    initScrollToTop();

    // Scroll reveal
    observeRevealElements();
});