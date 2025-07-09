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
    const listings = await db.all('SELECT * FROM listings ORDER BY created_at DESC');
    
    return NextResponse.json({ listings });
  } catch (error) {
    console.error('Fetch listings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}