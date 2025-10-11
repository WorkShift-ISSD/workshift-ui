'use client';

import {
  UserGroupIcon,
  HomeIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { ChartLineIcon, FileClockIcon, IdCardIcon, IterationCcwIcon, Repeat, RepeatIcon, StarIcon } from 'lucide-react';

// Map of links to display in the side navigation.
// Depending on the size of the application, this would be stored in a database.
const links = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon },
  { name: 'Personal', href: '/dashboard/personal', icon: UserGroupIcon },
  { name: 'Cambios',  href: '/dashboard/cambios',  icon: RepeatIcon },
  { name: 'Licencias', href: '/dashboard/licencias', icon: FileClockIcon },
  { name: 'Calificaciones', href: '/dashboard/calificaciones', icon: StarIcon },
  { name: 'Estadísticas', href: '/dashboard/estadisticas', icon: ChartLineIcon },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              'flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-gray-50 dark:bg-gray-800 p-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-sky-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 md:flex-none md:justify-start md:p-2 md:px-3 transition-colors',
              {
                'bg-sky-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400': pathname === link.href,
              },
            )}
          >
            <LinkIcon className="w-6" />
            <p className="hidden md:block">{link.name}</p>
          </Link>
        );
      })}
    </>
  );
}