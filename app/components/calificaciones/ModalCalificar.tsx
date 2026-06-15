"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { CheckCircle, XCircle, X, MessageSquare, ShieldCheck, ThumbsUp } from "lucide-react";
import { TurnoPendiente, HistorialCalificacion } from "@/hooks/useCalificaciones";
import { StarRow } from "./StarRow";
import { formatFecha } from "./calificacionesUtils";

const CRITERIOS = [
  { key: "comunicacion", label: "Comunicación", icon: MessageSquare },
  { key: "responsabilidad", label: "Responsabilidad", icon: ShieldCheck },
  { key: "recomendacion", label: "Recomendación", icon: ThumbsUp },
];

interface ModalCalificarProps {
  item: TurnoPendiente | HistorialCalificacion;
  onClose: () => void;
  onSubmit: (turnoId: string, calificadoId: string, data: {
    comunicacion: number;
    responsabilidad: number;
    recomendacion: number;
    cumplimiento: boolean;
    comentario?: string;
  }) => Promise<void>;
  initialValues?: HistorialCalificacion;
}

export function ModalCalificar({ item, onClose, onSubmit, initialValues }: ModalCalificarProps) {
  const esEdicion = !!initialValues;
  const [cumplimiento, setCumplimiento] = useState<boolean | null>(initialValues?.cumplimiento ?? null);
  const [scores, setScores] = useState([
    Number(initialValues?.comunicacion ?? 0),
    Number(initialValues?.responsabilidad ?? 0),
    Number(initialValues?.recomendacion ?? 0),
  ]);
  const [comentario, setComentario] = useState(initialValues?.comentario ?? "");
  const [loading, setLoading] = useState(false);

  const allFilled = cumplimiento !== null && scores.every((s) => s > 0);
  const promedio = scores.every((s) => s > 0)
    ? (scores.reduce((a, b) => a + b, 0) / 3).toFixed(1)
    : null;

  async function handleSubmit() {
    if (!allFilled || cumplimiento === null) return;
    setLoading(true);
    try {
      await onSubmit(item.id, esEdicion ? '' : (item as TurnoPendiente).otro_id, {
        comunicacion: scores[0],
        responsabilidad: scores[1],
        recomendacion: scores[2],
        cumplimiento,
        comentario: comentario || undefined,
      });
      toast.success(esEdicion ? "Calificación actualizada." : "Calificación registrada correctamente.", { position: "bottom-right" });
      onClose();
    } catch {
      toast.error("Error al registrar la calificación.", { position: "bottom-right" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between p-5 border-b border-gray-700">
          <div>
            <h2 className="text-white font-medium text-base">
              {esEdicion ? 'Editar calificación' : 'Calificar'} a {item.otro_nombre}
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">{formatFecha(item.fecha)} · {item.horario}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors mt-0.5">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Cumplimiento */}
          <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-700/50">
            <p className="text-gray-300 text-sm font-medium mb-1 text-center">Cumplimiento</p>
            <div className="flex gap-3">
              <button
                onClick={() => setCumplimiento(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-all ${
                  cumplimiento === true ? "bg-green-900/50 border-green-700 text-green-300" : "bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500"
                }`}
              >
                <CheckCircle size={15} /> Sí, cumplió
              </button>
              <button
                onClick={() => setCumplimiento(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-all ${
                  cumplimiento === false ? "bg-red-900/50 border-red-700 text-red-300" : "bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500"
                }`}
              >
                <XCircle size={15} /> No cumplió
              </button>
            </div>
          </div>

          {/* Criterios */}
          <div className="space-y-4">
            {CRITERIOS.map((c, i) => (
              <div key={c.key}>
                <div className="flex items-center gap-2 mb-1">
                  <c.icon size={13} className="text-gray-400 flex-shrink-0" />
                  <p className="text-gray-300 text-sm font-medium">{c.label}</p>
                </div>
                <div className="pl-5">
                  <StarRow
                    value={scores[i]}
                    onChange={(v) => setScores((prev) => { const n = [...prev]; n[i] = v; return n; })}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Promedio */}
          <AnimatePresence>
            {promedio && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gray-900/60 rounded-lg px-4 py-3 flex items-center justify-between border border-gray-700/50"
              >
                <div>
                  <p className="text-gray-500 text-xs">Promedio (3 criterios)</p>
                  <StarRow value={Math.round(parseFloat(promedio))} size={14} />
                </div>
                <span className="text-amber-400 text-xl font-medium">★ {promedio}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Comentario */}
          <div>
            <p className="text-gray-400 text-xs mb-2">Comentario <span className="text-gray-600">(opcional)</span></p>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="¿Querés agregar algo sobre la experiencia?"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm placeholder-gray-600 resize-none h-20 focus:outline-none focus:border-gray-500 transition-colors"
            />
            <p className="text-gray-600 text-xs mt-1">· Editable dentro de las 24hs · Plazo máximo: 7 días del cambio ·</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-400 text-sm hover:border-gray-500 hover:text-gray-300 transition-all">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allFilled || loading}
              className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Enviar calificación'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
