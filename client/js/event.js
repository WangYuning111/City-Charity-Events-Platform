// ============================================
// Event Detail Page JavaScript - event.js
// Handles loading and displaying a single event's details
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
// Countdown: Calculate full countdown
// ============================================
function getDetailedCountdown(dateStr, timeStr, status) {
    if (status === 'past' || status === 'suspended') return null;
    
    const eventDateTime = new Date(dateStr + 'T' + timeStr);
    const now = new Date();
    const diffMs = eventDateTime - now;
    
    if (diffMs <= 0) return null;
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
        return `${days} day${days !== 1 ? 's' : ''} ${hours} hr${hours !== 1 ? 's' : ''} remaining`;
    }
    if (hours > 0) {
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours} hr${hours !== 1 ? 's' : ''} ${minutes} min${minutes !== 1 ? 's' : ''} remaining`;
    }
    const minutes = Math.floor(diffMs / (1000 * 60));
    return `${minutes} min${minutes !== 1 ? 's' : ''} remaining`;
}

// ============================================
// Get URL query parameter
// ============================================
function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

// ============================================
// Show error message
// ============================================
function showError(message) {
    const errorEl = document.getElementById('detailError');
    errorEl.textContent = '⚠️ ' + message;
    errorEl.classList.add('show');
    document.getElementById('detailLoading').style.display = 'none';
}

// ============================================
// Load event detail from API
// ============================================
async function loadEventDetail() {
    const eventId = getQueryParam('id');

    if (!eventId) {
        showError('No event ID provided. Please select an event from the events list.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/events/${eventId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Event not found. It may have been removed.');
            }
            throw new Error(`Failed to load (HTTP ${response.status})`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Failed to load event details');
        }

        // Hide loading, show content
        document.getElementById('detailLoading').style.display = 'none';
        document.getElementById('detailContent').style.display = 'block';

        // Render event details
        renderEventDetail(result.data);

    } catch (err) {
        console.error('Failed to load event details:', err);
        showError(err.message || 'An error occurred while loading event details. Please check your network and try again.');
    }
}

// ============================================
// Render event detail into the page
// ============================================
function renderEventDetail(event) {
    // Breadcrumb
    document.getElementById('breadcrumbEventName').textContent = event.event_name;

    // Hero image
    const imgEl = document.getElementById('detailImage');
    imgEl.src = event.image_url;
    imgEl.alt = event.event_name;
    imgEl.onerror = function() {
        this.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22900%22 height=%22400%22%3E%3Crect fill=%22%23F5E6DC%22 width=%22900%22 height=%22400%22/%3E%3Ctext fill=%22%238D6E63%22 x=%22450%22 y=%22200%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2224%22%3ENo Image Available%3C/text%3E%3C/svg%3E';
    };

    // Badge and title
    document.getElementById('detailBadge').textContent = getStatusBadge(event.status);
    document.getElementById('detailTitle').textContent = event.event_name;

    // Description
    document.getElementById('detailDescription').textContent = event.full_description || event.short_description || 'No detailed description available.';

    // Countdown for upcoming/active events
    const countdown = getDetailedCountdown(event.event_date, event.event_time, event.status);
    const countdownHtml = countdown ? `<span class="event-card-countdown" style="position:static;display:inline-block;margin-left:0.75rem;font-size:0.9rem;vertical-align:middle;">⏱ ${countdown}</span>` : '';

    // Event info
    document.getElementById('infoDate').innerHTML = formatDate(event.event_date) + countdownHtml;
    document.getElementById('infoTime').textContent = formatTime(event.event_time);
    document.getElementById('infoLocation').textContent = event.location;
    document.getElementById('infoAddress').textContent = event.address || '';
    document.getElementById('infoCategory').textContent = event.category_name + (event.category_description ? ' — ' + event.category_description : '');
    document.getElementById('infoOrg').textContent = event.org_name || 'Not specified';

    // Ticket price
    const isFree = !event.ticket_price || parseFloat(event.ticket_price) === 0;
    document.getElementById('infoPrice').textContent = isFree ? 'Free Entry' : formatMoney(event.ticket_price) + ' / person';

    // Max participants
    if (event.max_participants) {
        document.getElementById('infoParticipantsRow').style.display = 'flex';
        document.getElementById('infoParticipants').textContent = `Limited to ${event.max_participants} participants`;
    }

    // Organizer contact
    if (event.organizer_contact) {
        document.getElementById('infoContactRow').style.display = 'flex';
        document.getElementById('infoContact').textContent = event.organizer_contact;
    }

    // Fundraising progress
    if (event.goal_amount && event.goal_amount > 0) {
        const progressPercent = Math.min(Math.round((event.current_amount / event.goal_amount) * 100), 100);
        document.getElementById('goalCurrent').textContent = formatMoney(event.current_amount);
        document.getElementById('goalTarget').textContent = formatMoney(event.goal_amount);
        document.getElementById('goalPercent').textContent = progressPercent + '% completed';
        
        // Animate progress bar
        setTimeout(() => {
            document.getElementById('goalProgressFill').style.width = progressPercent + '%';
        }, 100);
    } else {
        document.getElementById('progressCard').style.display = 'none';
    }

    // Organizer info
    if (event.org_name) {
        document.getElementById('orgInfoCard').style.display = 'block';
        document.getElementById('orgName').textContent = event.org_name;
        document.getElementById('orgMission').textContent = event.mission_statement || '';
        document.getElementById('orgDesc').textContent = event.org_description || '';
    }

    // Update register button (disable for past/suspended events)
    if (event.status === 'past' || event.status === 'suspended') {
        const btn = document.getElementById('btnRegister');
        if (event.status === 'past') {
            btn.textContent = 'Event Has Ended';
            btn.style.background = '#8D6E63';
            btn.style.cursor = 'not-allowed';
            btn.onclick = null;
        } else {
            btn.textContent = 'Event Suspended';
            btn.style.background = '#E67E22';
            btn.style.cursor = 'not-allowed';
            btn.onclick = null;
        }
    }
}

// ============================================
// Handle register button click
// ============================================
function handleRegister() {
    document.getElementById('registerModal').classList.add('show');
}

// ============================================
// Close modal dialog
// ============================================
function closeModal() {
    document.getElementById('registerModal').classList.remove('show');
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('registerModal');
    if (e.target === modal) {
        closeModal();
    }
});

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
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => {
        observer.observe(el);
    });
}

// ============================================
// Page initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadEventDetail();
    initScrollToTop();
    observeRevealElements();
});