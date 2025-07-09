import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDatabase } from './database';

const JWT_SECRET = process.env.JWT_SECRET || '37523927003424f356734afa927227a559ef7b8e1879de5cea403c9711f3346e806d4cd161e8e82d4aabc2715bfa4c921178cd72da217408722b67cd87005bb8';

export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}
export async function logAuditAction({ listingId, adminId, action, oldStatus, newStatus }) {
  const db = await getDatabase();
  await db.run(
    `INSERT INTO audit_logs (listing_id, admin_id, action, old_status, new_status)
     VALUES (?, ?, ?, ?, ?)`,
    [listingId, adminId, action, oldStatus, newStatus]
  );
}

export async function getUserFromToken(token) {
  const decoded = verifyToken(token);
  if (!decoded) return null;

  const db = await getDatabase();
  const user = await db.get('SELECT id, username, role FROM users WHERE id = ?', [decoded.id]);
  return user;
}