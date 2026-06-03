import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'aasa-med-chem-default-jwt-secret-key-32-chars'
);

export interface SessionUser {
  id: number;
  email: string;
  role: 'admin' | 'seller';
  name: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as number,
      email: payload.email as string,
      role: payload.role as 'admin' | 'seller',
      name: payload.name as string
    };
  } catch (error) {
    return null;
  }
}

export async function isAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  return user?.role === 'admin';
}
