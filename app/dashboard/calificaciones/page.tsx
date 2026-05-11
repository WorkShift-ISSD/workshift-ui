"use client";

import { useState, useMemo } from "react";
import * as XLSX from 'xlsx-js-style';
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  Star, Clock, CheckCircle, XCircle, ChevronRight,
  BarChart2, List, Download, Filter, X,
  MessageSquare, ThumbsUp, ShieldCheck, Search,
} from "lucide-react";
import { useCalificaciones, useListadoCalificaciones, TurnoPendiente, HistorialCalificacion } from "@/hooks/useCalificaciones";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";

// ─── Constantes ───────────────────────────────────────────────────────────────

const CRITERIOS = [
  { key: "comunicacion", label: "Comunicación", icon: MessageSquare },
  { key: "responsabilidad", label: "Responsabilidad", icon: ShieldCheck },
  { key: "recomendacion", label: "Recomendación", icon: ThumbsUp },
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
          className={`transition-colors ${onChange ? "cursor-pointer" : ""} ${i <= (hover || value) ? "text-amber-400 fill-amber-400" : "text-gray-600"
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
  initialValues,
}: {
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
}) {
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
      await onSubmit(item.id, item.otro_id, {
        comunicacion: scores[0],
        responsabilidad: scores[1],
        recomendacion: scores[2],
        cumplimiento,
        comentario: comentario || undefined,
      });
      toast.success(esEdicion ? "Calificación actualizada." : "Calificación registrada correctamente.", { position: "bottom-right" });
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
            <h2 className="text-white font-medium text-base">{esEdicion ? 'Editar calificación' : 'Calificar'} a {item.otro_nombre}</h2>
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
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-all ${cumplimiento === true
                  ? "bg-green-900/50 border-green-700 text-green-300"
                  : "bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500"
                  }`}
              >
                <CheckCircle size={15} /> Sí, cumplió
              </button>
              <button
                onClick={() => setCumplimiento(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-all ${cumplimiento === false
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
              {loading ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Enviar calificación'}
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
              const hoyMs = new Date().setHours(0, 0, 0, 0);
              const diasUsados = Math.floor((hoyMs - new Date(item.fecha + 'T00:00:00').getTime()) / 86400000);
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
                    ★ {Number(item.promedio).toFixed(1)}
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
  const [busqueda, setBusqueda] = useState("");
  const { listado, isLoading } = useListadoCalificaciones(undefined);

  const getIniciales = (nombre: string) => {
    const p = nombre.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase();
  };

  const listadoFiltrado = listado.filter(e =>
    busqueda === "" ||
    e.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const now = new Date();
  const fechaGen = now.toLocaleDateString("es-AR");
  const horaGen = now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const fechaArchivo = now.toISOString().slice(0, 10);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsData: (string | number)[][] = [];

    wsData.push(['DIRECCIÓN NACIONAL DE MIGRACIONES - WSMS']);
    wsData.push(['CALIFICACIONES DE PERSONAL - REPORTE DETALLADO']);
    wsData.push([`Generado: ${fechaGen} ${horaGen}`]);
    wsData.push([]);
    wsData.push(['TOTAL', 'CON CALIFICACIONES', 'SIN CALIFICACIONES']);
    wsData.push([
      listado.length,
      listado.filter(e => e.cantidad > 0).length,
      listado.filter(e => e.cantidad === 0).length,
    ]);
    wsData.push([]);

    const headerRowIndex = wsData.length;
    wsData.push(['EMPLEADO', 'PROMEDIO', 'CALIFICACIONES', 'CUMPLIÓ', 'NO CUMPLIÓ', 'ÚLTIMO COMENTARIO']);

    listadoFiltrado.forEach(e => {
      wsData.push([
        e.nombre,
        e.cantidad === 0 ? 'Sin calificaciones' : Number(e.promedio).toFixed(1),
        e.cantidad,
        e.cumplSi,
        e.cumplNo,
        e.ultimoComentario || '—',
      ]);
    });

    wsData.push([]);
    wsData.push(['Migraciones - WSMS © 2025']);
    wsData.push([`Total: ${listadoFiltrado.length} empleados`]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 35 }];

    // Estilo encabezado
    ['A1', 'A2'].forEach(cell => {
      if (ws[cell]) ws[cell].s = { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1F2937' } } };
    });
    const headerRow = `A${headerRowIndex + 1}`;
    ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
      const cell = `${col}${headerRowIndex + 1}`;
      if (ws[cell]) ws[cell].s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1D4ED8' } } };
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Calificaciones');
    XLSX.writeFile(wb, `Calificaciones_${fechaArchivo}.xlsx`);
  };

  const exportToPDF = async () => {
    try {
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const drawHeader = () => {
        doc.setFillColor(31, 41, 55);
        doc.rect(0, 0, pageWidth, 35, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text("Dirección Nacional de Migraciones - WSMS", pageWidth / 2, 15, { align: "center" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Calificaciones de Personal - Reporte Detallado", pageWidth / 2, 23, { align: "center" });
        doc.setFontSize(8);
        doc.text(`Generado: ${fechaGen} ${horaGen}`, pageWidth / 2, 30, { align: "center" });
      };

      const drawFooter = (page: number, total: number) => {
        doc.setDrawColor(200, 200, 200);
        doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text("Migraciones - WSMS © 2025", 15, pageHeight - 8);
        doc.text(`Página ${page} de ${total}`, pageWidth - 15, pageHeight - 8, { align: "right" });
      };

      drawHeader();
      let y = 45;

      // Cards resumen
      const cards = [
        { label: "Total", value: listadoFiltrado.length, color: [37, 99, 235] },
        { label: "Con calificaciones", value: listadoFiltrado.filter(e => e.cantidad > 0).length, color: [34, 197, 94] },
        { label: "Sin calificaciones", value: listadoFiltrado.filter(e => e.cantidad === 0).length, color: [107, 114, 128] },
      ];
      const cw = (pageWidth - 40) / 3;
      cards.forEach((c, i) => {
        const x = 15 + i * (cw + 2.5);
        doc.setFillColor(c.color[0], c.color[1], c.color[2]);
        doc.roundedRect(x, y, cw, 18, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text(String(c.value), x + cw / 2, y + 10, { align: "center" });
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(c.label, x + cw / 2, y + 16, { align: "center" });
      });
      y += 28;

      // Encabezados tabla
      const cols = [
        { label: "Empleado", x: 15, w: 55 },
        { label: "Promedio", x: 72, w: 25 },
        { label: "Califs.", x: 99, w: 18 },
        { label: "Cumplió", x: 119, w: 18 },
        { label: "No cumplió", x: 139, w: 20 },
        { label: "Último comentario", x: 161, w: 44 },
      ];
      doc.setFillColor(29, 78, 216);
      doc.rect(15, y, pageWidth - 30, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      cols.forEach(c => doc.text(c.label, c.x + 1, y + 5.5));
      y += 10;

      // Filas
      let page = 1;
      listadoFiltrado.forEach((e, idx) => {
        if (y > pageHeight - 30) {
          drawFooter(page, 1);
          doc.addPage();
          page++;
          drawHeader();
          y = 45;
          doc.setFillColor(29, 78, 216);
          doc.rect(15, y, pageWidth - 30, 8, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(255, 255, 255);
          cols.forEach(c => doc.text(c.label, c.x + 1, y + 5.5));
          y += 10;
        }
        doc.setFillColor(idx % 2 === 0 ? 249 : 243, idx % 2 === 0 ? 250 : 244, idx % 2 === 0 ? 251 : 246);
        doc.rect(15, y - 1, pageWidth - 30, 8, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(30, 30, 30);
        doc.text(e.nombre, cols[0].x + 1, y + 4.5);
        doc.text(e.cantidad === 0 ? '—' : `★ ${Number(e.promedio).toFixed(1)}`, cols[1].x + 1, y + 4.5);
        doc.text(String(e.cantidad), cols[2].x + 1, y + 4.5);
        doc.text(String(e.cumplSi), cols[3].x + 1, y + 4.5);
        doc.text(String(e.cumplNo), cols[4].x + 1, y + 4.5);
        const comentario = e.ultimoComentario || '—';
        doc.text(comentario.length > 30 ? comentario.slice(0, 30) + '...' : comentario, cols[5].x + 1, y + 4.5);
        y += 9;
      });

      drawFooter(page, page);
      doc.save(`Calificaciones_${fechaArchivo}.pdf`);
    } catch (err) {
      console.error('Error exportando PDF:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar por nombre o apellido..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 text-xs rounded-lg hover:border-gray-500 hover:text-gray-300 transition-all"
          >
            <Download size={13} /> PDF
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 text-xs rounded-lg hover:border-gray-500 hover:text-gray-300 transition-all"
          >
            <Download size={13} /> Excel
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700/50">
                  {["Empleado", "Promedio", "Califs.", "Cumplimiento", "Último comentario"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listadoFiltrado.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                      {busqueda ? "No se encontraron resultados." : "No hay calificaciones registradas."}
                    </td>
                  </tr>
                ) : listadoFiltrado.map((e) => (
                  <tr key={e.id} className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar iniciales={getIniciales(e.nombre)} size="sm" />
                        <span className="text-gray-200">{e.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {e.cantidad === 0 ? (
                        <span className="text-gray-600">Sin calificaciones</span>
                      ) : (
                        <div>
                          <StarRow value={Math.round(e.promedio)} size={12} />
                          <span className="text-gray-400 mt-0.5 block">{Number(e.promedio).toFixed(1)}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{e.cantidad}</td>
                    <td className="px-4 py-3">
                      {e.cantidad === 0 ? (
                        <span className="text-gray-600">—</span>
                      ) : (
                        <span className="text-xs">
                          <span className="text-green-400">{e.cumplSi} Sí</span>
                          <span className="text-gray-600"> · </span>
                          <span className="text-red-400">{e.cumplNo} No</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">
                      {e.ultimoComentario || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

type Tab = "pendientes" | "perfil" | "listado";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "pendientes", label: "Pendientes", icon: Clock },
  { key: "perfil", label: "Mi perfil", icon: BarChart2 },
  { key: "listado", label: "Listado general", icon: List },
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
              className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-all -mb-px ${tab === t.key
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

      <AnimatePresence>
        {editItem && (
          <ModalCalificar
            item={editItem}
            onClose={() => setEditItem(null)}
            onSubmit={async (_turnoId, _calificadoId, data) => handleEditarCalificacion(data)}
            initialValues={editItem}
          />
        )}
      </AnimatePresence>
    </>
  );
}