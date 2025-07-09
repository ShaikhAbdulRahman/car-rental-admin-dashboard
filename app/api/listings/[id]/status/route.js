import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database';
import { getUserFromToken,logAuditAction } from '../../../../../lib/auth';

export async function POST(request, { params }) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { status } = body;

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    const existing = await db.get('SELECT * FROM listings WHERE id = ?', [id]);

    if (!existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const oldStatus = existing.status;

    await db.run(
      `UPDATE listings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, id]
    );

    await logAuditAction({
      listingId: id,
      adminId: user.id,
      action: `status_changed_to_${status}`,
      oldStatus,
      newStatus: status
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
