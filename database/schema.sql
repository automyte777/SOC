-- ═══════════════════════════════════════════════════════════════
-- MULTI-SOCIETY SAAS PLATFORM - MASTER DATABASE SCHEMA
-- ═══════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS saas_master_db;
USE saas_master_db;

-- ── PLANS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  monthly_price DECIMAL(10, 2) NOT NULL,
  features TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── SOCIETIES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS societies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(255) NOT NULL UNIQUE,
  city VARCHAR(255) NOT NULL,
  society_type ENUM('Apartment', 'Plot Scheme', 'Villa Society', 'Mixed Society') NOT NULL,
  total_units INT NOT NULL,
  database_name VARCHAR(255) NOT NULL UNIQUE,
  plan_id INT,
  status ENUM('pending', 'approved', 'rejected', 'suspended', 'expired') DEFAULT 'pending',
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- ── MASTER USERS (Society Admins only, cross-reference) ───────────
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  society_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('society_admin', 'member') DEFAULT 'society_admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
);

-- ── DOMAINS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS domains (
  id INT AUTO_INCREMENT PRIMARY KEY,
  society_id INT NOT NULL,
  domain VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
);

-- ── SUBSCRIPTIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  society_id INT NOT NULL,
  plan_id INT NOT NULL,
  status ENUM('active', 'inactive', 'cancelled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (society_id) REFERENCES societies(id),
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- ── AUDIT LOGS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(255) NOT NULL,
  details TEXT,
  performed_by VARCHAR(255) DEFAULT 'System',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── SEED PLANS ────────────────────────────────────────────────────
INSERT IGNORE INTO plans (id, name, monthly_price, features) VALUES
(1, 'Starter Plan', 9.99, '["Up to 50 Units", "Gate Visitor Management", "Notice Board"]'),
(2, 'Professional Plan', 29.99, '["Up to 200 Units", "Maintenance Collection", "Society Voting", "Event Management"]'),
(3, 'Enterprise Plan', 99.99, '["Unlimited Units", "Photo Gallery", "Plot Booking", "Premium Support"]');


-- ═══════════════════════════════════════════════════════════════
-- PER-SOCIETY DATABASE SCHEMA  (dynamic: society_<id>_db)
-- Run inside each tenant database via databaseCreator.js
-- ═══════════════════════════════════════════════════════════════

/*

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('society_admin', 'resident', 'staff') DEFAULT 'resident',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flat_number VARCHAR(50) NOT NULL,
  building VARCHAR(100),
  owner_name VARCHAR(255),
  status ENUM('occupied', 'vacant') DEFAULT 'vacant',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS residents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flat_id INT,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  role ENUM('owner', 'tenant') DEFAULT 'owner',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS visitors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  visitor_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  flat_id INT,
  purpose VARCHAR(255),
  status ENUM('entered', 'exited') DEFAULT 'entered',
  entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  exit_time TIMESTAMP NULL,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS maintenance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flat_id INT,
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE,
  status ENUM('pending', 'paid') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flat_id INT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('open', 'in-progress', 'resolved') DEFAULT 'open',
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_name VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  description TEXT,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(100),
  salary DECIMAL(10, 2) DEFAULT NULL,
  shift VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flat_id INT,
  vehicle_number VARCHAR(50) NOT NULL,
  type ENUM('2-wheeler', '4-wheeler') DEFAULT '4-wheeler',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deliveries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delivery_person VARCHAR(255),
  company VARCHAR(100),
  flat_id INT,
  status ENUM('delivered', 'pending', 'denied') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE
);

*/
