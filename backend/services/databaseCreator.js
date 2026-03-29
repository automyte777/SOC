const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Service to handle the creation and initialization of a new society database.
 */
class DatabaseCreator {
  /**
   * Creates a new database for the society and initializes its schema.
   */
  async createSocietyDatabase(societyId, adminData) {
    const dbName = `society_${societyId}_db`;
    
    // Connection to the database server (root access needed to create databases)
    const connection = await mysql.createConnection({
      host:    process.env.DB_HOST || '127.0.0.1',
      user:    process.env.DB_USER || 'root',
      password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
      port:    parseInt(process.env.DB_PORT || '3306', 10),
      connectTimeout: 10000,
    });

    try {
      // 1. Create the Database
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      await connection.query(`USE \`${dbName}\``);

      // 2. Define Schema
      const schema = `
        CREATE TABLE IF NOT EXISTS flats (
          id INT AUTO_INCREMENT PRIMARY KEY,
          flat_number VARCHAR(50) NOT NULL,
          building VARCHAR(100),
          block VARCHAR(50) NULL,
          flat_type VARCHAR(50) NULL,
          floor INT NULL,
          area INT NULL,
          owner_name VARCHAR(255),
          status ENUM('occupied', 'vacant', 'pending_verification') DEFAULT 'vacant',
          created_by VARCHAR(50) DEFAULT 'admin',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          phone VARCHAR(50),
          password_hash VARCHAR(255) NOT NULL,
          role ENUM('society_secretary','home_owner','home_member','tenant','security_guard') DEFAULT 'home_owner',
          is_approved BOOLEAN DEFAULT TRUE,
          status ENUM('pending', 'active', 'rejected') DEFAULT 'active',
          flat_number VARCHAR(100),
          block VARCHAR(100),
          flat_id INT NULL,
          rental_start_date DATE NULL,
          rental_end_date DATE NULL,
          is_primary_owner BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL
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
          status ENUM('pending_approval', 'approved', 'rejected', 'entered', 'exited') DEFAULT 'pending_approval',
          entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          exit_time TIMESTAMP NULL,
          FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NULL,
          role_target ENUM('society_secretary', 'security_guard', 'all') NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS maintenance (
          id INT AUTO_INCREMENT PRIMARY KEY,
          flat_id INT,
          amount DECIMAL(10, 2) NOT NULL,
          due_date DATE,
          status ENUM('pending', 'paid') DEFAULT 'pending',
          billing_month VARCHAR(20) NULL,
          paid_amount DECIMAL(10, 2) DEFAULT 0,
          paid_at TIMESTAMP NULL,
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
          category VARCHAR(100) NULL,
          created_by INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
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

        CREATE TABLE IF NOT EXISTS events (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_name VARCHAR(255) NOT NULL,
          event_date DATE NOT NULL,
          description TEXT,
          location VARCHAR(255),
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

        CREATE TABLE IF NOT EXISTS vehicles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          flat_id INT NOT NULL,
          vehicle_number VARCHAR(50) NOT NULL,
          vehicle_type ENUM('2-wheeler', '4-wheeler') NOT NULL,
          owner_name VARCHAR(255),
          parking_slot VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE
        );
      `;

      // 3. Initialize Tables Sequentially
      const queries = schema.split(';').filter(q => q.trim().length > 0);
      for (const query of queries) {
        await connection.query(query);
      }

      // 4. Insert default Admin User
      await connection.query(
        'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [adminData.name, adminData.email, adminData.phone, adminData.password_hash, 'society_secretary']
      );

      return dbName;
    } catch (error) {
      console.error('[DatabaseCreator] Error creating society database:', error);
      throw error;
    } finally {
      await connection.end();
    }
  }
}

module.exports = new DatabaseCreator();
