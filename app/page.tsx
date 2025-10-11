import { ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Image from 'next/image';
import { inter } from './ui/fonts';
import LoginForm from './components/LoginForm';
import MigraLogo from '@/app/ui/MigraLogo';
import WSMSLogo from '@/app/ui/WSMSLogo';
import Footer from './components/Footer';

export default function Page() {
  return (
    <main className="flex flex-col p-4 bg-white dark:bg-gray-900 min-h-screen">
      <div className="flex items-center h-20 shrink-0 rounded-lg p-4 md:h-40 bg-[#cddcea] dark:bg-gray-800">
        <MigraLogo className="relative w-[40%] h-12 md:h-32" />
      </div>
      <div className="flex flex-col gap-4 md:flex-row mt-8 mb-8 md:ml-48">
        <div className="flex flex-col justify-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 p-6 md:w-2/5 md:px-10">
          <p className={`${inter.className} antialiased text-xl text-gray-800 dark:text-gray-200 md:text-3xl md:leading-normal`}>
            <strong className="dark:text-white">Bienvenido </strong> al sistema de {' '}
            <span className="text-blue-500 dark:text-blue-400">
              Gestión de turnos
            </span>
            , tu portal para una administración eficiente, donde puedes solicitar, visualizar o intercambiar tus turnos en Migraciones.
          </p>
        </div>
        <div className="flex items-center justify-center p-6 md:w-3/5 md:px-28 md:py-1">
          <LoginForm/>
        </div>
      </div>
    {/* <div className="flex items-center justify-center align-center h-15 shrink-0 rounded-lg p-4 md:h-20 bg-[#cddcea] dark:bg-gray-800">
        <div className="flex items-center justify-center mt- gap-x-0">
          <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center">Powered by
            <WSMSLogo className="h-20 w-20 ml-3" />
          </span>
        </div>
      </div> */}
    </main>
  );
}