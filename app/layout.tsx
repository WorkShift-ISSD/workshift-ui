import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import Footer from './components/Footer';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} antialiased flex flex-col min-h-screen`}>
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