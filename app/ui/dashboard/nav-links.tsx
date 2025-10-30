'use client';

import {
  UserGroupIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { 
  ChartLineIcon, 
  FileClockIcon, 
  RepeatIcon, 
  StarIcon,
  ClipboardCheckIcon,
  AlertTriangleIcon,
  ShieldAlertIcon
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { Permiso } from '@/app/lib/permissions';


interface LinkItem {
  name: string;
  href: string;
  icon: any;
  requiredPermissions: Permiso[]; // Permisos necesarios (con UNO basta)
}

// Links con sus permisos requeridos
const links: LinkItem[] = [
  { 
    name: 'Home', 
    href: '/dashboard', 
    icon: HomeIcon,
    requiredPermissions: [], // Todos pueden ver Home
  },
  { 
    name: 'Cambios',  
    href: '/dashboard/cambios',  
    icon: RepeatIcon,
    requiredPermissions: ['ofertar_turno', 'pedir_turno'], // Inspector, Supervisor
  },
  { 
    name: 'Solicitudes',  
    href: '/dashboard/solicitudes',  
    icon: RepeatIcon,
    requiredPermissions: ['solicitud_directa'], // Inspector, Supervisor
  },
  { 
    name: 'Licencias', 
    href: '/dashboard/licencias', 
    icon: FileClockIcon,
    requiredPermissions: ['pedir_licencia_ordinaria', 'pedir_licencia_especial'], // Inspector, Supervisor
  },
  { 
    name: 'Calificaciones', 
    href: '/dashboard/calificaciones', 
    icon: StarIcon,
    requiredPermissions: ['ver_calificaciones'], // Inspector, Supervisor
  },
  { 
    name: 'Personal', 
    href: '/dashboard/personal', 
    icon: UserGroupIcon,
    requiredPermissions: ['cargar_empleado', 'ver_personal_solo_lectura'], // Supervisor, Jefe
  },
  { 
    name: 'Faltas', 
    href: '/dashboard/faltas', 
    icon: AlertTriangleIcon,
    requiredPermissions: ['cargar_falta'], // Solo Supervisor
  },
  { 
    name: 'Sanciones', 
    href: '/dashboard/sanciones', 
    icon: ShieldAlertIcon,
    requiredPermissions: ['cargar_sancion'], // Solo Supervisor
  },
  { 
    name: 'Autorizaciones', 
    href: '/dashboard/autorizaciones', 
    icon: ClipboardCheckIcon,
    requiredPermissions: ['ver_autorizaciones'], // Solo Jefe
  },
  { 
    name: 'Estadísticas', 
    href: '/dashboard/estadisticas', 
    icon: ChartLineIcon,
    requiredPermissions: ['ver_estadisticas'], // Solo Jefe
  },
];

interface NavLinksProps {
  onLinkClick?: () => void;
}

export default function NavLinks({ onLinkClick }: NavLinksProps) {
  const pathname = usePathname();
  const { canAny } = usePermissions();

  // Filtrar links según permisos
  const visibleLinks = links.filter((link) => {
    // Si no requiere permisos, mostrarlo
    if (link.requiredPermissions.length === 0) return true;
    // Si requiere permisos, verificar que tenga al menos uno
    return canAny(link.requiredPermissions);
  });

  return (
    <>
      {visibleLinks.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            onClick={onLinkClick}
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