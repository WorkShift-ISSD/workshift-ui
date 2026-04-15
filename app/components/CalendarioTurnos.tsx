'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { calcularGrupoTrabaja } from '../lib/turnosUtils';
import { useAuth } from '../context/AuthContext';
import { useTurnosEfectivos } from '@/hooks/useTurnosEfectivos';

export default function CalendarioTurnos() {
  const [mesActual, setMesActual] = useState(new Date().getMonth());
  const [anioActual, setAnioActual] = useState(new Date().getFullYear());

  const { user } = useAuth();
  const { turnosEfectivos, fechasCedidas } = useTurnosEfectivos();

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

    // Trabaja si: es su grupo y no cedió, O ganó ese turno
    const trabaja = (esGrupoUsuario && !esCedido) || esGanado;

    return { fechaStr, trabaja, esGanado, esCedido, esHoy, grupoDelDia };
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
          const { trabaja, esGanado, esCedido, esHoy } = getDiaInfo(dia);

          return (
            <div
              key={dia}
              title={esCedido ? 'Cediste este turno' : esGanado ? 'Turno ganado por intercambio' : trabaja ? 'Tu día de guardia' : ''}
              className={`
                aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all
                ${esHoy ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                ${trabaja && !esCedido
                  ? esGanado
                    ? 'bg-green-500 dark:bg-green-600 text-white'
                    : 'bg-blue-500 dark:bg-blue-600 text-white'
                  : esCedido
                    ? 'bg-orange-200 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400'
                    : 'bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-600'
                }
              `}
            >
              <span className="font-bold">{dia}</span>
              {esCedido && <span className="text-[9px] mt-0.5 font-semibold">cedido</span>}
              {esGanado && <span className="text-[9px] mt-0.5 font-semibold">+turno</span>}
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
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Turno ganado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-900/40" />
          <span>Turno cedido</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-700/50" />
          <span>Sin guardia</span>
        </div>
      </div>
    </div>
  );
}