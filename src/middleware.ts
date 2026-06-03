import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'aasa-med-chem-default-jwt-secret-key-32-chars'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  // Paths that require auth
  const isDashboardRoute = pathname.startsWith('/dashboard');

  if (isDashboardRoute) {
    if (!token) {
      // Not logged in, redirect to login
      const url = new URL('/login', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }

    try {
      // Verify token
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const role = payload.role as string;

      // Handle root dashboard route: redirect based on role
      if (pathname === '/dashboard') {
        if (role === 'admin') {
          return NextResponse.redirect(new URL('/dashboard/admin/products', request.url));
        } else if (role === 'seller') {
          return NextResponse.redirect(new URL('/dashboard/seller/products', request.url));
        } else {
          return NextResponse.redirect(new URL('/dashboard/user/products', request.url));
        }
      }

      // Check admin permissions
      if (pathname.startsWith('/dashboard/admin') && role !== 'admin') {
        const dest = role === 'seller' ? '/dashboard/seller/products' : '/dashboard/user/products';
        return NextResponse.redirect(new URL(dest, request.url));
      }

      // Check seller permissions
      if (pathname.startsWith('/dashboard/seller') && role !== 'seller') {
        const dest = role === 'admin' ? '/dashboard/admin/products' : '/dashboard/user/products';
        return NextResponse.redirect(new URL(dest, request.url));
      }

      // Check user permissions
      if (pathname.startsWith('/dashboard/user') && role !== 'user') {
        const dest = role === 'admin' ? '/dashboard/admin/products' : '/dashboard/seller/products';
        return NextResponse.redirect(new URL(dest, request.url));
      }

      return NextResponse.next();
    } catch (error) {
      console.error('Middleware JWT check failed:', error);
      // Expired or invalid token: redirect to login and clear cookie
      const url = new URL('/login', request.url);
      const response = NextResponse.redirect(url);
      response.cookies.delete('auth_token');
      return response;
    }
  }

  // Non-dashboard routes: check if logged-in user is accessing login page, redirect them to dashboard
  if (pathname === '/login' && token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const role = payload.role as string;
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/dashboard/admin/products', request.url));
      } else if (role === 'seller') {
        return NextResponse.redirect(new URL('/dashboard/seller/products', request.url));
      } else {
        return NextResponse.redirect(new URL('/dashboard/user/products', request.url));
      }
    } catch (e) {
      // If token is invalid, let them access login page
    }
  }

  return NextResponse.next();
}

// Config to specify which paths the middleware runs on
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login'
  ]
};
