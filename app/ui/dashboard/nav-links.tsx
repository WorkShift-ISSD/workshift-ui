'use client';

import {
  UserGroupIcon,
  HomeIcon,
  ChartBarIcon,
  CalendarIcon,
  StarIcon,
  DocumentTextIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { usePermissions } from '@/hooks/usePermissions';

const links = [
  { 
    name: 'Inicio', 
    href: '/dashboard', 
    icon: HomeIcon,
    roles: ['INSPECTOR', 'SUPERVISOR', 'JEFE', 'ADMINISTRADOR'],
  },
  {
    name: 'Cambios',
    href: '/dashboard/cambios',
    icon: CalendarIcon,
    roles: ['INSPECTOR', 'SUPERVISOR', 'ADMINISTRADOR'],
  },
  
  {
    name: 'Licencias',
    href: '/dashboard/licencias',
    icon: ClipboardDocumentListIcon,
    roles: ['INSPECTOR', 'SUPERVISOR', 'ADMINISTRADOR'],
  },
  {
    name: 'Calificaciones',
    href: '/dashboard/calificaciones',
    icon: StarIcon,
    roles: ['INSPECTOR', 'SUPERVISOR', 'ADMINISTRADOR'],
  },
  {
    name: 'Personal',
    href: '/dashboard/personal',
    icon: UserGroupIcon,
    roles: ['SUPERVISOR', 'JEFE', 'ADMINISTRADOR'],
  },
  {
    name: 'Faltas',
    href: '/dashboard/faltas',
    icon: ShieldExclamationIcon,
    roles: ['SUPERVISOR', 'ADMINISTRADOR'],
  },
  {
    name: 'Sanciones',
    href: '/dashboard/sanciones',
    icon: ShieldExclamationIcon,
    roles: ['SUPERVISOR', 'ADMINISTRADOR'],
  },
  {
    name: 'Autorizaciones',
    href: '/dashboard/autorizaciones',
    icon: CheckCircleIcon,
    roles: ['JEFE', 'ADMINISTRADOR'],
  },
  {
    name: 'Informes',
    href: '/dashboard/informes',
    icon: DocumentTextIcon,
    roles: ['JEFE', 'ADMINISTRADOR'],
  },
  {
    name: 'Estadísticas',
    href: '/dashboard/estadisticas',
    icon: ChartBarIcon,
    roles: ['JEFE', 'ADMINISTRADOR'],
  },
];

export default function NavLinks() {
  const pathname = usePathname();
  const { userRole } = usePermissions();

  // Filtrar links según rol
  const visibleLinks = links.filter(link => 
    link.roles.includes(userRole || '')
  );

  return (
    <>
      {visibleLinks.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              'flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-gray-50 dark:bg-gray-800 p-3 text-sm font-medium hover:bg-sky-100 dark:hover:bg-sky-900 hover:text-blue-600 dark:hover:text-blue-400 md:flex-none md:justify-start md:p-2 md:px-3 transition-colors',
              {
                'bg-sky-100 dark:bg-sky-900 text-blue-600 dark:text-blue-400': pathname === link.href,
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