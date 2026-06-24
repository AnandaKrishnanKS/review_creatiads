import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  const { dbMode } = await getDb();
  const authRequired = !!process.env.CRM_PASSWORD;
  
  let isAuthenticated = false;
  if (!authRequired) {
    isAuthenticated = true;
  } else {
    try {
      const cookieStore = await cookies();
      const session = cookieStore.get('crm_session');
      if (session && session.value === 'authenticated') {
        isAuthenticated = true;
      }
    } catch (err) {
      console.error('Failed to read cookies in status check:', err.message);
    }
  }

  return NextResponse.json({
    status: 'online',
    dbMode: dbMode,
    authRequired: authRequired,
    isAuthenticated: isAuthenticated,
    message: dbMode === 'postgres' 
      ? 'Connected to Neon PostgreSQL' 
      : 'Running in offline fallback mode using shared_reviews.json'
  });
}
