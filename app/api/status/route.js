import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const { dbMode } = await getDb();
  const authRequired = !!process.env.CRM_PASSWORD;
  return NextResponse.json({
    status: 'online',
    dbMode: dbMode,
    authRequired: authRequired,
    message: dbMode === 'postgres' 
      ? 'Connected to Neon PostgreSQL' 
      : 'Running in offline fallback mode using shared_reviews.json'
  });
}
