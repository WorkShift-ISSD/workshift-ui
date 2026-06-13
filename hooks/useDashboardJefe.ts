// hooks/useDashboardJefe.ts
import { useMemo } from 'react';
import { useEmpleados } from './useEmpleados';
import { useAutorizaciones } from './useAutorizaciones';
import { useTodasLasFaltas } from './useFaltas';
import { useLicencias } from './useLicencias';
import { useAuth } from '@/app/context/AuthContext';

export function useDashboardJefe() {
  const { user }                                                       = useAuth();
  const { empleados, isLoading: loadingEmp }                          = useEmpleados();
  const { autorizaciones, loading: loadingAuth,
          aprobarAutorizacion, rechazarAutorizacion }                  = useAutorizaciones();
  const { faltas, isLoading: loadingFaltas }                          = useTodasLasFaltas();
  const { licencias, loading: loadingLic }                            = useLicencias();

  const hoy         = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
  const grupoJefe   = user?.grupoTurno; // 'A' | 'B' | 'C' | 'D'

  // ── Empleados del grupo del jefe (base de todos los filtros) ──────────
  const empleadosDelGrupo = useMemo(() =>
    (Array.isArray(empleados) ? empleados : []).filter(e =>
      (e.rol === 'INSPECTOR' || e.rol === 'SUPERVISOR') &&
      e.activo &&
      e.grupoTurno === grupoJefe
    ),
    [empleados, grupoJefe]
  );

  const idsDelGrupo = useMemo(() =>
    new Set(empleadosDelGrupo.map(e => e.id)),
    [empleadosDelGrupo]
  );

  // ── Ausentes hoy ──────────────────────────────────────────────────────
  const idsConFaltaHoy = useMemo(() =>
    new Set(
      (Array.isArray(faltas) ? faltas : [])
        .filter(f => f.fecha.split('T')[0] === hoy && idsDelGrupo.has(f.empleadoId))
        .map(f => f.empleadoId)
    ),
    [faltas, hoy, idsDelGrupo]
  );

  const idsConLicenciaHoy = useMemo(() =>
    new Set(
      (Array.isArray(licencias) ? licencias : [])
        .filter(l => {
          if (l.estado !== 'APROBADA') return false;
          const empId = l.empleado_id ?? l.empleado_id;
          if (!idsDelGrupo.has(empId)) return false;
          const desde = l.fecha_desde?.split('T')[0] ?? '';
          const hasta = l.fecha_hasta?.split('T')[0] ?? '';
          return desde <= hoy && hasta >= hoy;
        })
        .map(l => l.empleado_id ?? l.empleado_id)
    ),
    [licencias, hoy, idsDelGrupo]
  );
  // ── Métricas — solo del grupo ─────────────────────────────────────────
  const metricas = useMemo(() => {
    const totalActivos = empleadosDelGrupo.length;
    const mesActual    = hoy.slice(0, 7);

    const faltasMes = (Array.isArray(faltas) ? faltas : []).filter(f =>
      f.fecha.slice(0, 7) === mesActual && idsDelGrupo.has(f.empleadoId)
    );
    const empleadosConFalta = new Set(faltasMes.map(f => f.empleadoId)).size;
    const ausentismoPct = totalActivos > 0
      ? Math.round((empleadosConFalta / totalActivos) * 100 * 10) / 10
      : 0;

    return {
      total_activos:       totalActivos,
      ausentismo_mes_pct:  ausentismoPct,
      total_faltas_mes:    faltasMes.length,
      faltas_justificadas: faltasMes.filter(f => f.justificada).length,
    };
  }, [empleadosDelGrupo, faltas, hoy, idsDelGrupo]);

  // ── Personal — solo del grupo ─────────────────────────────────────────
  const personal = useMemo(() => {
    const emps = empleadosDelGrupo.map(e => ({
      id:               e.id,
      nombre:           e.nombre,
      apellido:         e.apellido,
      rol:              e.rol,
      grupo_turno:      e.grupoTurno,
      horario:          e.horario ?? '',
      calificacion:     (e as any).calificacion ?? 4.5,
      ausente_hoy:      idsConFaltaHoy.has(e.id) || idsConLicenciaHoy.has(e.id),
      con_licencia:     idsConLicenciaHoy.has(e.id),
      con_falta:        idsConFaltaHoy.has(e.id),
      con_sancion:      false,
      intercambios_mes: (e as any).totalIntercambios ?? 0,
      sobrecargado:     ((e as any).totalIntercambios ?? 0) > 3,
    }));
    return { empleados: emps };
  }, [empleadosDelGrupo, idsConFaltaHoy, idsConLicenciaHoy]);

  // ── Heatmap — autorizaciones visibles para el jefe ───────────────────
  const heatmap = useMemo(() => {
    const map: Record<string, { total: number; pendientes: number }> = {};
    (autorizaciones ?? [])
      .filter(a => a.tipo === 'CAMBIO_TURNO' || idsDelGrupo.has(a.empleadoId))
      .forEach(a => {
        const fecha = a.createdAt?.split('T')[0];
        if (!fecha) return;
        if (!map[fecha]) map[fecha] = { total: 0, pendientes: 0 };
        map[fecha].total++;
        if (a.estado === 'PENDIENTE') map[fecha].pendientes++;
      });
    return Object.entries(map).map(([fecha, v]) => ({ fecha, ...v }));
  }, [autorizaciones, idsDelGrupo]);

  // ── Pendientes del grupo con impacto ─────────────────────────────────
  const pendientesConImpacto = useMemo(() => {
    if (!autorizaciones?.length || !empleadosDelGrupo.length) return [];

    return autorizaciones
      .filter(a => a.estado === 'PENDIENTE' && (a.tipo === 'CAMBIO_TURNO' || idsDelGrupo.has(a.empleadoId)))
      .map(a => {
        const solicitante = empleadosDelGrupo.find(e => e.id === a.empleadoId);

        if (!solicitante || !a.licenciaId) {
          return {
            ...a,
            impacto: { nivel: 'bajo' as const, ausentes_periodo: 0, total_grupo: 0 },
          };
        }

        const licencia   = licencias?.find(l => l.id === a.licenciaId);
        const fechaDesde = licencia?.fecha_desde?.split('T')[0] ?? hoy;
        const fechaHasta = licencia?.fecha_hasta?.split('T')[0] ?? hoy;

        const mismoRolGrupo = empleadosDelGrupo.filter(e =>
          e.rol    === solicitante.rol &&
          e.activo === true &&
          e.id     !== solicitante.id
        );

        const yaAusentes = mismoRolGrupo.filter(e =>
          (Array.isArray(licencias) ? licencias : []).some(l => {
            if (l.estado !== 'APROBADA') return false;
            const empId  = l.empleado_id ?? l.empleado_id;
            const lDesde = l.fecha_desde?.split('T')[0] ?? '';
            const lHasta = l.fecha_hasta?.split('T')[0] ?? '';
            return empId === e.id && lDesde <= fechaHasta && lHasta >= fechaDesde;
          })
        ).length;

        const totalGrupo = mismoRolGrupo.length + 1;
        const pctImpacto = totalGrupo > 0
          ? Math.round(((yaAusentes + 1) / totalGrupo) * 100)
          : 0;
        const nivel = pctImpacto >= 50 ? 'alto' as const
                    : pctImpacto >= 25 ? 'medio' as const
                    : 'bajo' as const;

        return {
          ...a,
          impacto: { nivel, ausentes_periodo: yaAusentes, total_grupo: totalGrupo, pct_impacto: pctImpacto },
        };
      });
  }, [autorizaciones, empleadosDelGrupo, licencias, hoy, idsDelGrupo]);

  return {
    isLoading: loadingEmp || loadingAuth || loadingFaltas || loadingLic,
    grupoJefe,
    metricas,
    personal,
    heatmap,
    pendientes:           pendientesConImpacto,
    // Todas las autorizaciones del grupo (pendientes + aprobadas + rechazadas)
    // para que HeatmapOperativo pueda mostrar el historial completo
    autorizacionesGrupo:  (autorizaciones ?? []).filter(a => a.tipo === 'CAMBIO_TURNO' || idsDelGrupo.has(a.empleadoId)),
    aprobarAutorizacion,
    rechazarAutorizacion,
  };
}