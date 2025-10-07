
'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Users,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface Cambio {
  id: string;
  fecha: string;
  turno: string;
  solicitante: string;
  destinatario: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
}

// Mock data para próximos cambios
const mockCambios: Cambio[] = [
  {
    id: '1',
    fecha: '2025-10-10',
    turno: 'Nocturno - Inspector Gadget',
    solicitante: 'Juan García',
    destinatario: 'María López',
    estado: 'PENDIENTE'
  },
  {
    id: '2',
    fecha: '2025-10-08',
    turno: 'Tarde - Inspector Poirot',
    solicitante: 'Carlos Martínez',
    destinatario: 'Ana Rodríguez',
    estado: 'APROBADO'
  },
  {
    id: '3',
    fecha: '2025-10-12',
    turno: 'Mañana - Inspector Clouseau',
    solicitante: 'Luis González',
    destinatario: 'Patricia Hernández',
    estado: 'PENDIENTE'
  },
  {
    id: '4',
    fecha: '2025-10-15',
    turno: 'Nocturno - Inspector Morse',
    solicitante: 'Roberto Pérez',
    destinatario: 'Carmen Sánchez',
    estado: 'APROBADO'
  }
];

export default function DashboardHome() {
  const [userName] = useState('Emanuel');
  const [cambios] = useState<Cambio[]>(mockCambios);

  // Estadísticas mock
  const stats = {
    turnosOferta: 3,
    aprobados: 12,
    pendientes: 5,
    rechazados: 2
  };

  // Datos para el gráfico circular
  const turnosData = {
    misGuardias: 15,
    guardiasCubiertas: 8,
    guardiasQueMeCubrieron: 3,
    total: 26
  };

  const porcentajeCubierto = Math.round((turnosData.guardiasCubiertas / turnosData.total) * 100);

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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header de Bienvenida */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bienvenido, {userName}</h1>
        <p className="text-gray-600 mt-1">Aquí está el resumen de tu actividad en WorkShift</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Turnos en Oferta */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">En oferta</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.turnosOferta}</p>
          <p className="text-sm text-gray-600 mt-1">Turnos disponibles</p>
        </div>

        {/* Aprobados */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Este mes</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{stats.aprobados}</p>
          <p className="text-sm text-gray-600 mt-1">Solicitudes aprobadas</p>
        </div>

        {/* Pendientes */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <span className="text-sm text-gray-500">Esperando</span>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{stats.pendientes}</p>
          <p className="text-sm text-gray-600 mt-1">Solicitudes pendientes</p>
        </div>

        {/* Rechazados */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <span className="text-sm text-gray-500">Este mes</span>
          </div>
          <p className="text-3xl font-bold text-red-600">{stats.rechazados}</p>
          <p className="text-sm text-gray-600 mt-1">Solicitudes rechazadas</p>
        </div>
      </div>

      {/* Sección Principal: Gráfico y Próximos Cambios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Circular - Turnos Cubiertos */}
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Turnos cubiertos del mes</h2>
          
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
                  <p className="text-4xl font-bold text-gray-900">{porcentajeCubierto}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Leyenda */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-sky-400"></div>
                <span className="text-sm text-gray-600">Mis Guardias</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{turnosData.misGuardias}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                <span className="text-sm text-gray-600">Guardias Cubiertas</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{turnosData.guardiasCubiertas}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-800"></div>
                <span className="text-sm text-gray-600">Guardias que me cubrieron</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{turnosData.guardiasQueMeCubrieron}</span>
            </div>
          </div>
        </div>

        {/* Próximos Cambios */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Próximos cambios</h2>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            {cambios.map((cambio) => {
              const { day, month } = formatDate(cambio.fecha);
              return (
                <div 
                  key={cambio.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {/* Fecha */}
                  <div className="flex flex-col items-center justify-center bg-blue-600 text-white rounded-lg p-3 min-w-[60px]">
                    <span className="text-2xl font-bold">{day}</span>
                    <span className="text-xs uppercase">{month}</span>
                  </div>

                  {/* Información del turno */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{cambio.turno}</p>
                    <p className="text-sm text-gray-600 truncate">
                      {cambio.solicitante} → {cambio.destinatario}
                    </p>
                  </div>

                  {/* Estado */}
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getEstadoColor(cambio.estado)}`}>
                      {cambio.estado}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {cambios.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No hay cambios próximos</p>
            </div>
          )}
        </div>
      </div>

      {/* Sección de Estadísticas Rápidas (Opcional) */}
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
    </div>
  );
}
