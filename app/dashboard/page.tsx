'use client';

import { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  AlertCircle,
  X,
} from 'lucide-react';
import { useCambios } from '@/hooks/useCambios';
import { useTurnosData } from '@/hooks/useTurnosData';
import { Cambio as TipoCambio } from '../api/types';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import DashInspector from '@/app/components/dashboard/DashInspector';
import DashJefe from '@/app/components/dashboard/DashJefe';
import { useTodasLasFaltas } from '@/hooks/useFaltas';
import { calcularDiasTrabajoEnRango } from '@/app/lib/turnosUtils';
import { useOfertas } from '@/hooks/useOfertas';
import { useSolicitudesDirectas } from '@/hooks/useSolicitudesDirectas';
import CalendarioTurnos from '@/app/components/CalendarioTurnos';
import DashboardSupervisor from '../components/dashboard/Dashsupervisor';


type SolicitudDirectaEstado = 'SOLICITADO' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO';

export default function DashboardHome() {
  const { user, isLoading: authLoading } = useAuth();

    if (user?.rol === 'INSPECTOR') {
    return <DashInspector />;
  }

    if (user?.rol === 'SUPERVISOR') {
    return <DashboardSupervisor />;
  }

  const { cambios, isLoading: loadingCambios, error: errorCambios } = useCambios();
  const { turnosData, isLoading: loadingTurnos, error: errorTurnos } = useTurnosData();
  const { faltas, isLoading: loadingFaltas } = useTodasLasFaltas();
  const { ofertas, isLoading: loadingOfertas } = useOfertas();
  const { solicitudes, isLoading: loadingSolicitudes } = useSolicitudesDirectas();

  const [cambioSeleccionado, setCambioSeleccionado] = useState<TipoCambio | null>(null);
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const ITEMS_HISTORIAL = 5;

  const hoy = new Date().toISOString().split('T')[0];

  const proximos = useMemo(() =>
    cambios?.filter(c => c.fecha >= hoy)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()) || []
    , [cambios]);

  const historial = useMemo(() =>
    cambios?.filter(c => c.fecha < hoy)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()) || []
    , [cambios]);

  const totalPaginasHistorial = useMemo(() => Math.ceil(historial.length / ITEMS_HISTORIAL), [historial]);

  const historialPaginado = useMemo(() =>
    historial.slice((paginaHistorial - 1) * ITEMS_HISTORIAL, paginaHistorial * ITEMS_HISTORIAL)
    , [historial, paginaHistorial]);

  const monthInfo = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return {
      year,
      month,
      firstDay: `${year}-${String(month + 1).padStart(2, '0')}-01`,
      lastDayStr: new Date(year, month + 1, 0).toISOString().split('T')[0],
    };
  }, []);

  const misGuardiasReales = useMemo(() => {
    if (!user) return 0;
    return calcularDiasTrabajoEnRango(monthInfo.firstDay, monthInfo.lastDayStr, user.grupoTurno);
  }, [user, monthInfo]);

  const faltasDelMes = useMemo(() => {
    if (!user || !faltas) return 0;
    const hoyDate = new Date();
    hoyDate.setHours(0, 0, 0, 0);
    return faltas.filter(falta => {
      const fechaFalta = new Date(falta.fecha);
      return (
        falta.empleadoId === user.id &&
        fechaFalta.getFullYear() === monthInfo.year &&
        fechaFalta.getMonth() === monthInfo.month &&
        fechaFalta <= hoyDate
      );
    }).length;
  }, [user, faltas, monthInfo]);

  const guardiasTrabajadas = useMemo(() => {
    if (!user) return 0;
    const hoyDate = new Date();
    hoyDate.setHours(0, 0, 0, 0);
    const diasDebioTrabajarHastaHoy = calcularDiasTrabajoEnRango(
      monthInfo.firstDay,
      hoyDate > new Date(monthInfo.lastDayStr) ? monthInfo.lastDayStr : hoyDate.toISOString().split('T')[0],
      user.grupoTurno
    );
    return Math.max(0, diasDebioTrabajarHastaHoy - faltasDelMes);
  }, [user, monthInfo, faltasDelMes]);

  const porcentajeCubierto = useMemo(() => {
    if (misGuardiasReales === 0) return 0;
    return Math.round((guardiasTrabajadas / misGuardiasReales) * 100);
  }, [guardiasTrabajadas, misGuardiasReales]);

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('es-ES', { month: 'short' }),
    };
  };

  const formatDateLong = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getEstadoColor = (estado: string) => {
    const colors: Record<string, string> = {
      PENDIENTE: 'bg-yellow-100 text-yellow-800',
      APROBADO: 'bg-green-100 text-green-800',
      RECHAZADO: 'bg-red-100 text-red-800',
      REALIZADO: 'bg-blue-100 text-blue-800',
    };
    return colors[estado] || 'bg-gray-100 text-gray-800';
  };

  const statsReales = useMemo(() => {
    const turnosDisponibles = ofertas?.filter(
      o => o.estado === 'DISPONIBLE' && o.ofertante?.rol === user?.rol
    ).length || 0;

    const aprobadosDelMes = solicitudes?.filter(sol => {
      const fechaSol = new Date(sol.fechaSolicitud);
      const estado = sol.estado as SolicitudDirectaEstado;
      const involucraAlUsuario = sol.solicitante.id === user?.id || sol.destinatario.id === user?.id;
      return involucraAlUsuario && estado === 'APROBADO' &&
        fechaSol.getFullYear() === monthInfo.year && fechaSol.getMonth() === monthInfo.month;
    }).length || 0;

    const pendientesParaMi = solicitudes?.filter(sol => {
      const estado = String(sol.estado).toUpperCase();
      return sol.solicitante.id === user?.id && (estado === 'SOLICITADO' || estado === 'PENDIENTE');
    }).length || 0;

    const rechazadosDelMes = solicitudes?.filter(sol => {
      const fechaSol = new Date(sol.fechaSolicitud);
      const estado = sol.estado as SolicitudDirectaEstado;
      return sol.solicitante.id === user?.id &&
        (estado === 'RECHAZADO' || estado === 'CANCELADO') &&
        fechaSol.getFullYear() === monthInfo.year && fechaSol.getMonth() === monthInfo.month;
    }).length || 0;

    return { turnosOferta: turnosDisponibles, aprobados: aprobadosDelMes, pendientes: pendientesParaMi, rechazados: rechazadosDelMes };
  }, [ofertas, solicitudes, user, monthInfo]);

  const userRol = user?.rol as string | undefined;

  if (userRol === 'INSPECTOR')                           return <DashInspector />;
  if (userRol === 'JEFE' || userRol === 'ADMINISTRADOR') return <DashJefe />;
  if (userRol === 'SUPERVISOR')                          return <DashboardSupervisor />;

  if (loadingCambios || loadingTurnos || loadingFaltas || loadingOfertas || loadingSolicitudes) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <LoadingSpinner />
        <p className="text-gray-600 dark:text-gray-400">Cargando dashboard...</p>
      </div>
    );
  }

  if (errorCambios || errorTurnos) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar datos</h2>
          <p className="text-gray-600 mb-4">No se pudo conectar con el servidor.</p>
        </div>
      </div>
    );
  }

  const CambioCard = ({ cambio, pasado = false }: { cambio: TipoCambio; pasado?: boolean }) => {
    const { day, month } = formatDate(cambio.fecha);
    return (
      <button
        onClick={() => setCambioSeleccionado(cambio)}
        className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-left"
      >
        <div className={`flex flex-col items-center justify-center text-white rounded-lg p-2 min-w-[50px] flex-shrink-0 ${pasado ? 'bg-gray-500' : 'bg-blue-600'}`}>
          <span className="text-xl font-bold">{day}</span>
          <span className="text-xs uppercase">{month}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">{cambio.turno}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {cambio.solicitante.nombre} {cambio.solicitante.apellido}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getEstadoColor(cambio.estado)}`}>
          {cambio.estado}
        </span>
      </button>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Bienvenid@, {user?.nombre} {user?.apellido}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Aquí está el resumen de tu actividad en WorkShift</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">En oferta</span>
          </div>
          <p className="text-3xl font-bold text-blue-400">{statsReales.turnosOferta}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Turnos disponibles</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <span className="text-sm text-gray-500">Este mes</span>
          </div>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{statsReales.aprobados}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Solicitudes aprobadas</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
            <span className="text-sm text-gray-500">Para ti</span>
          </div>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{statsReales.pendientes}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Solicitudes pendientes</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <span className="text-sm text-gray-500">Este mes</span>
          </div>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{statsReales.rechazados}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Solicitudes rechazadas</p>
        </div>
      </div>

      {/* Sección Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Circular */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Turnos cubiertos del mes</h2>
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" strokeWidth="20" />
                <circle cx="100" cy="100" r="80" fill="none" stroke="#3b82f6" strokeWidth="20"
                  strokeDasharray={`${porcentajeCubierto * 5.024} 502.4`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">{porcentajeCubierto}%</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { color: 'bg-sky-400', label: 'Guardias del mes', value: misGuardiasReales },
              { color: 'bg-blue-600', label: 'Trabajadas (hasta hoy)', value: guardiasTrabajadas },
              { color: 'bg-gray-600', label: 'Me cubrieron', value: turnosData?.guardiasQueMeCubrieron || 0 },
              { color: 'bg-red-500', label: 'Faltas (hasta hoy)', value: faltasDelMes },
            ].map(({ color, label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Calendario */}
        <div className="lg:col-span-1">
          <CalendarioTurnos />
        </div>

        {/* Próximos Cambios */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">Próximos cambios</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">{proximos.length} cambios</span>
          </div>
          <div className="space-y-3">
            {proximos.map(cambio => <CambioCard key={cambio.id} cambio={cambio} />)}
          </div>
          {proximos.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 text-sm">No hay cambios próximos</p>
            </div>
          )}
        </div>
      </div>

      {/* Rendimiento del mes */}
      <div className="mt-6 bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-lg shadow-sm text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Rendimiento del mes</p>
            <p className="text-2xl font-bold mt-1">
              {porcentajeCubierto >= 95 ? 'Excelente trabajo' : porcentajeCubierto >= 85 ? 'Buen trabajo' : 'Mejorá tu asistencia'}
            </p>
            <p className="text-blue-100 text-sm mt-1">
              Has trabajado {guardiasTrabajadas} de {misGuardiasReales} turnos
              {turnosData && turnosData.guardiasQueMeCubrieron > 0 && ` y te cubrieron ${turnosData.guardiasQueMeCubrieron}`}
            </p>
          </div>
          <div className="p-4 bg-white/10 rounded-lg">
            <TrendingUp className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Historial de cambios */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Historial de cambios</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">{historial.length} cambios</span>
        </div>
        <div className="p-4 space-y-2">
          {historial.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 text-sm">No hay cambios realizados</p>
            </div>
          ) : (
            <>
              {historialPaginado.map(cambio => <CambioCard key={cambio.id} cambio={cambio} pasado />)}
              {totalPaginasHistorial > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setPaginaHistorial(p => Math.max(1, p - 1))}
                    disabled={paginaHistorial === 1}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {paginaHistorial} / {totalPaginasHistorial}
                  </span>
                  <button
                    onClick={() => setPaginaHistorial(p => Math.min(totalPaginasHistorial, p + 1))}
                    disabled={paginaHistorial === totalPaginasHistorial}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Detalle Cambio */}
      {cambioSeleccionado && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Detalle del cambio</h2>
              <button onClick={() => setCambioSeleccionado(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Fecha y horario */}
              <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex flex-col items-center justify-center bg-blue-600 text-white rounded-lg p-3 min-w-[60px]">
                  <span className="text-2xl font-bold">{formatDate(cambioSeleccionado.fecha).day}</span>
                  <span className="text-xs uppercase">{formatDate(cambioSeleccionado.fecha).month}</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Fecha del cambio</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{formatDateLong(cambioSeleccionado.fecha)}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{cambioSeleccionado.turno}</p>
                </div>
              </div>

              {/* Estado */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Estado</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getEstadoColor(cambioSeleccionado.estado)}`}>
                  {cambioSeleccionado.estado}
                </span>
              </div>

              {/* Tipo */}
              {cambioSeleccionado.tipoCambio && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Tipo</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{cambioSeleccionado.tipoCambio}</span>
                </div>
              )}

              {/* Participantes */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Participantes</p>
                </div>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-bold flex-shrink-0">
                    {cambioSeleccionado.solicitante.nombre[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {cambioSeleccionado.solicitante.nombre} {cambioSeleccionado.solicitante.apellido}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Solicitante</p>
                  </div>
                </div>
                {cambioSeleccionado.destinatario && (
                  <div className="px-4 py-3 flex items-center gap-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400 text-sm font-bold flex-shrink-0">
                      {cambioSeleccionado.destinatario.nombre[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {cambioSeleccionado.destinatario.nombre} {cambioSeleccionado.destinatario.apellido}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Destinatario</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Fecha de aprobación */}
              {cambioSeleccionado.fechaAprobacion && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Aprobado el</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {new Date(cambioSeleccionado.fechaAprobacion).toLocaleDateString('es-ES', {
                      day: 'numeric', month: 'long', year: 'numeric',
                      timeZone: 'America/Argentina/Buenos_Aires'
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setCambioSeleccionado(null)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}