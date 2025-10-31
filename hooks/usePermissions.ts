import { useAuth } from '@/app/context/AuthContext';
import { Permiso, PERMISOS_POR_ROL } from '@/app/lib/permissions';


export function usePermissions() {
  const { user } = useAuth();

  const can = (permiso: Permiso): boolean => {
    if (!user) return false;
    const permisos = PERMISOS_POR_ROL[user.rol] || [];
    return permisos.includes(permiso);
  };

  const canAny = (permisos: Permiso[]): boolean => {
    if (!user) return false;
    return permisos.some(permiso => can(permiso));
  };

  const canAll = (permisos: Permiso[]): boolean => {
    if (!user) return false;
    return permisos.every(permiso => can(permiso));
  };

  // Helper específico para verificar acciones CRUD
  const canCRUD = (recurso: 'empleado' | 'falta' | 'sancion' | 'licencia') => ({
    create: can(`cargar_${recurso}` as Permiso),
    read: can(`consultar_${recurso}` as Permiso),
    update: can(`modificar_${recurso}` as Permiso),
    delete: can(`eliminar_${recurso}` as Permiso),
  });

  return { 
    can, 
    canAny, 
    canAll, 
    canCRUD,
    userRole: user?.rol 
  };
}