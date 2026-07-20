'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Calendar, Clock, User, AlertCircle, CheckCircle, XCircle, Loader, RefreshCw, Gift, Download } from 'lucide-react';
import { useFormatters } from '@/hooks/useFormatters';
import { useAuth } from '@/app/context/AuthContext';
import { generarExcel, generarPDF } from '@/app/lib/exportUtils';
import { CustomDatePicker } from '@/app/components/CustomDatePicker';
import { LoadingSpinner } from './LoadingSpinner';

type Tab = 'solicitudes' | 'ofertas' | 'cambios';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; className: string }> = {
    SOLICITADO:  { label: 'Pendiente',    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400' },
    APROBADO:    { label: 'Aceptado',     className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
    COMPLETADO:  { label: 'Completado',   className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
    CANCELADO:   { label: 'Cancelado',    className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
    RECHAZADO:   { label: 'Rechazado',    className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
    DISPONIBLE:  { label: 'Disponible',   className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
    EXPIRADO:    { label: 'Expirado',     className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500' },
    PENDIENTE:   { label: 'Pendiente',    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400' },
    REALIZADO:   { label: 'Realizado',    className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  };
  const s = map[estado] || { label: estado, className: 'bg-gray-100 text-gray-600' };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${s.className}`}>{s.label}</span>;
}

function formatFechaSimple(fecha: string) {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Tab Solicitudes ──────────────────────────────────────────────────────────

function TabSolicitudes() {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const { formatFechaSafe } = useFormatters();

  useEffect(() => {
    fetch('/api/solicitudes-directas?usuario=yo', { credentials: 'include' })
      .then(r => r.json())
      .then(setSolicitudes)
      .finally(() => setIsLoading(false));
  }, []);

  const filtradas = solicitudes.filter(s => {
    const matchBusqueda = busqueda === '' ||
      `${s.solicitante?.nombre} ${s.solicitante?.apellido}`.toLowerCase().includes(busqueda.toLowerCase()) ||
      `${s.destinatario?.nombre} ${s.destinatario?.apellido}`.toLowerCase().includes(busqueda.toLowerCase());
    const matchEstado = filtroEstado === 'TODOS' || s.estado === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-3 mb-4 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Buscar por nombre..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100" />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100">
          <option value="TODOS">Todos los estados</option>
          <option value="SOLICITADO">Pendiente</option>
          <option value="APROBADO">Aceptado</option>
          <option value="COMPLETADO">Completado</option>
          <option value="CANCELADO">Cancelado</option>
          <option value="RECHAZADO">Rechazado</option>
        </select>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex-shrink-0">{filtradas.length} solicitud{filtradas.length !== 1 ? 'es' : ''}</p>

      <div className="flex-1 overflow-y-auto space-y-3">
        {isLoading ? (
          <LoadingSpinner size="default"  />
        ) : filtradas.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">No hay solicitudes para mostrar</div>
        ) : filtradas.map(s => (
          <div key={s.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {s.solicitante?.nombre} {s.solicitante?.apellido}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">→ {s.destinatario?.nombre} {s.destinatario?.apellido}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {s.prioridad === 'URGENTE' && <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Urgente</span>}
                <EstadoBadge estado={s.estado} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded p-2.5 border border-blue-100 dark:border-blue-900">
                <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mb-1">Turno ofrecido</p>
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{formatFechaSafe(s.turnoSolicitante?.fecha)}</p>
                <p className="text-[10px] text-gray-500">{s.turnoSolicitante?.horario} · Grupo {s.turnoSolicitante?.grupoTurno}</p>
              </div>
              {s.turnoDestinatario ? (
                <div className="bg-green-50 dark:bg-green-950/20 rounded p-2.5 border border-green-100 dark:border-green-900">
                  <p className="text-[10px] font-medium text-green-600 dark:text-green-400 mb-1">Turno solicitado</p>
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{formatFechaSafe(s.turnoDestinatario.fecha)}</p>
                  <p className="text-[10px] text-gray-500">{s.turnoDestinatario.horario} · Grupo {s.turnoDestinatario.grupoTurno}</p>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-900/20 rounded p-2.5 border border-gray-200 dark:border-gray-700">
                  <p className="text-[10px] font-medium text-gray-500 mb-1">Cobertura</p>
                  <p className="text-xs text-gray-400">Sin turno a cambio</p>
                </div>
              )}
            </div>
            {s.motivo && <p className="text-xs text-gray-500 italic mb-2">"{s.motivo}"</p>}
            <p className="text-xs text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2">Solicitado: {formatFechaSafe(s.fechaSolicitud)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab Ofertas ──────────────────────────────────────────────────────────────

function TabOfertas() {
  const [ofertas, setOfertas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const { formatDate, formatFechaSafe } = useFormatters();
  const { user } = useAuth();

  useEffect(() => {
    fetch('/api/ofertas', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setOfertas(Array.isArray(data) ? data : []))
      .finally(() => setIsLoading(false));
  }, []);

  const filtradas = ofertas.filter(o => {
    // Solo las ofertas donde el usuario fue ofertante o tomador
    const esInvolucrado = o.ofertante?.id === user?.id || o.tomador?.id === user?.id;
    const matchBusqueda = busqueda === '' ||
      `${o.ofertante?.nombre} ${o.ofertante?.apellido}`.toLowerCase().includes(busqueda.toLowerCase()) ||
      `${o.tomador?.nombre} ${o.tomador?.apellido}`.toLowerCase().includes(busqueda.toLowerCase());
    const matchEstado = filtroEstado === 'TODOS' || o.estado === filtroEstado;
    return esInvolucrado && matchBusqueda && matchEstado;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-3 mb-4 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Buscar por nombre..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100" />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100">
          <option value="TODOS">Todos los estados</option>
          <option value="DISPONIBLE">Disponible</option>
          <option value="COMPLETADO">Completado</option>
          <option value="CANCELADO">Cancelado</option>
          <option value="EXPIRADO">Expirado</option>
        </select>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex-shrink-0">{filtradas.length} oferta{filtradas.length !== 1 ? 's' : ''}</p>

      <div className="flex-1 overflow-y-auto space-y-3">
        {isLoading ? (
          <LoadingSpinner size="default"  />
        ) : filtradas.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">No hay ofertas para mostrar</div>
        ) : filtradas.map(o => {
          const esIntercambio = o.modalidadBusqueda === 'INTERCAMBIO';
          return (
            <div key={o.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${esIntercambio ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'}`}>
                    {esIntercambio ? <><RefreshCw className="h-3 w-3" /> Intercambio</> : <><Gift className="h-3 w-3" /> Cobertura</>}
                  </span>
                  {o.prioridad === 'URGENTE' && <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Urgente</span>}
                  <EstadoBadge estado={o.estado} />
                </div>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                <span className="font-medium">{o.ofertante?.nombre} {o.ofertante?.apellido}</span>
                {o.tomador && <span className="text-gray-400"> → {o.tomador.nombre} {o.tomador.apellido}</span>}
              </div>
              {o.turnoOfrece && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(o.turnoOfrece.fecha)} · {o.turnoOfrece.horario}
                </p>
              )}
              {o.descripcion && <p className="text-xs text-gray-400 italic mt-1">"{o.descripcion}"</p>}
              <p className="text-xs text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                Publicado: {formatFechaSafe(o.publicado)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Movimiento Card ──────────────────────────────────────────────────────────

function MovimientoCard({ t }: { t: any }) {
  const [expanded, setExpanded] = useState(false);
  const esGanado = t.rol === 'ganado';
  const esIntercambio = t.tipoCambio === 'INTERCAMBIO';

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div
        className="p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className={`px-2.5 py-1 rounded text-xs font-medium flex-shrink-0 ${esGanado ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'}`}>
          {esGanado ? 'Ganado' : 'Cedido'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatFechaSimple(t.fecha)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t.horarioEfectivo || '•'} · {t.tipoCambio ? (esIntercambio ? 'Intercambio' : 'Cobertura') : '•'}
            {t.companero ? ` · con ${t.companero}` : ''}
          </p>
        </div>
        <EstadoBadge estado={t.estado || 'PENDIENTE'} />
      </div>

      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
          <div className={`grid gap-3 ${esIntercambio ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className={`rounded-xl p-3 text-center border ${esGanado ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'}`}>
              <p className={`text-xs font-semibold mb-1 ${esGanado ? 'text-green-700 dark:text-green-300' : 'text-orange-700 dark:text-orange-300'}`}>
                {esGanado ? 'Turno ganado' : 'Turno cedido'}
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatFechaSimple(t.fecha)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t.horarioEfectivo || '•'}</p>
              {t.horario_original && t.horario_original !== t.horarioEfectivo && (
                <p className="text-xs text-gray-400 line-through mt-0.5">{t.horario_original}</p>
              )}
            </div>
            {esIntercambio && t.companero && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-center">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Compañero</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{t.companero}</p>
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                  {esGanado ? 'Cede' : 'Gana'}: {formatFechaSimple(t.fecha)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.horarioEfectivo || '•'}</p>
              </div>
            )}
          </div>

          {!esIntercambio && t.companero && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {esGanado ? 'Cubriste a' : 'Te cubrió'}: <span className="font-medium text-gray-700 dark:text-gray-300">{t.companero}</span>
            </p>
          )}

          {t.motivo && (
            <div className="bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-500 dark:text-gray-400">Motivo: </span>{t.motivo}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab Cambios Efectivos ────────────────────────────────────────────────────

function TabCambios() {
  const [data, setData] = useState<{ ganados: any[]; cedidos: any[] }>({ ganados: [], cedidos: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  useEffect(() => {
    fetch('/api/turnos-efectivos', { credentials: 'include' })
      .then(r => r.json())
      .then(setData)
      .finally(() => setIsLoading(false));
  }, []);

  const todos = [
    ...data.ganados.map((t: any) => ({ ...t, rol: 'ganado', horarioEfectivo: t.horario_efectivo, tipoCambio: t.tipo_cambio })),
    ...(data.cedidos || []).map((t: any) => ({ ...t, rol: 'cedido', horarioEfectivo: t.horario_efectivo, tipoCambio: t.tipo_cambio })),
  ].filter(t => {
    if (desde && t.fecha < desde) return false;
    if (hasta && t.fecha > hasta) return false;
    return true;
  }).sort((a, b) => b.fecha.localeCompare(a.fecha));

  const fechaArchivo = new Date().toISOString().slice(0, 10);

  const exportarExcel = () => {
    generarExcel(
      { subtitle: 'Cambios de Turno Efectivos - Reporte Personal', filename: `CambiosEfectivos_${fechaArchivo}.xlsx`, sheetName: 'Cambios' },
      [
        { header: 'FECHA', width: 14 },
        { header: 'ROL', width: 12 },
        { header: 'TIPO', width: 18 },
        { header: 'HORARIO EFECTIVO', width: 18 },
        { header: 'HORARIO ORIGINAL', width: 18 },
        { header: 'COMPAÑERO', width: 22 },
        { header: 'MOTIVO', width: 30 },
        { header: 'ESTADO', width: 14 },
      ],
      todos.map(t => [
        formatFechaSimple(t.fecha),
        t.rol === 'ganado' ? 'Ganado' : 'Cedido',
        t.tipoCambio || '•',
        t.horarioEfectivo || '•',
        t.horario_original || '•',
        t.companero || '•',
        t.motivo || '•',
        t.estado || '•',
      ])
    );
  };

  const exportarPDF = async () => {
    await generarPDF(
      { subtitle: 'Cambios de Turno Efectivos - Reporte Personal', orientation: 'landscape', filename: `CambiosEfectivos_${fechaArchivo}.pdf` },
      [
        { label: 'Fecha', x: 15, w: 28 },
        { label: 'Rol', x: 45, w: 18 },
        { label: 'Tipo', x: 65, w: 25 },
        { label: 'Horario', x: 92, w: 25 },
        { label: 'Compañero', x: 119, w: 38 },
        { label: 'Estado', x: 159, w: 24 },
        { label: 'Motivo', x: 185, w: 95, wrap: true },
      ],
      todos.map(t => (_doc: any) => ({
        cells: [
          formatFechaSimple(t.fecha),
          t.rol === 'ganado' ? 'Ganado' : 'Cedido',
          t.tipoCambio ? (t.tipoCambio === 'INTERCAMBIO' ? 'Intercambio' : 'Cobertura') : '•',
          t.horarioEfectivo || '•',
          t.companero || '•',
          t.estado || '•',
          t.motivo || '•',
        ],
      }))
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-4 mb-4 flex-shrink-0">
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Desde</label>
          <CustomDatePicker
            value={desde}
            onChange={setDesde}
            minDate={new Date('2020-01-01')}
            showGrupo={false}
            placeholder="dd/mm/aaaa"
            className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 w-full"
          />
        </div>
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Hasta</label>
          <CustomDatePicker
            value={hasta}
            onChange={setHasta}
            minDate={new Date('2020-01-01')}
            showGrupo={false}
            placeholder="dd/mm/aaaa"
            className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 w-full"
          />
        </div>
        {(desde || hasta) && (
          <button onClick={() => { setDesde(''); setHasta(''); }} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors self-end mb-2">
            Limpiar
          </button>
        )}
        <div className="flex gap-2 ml-auto">
          <button onClick={exportarPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded-lg hover:border-gray-400 transition-all">
            <Download size={13} /> PDF
          </button>
          <button onClick={exportarExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded-lg hover:border-gray-400 transition-all">
            <Download size={13} /> Excel
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex-shrink-0">{todos.length} cambio{todos.length !== 1 ? 's' : ''}</p>

      <div className="flex-1 overflow-y-auto space-y-2">
        {isLoading ? (
          <LoadingSpinner size="default"  />
        ) : todos.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">No hay cambios efectivos para mostrar</div>
        ) : todos.map((t, i) => (
          <MovimientoCard key={i} t={t} />
        ))}
      </div>
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────

interface ModalConsultarSolicitudesProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModalConsultarSolicitudes: React.FC<ModalConsultarSolicitudesProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<Tab>('solicitudes');

  if (!isOpen) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'solicitudes', label: 'Solicitudes' },
    { id: 'ofertas', label: 'Ofertas' },
    { id: 'cambios', label: 'Cambios efectivos' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Consultar Movimientos</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-hidden p-6">
          {tab === 'solicitudes' && <TabSolicitudes />}
          {tab === 'ofertas' && <TabOfertas />}
          {tab === 'cambios' && <TabCambios />}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors text-sm">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalConsultarSolicitudes;
