import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function esSoloAppBrigada(permisosCookie: string | undefined): boolean {
  if (!permisosCookie) return false;
  try {
    const permisos = JSON.parse(decodeURIComponent(permisosCookie)) as string[];
    return Array.isArray(permisos) && permisos.length === 1 && permisos[0] === 'app_brigada';
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;
  const permisosCookie = request.cookies.get('permisos')?.value;
  const soloBrigada = esSoloAppBrigada(permisosCookie);

  const isDashboard = pathname.startsWith('/dashboard');
  const isLogin = pathname === '/login' || pathname.startsWith('/login/');

  if (isDashboard) {
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Los usuarios de solo app brigada no deben entrar al dashboard
    if (soloBrigada) {
      const url = request.nextUrl.clone();
      url.pathname = '/brigada';
      return NextResponse.redirect(url);
    }
  }

  if (isLogin && token) {
    const url = request.nextUrl.clone();
    url.pathname = soloBrigada ? '/brigada' : '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/login/:path*'],
};
