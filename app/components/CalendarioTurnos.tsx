'use client';

import { useState } from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getResumenMes } from '../lib/turnosUtils';

export default function CalendarioTurnos() {
  const [mesActual, setMesActual] = useState(new Date().getMonth());
  const [anioActual, setAnioActual] = useState(new Date().getFullYear());

  const resumen = getResumenMes(mesActual, anioActual);

  const siguienteMes = () => {
    if (mesActual === 11) {
      setMesActual(0);
      setAnioActual(anioActual + 1);
    } else {
      setMesActual(mesActual + 1);
    }
  };

  const mesAnterior = () => {
    if (mesActual === 0) {
      setMesActual(11);
      setAnioActual(anioActual - 1);
    } else {
      setMesActual(mesActual - 1);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={mesAnterior}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {resumen.mes} {resumen.anio}
        </h3>
        
        <button
          onClick={siguienteMes}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Información del cálculo */}
      <div className="mb-6 space-y-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Cálculo:</strong> {resumen.mes} {resumen.anio} tiene {resumen.totalDias} días → {resumen.tipo}
          </p>
          {resumen.seInvierte && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
              ⚠️ Mes anterior tiene {resumen.diasMesAnterior} días → Regla invertida
            </p>
          )}
        </div>

        {/* Resumen de días por grupo */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 dark:text-green-400 mb-2">
              Grupo A
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {resumen.grupoA.cantidad} días ({resumen.grupoA.tipo})
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {resumen.grupoA.dias.join(', ')}
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <h4 className="font-semibold text-purple-800 dark:text-purple-400 mb-2">
              Grupo B
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {resumen.grupoB.cantidad} días ({resumen.grupoB.tipo})
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {resumen.grupoB.dias.join(', ')}
            </p>
          </div>
        </div>
      </div>

      {/* Calendario visual */}
      <div className="grid grid-cols-7 gap-2">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(dia => (
          <div key={dia} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2">
            {dia}
          </div>
        ))}
        
        {/* Días del mes */}
        {Array.from({ length: resumen.totalDias }, (_, i) => {
          const dia = i + 1;
          const fecha = new Date(anioActual, mesActual, dia);
          const diaSemana = fecha.getDay();
          const esGrupoA = resumen.grupoA.dias.includes(dia);
          const esGrupoB = resumen.grupoB.dias.includes(dia);
          
          // Espacios vacíos al inicio
          if (i === 0) {
            return (
              <>
                {Array.from({ length: diaSemana }, (_, j) => (
                  <div key={`empty-${j}`} />
                ))}
                <div
                  key={dia}
                  className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium ${
                    esGrupoA
                      ? 'bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-400'
                      : 'bg-purple-200 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400'
                  }`}
                >
                  {dia}
                </div>
              </>
            );
          }
          
          return (
            <div
              key={dia}
              className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium ${
                esGrupoA
                  ? 'bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-400'
                  : 'bg-purple-200 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400'
              }`}
            >
              {dia}
            </div>
          );
        })}
      </div>
    </div>
  );
}