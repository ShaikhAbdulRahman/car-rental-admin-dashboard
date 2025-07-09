import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getDatabase } from '../../lib/database';
import { getUserFromToken } from '../../lib/auth';
import DashboardClient from './DashboardClient';

export default async function Dashboard() {
  try {
    const cookieStore = cookies();
        let token = cookieStore.get('token')?.value;
    if (!token) {
      return <DashboardClient initialListings={[]} error={null} requiresAuth={true} />;
    }
    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin') {
      redirect('/login');
    }

    const db = await getDatabase();
    const listings = await db.all(`
      SELECT 
        l.*,
        u.username as owner_username
      FROM listings l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
    `);
    return <DashboardClient initialListings={listings || []} error={null} requiresAuth={false} />;
  } catch (error) {
    console.error('Dashboard server error:', error);
    return <DashboardClient initialListings={[]} error="Failed to load listings. Please try again." requiresAuth={false} />;
  }
}