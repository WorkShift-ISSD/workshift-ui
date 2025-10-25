'use client'

import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import Footer from './components/Footer';
import ThemeToggle from './components/ThemeToggle';
import { SWRConfig } from 'swr';
import type { SWRConfiguration, Key } from 'swr';
import fetcher from '@/hooks/backend/fetcher';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  
  const swrConfig: SWRConfiguration = {
    fetcher,
    dedupingInterval: 2000,
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      const statusCode = error?.response?.data?.statusCode;
      // No reintentar si ya hubo 3 intentos o si es un error de autenticación/autorización
      if (retryCount >= 3 || [400, 401, 403].includes(statusCode)) return;
      // Reintentar después de 3 segundos
      setTimeout(() => revalidate({ retryCount: retryCount + 1 }), 3000);
    },
    errorRetryCount: 3,
    revalidateOnFocus: false, // ← Esto evita que consulte cada vez que vuelves a la pestaña
    revalidateOnReconnect: false, // ← También recomendado para evitar consultas innecesarias
  };

  return (
    <html lang="es" className="h-full bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300">
      <body className={`${inter.className} antialiased flex flex-col min-h-screen transition-colors duration-300`}>
        <SWRConfig value={swrConfig}>
          <div className="fixed top-4 right-10 z-50">
            <ThemeToggle />
          </div>
          {/* Contenido principal */}
          <main className="flex-grow">
            {children}
          </main>
          
          {/* Footer: siempre al final de la página */}
          <Footer />
        </SWRConfig>
      </body>
    </html>
  );
}