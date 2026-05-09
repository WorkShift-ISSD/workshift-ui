"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  Star, Clock, CheckCircle, XCircle, ChevronRight,
  BarChart2, List, Download, Filter, X,
  MessageSquare, ThumbsUp, ShieldCheck,
} from "lucide-react";
import { useCalificaciones, TurnoPendiente, HistorialCalificacion } from "@/hooks/useCalificaciones";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";

// ─── Constantes ───────────────────────────────────────────────────────────────

const CRITERIOS = [
  { key: "comunicacion",    label: "Comunicación",    icon: MessageSquare },
  { key: "responsabilidad", label: "Responsabilidad", icon: ShieldCheck   },
  { key: "recomendacion",   label: "Recomendación",   icon: ThumbsUp      },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diasRestantes(fecha: string): number {
  const turnoDate = new Date(fecha + 'T00:00:00');
  const limite = new Date(turnoDate);
  limite.setDate(limite.getDate() + 7); // 7 días para calificar
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((limite.getTime() - hoy.getTime()) / 86400000));
}

function urgencyColor(dias: number) {
  if (dias <= 1) return "bg-red-900/40 text-red-300 border border-red-800/50";
  if (dias <= 2) return "bg-yellow-900/40 text-yellow-300 border border-yellow-800/50";
  return "bg-green-900/40 text-green-300 border border-green-800/50";
}

function urgencyLabel(dias: number) {
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  return `${dias} días restantes`;
}

function formatFecha(fecha: string) {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short'
  });
}

function getIniciales(nombre: string): string {
  const partes = nombre.trim().split(' ');
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return partes[0].slice(0, 2).toUpperCase();
}

// ─── Componentes compartidos ──────────────────────────────────────────────────

function StarRow({ value, onChange, size = 20 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={`transition-colors ${onChange ? "cursor-pointer" : ""} ${
            i <= (hover || value) ? "text-amber-400 fill-amber-400" : "text-gray-600"
          }`}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          onClick={() => onChange && onChange(i)}
        />
      ))}
    </div>
  );
}

function Avatar({ iniciales, size = "md" }: { iniciales: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return (
    <div className={`${sz} rounded-full bg-blue-900/60 text-blue-300 flex items-center justify-center font-medium flex-shrink-0`}>
      {iniciales}
    </div>
  );
}

// ─── Modal de calificación ────────────────────────────────────────────────────

function ModalCalificar({
  item,
  onClose,
  onSubmit,
}: {
  item: TurnoPendiente;
  onClose: () => void;
  onSubmit: (turnoId: string, calificadoId: string, data: {
    comunicacion: number;
    responsabilidad: number;
    recomendacion: number;
    cumplimiento: boolean;
    comentario?: string;
  }) => Promise<void>;
}) {
  const [cumplimiento, setCumplimiento] = useState<boolean | null>(null);
  const [scores, setScores] = useState([0, 0, 0]);
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);

  const allFilled = cumplimiento !== null && scores.every((s) => s > 0);
  const promedio = scores.every((s) => s > 0)
    ? (scores.reduce((a, b) => a + b, 0) / 3).toFixed(1)
    : null;

  async function handleSubmit() {
    if (!allFilled || cumplimiento === null) return;
    setLoading(true);
    try {
      await onSubmit(item.id, item.otro_id, {
        comunicacion: scores[0],
        responsabilidad: scores[1],
        recomendacion: scores[2],
        cumplimiento,
        comentario: comentario || undefined,
      });
      toast.success("Calificación registrada correctamente.", { position: "bottom-right" });
      onClose();
    } catch (err) {
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
            <h2 className="text-white font-medium text-base">Calificar a {item.otro_nombre}</h2>
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
                  cumplimiento === true
                    ? "bg-green-900/50 border-green-700 text-green-300"
                    : "bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500"
                }`}
              >
                <CheckCircle size={15} /> Sí, cumplió
              </button>
              <button
                onClick={() => setCumplimiento(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-all ${
                  cumplimiento === false
                    ? "bg-red-900/50 border-red-700 text-red-300"
                    : "bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500"
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
              {loading ? 'Enviando...' : 'Enviar calificación'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Tab: Pendientes ──────────────────────────────────────────────────────────

function TabPendientes({
  pendientes,
  historial,
  miScore,
  isLoading,
  onCalificar,
}: {
  pendientes: TurnoPendiente[];
  historial: HistorialCalificacion[];
  miScore: number;
  isLoading: boolean;
  onCalificar: (item: TurnoPendiente) => void;
}) {
  const emitidas = historial.filter(h => h.direccion === 'dada').length;
  const venceMasPronto = pendientes.reduce((min, p) => {
    const d = diasRestantes(p.fecha);
    return d < min.dias ? { dias: d, nombre: p.otro_nombre, fecha: formatFecha(p.fecha) } : min;
  }, { dias: 999, nombre: '', fecha: '' });

  const stats = [
    { label: "Pendientes",        value: pendientes.length,        color: "text-red-400",    sub: "cambios sin calificar" },
    { label: "Vence más pronto",  value: venceMasPronto.dias === 999 ? '—' : `${venceMasPronto.dias} día${venceMasPronto.dias !== 1 ? 's' : ''}`, color: "text-yellow-300", sub: venceMasPronto.nombre || '—' },
    { label: "Emitidas este mes", value: emitidas,                 color: "text-white",      sub: "calificaciones"        },
    { label: "Mi promedio",       value: `★ ${miScore.toFixed(1)}`, color: "text-amber-400",  sub: `${historial.filter(h => h.direccion === 'recibida').length} recibidas` },
  ];

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-gray-800 rounded-xl p-4 border border-gray-700/50">
            <p className="text-gray-500 text-xs mb-1">{s.label}</p>
            <p className={`text-2xl font-medium ${s.color}`}>{s.value}</p>
            <p className="text-gray-600 text-xs mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">
          Cambios completados sin calificar
        </p>
        {pendientes.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-10 border border-gray-700/50 text-center">
            <CheckCircle size={32} className="text-green-400 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No tenés calificaciones pendientes.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendientes.map((item) => {
              const dias = diasRestantes(item.fecha);
              const diasUsados = 7 - dias;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-gray-800 border border-gray-700/50 hover:border-blue-700/50 rounded-xl p-4 flex items-center gap-3 cursor-pointer group transition-all"
                  onClick={() => onCalificar(item)}
                >
                  <Avatar iniciales={getIniciales(item.otro_nombre)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{item.otro_nombre}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {formatFecha(item.fecha)} · {item.horario} · Completado hace {diasUsados} día{diasUsados !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-md flex-shrink-0 ${urgencyColor(dias)}`}>
                    {urgencyLabel(dias)}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onCalificar(item); }}
                    className="flex-shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors"
                  >
                    Calificar
                  </button>
                  <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 flex-shrink-0 transition-colors" />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Mi perfil ───────────────────────────────────────────────────────────

function TabMiPerfil({
  historial,
  miScore,
  isLoading,
  onEditar,
}: {
  historial: HistorialCalificacion[];
  miScore: number;
  isLoading: boolean;
  onEditar: (item: HistorialCalificacion) => void;
}) {
  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

  const recibidas = historial.filter(h => h.direccion === 'recibida');

  const promComun = recibidas.length
    ? recibidas.reduce((s, h) => s + h.comunicacion, 0) / recibidas.length
    : 0;
  const promResp = recibidas.length
    ? recibidas.reduce((s, h) => s + h.responsabilidad, 0) / recibidas.length
    : 0;
  const promRecom = recibidas.length
    ? recibidas.reduce((s, h) => s + h.recomendacion, 0) / recibidas.length
    : 0;

  const cumplSi = recibidas.filter(h => h.cumplimiento).length;
  const cumplNo = recibidas.filter(h => !h.cumplimiento).length;

  const criteriosPerfil = [
    { label: "Comunicación",    valor: promComun, pct: (promComun / 5) * 100 },
    { label: "Responsabilidad", valor: promResp,  pct: (promResp / 5) * 100  },
    { label: "Recomendación",   valor: promRecom, pct: (promRecom / 5) * 100 },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700/50 flex flex-col items-center justify-center gap-2">
          <p className="text-gray-500 text-xs">Mi score general</p>
          <p className="text-amber-400 text-5xl font-medium leading-none">{miScore.toFixed(1)}</p>
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
              <span className="text-gray-300 text-xs w-7 text-right">{c.valor.toFixed(1)}</span>
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
              <div key={item.id} className="bg-gray-800 border border-gray-700/50 rounded-xl p-4 flex items-center gap-3">
                <Avatar iniciales={getIniciales(item.otro_nombre)} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{item.otro_nombre}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {formatFecha(item.fecha)} · {item.horario} · {item.direccion === 'dada' ? 'Calificación dada' : 'Calificación recibida'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs px-2.5 py-1 rounded-md bg-blue-900/40 text-blue-300 border border-blue-800/50">
                    ★ {item.promedio.toFixed(1)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${item.cumplimiento ? 'text-green-400' : 'text-red-400'}`}>
                    {item.cumplimiento ? '✓ Cumplió' : '✗ No cumplió'}
                  </span>
                </div>
                {item.editable && (
                  <button
                    onClick={() => onEditar(item)}
                    className="text-blue-400 hover:text-blue-300 text-xs flex-shrink-0 transition-colors"
                  >
                    Editar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-gray-600 text-xs mt-3">
          Editar disponible dentro de las 24hs de emitida la calificación
        </p>
      </div>
    </div>
  );
}

// ─── Tab: Listado general ─────────────────────────────────────────────────────

function TabListado() {
  const [cargo, setCargo] = useState("Todos");

  // TODO: conectar a /api/calificaciones/listado cuando esté disponible
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-500" />
          <select
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-500"
          >
            {["Todos", "Inspector", "Supervisor"].map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 text-xs rounded-lg hover:border-gray-500 hover:text-gray-300 transition-all">
            <Download size={13} /> PDF
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 text-xs rounded-lg hover:border-gray-500 hover:text-gray-300 transition-all">
            <Download size={13} /> Excel
          </button>
        </div>
      </div>
      <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-8 text-center">
        <p className="text-gray-500 text-sm">El listado general estará disponible próximamente.</p>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

type Tab = "pendientes" | "perfil" | "listado";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "pendientes", label: "Pendientes",     icon: Clock     },
  { key: "perfil",     label: "Mi perfil",      icon: BarChart2 },
  { key: "listado",    label: "Listado general", icon: List      },
];

export default function CalificacionesPage() {
  const [tab, setTab] = useState<Tab>("pendientes");
  const [modalItem, setModal] = useState<TurnoPendiente | null>(null);
  const [editItem, setEditItem] = useState<HistorialCalificacion | null>(null);

  const { pendientes, historial, miScore, isLoading, crearCalificacion, editarCalificacion, refetch } = useCalificaciones();

  async function handleSubmitCalificacion(
    turnoEfectivoId: string,
    calificadoId: string,
    data: { comunicacion: number; responsabilidad: number; recomendacion: number; cumplimiento: boolean; comentario?: string }
  ) {
    await crearCalificacion({ turnoEfectivoId, calificadoId, ...data });
    refetch();
  }

  async function handleEditarCalificacion(data: {
    comunicacion?: number; responsabilidad?: number; recomendacion?: number; cumplimiento?: boolean; comentario?: string;
  }) {
    if (!editItem) return;
    await editarCalificacion(editItem.id, data);
    setEditItem(null);
    refetch();
    toast.success("Calificación actualizada.");
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Calificaciones</h1>
          <p className="text-gray-500 text-sm mt-1">
            Calificá a tus compañeros luego de completar un cambio de turno.
          </p>
        </div>

        <div className="flex gap-1 border-b border-gray-700/50">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-all -mb-px ${
                tab === t.key
                  ? "border-blue-500 text-blue-400 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              <t.icon size={15} />
              {t.label}
              {t.key === "pendientes" && pendientes.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {pendientes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {tab === "pendientes" && (
              <TabPendientes
                pendientes={pendientes}
                historial={historial}
                miScore={miScore}
                isLoading={isLoading}
                onCalificar={setModal}
              />
            )}
            {tab === "perfil" && (
              <TabMiPerfil
                historial={historial}
                miScore={miScore}
                isLoading={isLoading}
                onEditar={setEditItem}
              />
            )}
            {tab === "listado" && <TabListado />}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {modalItem && (
          <ModalCalificar
            item={modalItem}
            onClose={() => setModal(null)}
            onSubmit={handleSubmitCalificacion}
          />
        )}
      </AnimatePresence>
    </>
  );
}