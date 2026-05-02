'use client';

// app/components/autorizaciones/ImpactoBadge.tsx
import { useState } from 'react';

export type NivelImpacto = 'alto' | 'medio' | 'bajo';

export interface Impacto {
  nivel:            NivelImpacto;
  ausentes_periodo: number;
  total_grupo:      number;
  pct_impacto?:     number;
}

interface Props {
  impacto:       Impacto;
  empRol?:       string;
  empGrupo?:     string;
  esIntercambio: boolean;
  direction?:    'up' | 'down'; // mantenido por compatibilidad, ignorado con fixed
}

export function ImpactoBadge({
  impacto,
  empRol,
  empGrupo,
  esIntercambio,
}: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const cls = impacto.nivel === 'alto'
    ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'
    : impacto.nivel === 'medio'
      ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
      : 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20';

  const label = impacto.nivel === 'alto'   ? 'alto impacto'
    : impacto.nivel === 'medio' ? 'medio impacto'
    : 'bajo impacto';

  const tooltipText = esIntercambio
    ? 'Intercambio de un día entre dos empleados. El impacto en cobertura es simétrico — uno cubre al otro.'
    : impacto.total_grupo === 0
      ? 'No hay suficientes datos para calcular el impacto en cobertura.'
      : (() => {
          const rolLabel = empRol === 'INSPECTOR'  ? 'inspectores'
                         : empRol === 'SUPERVISOR' ? 'supervisores'
                         : 'empleados';
          const grupo    = empGrupo ? ` del Grupo ${empGrupo}` : '';
          const ausentes = impacto.ausentes_periodo + 1;
          return `Si se aprueba: ${ausentes} de ${impacto.total_grupo} ${rolLabel}${grupo} estarían ausentes en ese período (${impacto.pct_impacto}% del grupo).`;
        })();

  // Tooltip width en px — usado para no salirse de la ventana
  const TT_WIDTH = 256;

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // Posicionar encima del badge, alineado a la derecha
    const x = Math.min(rect.right - TT_WIDTH, window.innerWidth - TT_WIDTH - 8);
    const y = rect.top - 8; // se ajusta con translateY en el render
    setPos({ x, y });
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setPos(null)}
    >
      {/* Badge */}
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full cursor-help select-none whitespace-nowrap ${cls}`}>
        {label}
      </span>

      {/* Tooltip — fixed para escapar overflow:hidden de los cards */}
      {pos && (
        <div
          className={[
            'fixed z-[9999] w-64 p-2.5 rounded-xl shadow-xl',
            'bg-white dark:bg-gray-800',
            'border border-gray-200 dark:border-gray-700',
            'text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed',
            'pointer-events-none',
            '-translate-y-full',
          ].join(' ')}
          style={{ left: pos.x, top: pos.y }}
        >
          {/* Cabecera */}
          <p className={`font-semibold mb-1 ${
            impacto.nivel === 'alto'   ? 'text-red-600 dark:text-red-400'
            : impacto.nivel === 'medio' ? 'text-amber-600 dark:text-amber-400'
            : 'text-green-600 dark:text-green-400'
          }`}>
            {label.charAt(0).toUpperCase() + label.slice(1)}
            {impacto.pct_impacto !== undefined && !esIntercambio
              ? ` · ${impacto.pct_impacto}% del grupo`
              : ''}
          </p>

          <p>{tooltipText}</p>

          {/* Escala de referencia — solo para licencias */}
          {!esIntercambio && impacto.total_grupo > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-0.5">
              <p className="text-gray-400 dark:text-gray-500 font-medium">Escala:</p>
              <p><span className="text-green-600 dark:text-green-400 font-medium">Bajo</span> — menos del 25% ausente</p>
              <p><span className="text-amber-600 dark:text-amber-400 font-medium">Medio</span> — entre 25% y 49%</p>
              <p><span className="text-red-600 dark:text-red-400 font-medium">Alto</span> — 50% o más ausente</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}