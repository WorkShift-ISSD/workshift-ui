import Link from 'next/link';
import NavLinks from '@/app/ui/dashboard/nav-links';
import MigraLogo from '@/app/ui/MigraLogo';
import { PowerIcon } from '@heroicons/react/24/outline';
import LogoutButton from '@/app/components/LogoutButton';

export default function SideNav() {
  return (
    <div className="flex h-full flex-col px-3 py-4 md:px-2 bg-white dark:bg-gray-800">
      <Link
        className="mb-8 flex h-32 items-center justify-center rounded-md bg-ws-background dark:bg-gray-800 p-4 md:h-20"
        href=""
      >
        <div className="relative w-[99%] h-[80px] md:h-[120px]">
          <MigraLogo className="relative w-[99%] h-[80px] md:h-[120px]"/>
        </div>
      </Link>
      <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
        <NavLinks />
        <br />
        <LogoutButton/>
        <div className="hidden h-auto w-full grow rounded-md bg-gray-50 dark:bg-gray-800 md:block"></div>
      </div>
    </div>
  );
}