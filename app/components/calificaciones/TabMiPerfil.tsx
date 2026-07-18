"use client";

import { HistorialCalificacion } from "@/hooks/useCalificaciones";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";
import { StarRow } from "./StarRow";
import { AvatarCalif } from "./AvatarCalif";
import { formatFecha, getIniciales } from "./calificacionesUtils";

interface TabMiPerfilProps {
  historial: HistorialCalificacion[];
  miScore: number;
  isLoading: boolean;
  onEditar: (item: HistorialCalificacion) => void;
  onEliminar: (item: HistorialCalificacion) => void;
}

export function TabMiPerfil({ historial, miScore, isLoading, onEditar, onEliminar }: TabMiPerfilProps) {
  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

  const recibidas = historial.filter(h => h.direccion === 'recibida');

  const promComun = recibidas.length ? recibidas.reduce((s, h) => s + Number(h.comunicacion), 0) / recibidas.length : 0;
  const promResp = recibidas.length ? recibidas.reduce((s, h) => s + Number(h.responsabilidad), 0) / recibidas.length : 0;
  const promRecom = recibidas.length ? recibidas.reduce((s, h) => s + Number(h.recomendacion), 0) / recibidas.length : 0;
  const cumplSi = recibidas.filter(h => h.cumplimiento).length;
  const cumplNo = recibidas.filter(h => !h.cumplimiento).length;

  const criteriosPerfil = [
    { label: "Comunicación", valor: promComun, pct: (promComun / 5) * 100 },
    { label: "Responsabilidad", valor: promResp, pct: (promResp / 5) * 100 },
    { label: "Recomendación", valor: promRecom, pct: (promRecom / 5) * 100 },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700/50 flex flex-col items-center justify-center gap-2">
          <p className="text-gray-500 text-xs">Mi score general</p>
          <p className="text-amber-400 text-5xl font-medium leading-none">{Number(miScore).toFixed(1)}</p>
          <StarRow value={Math.round(miScore)} size={16} />
          <p className="text-gray-600 text-xs">{recibidas.length} calificaciones recibidas</p>
        </div>

        <div className="md:col-span-2 bg-gray-800 rounded-xl p-5 border border-gray-700/50 space-y-3">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Desglose por criterio</p>
          {criteriosPerfil.map((c) => (
            <div key={c.label} className="flex items-center gap-3">
              <span className="text-gray-400 text-xs w-44 flex-shrink-0">{c.label}</span>
              <div className="flex-1 bg-gray-900 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${c.pct}%` }} />
              </div>
              <span className="text-gray-300 text-xs w-7 text-right">{Number(c.valor).toFixed(1)}</span>
            </div>
          ))}
          <div className="border-t border-gray-700/50 pt-3 flex items-center gap-3">
            <span className="text-gray-500 text-xs w-44 flex-shrink-0">Cumplimiento (Sí/No)</span>
            <span className="text-xs">
              <span className="text-green-400">{cumplSi} Sí</span>
              <span className="text-gray-600"> · </span>
              <span className="text-red-400">{cumplNo} No</span>
            </span>
          </div>
        </div>
      </div>

      <div>
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">
          Historial de calificaciones
        </p>
        {historial.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No hay calificaciones aún.</p>
        ) : (
          <div className="space-y-2">
            {historial.map((item) => (
              <div key={item.id} className="bg-gray-800 border border-gray-700/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <AvatarCalif iniciales={getIniciales(item.otro_nombre)} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{item.otro_nombre}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {formatFecha(item.fecha)} · {item.horario} · {item.direccion === 'dada' ? 'Calificación dada' : 'Calificación recibida'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs px-2.5 py-1 rounded-md bg-blue-900/40 text-blue-300 border border-blue-800/50">
                    ★ {Number(item.promedio).toFixed(1)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${item.cumplimiento ? 'text-green-400' : 'text-red-400'}`}>
                    {item.cumplimiento ? '✓ Cumplió' : '✗ No cumplió'}
                  </span>
                </div>
                {item.editable && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => onEditar(item)} className="text-blue-400 hover:text-blue-300 text-xs transition-colors">
                      Editar
                    </button>
                    <button onClick={() => onEliminar(item)} className="text-red-500 hover:text-red-400 text-xs transition-colors">
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-gray-600 text-xs mt-3">
          Editar y eliminar disponibles dentro de las 24hs de emitida la calificación
        </p>
      </div>
    </div>
  );
}
