
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Image from 'next/image';
import { inter } from './ui/fonts';
import LoginForm from './components/LoginForm';
import MigraLogo from '@/app/ui/MigraLogo';
import WSMSLogo from '@/app/ui/WSMSLogo';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col p-3">
      <div className="flex h-20 shrink-0 items-end rounded-lg bg-cddcea p-4 md:h-40"
      style={{ backgroundColor: '#cddcea' }}>
        <MigraLogo className=" relative w-[30%] h-[80px] md:h-[120px]" />
      </div>
      <div className=" flex grow flex-col gap-4 md:flex-row mt-2">
        <div className="flex flex-col justify-center gap-2 rounded-lg bg-gray-50 md:w-2/5 md:px-10 ">
          <p className={`${inter.className} antialiased text-xl text-gray-800 md:text-3xl md:leading-normal`}>
            <div/>
            <strong>Bienvenido </strong> al sistema de {' '}
            <span className="text-blue-500">
              Gestión de turnos
            </span>
            , tu portal para una administración eficiente, donde puedes solicitar, visualizar o intercambiar tus turnos en Migraciones.
          </p>
          
        </div>
        <div className="flex items-center justify-center p-6 md:w-3/5 md:px-28 md:py-1">
          <LoginForm/>
        </div>
      </div>
    <div className="flex items-center justify-center align-center h-15 shrink-0 rounded-lg p-4 md:h-20"
      style={{ backgroundColor: '#cddcea' }}>
        <div className="flex items-center justify-center mt- gap-x-0">
                      <span className="text-sm text-gray-700 flex  items-center">Powered by
                      <WSMSLogo className="h-20 w-20 ml-3" />
                      </span>
                    </div>
      </div>

    </main>
  );
}
