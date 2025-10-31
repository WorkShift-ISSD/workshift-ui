import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'Workshift25'
);

// Rutas permitidas por rol
const RUTAS_POR_ROL = {
  INSPECTOR: [
    '/dashboard',
    '/dashboard/cambios',
    '/dashboard/solicitudes',
    '/dashboard/licencias',
    '/dashboard/calificaciones',
    '/dashboard/privacy',
    '/dashboard/terms',
  ],
  SUPERVISOR: [
    '/dashboard',
    '/dashboard/cambios',
    '/dashboard/solicitudes',
    '/dashboard/licencias',
    '/dashboard/calificaciones',
    '/dashboard/personal',
    '/dashboard/faltas',
    '/dashboard/sanciones',
    '/dashboard/privacy',
    '/dashboard/terms',
  ],
  JEFE: [
    '/dashboard',
    '/dashboard/autorizaciones',
    '/dashboard/personal',  // Solo lectura
    '/dashboard/estadisticas',
    '/dashboard/informes',
    '/dashboard/privacy',
    '/dashboard/terms',
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas
  const publicRoutes = ['/', '/loading'];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // API routes no pasan por aquí
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const userRole = payload.rol as keyof typeof RUTAS_POR_ROL;

    const rutasPermitidas = RUTAS_POR_ROL[userRole] || [];
    const tieneAcceso = rutasPermitidas.some(ruta => pathname.startsWith(ruta));

    if (!tieneAcceso) {
      console.log(`❌ Acceso denegado: ${userRole} intentó acceder a ${pathname}`);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    const response = NextResponse.next();
    response.headers.set('x-user-role', userRole);
    return response;

  } catch (error) {
    console.error('Error en middleware:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};