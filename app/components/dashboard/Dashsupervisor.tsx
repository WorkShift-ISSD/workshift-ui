'use client';

import { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/app/api/fetcher';
import {
  Calendar,
  CheckCircle,
  Ban,
  Clock,
  XCircle,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Star,
  AlertTriangle,
  Shield,
  UserCheck,
  UserX,
  Search,
  X,
} from 'lucide-react';
import { useCambios } from '@/hooks/useCambios';
import { useTurnosData } from '@/hooks/useTurnosData';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useTodasLasFaltas } from '@/hooks/useFaltas';
import { calcularDiasTrabajoEnRango, calcularGrupoTrabaja } from '@/app/lib/turnosUtils';
import { useCambiosPage } from '@/hooks/useCambiosPage';
import { useSolicitudesDirectas } from '@/hooks/useSolicitudesDirectas';
import CalendarioTurnos from '@/app/components/CalendarioTurnos';
import { useTurnosEfectivos } from '@/hooks/useTurnosEfectivos';
import { useFormatters } from '@/hooks/useFormatters';
import { useSanciones } from '@/hooks/useSanciones';
import { useLicencias } from '@/hooks/useLicencias';
import { useEmpleados } from '@/hooks/useEmpleados';
import { useCalificaciones } from '@/hooks/useCalificaciones';
import Link from 'next/link';

// ── Helpers ────────────────────────────────────────────────────────────────

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getLunes(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toYMD(date: Date) {
  return date.toISOString().split('T')[0];
}

// ── Íconos de estado de día ────────────────────────────────────────────────

function DayIcon({
  type,
  isSancion = false,
}: {
  type: 'worked' | 'exchange' | 'off' | 'covered' | 'absent' | 'license' | 'future';
  isSancion?: boolean;
}) {
  if (type === 'future') return <CheckCircle className="w-4 h-4 text-green-300 dark:text-green-700" />;
  if (type === 'worked') return <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />;
  if (type === 'exchange') return <RefreshCw className="w-4 h-4 text-amber-400" />;
  if (type === 'covered') return <RefreshCw className="w-4 h-4 text-orange-400" />;
  if (type === 'absent')
    return isSancion ? (
      <Ban className="w-4 h-4 text-red-400" />
    ) : (
      <XCircle className="w-4 h-4 text-red-400" />
    );
  if (type === 'license') return <Clock className="w-4 h-4 text-orange-300" />;
  return null;
}

// ── Componente principal ───────────────────────────────────────────────────

export default function DashboardSupervisor() {
  const { user } = useAuth();
  const { miScore } = useCalificaciones();

  // ── Hooks personales (idénticos al Inspector) ────────────────────────────
  const { cambios, isLoading: loadingCambios, error: errorCambios } = useCambios();
  const { isLoading: loadingTurnos, error: errorTurnos } = useTurnosData();
  const { faltas, isLoading: loadingFaltas } = useTodasLasFaltas();
  const { ofertasDisponibles } = useCambiosPage();
  const { solicitudes, isLoading: loadingSolicitudes } = useSolicitudesDirectas();
  const { turnosEfectivos, fechasCedidas } = useTurnosEfectivos();
  const { formatFechaLargaConDia } = useFormatters();
  const { sanciones } = useSanciones();
  const { licencias } = useLicencias();

  // ── Hook de supervisión ──────────────────────────────────────────────────
  const { empleados, isLoading: loadingEmpleados } = useEmpleados();

  const hoy = new Date();
  const hoyYMD = toYMD(hoy);

  const { data: presentesHoyData } = useSWR(`/api/presentes?fecha=${hoyYMD}`, fetcher);
  const presentesHoyIds = useMemo(() => {
    if (!Array.isArray(presentesHoyData)) return new Set<string>();
    return new Set<string>(presentesHoyData.map((p: any) => String(p.empleadoId)));
  }, [presentesHoyData]);

  // ── Mes actual ──────────────────────────────────────────────────────────
  const monthInfo = useMemo(() => {
    const year = hoy.getFullYear();
    const month = hoy.getMonth();
    return {
      year,
      month,
      firstDay: `${year}-${String(month + 1).padStart(2, '0')}-01`,
      lastDayStr: new Date(year, month + 1, 0).toISOString().split('T')[0],
      label: hoy.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
    };
  }, []);

  // ── Guardias / faltas personales ─────────────────────────────────────────
  const misGuardiasReales = useMemo(() => {
    if (!user) return 0;
    return calcularDiasTrabajoEnRango(monthInfo.firstDay, monthInfo.lastDayStr, user.grupoTurno);
  }, [user, monthInfo]);

  const faltasDelMes = useMemo(() => {
    if (!user || !faltas) return 0;
    const hoyDate = new Date();
    hoyDate.setHours(0, 0, 0, 0);

    const faltasReales = faltas.filter(f => {
      const fechaStr = f.fecha.includes('T') ? f.fecha.split('T')[0] : f.fecha;
      const ff = new Date(fechaStr + 'T00:00:00');
      if (
        !(
          f.empleadoId === user.id &&
          ff.getFullYear() === monthInfo.year &&
          ff.getMonth() === monthInfo.month &&
          ff <= hoyDate
        )
      )
        return false;
      const grupoDelDia = calcularGrupoTrabaja(ff);
      return grupoDelDia === user.grupoTurno;
    }).length;

    const sancionesReales =
      sanciones?.filter(s => {
        if (s.empleado_id !== user.id || s.estado !== 'ACTIVA') return false;
        const desde = new Date(s.fecha_desde.split('T')[0] + 'T00:00:00');
        const hasta = new Date(s.fecha_hasta.split('T')[0] + 'T00:00:00');
        let count = 0;
        const cursor = new Date(
          Math.max(desde.getTime(), new Date(monthInfo.firstDay + 'T00:00:00').getTime())
        );
        const fin = new Date(
          Math.min(
            hasta.getTime(),
            hoyDate.getTime(),
            new Date(monthInfo.lastDayStr + 'T00:00:00').getTime()
          )
        );
        while (cursor <= fin) {
          if (calcularGrupoTrabaja(cursor) === user.grupoTurno) count++;
          cursor.setDate(cursor.getDate() + 1);
        }
        return count > 0;
      }).length ?? 0;

    return faltasReales + sancionesReales;
  }, [user, faltas, sanciones, monthInfo]);

  const guardiasTrabajadas = useMemo(() => {
    if (!user) return 0;
    const hoyDate = new Date();
    hoyDate.setHours(0, 0, 0, 0);
    const hasta =
      hoyDate > new Date(monthInfo.lastDayStr) ? monthInfo.lastDayStr : toYMD(hoyDate);
    return Math.max(
      0,
      calcularDiasTrabajoEnRango(monthInfo.firstDay, hasta, user.grupoTurno) - faltasDelMes
    );
  }, [user, monthInfo, faltasDelMes]);

  const porcentajeCubierto = useMemo(
    () =>
      misGuardiasReales === 0
        ? 0
        : Math.round((guardiasTrabajadas / misGuardiasReales) * 100),
    [guardiasTrabajadas, misGuardiasReales]
  );

  function getDayStyles(
    type: 'worked' | 'exchange' | 'covered' | 'off' | 'future' | 'absent' | 'license',
    esGuardia = true
  ) {
    switch (type) {
      case 'worked':
        return 'bg-green-100 dark:bg-green-500/10 border-green-200 dark:border-green-500/20';
      case 'exchange':
        return 'bg-amber-100 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
      case 'covered':
        return 'bg-orange-100 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20';
      case 'absent':
        return esGuardia
          ? 'bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
          : 'bg-red-200 dark:bg-red-900/30 border-red-400 dark:border-red-700/50';
      case 'license':
        return 'bg-orange-100 dark:bg-orange-400/10 border-orange-300 dark:border-orange-400/20';
      case 'off':
        return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
      case 'future':
        return esGuardia
          ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30'
          : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  }

  // ── Semana actual (personal) ─────────────────────────────────────────────
  const semanaActual = useMemo((): {
    label: string;
    tipo: 'worked' | 'exchange' | 'off' | 'future' | 'covered' | 'absent' | 'license';
    horario: string;
    esSancion: boolean;
    esGuardia: boolean;
  }[] => {
    const lunes = getLunes(hoy);
    const fechasGanadas = new Set(turnosEfectivos.map(t => t.fecha));
    const fechasCedidasSet = new Set(fechasCedidas);

    return DIAS_SEMANA.map((label, i) => {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const esFuturo = ymd > hoyYMD;

      const grupoDelDia = calcularGrupoTrabaja(d);
      const esGrupoUsuario = grupoDelDia === user?.grupoTurno;
      const esGanado = fechasGanadas.has(ymd);
      const esCedido = fechasCedidasSet.has(ymd);
      const trabaja = (esGrupoUsuario && !esCedido) || esGanado;

      const esFalta =
        faltas?.some(f => {
          const fs = f.fecha.includes('T') ? f.fecha.split('T')[0] : f.fecha;
          return f.empleadoId === user?.id && fs === ymd;
        }) ?? false;

      const esSancion =
        sanciones?.some(
          s =>
            s.empleado_id === user?.id &&
            ymd >= s.fecha_desde.split('T')[0] &&
            ymd <= s.fecha_hasta.split('T')[0]
        ) ?? false;

      const esLicencia =
        licencias?.some(
          l =>
            l.empleado_id === user?.id &&
            (l.estado === 'APROBADA' || l.estado === 'ACTIVA') &&
            ymd >= l.fecha_desde.split('T')[0] &&
            ymd <= l.fecha_hasta.split('T')[0]
        ) ?? false;

      let tipo: 'worked' | 'exchange' | 'off' | 'future' | 'covered' | 'absent' | 'license';
      if (esFuturo) tipo = 'future';
      else if (esFalta || esSancion) tipo = 'absent';
      else if (esLicencia) tipo = 'license';
      else if (esCedido) tipo = 'covered';
      else if (esGanado) tipo = 'exchange';
      else if (trabaja) tipo = 'worked';
      else tipo = 'off';

      const horario = esGanado
        ? turnosEfectivos.find(t => t.fecha === ymd)?.horario_efectivo || user?.horario || ''
        : esCedido
          ? ''
          : trabaja
            ? user?.horario || ''
            : '';

      return { label, tipo, horario, esSancion, esGuardia: trabaja };
    });
  }, [hoy, hoyYMD, turnosEfectivos, fechasCedidas, user, faltas, sanciones, licencias]);

  const trabajadosSemana = semanaActual.filter(
    d => d.tipo === 'worked' || d.tipo === 'exchange'
  ).length;
  const intercambiosSemana = semanaActual.filter(d => d.tipo === 'exchange').length;
  const faltasSemana = semanaActual.filter(d => d.tipo === 'absent' && d.esGuardia).length;
  const licenciasSemana = semanaActual.filter(d => d.tipo === 'license').length;

  // ── Stats personales ─────────────────────────────────────────────────────
  const statsReales = useMemo(() => {
    const misSolicitudes =
      solicitudes?.filter(
        sol => sol.solicitante.id === user?.id || sol.destinatario.id === user?.id
      ) || [];

    const aprobados = misSolicitudes.filter(sol => {
      const f = new Date(sol.fechaSolicitud);
      return (
        sol.estado === 'COMPLETADO' &&
        f.getFullYear() === monthInfo.year &&
        f.getMonth() === monthInfo.month
      );
    }).length;

    const pendientes = misSolicitudes.filter(sol => sol.estado === 'APROBADO').length;

    const rechazados = misSolicitudes.filter(sol => {
      const f = new Date(sol.fechaSolicitud);
      const estado = sol.estado as string;
      return (
        (estado === 'RECHAZADO' || estado === 'CANCELADO') &&
        f.getFullYear() === monthInfo.year &&
        f.getMonth() === monthInfo.month
      );
    }).length;

    return { aprobados, pendientes, rechazados };
  }, [solicitudes, user, monthInfo]);

  const proximosCambios = useMemo(
    () =>
      (cambios || [])
        .filter(c => c.fecha >= hoyYMD)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .slice(0, 3),
    [cambios, hoyYMD]
  );

  const solicitudesPendientes = useMemo(
    () =>
      (solicitudes || [])
        .filter(s => {
          const estado = String(s.estado).toUpperCase();
          return (
            s.destinatario.id === user?.id &&
            (estado === 'SOLICITADO' || estado === 'PENDIENTE')
          );
        })
        .slice(0, 2),
    [solicitudes, user]
  );

  const misIntercambios = useMemo(
    () =>
      (cambios || [])
        .filter(c => c.fecha >= hoyYMD)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .slice(0, 3),
    [cambios, hoyYMD]
  );

  const fechasEfectivasSet = useMemo(
    () => new Set(turnosEfectivos.map(t => t.fecha)),
    [turnosEfectivos]
  );

  // ── Datos de supervisión ─────────────────────────────────────────────────
  const inspectores = useMemo(
    () => (empleados || []).filter(e => e.rol === 'INSPECTOR'),
    [empleados]
  );

  const estadoInspectores = useMemo(() => {
    return inspectores.map(inspector => {
      const grupoDelDia = calcularGrupoTrabaja(hoy);
      const esSuDia = grupoDelDia === inspector.grupoTurno;

      const tieneFalta =
        faltas?.some(f => {
          const fs = f.fecha.includes('T') ? f.fecha.split('T')[0] : f.fecha;
          return f.empleadoId === inspector.id && fs === hoyYMD;
        }) ?? false;

      const tieneSancion =
        sanciones?.some(
          s =>
            s.empleado_id === inspector.id &&
            s.estado === 'ACTIVA' &&
            hoyYMD >= s.fecha_desde.split('T')[0] &&
            hoyYMD <= s.fecha_hasta.split('T')[0]
        ) ?? false;

      const tieneLicencia =
        licencias?.some(
          l =>
            l.empleado_id === inspector.id &&
            (l.estado === 'APROBADA' || l.estado === 'ACTIVA') &&
            hoyYMD >= l.fecha_desde.split('T')[0] &&
            hoyYMD <= l.fecha_hasta.split('T')[0]
        ) ?? false;

      // Tiene reemplazo si alguien ganó su turno por cambio aprobado
      const tieneReemplazo = (cambios || []).some(
        c => c.fecha === hoyYMD && c.destinatario?.id === inspector.id && c.estado === 'APROBADO'
      );

      let estado: 'PRESENTE' | 'AUSENTE' | 'LICENCIA' | 'SANCIONADO' | 'SIN_REGISTRAR';
      if (tieneSancion) estado = 'SANCIONADO';
      else if (tieneLicencia) estado = 'LICENCIA';
      else if (tieneFalta) estado = 'AUSENTE';
      else if (presentesHoyIds.has(String(inspector.id))) estado = 'PRESENTE';
      else estado = 'SIN_REGISTRAR';

      return { ...inspector, estado, esSuDia, tieneReemplazo };
    });
  }, [inspectores, faltas, sanciones, licencias, cambios, hoy, hoyYMD, presentesHoyIds]);

  // Solo los que deberían trabajar hoy
  const inspectoresDeHoy = useMemo(
    () => estadoInspectores.filter(i => i.esSuDia),
    [estadoInspectores]
  );

  const presentes = inspectoresDeHoy.filter(i => i.estado === 'PRESENTE').length;
  const ausentes = inspectoresDeHoy.filter(i => i.estado === 'AUSENTE').length;
  const enLicencia = inspectoresDeHoy.filter(i => i.estado === 'LICENCIA').length;
  const sancionados = inspectoresDeHoy.filter(i => i.estado === 'SANCIONADO').length;
  const totalDeHoy = inspectoresDeHoy.length;
  const coberturaPct =
    totalDeHoy === 0 ? 100 : Math.round((presentes / totalDeHoy) * 100);

  // ── Alertas operativas ───────────────────────────────────────────────────
  const ausentesSinReemplazo = inspectoresDeHoy.filter(
    i => (i.estado === 'AUSENTE' || i.estado === 'SANCIONADO') && !i.tieneReemplazo
  );
  const hayAlertas = ausentesSinReemplazo.length > 0;

  const INSPECTORES_POR_PAGINA = 5;
  const [paginaInspectores, setPaginaInspectores] = useState(1);
  const [busquedaInspector, setBusquedaInspector] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'PRESENTE' | 'AUSENTE' | 'LICENCIA' | 'SANCIONADO' | null>(null);

  // ── Popup de personas por horario ────────────────────────────────────────
  type PopupHorario = { horario: string; filtro: 'PRESENTE' | 'AUSENTE' | 'LICENCIA' | 'SANCIONADO' | null };
  const [popupHorario, setPopupHorario] = useState<PopupHorario | null>(null);
  const [busquedaPopup, setBusquedaPopup] = useState('');
  const [paginaPopup, setPaginaPopup] = useState(1);
  const POPUP_POR_PAGINA = 6;

  function abrirPopup(horario: string, filtro: PopupHorario['filtro']) {
    setPopupHorario({ horario, filtro });
    setBusquedaPopup('');
    setPaginaPopup(1);
  }
  function cerrarPopup() { setPopupHorario(null); setBusquedaPopup(''); }

  // Cerrar popup con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrarPopup(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupHorario]);

  // ── Agrupación por horario ───────────────────────────────────────────────
  const porHorario = useMemo(() => {
    const map = new Map<string, { presentes: number; faltas: number; licencias: number; sanciones: number; sinRegistrar: number }>();
    for (const inspector of inspectoresDeHoy) {
      const horario = inspector.horario || 'Sin horario';
      if (!map.has(horario)) map.set(horario, { presentes: 0, faltas: 0, licencias: 0, sanciones: 0, sinRegistrar: 0 });
      const entry = map.get(horario)!;
      if (inspector.estado === 'PRESENTE') entry.presentes++;
      else if (inspector.estado === 'AUSENTE') entry.faltas++;
      else if (inspector.estado === 'LICENCIA') entry.licencias++;
      else if (inspector.estado === 'SANCIONADO') entry.sanciones++;
      else entry.sinRegistrar++;
    }
    return Array.from(map.entries())
      .map(([horario, stats]) => ({ horario, ...stats }))
      .sort((a, b) => a.horario.localeCompare(b.horario));
  }, [inspectoresDeHoy]);

  // ── Loading / Error ──────────────────────────────────────────────────────
  if (
    loadingCambios ||
    loadingTurnos ||
    loadingFaltas ||
    loadingSolicitudes ||
    loadingEmpleados
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <LoadingSpinner />
        <p className="text-gray-500 dark:text-gray-400 mt-3 text-sm">Cargando dashboard...</p>
      </div>
    );
  }

  if (errorCambios || errorTurnos) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 dark:text-white font-semibold">Error al cargar datos</p>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-grow flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors overflow-y-auto scrollbar-hide">

      {/* ── Header ── */}
      <div className="mb-6 flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Bienvenido {user?.nombre} {user?.apellido}
            <Link href="/dashboard/calificaciones?tab=perfil">
              <span className="flex items-center gap-1 text-amber-400 text-base font-semibold ml-1 hover:text-amber-300 transition-colors cursor-pointer" title="Ver mis calificaciones">
                <Star className="w-6 h-6 fill-amber-400" />
                {Number(miScore ?? 0).toFixed(1)}
              </span>
            </Link>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 capitalize">{user?.rol?.toLowerCase()}</p>
        </div>
      </div>

      {/* ══════════════ CAPA DE SUPERVISIÓN ══════════════ */}

      {/* ── Alertas operativas (máxima jerarquía visual) ── */}
      {hayAlertas && (
        <div className="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-700/50 rounded-2xl p-4 flex items-start gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {ausentesSinReemplazo.length === 1
                ? '1 inspector ausente sin reemplazo'
                : `${ausentesSinReemplazo.length} inspectores ausentes sin reemplazo`}
            </p>
            <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">
              {ausentesSinReemplazo.map(i => `${i.nombre} ${i.apellido}`).join(', ')}
            </p>
          </div>
        </div>
      )}



      {/* ══════════════ SECCIÓN PERSONAL (idéntica al Inspector) ══════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* ══════════════ COLUMNA IZQUIERDA (2/3) ══════════════ */}
        <div className="xl:col-span-2 space-y-4">

          {/* ── Card: Mi semana + Calendario ── */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">

            {/* Mi Semana */}
            <div className="grid grid-cols-7 gap-2 mb-3 p-4">
              {semanaActual.map(({ label, tipo, horario, esSancion, esGuardia }) => (
                <div
                  key={label}
                  className={`flex flex-col items-center rounded-md overflow-hidden border ${getDayStyles(tipo, esGuardia)} transition hover:scale-105`}
                >
                  <div className="w-full h-6 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                      {label}
                      {tipo !== 'off' && (tipo !== 'future' || esGuardia) && horario
                        ? ` · ${horario.split('-')[0]}`
                        : ''}
                    </span>
                  </div>
                  <div className="w-full h-px bg-black/20" />
                  <div className="w-full h-8 flex items-center justify-center">
                    {tipo !== 'off' && (tipo !== 'future' || esGuardia) && (
                      <DayIcon type={tipo} isSancion={esSancion} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen semana */}
            <div className="flex items-center gap-4 mt-3 mb-5 px-4 text-sm">
              <span className="flex items-center gap-1.5 text-green-500 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="font-semibold">{trabajadosSemana} trabajados</span>
              </span>
              <span className="text-gray-500 dark:text-gray-400">•</span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <RefreshCw className="w-4 h-4" />
                <span className="font-semibold">{intercambiosSemana} intercambios</span>
              </span>
              {faltasSemana > 0 && (
                <>
                  <span className="text-gray-500 dark:text-gray-400">•</span>
                  <span className="flex items-center gap-1.5 text-red-400">
                    <XCircle className="w-4 h-4" />
                    <span className="font-semibold">
                      {faltasSemana} {faltasSemana === 1 ? 'falta' : 'faltas'}
                    </span>
                  </span>
                </>
              )}
              {licenciasSemana > 0 && (
                <>
                  <span className="text-gray-500 dark:text-gray-400">•</span>
                  <span className="flex items-center gap-1.5 text-orange-400">
                    <Clock className="w-4 h-4" />
                    <span className="font-semibold">
                      {licenciasSemana} {licenciasSemana === 1 ? 'licencia' : 'licencias'}
                    </span>
                  </span>
                </>
              )}
            </div>

            {/* Presentes por horario */}
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 px-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Cobertura por horario — hoy
                </h3>
              </div>
              {porHorario.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No hay inspectores en turno hoy.
                </p>
              ) : (
                <div className="space-y-2">
                  {porHorario.map(({ horario, presentes, faltas, licencias, sanciones, sinRegistrar }) => {
                    const total = presentes + faltas + licencias + sanciones + sinRegistrar;
                    const pct = total === 0 ? 100 : Math.round((presentes / total) * 100);
                    return (
                      <div
                        key={horario}
                        className="rounded-xl border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/40 px-4 py-3"
                      >
                        {/* Fila superior: horario + pct */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            🕐 {horario}
                          </span>
                          <span
                            className={`text-xs font-bold ${pct >= 80
                              ? 'text-green-500 dark:text-green-400'
                              : pct >= 60
                                ? 'text-amber-400'
                                : 'text-red-400'
                              }`}
                          >
                            {pct}% cobertura
                          </span>
                        </div>
                        {/* Barra */}
                        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-500'
                              }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {/* Contadores clicables */}
                        <div className="flex items-center gap-3 text-xs flex-wrap">
                          {([
                            { filtro: 'PRESENTE' as const, count: presentes, icon: <UserCheck className="w-3.5 h-3.5" />, cls: 'text-green-500 dark:text-green-400', label: (n: number) => `${n} presente${n !== 1 ? 's' : ''}` },
                            { filtro: 'AUSENTE' as const, count: faltas, icon: <UserX className="w-3.5 h-3.5" />, cls: 'text-red-400', label: (n: number) => `${n} ${n === 1 ? 'falta' : 'faltas'}` },
                            { filtro: 'LICENCIA' as const, count: licencias, icon: <Clock className="w-3.5 h-3.5" />, cls: 'text-orange-400', label: (n: number) => `${n} ${n === 1 ? 'licencia' : 'licencias'}` },
                            { filtro: 'SANCIONADO' as const, count: sanciones, icon: <Ban className="w-3.5 h-3.5" />, cls: 'text-red-600 dark:text-red-500', label: (n: number) => `${n} ${n === 1 ? 'sanción' : 'sanciones'}` },
                          ]).map(({ filtro: f, count, icon, cls, label }) => (
                            <button
                              key={f}
                              onClick={() => abrirPopup(horario, f)}
                              className={`flex items-center gap-1 ${cls} hover:opacity-70 transition-opacity rounded px-1 -mx-1`}
                            >
                              {icon}
                              <span className="font-semibold underline decoration-dotted underline-offset-2">{label(count)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Fila: Mis intercambios + Solicitudes ── */}
          <div className="grid md:grid-cols-2 gap-4">

            {/* Mis intercambios */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                Mis intercambios
              </h2>
              <div className="space-y-3">
                {misIntercambios.length === 0 && (
                  <p className="text-gray-500 text-sm">No hay intercambios recientes</p>
                )}
                {misIntercambios.map(c => {
                  const esAprobadoReal = fechasEfectivasSet.has(c.fecha);
                  return (
                    <div key={c.id} className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${esAprobadoReal
                            ? 'bg-green-400'
                            : c.estado === 'PENDIENTE'
                              ? 'bg-amber-400'
                              : 'bg-red-400'
                            }`}
                        />
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          Cambio con{' '}
                          <span className="text-blue-400">
                            {c.destinatario
                              ? `${c.destinatario.nombre} ${c.destinatario.apellido}`
                              : 'N/A'}
                          </span>
                        </p>
                        <p
                          className={`text-xs mt-0.5 ${esAprobadoReal
                            ? 'text-green-500 dark:text-green-400'
                            : c.estado === 'PENDIENTE'
                              ? 'text-amber-400'
                              : 'text-red-400'
                            }`}
                        >
                          — {esAprobadoReal ? 'Aprobado' : c.estado === 'PENDIENTE' ? 'Pendiente' : 'Rechazado'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Solicitudes */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                <span className="flex items-center gap-2">
                  Solicitudes
                  {solicitudesPendientes.length > 0 && (
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                      {solicitudesPendientes.length}
                    </span>
                  )}
                </span>
              </h2>
              {solicitudesPendientes.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay solicitudes pendientes</p>
              ) : (
                <div className="space-y-4">
                  {solicitudesPendientes.map(s => (
                    <div key={s.id}>
                      <p className="text-sm text-gray-900 dark:text-white mb-3">
                        <span className="font-semibold text-blue-400">
                          {s.solicitante
                            ? `${s.solicitante.nombre} ${s.solicitante.apellido}`
                            : 'N/A'}
                        </span>{' '}
                        {s.turnoDestinatario
                          ? <>quiere tu turno del{' '}<span className="text-gray-300">{formatFechaLargaConDia(s.turnoDestinatario.fecha)}</span></>
                          : <>quiere cubrirte el{' '}<span className="text-gray-300">{formatFechaLargaConDia(s.turnoSolicitante?.fecha)}</span></>
                        }
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ══════════════ COLUMNA DERECHA (1/3) ══════════════ */}
        <div className="xl:col-span-1 space-y-4">

          {/* ── Calendario ── */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Mi calendario
            </h2>
            <CalendarioTurnos />
          </div>

          {/* ── Próximos cambios ── */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Próximos cambios
            </h2>
            <div className="space-y-3">
              {proximosCambios.length === 0 && (
                <p className="text-gray-500 text-sm">No hay cambios próximos</p>
              )}
              {proximosCambios.map(c => {
                const fecha = formatFechaLargaConDia(c.fecha);
                return (
                  <div key={c.id} className="flex items-center gap-3 group cursor-pointer">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${c.estado === 'APROBADO'
                        ? 'bg-green-500/20'
                        : c.estado === 'PENDIENTE'
                          ? 'bg-amber-500/20'
                          : 'bg-gray-700'
                        }`}
                    >
                      {c.estado === 'APROBADO' ? (
                        <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
                      ) : (
                        <RefreshCw className="w-5 h-5 text-amber-400" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {fecha} <span className="text-gray-400">-</span> 🕐 {c.turno}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Turnos disponibles ── */}
          <Link href="/dashboard/cambios?tab=ofertas-disponibles">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">En oferta</p>
                  <p className="text-3xl font-bold text-blue-400 mt-1">{ofertasDisponibles.length}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Turnos disponibles</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
          </Link>

          {/* ── Solicitudes stats ── */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Solicitudes
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <span className="text-2xl font-bold text-green-500 dark:text-green-400">
                  {statsReales.aprobados}
                </span>
                <span className="text-xs text-green-500 dark:text-green-400/70 text-center leading-tight">
                  Aprobadas
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-2xl font-bold text-amber-400">{statsReales.pendientes}</span>
                <span className="text-xs text-amber-400/70 text-center leading-tight">Pendientes</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <span className="text-2xl font-bold text-red-400">{statsReales.rechazados}</span>
                <span className="text-xs text-red-400/70 text-center leading-tight">Rechazadas</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Rendimiento del mes ── */}
      <div className="mt-6 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wide">
              Rendimiento del mes
            </p>
            <p className="text-white text-lg font-bold mt-1">
              {porcentajeCubierto >= 95
                ? 'Excelente trabajo'
                : porcentajeCubierto >= 85
                  ? 'Buen trabajo'
                  : 'Mejorá tu asistencia'}
            </p>
            <p className="text-blue-200 text-xs mt-1">
              {guardiasTrabajadas} de {misGuardiasReales} turnos cubiertos
            </p>
          </div>
          <div className="p-3 bg-white/10 rounded-xl">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      {/* ── Popup personas por horario ── */}
      {popupHorario && (() => {
        const BADGE_P: Record<string, { label: string; cls: string }> = {
          PRESENTE: { label: 'Presente', cls: 'bg-green-500/10 text-green-500 dark:text-green-400 border-green-500/20' },
          AUSENTE: { label: 'Ausente', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
          LICENCIA: { label: 'En licencia', cls: 'bg-orange-400/10 text-orange-400 border-orange-400/20' },
          SANCIONADO: { label: 'Sancionado', cls: 'bg-red-950/20 text-red-600 dark:text-red-500 border-red-900/30' },
        };
        const inspHorario = inspectoresDeHoy.filter(i =>
          (i.horario || 'Sin horario') === popupHorario.horario &&
          (popupHorario.filtro ? i.estado === popupHorario.filtro : true)
        );
        const q = busquedaPopup.toLowerCase().trim();
        const filtrados = q
          ? inspHorario.filter(i => `${i.nombre} ${i.apellido}`.toLowerCase().includes(q))
          : inspHorario;
        const totalPags = Math.ceil(filtrados.length / POPUP_POR_PAGINA);
        const pag = Math.min(paginaPopup, Math.max(1, totalPags));
        const pagina = filtrados.slice((pag - 1) * POPUP_POR_PAGINA, pag * POPUP_POR_PAGINA);
        const estadoLabel = popupHorario.filtro
          ? BADGE_P[popupHorario.filtro]?.label
          : 'Todos';

        return (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={cerrarPopup}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Panel */}
            <div
              className="relative z-10 w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    🕐 {popupHorario.horario}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {estadoLabel}
                    <span className="ml-1.5 text-xs font-normal text-gray-400">({filtrados.length})</span>
                  </p>
                </div>
                <button
                  onClick={cerrarPopup}
                  className="ml-3 flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Buscador compacto */}
              <div className="px-3 pt-3 pb-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={busquedaPopup}
                    onChange={e => { setBusquedaPopup(e.target.value); setPaginaPopup(1); }}
                    className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                  />
                  {busquedaPopup && (
                    <button
                      onClick={() => { setBusquedaPopup(''); setPaginaPopup(1); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista */}
              <div className="px-3 pb-2 space-y-1 max-h-64 overflow-y-auto">
                {pagina.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Sin resultados</p>
                ) : pagina.map(inspector => {
                  const badge = BADGE_P[inspector.estado];
                  return (
                    <div
                      key={inspector.id}
                      className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400">
                            {inspector.nombre[0]}{inspector.apellido[0]}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-gray-900 dark:text-white truncate">
                          {inspector.nombre} {inspector.apellido}
                        </span>
                      </div>
                      <span className={`flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Paginación compacta */}
              {!q && totalPags > 1 && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs text-gray-400">
                    {(pag - 1) * POPUP_POR_PAGINA + 1}–{Math.min(pag * POPUP_POR_PAGINA, filtrados.length)} / {filtrados.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPaginaPopup(p => Math.max(1, p - 1))}
                      disabled={pag === 1}
                      className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >←</button>
                    <span className="text-xs text-gray-500 px-1">{pag}/{totalPags}</span>
                    <button
                      onClick={() => setPaginaPopup(p => Math.min(totalPags, p + 1))}
                      disabled={pag === totalPags}
                      className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >→</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
}