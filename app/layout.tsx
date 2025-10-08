import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import Footer from './components/Footer';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased flex flex-col min-h-screen`}>
        <div className="flex-grow">
          {children}
        </div>
        <Footer/>
      </body>
    </html>
  );
}
