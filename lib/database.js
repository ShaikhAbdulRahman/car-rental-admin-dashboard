import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

let db = null;

export async function getDatabase() {
  if (db) return db;

  const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';
  const dbPath = isVercel ? '/tmp/database.db' : './database.db';
  
  if (isVercel) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      price_per_day REAL NOT NULL,
      location TEXT NOT NULL,
      image_url TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER,
      admin_id INTEGER,
      action TEXT NOT NULL,
      old_status TEXT,
      new_status TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (listing_id) REFERENCES listings(id),
      FOREIGN KEY (admin_id) REFERENCES users(id)
    );
  `);

  const adminExists = await db.get('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      ['admin', hashedPassword, 'admin']
    );
  }

  const listingCount = await db.get('SELECT COUNT(*) as count FROM listings');
  if (listingCount.count === 0) {
    const sampleListings = [
      {
        title: 'Toyota Camry 2022 - Reliable & Comfortable',
        description: 'Perfect for city drives and long trips. Clean interior, excellent fuel economy.',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        price_per_day: 45.00,
        location: 'Downtown',
        image_url: 'https://via.placeholder.com/300x200?text=Toyota+Camry',
        status: 'pending'
      },
      {
        title: 'Honda Accord 2021 - Premium Sedan',
        description: 'Spacious sedan with advanced safety features and premium interior.',
        make: 'Honda',
        model: 'Accord',
        year: 2021,
        price_per_day: 50.00,
        location: 'Airport',
        image_url: 'https://via.placeholder.com/300x200?text=Honda+Accord',
        status: 'approved'
      },
      {
        title: 'Ford Mustang 2023 - Sports Car',
        description: 'Experience the thrill of driving a classic American muscle car.',
        make: 'Ford',
        model: 'Mustang',
        year: 2023,
        price_per_day: 85.00,
        location: 'City Center',
        image_url: 'https://via.placeholder.com/300x200?text=Ford+Mustang',
        status: 'rejected'
      },
      {
        title: 'Tesla Model 3 2023 - Electric Luxury',
        description: 'Eco-friendly electric vehicle with cutting-edge technology.',
        make: 'Tesla',
        model: 'Model 3',
        year: 2023,
        price_per_day: 75.00,
        location: 'Tech District',
        image_url: 'https://via.placeholder.com/300x200?text=Tesla+Model+3',
        status: 'pending'
      },
      {
        title: 'BMW X5 2022 - Luxury SUV',
        description: 'Premium SUV perfect for family trips and business travel.',
        make: 'BMW',
        model: 'X5',
        year: 2022,
        price_per_day: 95.00,
        location: 'Uptown',
        image_url: 'https://via.placeholder.com/300x200?text=BMW+X5',
        status: 'approved'
      }
    ];

    for (const listing of sampleListings) {
      await db.run(`
        INSERT INTO listings (title, description, make, model, year, price_per_day, location, image_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        listing.title,
        listing.description,
        listing.make,
        listing.model,
        listing.year,
        listing.price_per_day,
        listing.location,
        listing.image_url,
        listing.status
      ]);
    }
  }

  return db;
}