import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import type { Metadata, Viewport } from 'next';

import ThemeToggle from './components/ThemeToggle';
import { AuthProvider } from './context/AuthContext';

// ── PWA & SEO metadata ────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: 'Gestión de Turnos — Migraciones',
  description: 'Portal de administración de turnos, intercambios y guardias para Migraciones.',
  manifest: '/api/pwa/manifest',
  appleWebApp: {
    capable: true,
    title: 'Turnos',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

// ── Viewport / theme-color (separado de metadata en Next.js 14+) ──────────
export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className="h-full bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300"
    >
      <body className={`${inter.className} antialiased transition-colors duration-300`}>
        <div className="fixed top-4 right-10 z-50">
          <ThemeToggle />
        </div>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}