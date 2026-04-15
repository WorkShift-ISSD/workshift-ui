'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { useTodasLasFaltas } from '@/hooks/useFaltas';
import { useOfertas } from '@/hooks/useOfertas';
import { useSolicitudesDirectas } from '@/hooks/useSolicitudesDirectas';
import { useAuth } from '@/app/context/AuthContext';

import { calcularDiasTrabajoEnRango } from '@/app/lib/turnosUtils';
import CalendarioTurnos from '@/app/components/CalendarioTurnos';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';


export function Inspector() {
      const { user } = useAuth();

  if (!user) return null;


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
    <div className="min-h-screen bg-slate-900">
      {user.rol === 'INSPECTOR' && <Inspector />}
      {user.rol === 'SUPERVISOR' && <Supervisor />}
      {user.rol === 'JEFE' && <Jefe />}
    </div>
  );
}
