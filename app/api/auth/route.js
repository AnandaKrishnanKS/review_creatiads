import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { password } = await req.json();
    const crmPassword = process.env.CRM_PASSWORD;

    // If no password is configured in the environment, bypass auth
    if (!crmPassword) {
      return NextResponse.json({ authenticated: true });
    }

    if (password === crmPassword) {
      return NextResponse.json({ authenticated: true });
    }

    return NextResponse.json({ authenticated: false, error: 'Incorrect password' }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 500 });
  }
}
