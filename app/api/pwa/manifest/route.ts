import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      name: 'Gestión de Turnos — Migraciones',
      short_name: 'Turnos',
      description: 'Portal de administración de turnos, intercambios y guardias.',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#111827',
      theme_color: '#3b82f6',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json',
      },
    }
  );
}