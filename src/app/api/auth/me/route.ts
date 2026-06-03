import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'aasa-med-chem-default-jwt-secret-key-32-chars'
);

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        name: payload.name
      }
    });
  } catch (error) {
    console.error('Auth me endpoint verification failed:', error);
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
}
