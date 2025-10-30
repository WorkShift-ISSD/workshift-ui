'use client';

import { usePermissions } from '@/hooks/usePermissions';

import { ReactNode } from 'react';
import { Permiso } from '../lib/permissions';

interface CanProps {
  do: Permiso | Permiso[];
  children: ReactNode;
  fallback?: ReactNode;
}

export default function Can({ do: permisos, children, fallback = null }: CanProps) {
  const { can, canAny } = usePermissions();

  const tienePermiso = Array.isArray(permisos) 
    ? canAny(permisos)
    : can(permisos);

  return tienePermiso ? <>{children}</> : <>{fallback}</>;
}