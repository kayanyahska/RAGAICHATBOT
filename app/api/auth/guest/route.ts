
import { isDevelopmentEnvironment } from '@/lib/constants';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = searchParams.get('redirectUrl') || '/';

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (token) {
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Simple approach: just redirect to the main page and let the client handle auth
  const response = NextResponse.redirect(new URL(redirectUrl, request.url));

  // Set a simple guest session cookie
  response.cookies.set('guest-session', 'true', {
    httpOnly: true,
    secure: !isDevelopmentEnvironment,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return response;
}
