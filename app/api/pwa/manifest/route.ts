import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      name: 'WSMS - Gestión de Turnos',
      short_name: 'Gestion de Turnos',
      description: 'Portal de administración de turnos, intercambios y guardias.',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#111827',
      theme_color: '#3b82f6',
      icons: [
        { src: '/icons/WSMSx192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/WSMSx512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json',
      },
    }
  );
}