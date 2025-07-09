import { NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/database';
import { getUserFromToken } from '../../../lib/auth';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = await getDatabase();
    const logs = await db.all(
      `SELECT 
        audit_logs.*,
        users.username
      FROM audit_logs
      JOIN users ON audit_logs.admin_id = users.id
      ORDER BY audit_logs.timestamp DESC
      LIMIT 100`
    );
    
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}