export type Permiso = 
  // OFERTAS Y CAMBIOS
  | 'ofertar_turno'           // Publicar oferta de turno
  | 'pedir_turno'             // Tomar oferta de otro
  | 'consultar_mis_ofertas'   // Ver mis ofertas
  | 'modificar_mis_ofertas'   // Editar mis ofertas
  | 'eliminar_mis_ofertas'    // Cancelar mis ofertas
  
  // SOLICITUDES DIRECTAS
  | 'enviar_solicitud_directa'      // Mandar solicitud a otro usuario
  | 'recibir_solicitud_directa'     // Recibir y responder solicitudes
  | 'consultar_mis_solicitudes'     // Ver mis solicitudes enviadas
  | 'modificar_solicitud_pendiente' // Modificar solicitud antes de ser aceptada
  | 'eliminar_solicitud_pendiente'  // Cancelar solicitud antes de ser aceptada
  
  // LICENCIAS
  | 'pedir_licencia_ordinaria'    // Pedir licencia ordinaria (genera autorización)
  | 'pedir_licencia_especial'     // Pedir licencia especial (sin autorización)
  | 'cargar_licencia_especial_otros' // Supervisor puede cargar licencias especiales de otros
  
  // CALIFICACIONES
  | 'calificar_usuario'           // Calificar después de un cambio realizado
  | 'consultar_calificaciones'    // Ver calificaciones propias y de otros
  
  // GESTIÓN DE PERSONAL (Supervisor)
  | 'cargar_empleado'
  | 'consultar_empleado'
  | 'modificar_empleado'
  | 'eliminar_empleado'
  
  // FALTAS Y SANCIONES (Supervisor)
  | 'cargar_falta'
  | 'consultar_falta'
  | 'modificar_falta'
  | 'eliminar_falta'
  | 'cargar_sancion'
  | 'consultar_sancion'
  | 'modificar_sancion'
  | 'eliminar_sancion'
  
  // AUTORIZACIONES (Jefe)
  | 'ver_autorizaciones'
  | 'autorizar_cambio'
  | 'rechazar_cambio'
  | 'autorizar_licencia'
  | 'rechazar_licencia'
  
  // INFORMES/ESTADÍSTICAS
  | 'ver_estadisticas'
  | 'ver_informes'
  
  // PERSONAL (Solo lectura para Jefe)
  | 'ver_personal_solo_lectura';

export const PERMISOS_POR_ROL: Record<string, Permiso[]> = {
  INSPECTOR: [
    // Ofertas
    'ofertar_turno',
    'pedir_turno',
    'consultar_mis_ofertas',
    'modificar_mis_ofertas',
    'eliminar_mis_ofertas',
    
    // Solicitudes directas
    'enviar_solicitud_directa',
    'recibir_solicitud_directa',
    'consultar_mis_solicitudes',
    'modificar_solicitud_pendiente',
    'eliminar_solicitud_pendiente',
    
    // Licencias
    'pedir_licencia_ordinaria',
    'pedir_licencia_especial',
    
    // Calificaciones
    'calificar_usuario',
    'consultar_calificaciones',
  ],
  
  SUPERVISOR: [
    // Todo lo del Inspector
    'ofertar_turno',
    'pedir_turno',
    'consultar_mis_ofertas',
    'modificar_mis_ofertas',
    'eliminar_mis_ofertas',
    'enviar_solicitud_directa',
    'recibir_solicitud_directa',
    'consultar_mis_solicitudes',
    'modificar_solicitud_pendiente',
    'eliminar_solicitud_pendiente',
    'pedir_licencia_ordinaria',
    'pedir_licencia_especial',
    'calificar_usuario',
    'consultar_calificaciones',
    
    // Permisos adicionales del Supervisor
    'cargar_empleado',
    'consultar_empleado',
    'modificar_empleado',
    'eliminar_empleado',
    'cargar_falta',
    'consultar_falta',
    'modificar_falta',
    'eliminar_falta',
    'cargar_sancion',
    'consultar_sancion',
    'modificar_sancion',
    'eliminar_sancion',
    'cargar_licencia_especial_otros',
  ],
  
  JEFE: [
    // Autorizaciones (principal función)
    'ver_autorizaciones',
    'autorizar_cambio',
    'rechazar_cambio',
    'autorizar_licencia',
    'rechazar_licencia',
    
    // Ver personal (solo lectura)
    'ver_personal_solo_lectura',
    
    // Informes y estadísticas
    'ver_estadisticas',
    'ver_informes',
  ],
};

// Helper para verificar si un permiso es de escritura
export const esPermisoEscritura = (permiso: Permiso): boolean => {
  return permiso.includes('cargar') || 
         permiso.includes('modificar') || 
         permiso.includes('eliminar') ||
         permiso.includes('autorizar') ||
         permiso.includes('rechazar');
};