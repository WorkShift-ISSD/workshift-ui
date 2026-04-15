'use client';

import { useState } from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Edit,
  Check,
  X as XIcon
} from 'lucide-react';
import { useCambios } from '@/hooks/useCambios';
import { useStats } from '@/hooks/useStats';
import { useTurnosData } from '@/hooks/useTurnosData';
import { Cambio as TipoCambio } from '../api/types';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useTodasLasFaltas } from '@/hooks/useFaltas';
import { calcularDiasTrabajoEnRango } from '@/app/lib/turnosUtils';
import { useMemo, useEffect } from 'react';
import { useOfertas } from '@/hooks/useOfertas';
import { useSolicitudesDirectas } from '@/hooks/useSolicitudesDirectas';
import CalendarioTurnos from '@/app/components/CalendarioTurnos';


export default function DashboardHome() {
  const { user } = useAuth();

  // Hooks SWR
  const {
    cambios,
    isLoading: loadingCambios,
    error: errorCambios,
    createCambio,
    updateCambio,
    deleteCambio
  } = useCambios();

  const { stats, isLoading: loadingStats, error: errorStats } = useStats();
  const { turnosData, isLoading: loadingTurnos, error: errorTurnos } = useTurnosData();

  const { faltas, isLoading: loadingFaltas } = useTodasLasFaltas();

  const { ofertas, isLoading: loadingOfertas } = useOfertas();
  const { solicitudes, isLoading: loadingSolicitudes } = useSolicitudesDirectas();

  // Estados para crear nuevo cambio
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fecha: '',
    turno: '',
    solicitante: '',
    destinatario: '',
    estado: 'PENDIENTE' as 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'
  });

  // Información del mes actual
  const monthInfo = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11

    return {
      year: year,
      month: month,
      firstDay: `${year}-${String(month + 1).padStart(2, '0')}-01`,
      lastDayStr: new Date(year, month + 1, 0).toISOString().split('T')[0],
    };
  }, []);

  // Calcular turnos reales basados en presentismo
  const misGuardiasReales = useMemo(() => {
    if (!user) return 0;

    // Días que debía trabajar según su grupo A/B
    return calcularDiasTrabajoEnRango(
      monthInfo.firstDay,
      monthInfo.lastDayStr,
      user.grupoTurno
    );
  }, [user, monthInfo]);

  // Calcular faltas del mes hasta hoy (separado para reutilizar)
  const faltasDelMes = useMemo(() => {
    if (!user || !faltas) return 0;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return faltas.filter(falta => {
      const fechaFalta = new Date(falta.fecha);
      return (
        falta.empleadoId === user.id &&
        fechaFalta.getFullYear() === monthInfo.year &&
        fechaFalta.getMonth() === monthInfo.month &&
        fechaFalta <= hoy
      );
    }).length;
  }, [user, faltas, monthInfo]);

  // Calcular turnos trabajados (días sin faltas, solo hasta hoy)
  const guardiasTrabajadas = useMemo(() => {
    if (!user) return 0;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Calcular cuántos días debía trabajar HASTA HOY (no todo el mes)
    const diasDebioTrabajarHastaHoy = calcularDiasTrabajoEnRango(
      monthInfo.firstDay,
      hoy > new Date(monthInfo.lastDayStr) ? monthInfo.lastDayStr : hoy.toISOString().split('T')[0],
      user.grupoTurno
    );

    // Días trabajados = días que debía trabajar hasta hoy - faltas
    return Math.max(0, diasDebioTrabajarHastaHoy - faltasDelMes);
  }, [user, monthInfo, faltasDelMes]);

  // Calcular porcentaje cubierto
  const porcentajeCubierto = useMemo(() => {
    if (misGuardiasReales === 0) return 0;
    return Math.round((guardiasTrabajadas / misGuardiasReales) * 100);
  }, [guardiasTrabajadas, misGuardiasReales]);

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const dayNum = date.getDate();
    const month2 = date.toLocaleDateString('es-ES', { month: 'short' });
    return { day: dayNum, month: month2 };
  };

  // Función para obtener color según estado
  const getEstadoColor = (estado: string) => {
    const colors = {
      PENDIENTE: 'bg-yellow-100 text-yellow-800',
      APROBADO: 'bg-green-100 text-green-800',
      RECHAZADO: 'bg-red-100 text-red-800'
    };
    return colors[estado as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Estadísticas reales basadas en ofertas y solicitudes
  type SolicitudDirectaEstado = 'SOLICITADO' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO';

  const statsReales = useMemo(() => {

    const turnosDisponibles = ofertas?.filter(
      o => o.estado === 'DISPONIBLE' && o.ofertante?.rol === user?.rol
    ).length || 0;

    // Aprobadas donde el usuario es solicitante O destinatario
    const aprobadosDelMes = solicitudes?.filter(sol => {
      const fechaSol = new Date(sol.fechaSolicitud);
      const estado = sol.estado as SolicitudDirectaEstado;
      const involucraAlUsuario =
        sol.solicitante.id === user?.id || sol.destinatario.id === user?.id;
      return (
        involucraAlUsuario &&
        estado === 'APROBADO' &&
        fechaSol.getFullYear() === monthInfo.year &&
        fechaSol.getMonth() === monthInfo.month
      );
    }).length || 0;

    // Pendientes de autorización del jefe donde el usuario es solicitante
    const pendientesParaMi = solicitudes?.filter(sol => {
      const estado = String(sol.estado).toUpperCase();
      const esSolicitante = sol.solicitante.id === user?.id;
      const esSolicitado = estado === 'SOLICITADO' || estado === 'PENDIENTE';
      return esSolicitante && esSolicitado;
    }).length || 0;

    // Rechazadas donde el usuario es solicitante
    const rechazadosDelMes = solicitudes?.filter(sol => {
      const fechaSol = new Date(sol.fechaSolicitud);
      const estado = sol.estado as SolicitudDirectaEstado;
      return (
        sol.solicitante.id === user?.id && // ya estaba correcto
        (estado === 'RECHAZADO' || estado === 'CANCELADO') &&
        fechaSol.getFullYear() === monthInfo.year &&
        fechaSol.getMonth() === monthInfo.month
      );
    }).length || 0;

    return {
      turnosOferta: turnosDisponibles,
      aprobados: aprobadosDelMes,
      pendientes: pendientesParaMi,
      rechazados: rechazadosDelMes,
    };
  }, [ofertas, solicitudes, user, monthInfo]);

  useEffect(() => {


    if (solicitudes) {

      // Ver específicamente las rechazadas
      const rechazadas = solicitudes.filter(sol => {
        const estado = sol.estado as SolicitudDirectaEstado;
        return estado === 'RECHAZADO';
      });


      // Ver las del mes
      const rechazadasDelMes = solicitudes.filter(sol => {
        const fechaSol = new Date(sol.fechaSolicitud);
        const estado = sol.estado as SolicitudDirectaEstado;

        return (
          estado === 'RECHAZADO' &&
          fechaSol.getFullYear() === monthInfo.year &&
          fechaSol.getMonth() === monthInfo.month
        );
      });

    }
  }, [solicitudes, monthInfo]);

  // Manejar creación de cambio
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createCambio(formData);

      // Resetear formulario
      setFormData({
        fecha: '',
        turno: '',
        solicitante: '',
        destinatario: '',
        estado: 'PENDIENTE'
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creando cambio:', error);
      alert('Error al crear el cambio');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar actualización de estado
  const handleUpdateEstado = async (id: string, nuevoEstado: 'APROBADO' | 'RECHAZADO') => {
    try {
      await updateCambio(id, { estado: nuevoEstado });
    } catch (error) {
      console.error('Error actualizando cambio:', error);
      alert('Error al actualizar el cambio');
    }
  };

  // Manejar eliminación
  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cambio?')) return;

    try {
      await deleteCambio(id);
    } catch (error) {
      console.error('Error eliminando cambio:', error);
      alert('Error al eliminar el cambio');
    }
  };

  // Componente de loading
  if (loadingCambios || loadingStats || loadingTurnos || loadingFaltas || loadingOfertas || loadingSolicitudes) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <LoadingSpinner />
        <p className="text-gray-600 dark:text-gray-400">Cargando dashboard...</p>
      </div>
    );
  }

  // Manejo de errores
  if (errorCambios || errorStats || errorTurnos) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar datos</h2>
          <p className="text-gray-600 mb-4">
            No se pudo conectar con el servidor. Asegúrate de que la base de datos esté configurada.
          </p>
          <code className="text-sm bg-gray-100 px-3 py-1 rounded block">
            Verifica POSTGRES_URL en .env.local
          </code>
        </div>
      </div>
    );
  }

  return (

    <div className="p-6 max-w-7xl mx-auto">
      {/* Header de Bienvenida */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Bienvenid@, {user?.nombre} {user?.apellido}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Aquí está el resumen de tu actividad en WorkShift</p>
        </div>
        {/* <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nuevo Cambio
        </button> */}
      </div>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ================= IZQUIERDA (2/3) ================= */}
        <div className="xl:col-span-2 space-y-6">

          {/* ===== FILA 1: Mi Semana + Calendario ===== */}
          <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow border space-y-6">

            {/* Mi Semana */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Mi Semana</h2>
              <div className="grid grid-cols-5 gap-2 text-center text-sm">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab', 'Dom'].map((d, i) => (
                  <div key={i} className="p-2 rounded bg-gray-100 dark:bg-gray-700">
                    {d}
                  </div>
                ))}
              </div>
            </div>

            {/* Calendario */}
            <div className="max-w-[720px] mx-auto">
              <CalendarioTurnos />
            </div>

          </div>

          {/* ===== FILA 2: 2 columnas ===== */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* Mis Intercambios */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border">
              <h2 className="text-lg font-semibold mb-4">Mis intercambios</h2>

              {cambios?.slice(0, 3).map(c => (
                <div key={c.id} className="mb-3 text-sm">
                  <p className="font-medium">{c.turno}</p>
                  <p className="text-xs text-gray-500">{c.solicitante}</p>
                  <span className={`text-xs px-2 py-1 rounded ${getEstadoColor(c.estado)}`}>
                    {c.estado}
                  </span>
                </div>
              ))}
            </div>

            {/* Solicitudes */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border">
              <h2 className="text-lg font-semibold mb-4">Solicitudes</h2>

              {solicitudes?.slice(0, 2).map(s => (
                <div key={s.id} className="mb-3 text-sm">
                  {s.solicitante.nombre} quiere tu turno
                </div>
              ))}

              <div className="flex gap-2 mt-4">
                <button className="flex-1 bg-green-500 text-white py-1 rounded">
                  Aceptar
                </button>
                <button className="flex-1 bg-red-500 text-white py-1 rounded">
                  Rechazar
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* ================= DERECHA (1/3) ================= */}
        <div className="xl:col-span-1 space-y-6">

          {/* Turnos cubiertos */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Turnos cubiertos del mes
            </h2>

            {/* gráfico */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <svg width="180" height="180" viewBox="0 0 200 200" className="transform -rotate-90">
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" strokeWidth="20" />
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="20"
                    strokeDasharray={`${porcentajeCubierto * 5.024} 502.4`}
                    strokeLinecap="round"
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {porcentajeCubierto}%
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Guardias del mes</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{misGuardiasReales}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Trabajadas (hasta hoy)</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{guardiasTrabajadas}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Me cubrieron</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {turnosData?.guardiasQueMeCubrieron || 0}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Faltas (hasta hoy)</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{faltasDelMes}</span>
              </div>
            </div>
          </div>

          {/* Próximos cambios */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Próximos cambios
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {cambios?.length || 0} cambios
              </span>
            </div>

            <div className="space-y-3">
              {cambios && cambios.length > 0 ? (
                [...cambios]
                  .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                  .slice(0, 3)
                  .map((cambio: TipoCambio) => {
                    const { day, month } = formatDate(cambio.fecha);
                    return (
                      <div key={cambio.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <div className="bg-blue-600 text-white rounded-lg p-2 text-center min-w-[50px]">
                          <span className="text-lg font-bold">{day}</span>
                          <span className="text-xs uppercase">{month}</span>
                        </div>

                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {cambio.turno}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {cambio.solicitante}
                          </p>
                        </div>

                        <span className={`text-xs px-2 py-1 rounded ${getEstadoColor(cambio.estado)}`}>
                          {cambio.estado}
                        </span>
                      </div>
                    );
                  })
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No hay cambios próximos
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stats Cards (versión original adaptada) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Turnos en Oferta */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">En oferta</span>
              </div>

              <p className="text-2xl font-bold text-blue-400 dark:text-blue-400">
                {statsReales.turnosOferta}
              </p>

              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Turnos disponibles
              </p>
            </div>

            {/* Aprobados */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <span className="text-xs text-gray-500">Este mes</span>
              </div>

              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {statsReales.aprobados}
              </p>

              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Solicitudes aprobadas
              </p>
            </div>

            {/* Pendientes */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <span className="text-xs text-gray-500">Para ti</span>
              </div>

              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {statsReales.pendientes}
              </p>

              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Solicitudes pendientes
              </p>
            </div>

            {/* Rechazados */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <span className="text-xs text-gray-500">Este mes</span>
              </div>

              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {statsReales.rechazados}
              </p>

              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Solicitudes rechazadas
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* Sección de Estadísticas Rápidas */}
      <div className="mt-6 bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-xl shadow-sm text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Rendimiento del mes</p>

            <p className="text-2xl font-bold mt-1">
              {porcentajeCubierto >= 95 ? 'Excelente trabajo' :
                porcentajeCubierto >= 85 ? 'Buen trabajo' :
                  'Mejorá tu asistencia'}
            </p>

            <p className="text-blue-100 text-sm mt-1">
              Has trabajado {guardiasTrabajadas} de {misGuardiasReales} turnos
              {turnosData && turnosData.guardiasQueMeCubrieron > 0 &&
                ` y te cubrieron ${turnosData.guardiasQueMeCubrieron}`
              }
            </p>
          </div>

          <div className="p-4 bg-white/10 rounded-lg">
            <TrendingUp className="h-8 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
}