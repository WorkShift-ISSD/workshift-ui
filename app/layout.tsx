import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import Footer from './components/Footer';
import ThemeToggle from './components/ThemeToggle';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} antialiased flex flex-col min-h-screen`}>
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        {/* Contenido principal */}
        <main className="flex-grow">
          {children}
        </main>
        
        {/* Footer: siempre al final de la página */}
        <Footer />
      </body>
    </html>
  );
}