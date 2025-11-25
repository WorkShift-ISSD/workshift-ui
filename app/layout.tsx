import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import Footer from './components/Footer';
import ThemeToggle from './components/ThemeToggle';
import { AuthProvider } from './context/AuthContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300">
      <body className={`${inter.className} antialiased flex flex-col min-h-screen transition-colors duration-300`}>
        <div className="fixed top-4 right-10 z-50">
          <ThemeToggle />
        </div>
        {/* Contenido principal */}
        <AuthProvider>
          {children}
        </AuthProvider>

        
        
        {/* Footer: siempre al final de la página */}
        <Footer />
      </body>
    </html>
  );
}