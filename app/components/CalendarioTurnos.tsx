'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Ban } from 'lucide-react';
import { calcularGrupoTrabaja } from '../lib/turnosUtils';
import { useAuth } from '../context/AuthContext';
import { useTurnosEfectivos } from '@/hooks/useTurnosEfectivos';
import { useTodasLasFaltas } from '@/hooks/useFaltas';
import { useSanciones } from '@/hooks/useSanciones';
import { useLicencias } from '@/hooks/useLicencias';

export default function CalendarioTurnos() {
  const [mesActual, setMesActual] = useState(new Date().getMonth());
  const [anioActual, setAnioActual] = useState(new Date().getFullYear());

  const { user } = useAuth();
  const { turnosEfectivos, fechasCedidas } = useTurnosEfectivos();
  const { faltas } = useTodasLasFaltas();
  const { sanciones } = useSanciones();
  const { licencias } = useLicencias();

  const hoy = new Date();
  const totalDias = new Date(anioActual, mesActual + 1, 0).getDate();
  const primerDia = new Date(anioActual, mesActual, 1).getDay();
  // Ajustar para que la semana empiece en lunes (0=Dom → 6)
  const offsetInicio = primerDia === 0 ? 6 : primerDia - 1;

  const fecha = new Date(anioActual, mesActual);

  const nombreMes =
    fecha.toLocaleDateString('es-AR', { month: 'long' }).replace(/^./, c => c.toUpperCase()) +
    " " +
    fecha.getFullYear();

  const siguienteMes = () => {
    if (mesActual === 11) { setMesActual(0); setAnioActual(a => a + 1); }
    else setMesActual(m => m + 1);
  };

  const mesAnterior = () => {
    if (mesActual === 0) { setMesActual(11); setAnioActual(a => a - 1); }
    else setMesActual(m => m - 1);
  };

  const fechasGanadas = new Set(turnosEfectivos.map(t => t.fecha));
  const fechasCedidasSet = new Set(fechasCedidas);

  const getDiaInfo = (dia: number) => {
    const fecha = new Date(anioActual, mesActual, dia);
    const fechaStr = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const grupoDelDia = calcularGrupoTrabaja(fecha);
    const esGrupoUsuario = grupoDelDia === user?.grupoTurno;
    const esGanado = fechasGanadas.has(fechaStr);
    const esCedido = fechasCedidasSet.has(fechaStr);
    const esHoy = fecha.toDateString() === hoy.toDateString();

    const esFalta = faltas?.some(f => {
      const fs = f.fecha.includes('T') ? f.fecha.split('T')[0] : f.fecha;
      return f.empleadoId === user?.id && fs === fechaStr;
    }) ?? false;

    const esSancion = sanciones?.some(s =>
      s.empleado_id === user?.id &&
      fechaStr >= s.fecha_desde.split('T')[0] &&
      fechaStr <= s.fecha_hasta.split('T')[0]
    ) ?? false;

    const esLicencia = licencias?.some(l =>
      l.empleado_id === user?.id &&
      (l.estado === 'APROBADA' || l.estado === 'ACTIVA') &&
      fechaStr >= l.fecha_desde.split('T')[0] &&
      fechaStr <= l.fecha_hasta.split('T')[0]
    ) ?? false;

    const trabaja = (esGrupoUsuario && !esCedido) || esGanado;

    return { fechaStr, trabaja, esGanado, esCedido, esHoy, grupoDelDia, esFalta, esSancion, esLicencia };
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={mesAnterior} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 capitalize">{nombreMes}</h3>
        <button onClick={siguienteMes} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-1">
        {/* Espacios vacíos */}
        {Array.from({ length: offsetInicio }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Días del mes */}
        {Array.from({ length: totalDias }, (_, i) => {
          const dia = i + 1;
          const { trabaja, esGanado, esCedido, esHoy, esFalta, esSancion, esLicencia } = getDiaInfo(dia);
          const esRojo = esFalta || esSancion;

          return (
            <div
              key={dia}
              title={
                esFalta ? 'Falta registrada'
                  : esSancion ? 'Sanción activa'
                    : esLicencia ? 'Licencia'
                      : esCedido ? 'Cediste este turno'
                        : esGanado ? 'Turno ganado por intercambio'
                          : trabaja ? 'Tu día de guardia'
                            : ''
              }
              className={`
        h-12 px-1 rounded-md flex flex-col items-center justify-center text-xs font-medium transition-all relative
        ${esHoy ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                ${esFalta
                  ? trabaja
                    ? 'bg-red-500 dark:bg-red-600 text-white'
                    : 'bg-red-300 dark:bg-red-900/50 text-white'
                  : esSancion
                    ? trabaja
                      ? 'bg-red-500 dark:bg-red-600 text-white'
                      : 'bg-red-300 dark:bg-red-900/50 text-red-200'
                    : esLicencia
                      ? 'bg-orange-400 dark:bg-orange-500 text-white'
                      : trabaja && !esCedido
                        ? esGanado
                          ? 'bg-green-500 dark:bg-green-600 text-white'
                          : 'bg-blue-500 dark:bg-blue-600 text-white'
                        : esCedido
                          ? 'bg-orange-200 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400'
                          : 'bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-600'
                }
      `}
            >
              {esFalta && !esSancion && <span className="absolute top-0.5 left-0.5 text-[8px]">✗</span>}
              {esSancion && <Ban className="absolute top-0.5 left-0.5 w-3 h-3 text-white" />}
              {esLicencia && !esRojo && <span className="absolute top-0.5 left-0.5 text-[8px]">📋</span>}
              <span className="font-bold text-lg">{dia}</span>
              {esCedido && <span className="text-[9px] mt-0.5 font-semibold">cedido</span>}
              {esGanado && !esRojo && !esLicencia && <span className="text-[9px] mt-0.5 font-semibold">+turno</span>}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 justify-center text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Mi guardia</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-700/50" />
          <span>Sin guardia</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Turno ganado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-900/40" />
          <span>Turno cedido</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-400" />
          <span>Licencia</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500 flex items-center justify-center">
            <span className="text-[6px] text-white font-bold">✗</span>
          </div>
          <span>Falta</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500 flex items-center justify-center">
            <Ban className="w-2 h-2 text-white" />
          </div>
          <span>Sanción</span>
        </div>
      </div>
    </div>
  );
}