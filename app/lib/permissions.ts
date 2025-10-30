export type Rol = 'INSPECTOR' | 'SUPERVISOR' | 'JEFE';

export type Permiso =
  // Permisos de Inspector
  | 'ofertar_turno'
  | 'pedir_turno'
  | 'solicitud_directa'
  | 'recibir_solicitud_directa'
  | 'pedir_licencia_ordinaria'
  | 'pedir_licencia_especial'
  | 'calificar_usuario'
  | 'ver_calificaciones'
  
  // Permisos de Supervisor (Inspector +)
  | 'cargar_empleado'
  | 'cargar_falta'
  | 'cargar_sancion'
  | 'cargar_licencia_especial_otros'
  
  // Permisos de Jefe
  | 'ver_autorizaciones'
  | 'autorizar_rechazar'
  | 'ver_personal_solo_lectura'
  | 'ver_estadisticas';

// Mapa de permisos por rol
const PERMISOS_POR_ROL: Record<Rol, Permiso[]> = {
  INSPECTOR: [
    'ofertar_turno',
    'pedir_turno',
    'solicitud_directa',
    'recibir_solicitud_directa',
    'pedir_licencia_ordinaria',
    'pedir_licencia_especial',
    'calificar_usuario',
    'ver_calificaciones',
  ],
  
  SUPERVISOR: [
    // Todos los permisos de Inspector
    'ofertar_turno',
    'pedir_turno',
    'solicitud_directa',
    'recibir_solicitud_directa',
    'pedir_licencia_ordinaria',
    'pedir_licencia_especial',
    'calificar_usuario',
    'ver_calificaciones',
    // Permisos adicionales de Supervisor
    'cargar_empleado',
    'cargar_falta',
    'cargar_sancion',
    'cargar_licencia_especial_otros',
  ],
  
  JEFE: [
    'ver_autorizaciones',
    'autorizar_rechazar',
    'ver_personal_solo_lectura',
    'ver_estadisticas',
  ],
};

// Función para verificar si un rol tiene un permiso
export function tienePermiso(rol: Rol, permiso: Permiso): boolean {
  return PERMISOS_POR_ROL[rol]?.includes(permiso) || false;
}

// Función para verificar múltiples permisos
export function tieneAlgunPermiso(rol: Rol, permisos: Permiso[]): boolean {
  return permisos.some(permiso => tienePermiso(rol, permiso));
}

// Función para verificar todos los permisos
export function tieneTodosLosPermisos(rol: Rol, permisos: Permiso[]): boolean {
  return permisos.every(permiso => tienePermiso(rol, permiso));
}

// Obtener todos los permisos de un rol
export function obtenerPermisos(rol: Rol): Permiso[] {
  return PERMISOS_POR_ROL[rol] || [];
}