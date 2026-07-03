import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import type { Metadata, Viewport } from 'next';

import ThemeToggle from './components/ThemeToggle';
import { AuthProvider } from './context/AuthContext';

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

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
    icon: '/logo192.png',
    apple: '/logo180.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300">
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