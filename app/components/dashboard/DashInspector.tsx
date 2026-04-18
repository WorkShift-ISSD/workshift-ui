'use client';

import { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Star,
} from 'lucide-react';
import { useCambios } from '@/hooks/useCambios';
import { useTurnosData } from '@/hooks/useTurnosData';
import { Cambio as TipoCambio } from '../../api/types';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useTodasLasFaltas } from '@/hooks/useFaltas';
import { calcularDiasTrabajoEnRango } from '@/app/lib/turnosUtils';
import { useCambiosPage } from '@/hooks/useCambiosPage';
import { useSolicitudesDirectas } from '@/hooks/useSolicitudesDirectas';
import CalendarioTurnos from '@/app/components/CalendarioTurnos';
import { useTurnosEfectivos } from '@/hooks/useTurnosEfectivos';
import { calcularGrupoTrabaja } from '@/app/lib/turnosUtils';
import { useFormatters } from '@/hooks/useFormatters';

type SolicitudDirectaEstado = 'SOLICITADO' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO';


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

function DayIcon({ type }: { type: 'worked' | 'exchange' | 'off' | 'covered' }) {
  if (type === 'worked') return <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />;
  if (type === 'exchange') return <RefreshCw className="w-4 h-4 text-amber-400" />;
  if (type === 'covered') return <RefreshCw className="w-4 h-4 text-orange-400" />;
  if (type === 'off') return null;
  return null;
}

// ── Componente principal ───────────────────────────────────────────────────

export default function DashboardHome() {
  const { user } = useAuth();

  const { cambios, isLoading: loadingCambios, error: errorCambios } = useCambios();
  const { turnosData, isLoading: loadingTurnos, error: errorTurnos } = useTurnosData();
  const { faltas, isLoading: loadingFaltas } = useTodasLasFaltas();
  const { ofertasDisponibles } = useCambiosPage();
  const { solicitudes, isLoading: loadingSolicitudes } = useSolicitudesDirectas();
  const { turnosEfectivos, fechasCedidas } = useTurnosEfectivos();
  const { formatFechaLargaConDia } = useFormatters();

  const hoy = new Date();
  const hoyYMD = toYMD(hoy);

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

  // ── Guardias / faltas ───────────────────────────────────────────────────
  const misGuardiasReales = useMemo(() => {
    if (!user) return 0;
    return calcularDiasTrabajoEnRango(monthInfo.firstDay, monthInfo.lastDayStr, user.grupoTurno);
  }, [user, monthInfo]);

  const faltasDelMes = useMemo(() => {
    if (!user || !faltas) return 0;
    const hoyDate = new Date(); hoyDate.setHours(0, 0, 0, 0);
    return faltas.filter(f => {
      const ff = new Date(f.fecha);
      return f.empleadoId === user.id &&
        ff.getFullYear() === monthInfo.year &&
        ff.getMonth() === monthInfo.month &&
        ff <= hoyDate;
    }).length;
  }, [user, faltas, monthInfo]);

  const guardiasTrabajadas = useMemo(() => {
    if (!user) return 0;
    const hoyDate = new Date(); hoyDate.setHours(0, 0, 0, 0);
    const hasta = hoyDate > new Date(monthInfo.lastDayStr) ? monthInfo.lastDayStr : toYMD(hoyDate);
    return Math.max(0, calcularDiasTrabajoEnRango(monthInfo.firstDay, hasta, user.grupoTurno) - faltasDelMes);
  }, [user, monthInfo, faltasDelMes]);

  const cubiertas = turnosData?.guardiasQueMeCubrieron || 0;

  const trabajadasPct = (guardiasTrabajadas / misGuardiasReales) * 100;
  const cubiertasPct = (cubiertas / misGuardiasReales) * 100;
  const faltasPct = (faltasDelMes / misGuardiasReales) * 100;

  const porcentajeCubierto = useMemo(() =>
    misGuardiasReales === 0 ? 0 : Math.round((guardiasTrabajadas / misGuardiasReales) * 100),
    [guardiasTrabajadas, misGuardiasReales]);


  function getDayStyles(type: 'worked' | 'exchange' | 'covered' | 'off' | 'future') {
    switch (type) {
      case 'worked':
        return 'bg-green-100 dark:bg-green-500/10 border-green-200 dark:border-green-500/20';
      case 'exchange':
        return 'bg-amber-100 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
      case 'covered':
        return 'bg-orange-100 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20';
      case 'off':
      case 'future':
        return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  }

  // ── Semana actual ────────────────────────────────────────────────────────
  const semanaActual = useMemo(() => {
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

      let tipo: 'worked' | 'exchange' | 'off' | 'future' | 'covered';
      if (esFuturo) {
        tipo = 'future';
      } else if (esCedido) {
        tipo = 'covered';
      } else if (esGanado) {
        tipo = 'exchange';
      } else if (trabaja) {
        tipo = 'worked';
      } else {
        tipo = 'off';
      }

      const horario = esGanado
        ? turnosEfectivos.find(t => t.fecha === ymd)?.horario_efectivo || user?.horario || ''
        : esCedido
          ? ''
          : trabaja
            ? user?.horario || ''
            : '';

      return { label, tipo, horario };
    });
  }, [hoy, hoyYMD, turnosEfectivos, fechasCedidas, user]);

  const trabajadosSemana = semanaActual.filter(d => d.tipo === 'worked' || d.tipo === 'exchange').length;
  const intercambiosSemana = semanaActual.filter(d => d.tipo === 'exchange').length;

  // ── Stats ────────────────────────────────────────────────────────────────

  const statsReales = useMemo(() => {
    const misSolicitudes = solicitudes?.filter(sol =>
      sol.solicitante.id === user?.id || sol.destinatario.id === user?.id
    ) || [];

    // Aprobadas = el jefe aprobó (COMPLETADO)
    const aprobados = misSolicitudes.filter(sol => {
      const f = new Date(sol.fechaSolicitud);
      return sol.estado === 'COMPLETADO' &&
        f.getFullYear() === monthInfo.year &&
        f.getMonth() === monthInfo.month;
    }).length;

    // Pendientes = empleados acordaron pero el jefe no aprobó aún
    const pendientes = misSolicitudes.filter(sol =>
      sol.estado === 'APROBADO'
    ).length;

    // Rechazadas = rechazadas o canceladas este mes
    const rechazados = misSolicitudes.filter(sol => {
      const f = new Date(sol.fechaSolicitud);
      const estado = sol.estado as string;
      return (estado === 'RECHAZADO' || estado === 'CANCELADO') &&
        f.getFullYear() === monthInfo.year &&
        f.getMonth() === monthInfo.month;
    }).length;

    return { aprobados, pendientes, rechazados };
  }, [solicitudes, user, monthInfo]);
  // ── Próximos cambios ─────────────────────────────────────────────────────
  const proximosCambios = useMemo(() =>
    (cambios || [])
      .filter(c => c.fecha >= hoyYMD)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(0, 3),
    [cambios, hoyYMD]);

  // ── Solicitudes pendientes para el usuario ───────────────────────────────
  const solicitudesPendientes = useMemo(() =>
    (solicitudes || []).filter(s => {
      const estado = String(s.estado).toUpperCase();
      return s.destinatario.id === user?.id && (estado === 'SOLICITADO' || estado === 'PENDIENTE');
    }).slice(0, 2),
    [solicitudes, user]);

  // ── Intercambios recientes ───────────────────────────────────────────────
  const misIntercambios = useMemo(() =>
    (cambios || []).slice(0, 3),
    [cambios]);

  const formatDayMonth = (ymd: string) => {
    const [, , d] = ymd.split('-');
    const date = new Date(ymd + 'T12:00:00');
    return {
      day: parseInt(d),
      weekday: date.toLocaleDateString('es-ES', { weekday: 'long' }),
    };
  };

  // ── Loading / Error ──────────────────────────────────────────────────────
  if (loadingCambios || loadingTurnos || loadingFaltas || loadingSolicitudes) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <LoadingSpinner />
        <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-3 text-sm">Cargando dashboard...</p>
      </div>
    );
  }

  if (errorCambios || errorTurnos) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 dark:text-gray-900 dark:text-white font-semibold">Error al cargar datos</p>
        </div>
      </div>
    );
  }

  // ── Donut SVG ────────────────────────────────────────────────────────────
  const RADIUS = 54;
  const CIRCUM = 2 * Math.PI * RADIUS;
  const dash = (porcentajeCubierto / 100) * CIRCUM;
  const dashTrabajadas = (trabajadasPct / 100) * CIRCUM;
  const dashCubiertas = (cubiertasPct / 100) * CIRCUM;
  const dashFaltas = (faltasPct / 100) * CIRCUM;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-grow flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors overflow-y-auto scrollbar-hides">

      {/* ── Header ── */}
      <div className="mb-6 flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Bienvenido {user?.nombre} {user?.apellido}
            <span className="flex items-center gap-1 text-amber-400 text-base font-semibold ml-1">
              <Star className="w-6 h-6 fill-amber-400" />
              4.6
            </span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400 text-sm mt-0.5 capitalize">{user?.rol?.toLowerCase()}</p>
        </div>
      </div>

      {/* ── Layout principal ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* ══════════════ COLUMNA IZQUIERDA (2/3) ══════════════ */}
        <div className="xl:col-span-2 space-y-4">

          {/* ── Card: Mi semana + Calendario ── */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">


            {/* Mi Semana */}
            <div className="grid grid-cols-7 gap-2 mb-3 p-4">
              {semanaActual.map(({ label, tipo, horario }) => (
                <div
                  key={label}
                  className={`flex flex-col items-center rounded-md overflow-hidden border ${getDayStyles(tipo)} transition hover:scale-105`}
                >
                  <div className="w-full h-6 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                      {label}{(tipo !== 'off' && tipo !== 'future') && horario ? ` · ${horario.split('-')[0]}` : ''}
                    </span>
                  </div>
                  <div className="w-full h-px bg-black/20" />
                  <div className="w-full h-8 flex items-center justify-center">
                    {(tipo !== 'off' && tipo !== 'future') && <DayIcon type={tipo} />}
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen semana */}
            <div className="flex items-center gap-4 mt-3 mb-5 text-sm">
              <span className="flex items-center gap-1.5 text-green-500 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="font-semibold">{trabajadosSemana} trabajados</span>
              </span>
              <span className="text-gray-500 dark:text-gray-400">•</span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <RefreshCw className="w-4 h-4" />
                <span className="font-semibold">{intercambiosSemana} intercambios</span>
              </span>
            </div>

            {/* Calendario */}
            <div className="border-t border-gray-800 pt-4">
              <CalendarioTurnos />
            </div>
          </div>

          {/* ── Fila: Mis intercambios + Solicitudes ── */}
          <div className="grid md:grid-cols-2 gap-4">

            {/* Mis intercambios */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Mis intercambios</h2>
              <div className="space-y-3">
                {misIntercambios.length === 0 && (
                  <p className="text-gray-500 text-sm">No hay intercambios recientes</p>
                )}
                {misIntercambios.map(c => (
                  <div key={c.id} className="flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.estado === 'APROBADO' ? 'bg-green-400' : c.estado === 'PENDIENTE' ? 'bg-amber-400' : 'bg-red-400'}`} />
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          Cambio con{' '}
                          <span className="text-blue-400">
                            {c.destinatario?.apellido || 'N/A'}
                          </span>
                        </p>
                        <p className={`text-xs mt-0.5 ${c.estado === 'APROBADO' ? 'text-green-500 dark:text-green-400' : c.estado === 'PENDIENTE' ? 'text-amber-400' : 'text-red-400'}`}>
                          — {c.estado === 'APROBADO' ? 'Aprobado' : c.estado === 'PENDIENTE' ? 'Pendiente' : 'Rechazado'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:text-gray-400 transition-colors" />
                  </div>
                ))}
              </div>
            </div>

            {/* Solicitudes */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                <span className="flex items-center gap-2">
                  Solicitudes
                  {solicitudesPendientes.length > 0 && (
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-gray-900 dark:text-white text-xs flex items-center justify-center font-bold">
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
                        <span className="font-semibold text-blue-400">{s.solicitante
                          ? `${s.solicitante.nombre} ${s.solicitante.apellido}`
                          : 'N/A'}</span>
                        {' '}quiere tu turno del{' '}
                        <span className="text-gray-300">
                          {formatFechaLargaConDia(s.turnoDestinatario.fecha)}
                        </span>
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

          {/* ── Turnos cubiertos (donut) ── */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Turnos cubiertos</h2>

            <div className="flex items-center justify-center mb-5">
              <div className="relative">

                {/* SVG (tu gráfico nuevo) */}
                <svg width="140" height="140" viewBox="0 0 140 140">
                  {/* Fondo total */}
                  <circle cx="70" cy="70" r={RADIUS} fill="none" className="stroke-blue-500 dark:stroke-blue-400" strokeWidth="14" />

                  {/* Trabajadas */}
                  <circle
                    cx="70"
                    cy="70"
                    r={RADIUS}
                    fill="none"
                    className="stroke-green-500 dark:stroke-green-400"
                    strokeWidth="14"
                    strokeDasharray={`${dashTrabajadas} ${CIRCUM}`}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                  />

                  {/* Cubiertas */}
                  {cubiertas > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r={RADIUS}
                      fill="none"
                      className="stroke-orange-500 dark:stroke-orange-400"
                      strokeWidth="14"
                      strokeDasharray={`${dashCubiertas} ${CIRCUM}`}
                      strokeDashoffset={-dashTrabajadas}
                      strokeLinecap="round"
                    />
                  )}

                  {/* Faltas */}
                  {faltasDelMes > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r={RADIUS}
                      fill="none"
                      className="stroke-red-500 dark:stroke-red-400"
                      strokeWidth="14"
                      strokeDasharray={`${dashFaltas} ${CIRCUM}`}
                      strokeDashoffset={-(dashTrabajadas + dashCubiertas)}
                      strokeLinecap="round"
                    />
                  )}
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {porcentajeCubierto}%
                  </span>
                </div>

              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Guardias del mes</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">{misGuardiasReales}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Trabajados (hasta hoy)</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">{guardiasTrabajadas}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                  <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Me cubrieron</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {turnosData?.guardiasQueMeCubrieron || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Faltas (hasta hoy)</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">{faltasDelMes}</span>
              </div>
            </div>
          </div>

          {/* ── Próximos cambios ── */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Próximos cambios</h2>
            <div className="space-y-3">
              {proximosCambios.length === 0 && (
                <p className="text-gray-500 text-sm">No hay cambios próximos</p>
              )}
              {proximosCambios.map(c => {
                const { weekday } = formatDayMonth(c.fecha);
                return (
                  <div key={c.id} className="flex items-center gap-3 group cursor-pointer">
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${c.estado === 'APROBADO' ? 'bg-green-500/20' :
                      c.estado === 'PENDIENTE' ? 'bg-amber-500/20' : 'bg-gray-700'
                      }`}>
                      {c.estado === 'APROBADO'
                        ? <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
                        : <RefreshCw className="w-5 h-5 text-amber-400" />
                      }
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{weekday}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 truncate">{c.turno}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:text-gray-400 transition-colors flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Turnos disponibles ── */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
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

          {/* ── Solicitudes stats ── */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Solicitudes</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <span className="text-2xl font-bold text-green-500 dark:text-green-400">{statsReales.aprobados}</span>
                <span className="text-xs text-green-500 dark:text-green-400/70 text-center leading-tight">Aprobadas</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-2xl font-bold text-amber-400">{statsReales.pendientes}</span>
                <span className="text-xs text-amber-400/70 text-center leading-tight">Pendientes</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <span className="text-2xl font-bold text-red-400">{statsReales.rechazados}</span>
                <span className="text-xs text-red-400/70 text-center leading-tight">Rechazada</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Rendimiento del mes ── */}
      <div className="mt-6 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wide">Rendimiento del mes</p>
            <p className="text-white text-lg font-bold mt-1">
              {porcentajeCubierto >= 95 ? 'Excelente trabajo' :
                porcentajeCubierto >= 85 ? 'Buen trabajo' : 'Mejorá tu asistencia'}
            </p>
            <p className="text-blue-200 text-xs mt-1">
              {guardiasTrabajadas} de {misGuardiasReales} turnos cubiertos
            </p>
          </div>
          <div className="p-3 bg-white/10 rounded-xl">
            <TrendingUp className="h-6 w-6 text-gray-900 dark:text-white" />
          </div>
        </div>
      </div>
    </div >
  );
}
