'use client';

import { useAuth } from "@/app/context/AuthContext";
import { Permiso, tieneAlgunPermiso, tienePermiso, tieneTodosLosPermisos } from "@/app/lib/permissions";



export function usePermissions() {
  const { user } = useAuth();

  const can = (permiso: Permiso): boolean => {
    if (!user) return false;
    return tienePermiso(user.rol, permiso);
  };

  const canAny = (permisos: Permiso[]): boolean => {
    if (!user) return false;
    return tieneAlgunPermiso(user.rol, permisos);
  };

  const canAll = (permisos: Permiso[]): boolean => {
    if (!user) return false;
    return tieneTodosLosPermisos(user.rol, permisos);
  };

  return {
    can,
    canAny,
    canAll,
    rol: user?.rol || null,
  };
}