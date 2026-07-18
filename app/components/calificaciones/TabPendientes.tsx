"use client";

import { motion } from "framer-motion";
import { CheckCircle, ChevronRight } from "lucide-react";
import { TurnoPendiente, HistorialCalificacion } from "@/hooks/useCalificaciones";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";
import { AvatarCalif } from "./AvatarCalif";
import { diasRestantes, urgencyColor, urgencyLabel, formatFecha, getIniciales } from "./calificacionesUtils";

interface TabPendientesProps {
  pendientes: TurnoPendiente[];
  historial: HistorialCalificacion[];
  miScore: number;
  isLoading: boolean;
  onCalificar: (item: TurnoPendiente) => void;
}

export function TabPendientes({ pendientes, historial, miScore, isLoading, onCalificar }: TabPendientesProps) {
  const emitidas = historial.filter(h => h.direccion === 'dada').length;
  const venceMasPronto = pendientes.reduce((min, p) => {
    const d = diasRestantes(p.fecha);
    return d < min.dias ? { dias: d, nombre: p.otro_nombre, fecha: formatFecha(p.fecha) } : min;
  }, { dias: 999, nombre: '', fecha: '' });

  const stats = [
    { label: "Pendientes", value: pendientes.length, color: "text-red-400", sub: "cambios sin calificar" },
    { label: "Vence más pronto", value: venceMasPronto.dias === 999 ? '—' : `${venceMasPronto.dias} día${venceMasPronto.dias !== 1 ? 's' : ''}`, color: "text-yellow-300", sub: venceMasPronto.nombre || '—' },
    { label: "Emitidas este mes", value: emitidas, color: "text-white", sub: "calificaciones" },
    { label: "Mi promedio", value: `★ ${Number(miScore).toFixed(1)}`, color: "text-amber-400", sub: `${historial.filter(h => h.direccion === 'recibida').length} recibidas` },
  ];

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-400 dark:border-gray-700/50">
            <p className="text-gray-500 dark:text-gray-500 text-xs mb-1">{s.label}</p>
            <p className={`text-2xl font-medium ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-gray-500 dark:text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">
          Cambios completados sin calificar
        </p>
        {pendientes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-10 border border-gray-400 dark:border-gray-700/50 text-center">
            <CheckCircle size={32} className="text-green-500 dark:text-green-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No tenés calificaciones pendientes.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendientes.map((item) => {
              const dias = diasRestantes(item.fecha);
              const hoyMs = new Date().setHours(0, 0, 0, 0);
              const diasUsados = Math.floor((hoyMs - new Date(item.fecha + 'T00:00:00').getTime()) / 86400000);
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white dark:bg-gray-800 border border-gray-400 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-blue-700/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 cursor-pointer group transition-all"
                  onClick={() => onCalificar(item)}
                >
                  <AvatarCalif iniciales={getIniciales(item.otro_nombre)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 dark:text-white text-sm font-medium">{item.otro_nombre}</p>
                    <p className="text-gray-500 dark:text-gray-500 text-xs mt-0.5">
                      {formatFecha(item.fecha)} · {item.horario} · Completado hace {diasUsados} día{diasUsados !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                    <span className={`text-xs px-2.5 py-1 rounded-md flex-shrink-0 ${urgencyColor(dias)}`}>
                      {urgencyLabel(dias)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onCalificar(item); }}
                      className="flex-shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors"
                    >
                      Calificar
                    </button>
                    <ChevronRight size={16} className="text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 flex-shrink-0 transition-colors hidden sm:block" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
