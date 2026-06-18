import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import type { Metadata } from 'next';

import ThemeToggle from './components/ThemeToggle';
import { AuthProvider } from './context/AuthContext';

export const metadata: Metadata = {
  title: 'WorkShift',
  description: 'Sistema de gestión de turnos de trabajo',
  manifest: '/manifest.json',
  themeColor: '#2563eb',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WorkShift',
  },
  icons: {
    icon: '/Logo_v4a.png',
    apple: '/Logo_v4a.png',
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