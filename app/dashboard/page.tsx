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


export default function DashboardHome() {
  const userName = 'Emanuel';

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

  // Calcular porcentaje cubierto
  const porcentajeCubierto = (() => {
    if (!turnosData || turnosData.misGuardias === 0) return 0;
    return Math.round((turnosData.guardiasCubiertas / turnosData.misGuardias) * 100);
  })();

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('es-ES', { month: 'short' });
    return { day, month };
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
  if (loadingCambios || loadingStats || loadingTurnos) {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Bienvenido, {userName}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Aquí está el resumen de tu actividad en WorkShift</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nuevo Cambio
        </button>
      </div>

      {/* Formulario de creación */}
      {showCreateForm && (
        <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Crear nuevo cambio</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fecha
              </label>
              <input
                type="date"
                required
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Turno
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Nocturno - Inspector Gadget"
                value={formData.turno}
                onChange={(e) => setFormData({ ...formData, turno: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Solicitante
              </label>
              <input
                type="text"
                required
                placeholder="Nombre del solicitante"
                value={formData.solicitante}
                onChange={(e) => setFormData({ ...formData, solicitante: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destinatario
              </label>
              <input
                type="text"
                required
                placeholder="Nombre del destinatario"
                value={formData.destinatario}
                onChange={(e) => setFormData({ ...formData, destinatario: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg transition-colors"
              />
            </div>

            <div className="md:col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Crear Cambio
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Turnos en Oferta */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">En oferta</span>
          </div>
          <p className="text-3xl font-bold text-blue-400 dark:text-blue-400">{stats?.turnosOferta || 0}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Turnos disponibles</p>
        </div>

        {/* Aprobados */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <span className="text-sm text-gray-500">Este mes</span>
          </div>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats?.aprobados || 0}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Solicitudes aprobadas</p>
        </div>

        {/* Pendientes */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
            <span className="text-sm text-gray-500">Esperando</span>
          </div>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats?.pendientes || 0}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Solicitudes pendientes</p>
        </div>

        {/* Rechazados */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <span className="text-sm text-gray-500">Este mes</span>
          </div>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats?.rechazados || 0}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Solicitudes rechazadas</p>
        </div>
      </div>

      {/* Sección Principal: Gráfico y Próximos Cambios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Circular - Turnos Cubiertos */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Turnos cubiertos del mes</h2>

          {/* SVG Circular Chart */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="20"
                />
                {/* Progress circle */}
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
                <div className="text-center">
                  <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">{porcentajeCubierto}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Leyenda */}
          {turnosData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-sky-400"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Mis Guardias</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{turnosData.misGuardias}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Guardias Cubiertas</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{turnosData.guardiasCubiertas}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Guardias que me cubrieron</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{turnosData.guardiasQueMeCubrieron}</span>
              </div>
            </div>
          )}
        </div>

        {/* Próximos Cambios */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
              Próximos cambios
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {cambios?.length || 0} cambios
            </span>
          </div>

          <div className="space-y-3">
            {cambios && [...cambios]
              .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
              .map((cambio: TipoCambio) => {
                const { day, month } = formatDate(cambio.fecha);
                return (
                  <div
                    key={cambio.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                  >
                    {/* Fecha */}
                    <div className="flex flex-col items-center justify-center bg-blue-600 text-white rounded-lg p-2 sm:p-3 min-w-[50px] sm:min-w-[60px] flex-shrink-0">
                      <span className="text-xl sm:text-2xl font-bold">{day}</span>
                      <span className="text-xs uppercase">{month}</span>
                    </div>

                    {/* Información del turno */}
                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm sm:text-base">
                        {cambio.turno}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                        {cambio.solicitante} → {cambio.destinatario}
                      </p>
                    </div>

                    {/* Estado y acciones */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getEstadoColor(cambio.estado)}`}>
                        {cambio.estado}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>

          {cambios && cambios.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 text-sm sm:text-base">No hay cambios próximos</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Crear el primer cambio
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sección de Estadísticas Rápidas */}
      {turnosData && (
        <div className="mt-6 bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-lg shadow-sm text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Rendimiento del mes</p>
              <p className="text-2xl font-bold mt-1">Excelente trabajo</p>
              <p className="text-blue-100 text-sm mt-1">
                Has cubierto {turnosData.guardiasCubiertas} turnos y te han cubierto {turnosData.guardiasQueMeCubrieron}
              </p>
            </div>
            <div className="p-4 bg-white/10 rounded-lg">
              <TrendingUp className="h-8 w-8" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}