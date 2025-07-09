import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database';
import { getUserFromToken } from '../../../../lib/auth';

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const listingData = await request.json();
    const db = await getDatabase();
    
    const result = await db.run(`
      UPDATE listings SET 
        title = ?, 
        description = ?, 
        make = ?, 
        model = ?, 
        year = ?, 
        price_per_day = ?, 
        location = ?, 
        image_url = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      listingData.title,
      listingData.description,
      listingData.make,
      listingData.model,
      listingData.year,
      listingData.price_per_day,
      listingData.location,
      listingData.image_url,
      id
    ]);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const updatedListing = await db.get('SELECT * FROM listings WHERE id = ?', [id]);
    return NextResponse.json(updatedListing);
  } catch (error) {
    console.error('Listing update error:', error);
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
  }
}