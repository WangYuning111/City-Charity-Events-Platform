-- ============================================
-- City Charity Events Dynamic Website - Database Schema
-- Database: charityevents_db
-- ============================================

-- Create database
DROP DATABASE IF EXISTS charityevents_db;
CREATE DATABASE charityevents_db;
USE charityevents_db;

-- ============================================
-- Table 1: Charitable Organizations
-- ============================================
CREATE TABLE organizations (
    org_id INT AUTO_INCREMENT PRIMARY KEY,
    org_name VARCHAR(150) NOT NULL,
    mission_statement TEXT,
    description TEXT,
    contact_email VARCHAR(100),
    contact_phone VARCHAR(30),
    website_url VARCHAR(255),
    logo_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table 2: Event Categories
-- ============================================
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(80) NOT NULL,
    category_description VARCHAR(255),
    icon_class VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table 3: Charity Events
-- ============================================
CREATE TABLE events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(200) NOT NULL,
    short_description VARCHAR(500),
    full_description TEXT,
    category_id INT NOT NULL,
    org_id INT,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    address TEXT,
    image_url VARCHAR(255),
    ticket_price DECIMAL(10,2) DEFAULT 0.00,
    goal_amount DECIMAL(12,2) DEFAULT 0.00,
    current_amount DECIMAL(12,2) DEFAULT 0.00,
    status ENUM('upcoming','active','past','suspended') DEFAULT 'upcoming',
    max_participants INT DEFAULT NULL,
    organizer_contact VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Seed Data: Organizations
-- ============================================
INSERT INTO organizations (org_name, mission_statement, description, contact_email, contact_phone, website_url) VALUES
('Love Foundation', 'Gathering every act of kindness to spread warmth across the city', 'Founded in 2010, the Love Foundation is dedicated to helping communities in need throughout the city. We believe every small act of kindness can change the world.', 'info@lovefoundation.org', '+1 (800) 888-0001', 'www.lovefoundation.org'),
('Green Future Initiative', 'Protecting our green home for the next generation', 'Focused on environmental charitable causes, we drive sustainable development through education and action to make our city a better place.', 'contact@greenfuture.org', '+1 (800) 888-0002', 'www.greenfuture.org'),
('City Light Charity Association', 'Illuminating every corner that needs help', 'City Light is committed to diverse charitable programs including poverty relief, educational support, and community service.', 'info@citylightcharity.org', '+1 (800) 888-0003', 'www.citylightcharity.org'),
('Star of Hope Education Fund', 'Every child deserves the right to dream', 'Focused on equalizing educational resources, we provide support for migrant children in cities and left-behind children in rural areas.', 'hope@starfoundation.org', '+1 (800) 888-0004', 'www.starfoundation.org');

-- ============================================
-- Seed Data: Event Categories
-- ============================================
INSERT INTO categories (category_name, category_description, icon_class) VALUES
('Charity Gala', 'Elegant dinner events raising funds through ticket sales', 'icon-gala'),
('Fun Run', 'Community-wide running events combining fitness with philanthropy', 'icon-run'),
('Charity Auction', 'Auctioning valuable items with proceeds going to charitable causes', 'icon-auction'),
('Charity Concert', 'Spreading love through music with performance proceeds donated to charity', 'icon-concert'),
('Volunteer Service', 'Hands-on community engagement and direct charitable action', 'icon-volunteer'),
('Public Lecture', 'Spreading awareness and inspiring more people to join charitable causes', 'icon-lecture'),
('Charity Bazaar', 'Handmade crafts and pre-loved items sold with proceeds donated', 'icon-bazaar'),
('Outdoor Adventure', 'Challenging yourself while fundraising through adventure activities', 'icon-adventure');

-- ============================================
-- Seed Data: Charity Events (10 sample events)
-- ============================================
INSERT INTO events (event_name, short_description, full_description, category_id, org_id, event_date, event_time, location, address, image_url, ticket_price, goal_amount, current_amount, status, max_participants, organizer_contact) VALUES

-- Event 1: Charity Gala
('2026 Annual Love & Charity Gala',
 'Bringing together the city\'s finest for an evening of compassion. A night filled with warmth, inspiration, and giving.',
 'The 2026 Annual Love & Charity Gala is one of the most impactful charity events of the year. Held at a five-star luxury hotel, the gala will welcome distinguished guests, business leaders, and philanthropists from across the community.\n\nGala Program:\n• Welcome Address & Year in Review\n• Beneficiary Story Sharing\n• Live Charity Auction\n• Captivating Artistic Performances\n• Donation Ceremony\n\nAll ticket revenue and auction proceeds will go toward educational support programs for children from underprivileged families. Your participation will bring hope to hundreds of children.',
 1, 1, '2026-12-15', '18:30:00', 'Grand International Hotel Ballroom', '88 Jianguo Road, Chaoyang District, Grand International Hotel 3F',
 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800',
 500.00, 500000.00, 320000.00, 'upcoming', 500, 'Manager Wang +1-800-888-0001'),

-- Event 2: Fun Run
('City Charity Fun Run 2026',
 'Run for a cause! A 5K fun run promoting healthy living while making a difference.',
 'The 3rd Annual City Charity Fun Run is happening at Central Park! This exciting event combines fun and fitness with two race categories: a 5K fun run and a 10K challenge run.\n\nEvent Highlights:\n• Color Run elements with multiple color stations along the route\n• Family & Kids category: 1K Mini Run\n• Best Costume Award contest\n• Finisher medals for all participants\n• Live music party at the finish line\n\n100% of registration fees will be donated to Green Future environmental projects. Let\'s run for health, run for love!',
 2, 2, '2026-11-20', '08:00:00', 'Central Park', 'Zhongguancun Boulevard, Haidian District, Central Park',
 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800',
 50.00, 200000.00, 158000.00, 'upcoming', 2000, 'Coordinator Li +1-800-888-0002'),

-- Event 3: Charity Auction
('Treasures Charity Auction',
 'Featuring rare collectibles and celebrity memorabilia — all to support education.',
 'This prestigious charity auction brings together rare and valuable items generously donated by community supporters, including fine art, celebrity memorabilia, jewelry, and more.\n\nAuction Categories:\n• Contemporary Artworks — 20 pieces\n• Celebrity-Signed Memorabilia — 15 items\n• Fine Jewelry — 10 pieces\n• Rare Wines & Collectibles\n\nAll items have been donated free of charge by caring individuals. 100% of auction proceeds will support the Star of Hope Education Fund for building schools in rural areas.',
 3, 1, '2026-10-28', '14:00:00', 'Arts Center Auction Hall', '100 Century Avenue, Pudong District, Shanghai Arts Center',
 'https://images.unsplash.com/photo-1544991875-5dc7b9b6d88b?w=800',
 0.00, 800000.00, 250000.00, 'upcoming', 300, 'Director Zhang +1-800-888-0001'),

-- Event 4: Charity Concert
('"Melodies of Love" Charity Symphony Concert',
 'Renowned musicians unite for a breathtaking performance — music that gives back.',
 'Presented by City Light Charity Association, the "Melodies of Love" Charity Symphony Concert features internationally acclaimed musicians in an unforgettable evening of classical music.\n\nProgram:\n• Beethoven — Symphony No. 5 in C minor\n• Tchaikovsky — Selections from Swan Lake\n• Popular Film Score Medley\n• Classical Chinese Orchestral Works\n\nSpecial Segments:\n• Guest performance by the Children\'s Choir\n• Charity impact documentary screening\n\nAll ticket revenue will be donated to the City Poverty Relief Project.',
 4, 3, '2026-11-05', '19:00:00', 'Grand Theater Concert Hall', '1 East Chang\'an Avenue, Dongcheng District, Grand Theater',
 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800',
 200.00, 300000.00, 185000.00, 'upcoming', 800, 'Manager Chen +1-800-888-0003'),

-- Event 5: Volunteer Service (Active)
('Community Winter Warmth Volunteer Drive',
 'Reach out to elderly residents and families in need throughout the community this winter.',
 'The Community Winter Warmth Drive is City Light Charity Association\'s annual winter volunteer initiative. Volunteers will be organized into teams visiting neighborhoods across the city to bring warmth to those who need it most.\n\nVolunteer Activities:\n• Visiting and spending time with elderly residents living alone\n• Delivering essential supplies (food, blankets) to families in need\n• Helping seniors with house cleaning and haircuts\n• Organizing community dumpling-making gatherings\n• Conducting fraud prevention awareness sessions\n\nLet\'s take action together and spread warmth throughout our city!',
 5, 3, '2026-12-01', '09:00:00', 'Community Service Centers Citywide', 'Various community service centers across the city — specific group assignments will be communicated.',
 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800',
 0.00, 50000.00, 35000.00, 'active', 200, 'Volunteer Captain Liu +1-800-888-0003'),

-- Event 6: Charity Bazaar (Active)
('Creative Hearts Charity Bazaar',
 'Handmade crafts, baked treats, pre-loved treasures — shop and do good!',
 'The monthly Creative Hearts Charity Bazaar opens at Culture Square! This vibrant market brings together artisans, bakers, and generous citizens with all kinds of wonderful goods.\n\nMarket Stalls:\n• Arts & Crafts: Weaving, pottery, textile arts\n• Food & Bakery: Homemade cakes, cookies, jams\n• Pre-Loved Goods: Books, toys, homewares\n• Kids\' Corner: Little ones become mini vendors\n• Interactive Zone: DIY hands-on workshops\n\nAll market proceeds and stall fees are donated to support families in need within our community. Shop, discover, and do good!',
 7, 3, '2026-10-18', '10:00:00', 'Culture Square', '200 Tianhe Road, Tianhe District, Guangzhou Culture Square',
 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800',
 0.00, 30000.00, 12000.00, 'active', NULL, 'Coordinator Zhao +1-800-888-0003'),

-- Event 7: Public Lecture
('"Building a Better City" Charity Lecture Series',
 'Leading voices in philanthropy share insights on the future of urban charitable development.',
 'This charity lecture series brings together distinguished speakers from academia, business, and nonprofit organizations for an in-depth discussion on urban philanthropy and community building.\n\nLecture Topics:\n• Digital Transformation in Urban Philanthropy\n• Corporate Social Responsibility & Sustainable Development\n• Community Engagement & Grassroots Governance\n• Youth Philanthropy & Volunteerism\n\nIdeal for: nonprofit professionals, CSR managers, volunteers, and citizens interested in giving back.',
 6, 1, '2026-10-25', '14:00:00', 'University City Lecture Hall', 'University Town Academic Exchange Center, Nanshan District, Shenzhen',
 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800',
 0.00, 20000.00, 8000.00, 'upcoming', 300, 'Education Officer Zhou +1-800-888-0001'),

-- Event 8: Outdoor Adventure
('"Climb for Hope" Charity Mountain Expedition',
 'Push your limits — every step up the mountain supports education for children in rural areas.',
 'The Climb for Hope Charity Mountain Expedition challenges participants to summit peaks reaching 2,000 meters. Participants fundraise through crowdfunding before the event — every $100 raised covers one week of education for a child in a rural mountain community.\n\nItinerary:\n• Day 1: Assemble, travel to base camp, icebreaker activities\n• Day 2: Summit challenge, mountaintop ceremony, certificate presentation\n• Day 3: Reflection session, return journey\n\nChallenge yourself and contribute to rural education!',
 8, 4, '2026-11-12', '06:30:00', 'Phoenix Mountain National Forest Park', 'Dujiangyan City, Chengdu, Sichuan — Phoenix Mountain',
 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
 100.00, 150000.00, 92000.00, 'upcoming', 150, 'Expedition Leader +1-800-888-0004'),

-- Event 9: Charity Gala (Past)
('2025 Gratitude Charity Gala',
 'Looking back at a year of charitable achievements — with gratitude to every donor.',
 'The 2025 Gratitude Charity Gala was successfully held in December 2025. The evening celebrated the achievements of the past year\'s charity programs and recognized outstanding volunteers and donors.\n\nEvent Achievements:\n• Over $180,000 raised on the night\n• Annual "Charity Star" awards presented\n• 8 new corporate partners signed on\n• 2026 Annual Charity Plan unveiled\n\nThank you to every participant for your compassion and support!',
 1, 1, '2025-12-20', '18:00:00', 'Grand International Hotel Ballroom', '88 Jianguo Road, Chaoyang District, Grand International Hotel',
 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800',
 500.00, 500000.00, 480000.00, 'past', 500, 'Manager Wang +1-800-888-0001'),

-- Event 10: Charity Concert (Suspended)
('Starlight Charity Music Festival',
 'A large outdoor music festival blending pop culture with philanthropy — currently suspended.',
 'This is a large-scale outdoor music festival that has been temporarily suspended due to venue safety approval issues. The organizing team is working with relevant authorities to resolve the matter and resume as soon as possible. Ticket holders will receive refund notifications.',
 4, 2, '2027-01-15', '16:00:00', 'Riverside Open-Air Music Square', 'Binjiang Avenue, Pudong District, Shanghai Music Square',
 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
 300.00, 600000.00, 50000.00, 'suspended', 5000, 'Event Suspended — Awaiting Update');