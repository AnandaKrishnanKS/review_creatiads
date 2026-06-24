import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    const { password } = await req.json();
    const crmPassword = process.env.CRM_PASSWORD;

    // If no password is configured in the environment, bypass auth
    if (!crmPassword) {
      return NextResponse.json({ authenticated: true });
    }

    if (password === crmPassword) {
      const cookieStore = await cookies();
      cookieStore.set('crm_session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 1 day
        path: '/'
      });
      return NextResponse.json({ authenticated: true });
    }

    return NextResponse.json({ authenticated: false, error: 'Incorrect password' }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('crm_session');
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    return NextResponse.json({ error: 'Logout failed.' }, { status: 500 });
  }
}
