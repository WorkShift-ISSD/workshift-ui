'use client';

// app/components/dashboard/DashJefe.tsx
import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Users,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useDashboardJefe } from '@/hooks/useDashboardJefe';
import { ImpactoBadge, Impacto } from '@/app/components/autorizaciones/ImpactoBadge';
import { HeatmapOperativo } from '@/app/components/dashboard/HeatmapOperativo';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface AuthPendiente {
  id:               string;
  tipo:             string;
  createdAt:        string;
  empleadoId:       string;
  licenciaId?:      string;
  solicitudId?:     string;
  estado:           string;
  // empleado solicitante (del join en el hook o del objeto anidado)
  empleado?: {
    nombre:    string;
    apellido:  string;
    rol:       string;
    grupoTurno: string;
  };
  // solicitud directa (si existe)
  solicitud?: {
    motivo:             string;
    fechaSolicitante:   string;
    horarioSolicitante: string;
    grupoSolicitante:   string;
    fechaDestinatario?: string;
    horarioDestinatario?:string;
    destinatario?: {
      nombre:   string;
      apellido: string;
      rol:      string;
    };
  };
  // licencia (si existe)
  licencia?: {
    tipo:       string;
    fechaDesde: string;
    fechaHasta: string;
    fecha_desde?: string; // fallback snake_case
    fecha_hasta?: string;
    dias:       number;
  };
  impacto: Impacto;
}

interface Empleado {
  id:               string;
  nombre:           string;
  apellido:         string;
  rol:              string;
  grupo_turno:      string;
  horario:          string;
  calificacion:     number;
  ausente_hoy:      boolean;
  con_licencia:     boolean;
  con_falta:        boolean;
  con_sancion:      boolean;
  intercambios_mes: number;
  sobrecargado:     boolean;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function fmtFecha(iso: string) {
  const clean = iso.includes('T') ? iso.split('T')[0] : iso;
  const [y, m, d] = clean.split('-');
  return `${d}/${m}/${y}`;
}

function initials(nombre = '', apellido = '') {
  return `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase();
}

// ─────────────────────────────────────────────────────────────
// Personal global
// ─────────────────────────────────────────────────────────────
function PersonalGlobal({ empleados }: { empleados: Empleado[] }) {
  const [rolFiltro, setRolFiltro]       = useState<'INSPECTOR' | 'SUPERVISOR'>('INSPECTOR');
  const [soloProblemas, setSoloProblemas] = useState(false);

  const resumen = useMemo(() => {
    const calc = (rol: string) => {
      const emps     = empleados.filter(e => e.rol === rol);
      const total    = emps.length;
      const presentes = emps.filter(e => !e.ausente_hoy).length;
      return {
        total,
        presentes,
        con_licencia:  emps.filter(e => e.con_licencia).length,
        con_falta:     emps.filter(e => e.con_falta).length,
        sobrecargados: emps.filter(e => e.sobrecargado).length,
        cobertura_pct: total > 0 ? Math.round((presentes / total) * 100) : 0,
      };
    };
    return { INSPECTOR: calc('INSPECTOR'), SUPERVISOR: calc('SUPERVISOR') };
  }, [empleados]);

  const lista = useMemo(() =>
    empleados
      .filter(e => e.rol === rolFiltro)
      .filter(e => !soloProblemas || e.ausente_hoy || e.sobrecargado),
    [empleados, rolFiltro, soloProblemas]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {(['INSPECTOR', 'SUPERVISOR'] as const).map(rol => {
          const r = resumen[rol];
          const pctColor = r.cobertura_pct >= 80
            ? 'text-green-600 dark:text-green-400'
            : r.cobertura_pct >= 60 ? 'text-amber-600 dark:text-amber-400'
            : 'text-red-600 dark:text-red-400';
          const barColor = r.cobertura_pct >= 80
            ? 'bg-green-500 dark:bg-green-400'
            : r.cobertura_pct >= 60 ? 'bg-amber-500 dark:bg-amber-400'
            : 'bg-red-500 dark:bg-red-400';

          return (
            <button
              key={rol}
              onClick={() => setRolFiltro(rol)}
              className={[
                'text-left p-3 rounded-xl border transition-colors',
                rolFiltro === rol
                  ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700',
              ].join(' ')}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  {rol === 'INSPECTOR' ? <Users className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  {rol === 'INSPECTOR' ? 'Inspectores' : 'Supervisores'}
                </span>
                <span className={`text-lg font-bold font-mono ${pctColor}`}>{r.cobertura_pct}%</span>
              </div>
              <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2.5">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${r.cobertura_pct}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                <span>Total <span className="text-gray-900 dark:text-white font-semibold">{r.total}</span></span>
                <span>Presentes <span className="text-green-600 dark:text-green-400 font-semibold">{r.presentes}</span></span>
                <span>Licencia <span className="text-amber-600 dark:text-amber-400 font-semibold">{r.con_licencia}</span></span>
                <span>Falta <span className="text-red-600 dark:text-red-400 font-semibold">{r.con_falta}</span></span>
                {r.sobrecargados > 0 && (
                  <span className="col-span-2">Sobrecarg. <span className="text-orange-600 dark:text-orange-400 font-semibold">{r.sobrecargados}</span></span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {lista.length} {rolFiltro === 'INSPECTOR' ? 'inspectores' : 'supervisores'}
        </span>
        <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
          <input type="checkbox" checked={soloProblemas} onChange={e => setSoloProblemas(e.target.checked)} className="rounded" />
          Solo con problemas
        </label>
      </div>

      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
        {lista.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-600 text-xs py-6">Sin empleados con ese filtro</p>
        ) : lista.map(emp => (
          <div
            key={emp.id}
            className={[
              'flex items-center gap-2.5 px-3 py-2 rounded-xl border',
              'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
              emp.ausente_hoy ? 'opacity-50' : '',
            ].join(' ')}
          >
            <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-semibold text-gray-600 dark:text-gray-300 flex-shrink-0">
              {initials(emp.nombre, emp.apellido)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 dark:text-white text-xs font-medium truncate">
                {emp.apellido}, {emp.nombre}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                Grupo {emp.grupo_turno} · {emp.horario}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {emp.con_licencia && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">LIC</span>
              )}
              {emp.con_falta && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20">FALTA</span>
              )}
              {emp.sobrecargado && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">+3</span>
              )}
              {!emp.ausente_hoy && !emp.sobrecargado && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 flex-shrink-0" />
              )}
            </div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono w-8 text-right flex-shrink-0">
              {emp.calificacion.toFixed(1)}★
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AuthCard
// ─────────────────────────────────────────────────────────────
function AuthCard({
  auth,
  onAction,
}: {
  auth: AuthPendiente;
  onAction: (id: string, action: 'aprobar' | 'rechazar', obs: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [obs, setObs]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { impacto } = auth;
  const esIntercambio = !!auth.solicitudId;

  // Extraer datos del solicitante — pueden venir como objeto anidado o como campos planos
  const empNombre  = auth.empleado?.nombre  ?? '';
  const empApellido = auth.empleado?.apellido ?? '';
  const empRol     = auth.empleado?.rol      ?? '';
  const empGrupo   = auth.empleado?.grupoTurno ?? '';

  const handle = async (action: 'aprobar' | 'rechazar') => {
    if (action === 'rechazar' && !obs.trim()) {
      document.getElementById(`obs-${auth.id}`)?.focus();
      return;
    }
    if (action === 'rechazar' && obs.trim().length < 10) {
      setErrorMsg('Las observaciones deben tener al menos 10 caracteres');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await onAction(auth.id, action, obs);
      setDone(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ocurrió un error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (done) return null;

  return (
    <div className={[
      'border rounded-2xl overflow-hidden transition-all bg-white dark:bg-gray-900',
      expanded ? 'border-gray-300 dark:border-gray-600' : 'border-gray-200 dark:border-gray-800',
    ].join(' ')}>

      {/* Fila principal */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[11px] font-semibold text-gray-600 dark:text-gray-300 flex-shrink-0">
          {initials(empNombre, empApellido)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {empApellido}, {empNombre}
            {esIntercambio && auth.solicitud?.destinatario && (
              <span className="text-gray-400 dark:text-gray-500">
                {' '}↔ {auth.solicitud.destinatario.apellido}
              </span>
            )}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            {esIntercambio ? 'Intercambio de turno' : (auth.licencia?.tipo ?? auth.tipo)}
            {auth.licencia?.dias ? ` · ${auth.licencia.dias}d` : ''}
            {' · '}{fmtFecha(auth.createdAt)}
          </p>
        </div>

        {impacto?.pct_impacto !== undefined && !esIntercambio && (
          <div className="text-center flex-shrink-0 hidden sm:block mr-1">
            <p className={`text-sm font-bold font-mono ${
              impacto.nivel === 'alto' ? 'text-red-600 dark:text-red-400'
              : impacto.nivel === 'medio' ? 'text-amber-600 dark:text-amber-400'
              : 'text-green-600 dark:text-green-400'
            }`}>{impacto.pct_impacto}%</p>
            <p className="text-[9px] text-gray-400 dark:text-gray-500">grupo</p>
          </div>
        )}

        <ImpactoBadge
          impacto={impacto}
          empRol={empRol}
          empGrupo={empGrupo}
          esIntercambio={esIntercambio}
        />

        <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => handle('aprobar')}
            disabled={loading}
            title="Aprobar"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors disabled:opacity-40"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExpanded(true)}
            title="Rechazar"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Detalle expandido */}
      {expanded && (
        <div className="px-3 pb-4 border-t border-gray-200 dark:border-gray-800 pt-3 space-y-3">

          {/* Tarjetas intercambio */}
          {esIntercambio && auth.solicitud?.destinatario && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-3 text-center">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{empApellido}, {empNombre}</p>
                <p className="text-[10px] text-blue-500 dark:text-blue-400 uppercase tracking-wide mt-0.5">{empRol}</p>
                <span className="mt-1.5 inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] rounded-full font-medium">
                  CEDE SU TURNO
                </span>
                {auth.solicitud.fechaSolicitante && (
                  <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-2 space-y-0.5">
                    <p>{fmtFecha(auth.solicitud.fechaSolicitante)}</p>
                    <p>{auth.solicitud.horarioSolicitante}</p>
                    <p>Grupo {auth.solicitud.grupoSolicitante}</p>
                  </div>
                )}
              </div>
              <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-3 text-center">
                <p className="text-xs font-semibold text-green-700 dark:text-green-300">
                  {auth.solicitud.destinatario.apellido}, {auth.solicitud.destinatario.nombre}
                </p>
                <p className="text-[10px] text-green-500 dark:text-green-400 uppercase tracking-wide mt-0.5">
                  {auth.solicitud.destinatario.rol}
                </p>
                <span className="mt-1.5 inline-block px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-[10px] rounded-full font-medium">
                  CUBRE
                </span>
                {auth.solicitud.fechaDestinatario && (
                  <div className="text-[11px] text-green-600 dark:text-green-400 mt-2 space-y-0.5">
                    <p>{fmtFecha(auth.solicitud.fechaDestinatario)}</p>
                    <p>{auth.solicitud.horarioDestinatario}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fechas licencia */}
          {auth.licencia && (
            <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Desde</p>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{fmtFecha(auth.licencia.fechaDesde)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Hasta</p>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{fmtFecha(auth.licencia.fechaHasta)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Días</p>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{auth.licencia.dias}</p>
              </div>
            </div>
          )}

          {/* Impacto en cobertura */}
          {impacto?.total_grupo > 0 && (
            <div className={[
              'rounded-xl p-3 text-xs space-y-2',
              impacto.nivel === 'alto'
                ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20'
                : impacto.nivel === 'medio'
                  ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20'
                  : 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20',
            ].join(' ')}>
              <p className="font-semibold text-gray-700 dark:text-gray-300">
                Impacto en cobertura · Grupo {empGrupo}
              </p>

              {/* Duración de la licencia — solo si tenemos los datos */}
              {(auth.licencia?.fechaDesde ?? auth.licencia?.fecha_desde) && (
                <div className="flex items-center gap-3 py-1.5 px-2 rounded-lg bg-white/60 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700/40">
                  <div className="text-center">
                    <p className={`text-lg font-bold leading-none ${
                      impacto.nivel === 'alto'   ? 'text-red-600 dark:text-red-400'
                      : impacto.nivel === 'medio' ? 'text-amber-600 dark:text-amber-400'
                      : 'text-green-600 dark:text-green-400'
                    }`}>
                      {auth.licencia!.dias}
                    </p>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">días</p>
                  </div>
                  <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
                  <div className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">
                      {fmtFecha(auth.licencia!.fechaDesde ?? (auth.licencia as any).fecha_desde)}
                    </span>
                    <span className="mx-1.5 text-gray-400">→</span>
                    <span className="font-medium">
                      {fmtFecha(auth.licencia!.fechaHasta ?? (auth.licencia as any).fecha_hasta)}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
                  <div className="text-gray-500 dark:text-gray-400 italic">
                    {auth.licencia!.tipo.replace(/_/g, ' ').toLowerCase()}
                  </div>
                </div>
              )}

              <p className="text-gray-600 dark:text-gray-400">
                Si se aprueba: <strong>{impacto.ausentes_periodo + 1}</strong> de{' '}
                <strong>{impacto.total_grupo}</strong> empleados del grupo estarán
                ausentes durante ese período ({impacto.pct_impacto}% del grupo).
              </p>
            </div>
          )}

          {/* Motivo */}
          {auth.solicitud?.motivo && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-xs text-gray-600 dark:text-gray-400">
              <span className="text-gray-400 dark:text-gray-500">Motivo: </span>
              {auth.solicitud.motivo}
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="text-[11px] text-gray-500 dark:text-gray-400 block mb-1.5">
              Observaciones{' '}
              <span className="text-gray-400 dark:text-gray-600">
                (opcional para aprobar · obligatorio para rechazar)
              </span>
            </label>
            <textarea
              id={`obs-${auth.id}`}
              value={obs}
              onChange={e => setObs(e.target.value)}
              placeholder="Agregar observaciones..."
              rows={2}
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
            />
            <p className="text-[10px] text-gray-400 dark:text-gray-600 text-right mt-0.5">
              {obs.length} caracteres
            </p>
          </div>

          {/* Error */}
          {errorMsg && (
            <p className="text-xs text-red-600 dark:text-red-400 text-center bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          {/* Acciones */}
          <div className="flex gap-2">
            <button
              onClick={() => setExpanded(false)}
              className="flex-1 h-9 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={() => handle('rechazar')}
              disabled={loading || !obs.trim()}
              className="flex-1 h-9 bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
            >
              {loading ? '...' : '✕ Rechazar'}
            </button>
            <button
              onClick={() => handle('aprobar')}
              disabled={loading}
              className="flex-1 h-9 bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-40"
            >
              {loading ? '...' : '✓ Aprobar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Componente principal — sin referencias a mutate/metricas/personal
// que ya no existen en el hook
// ─────────────────────────────────────────────────────────────
export default function DashJefe() {
  const { user } = useAuth();
  const {
    isLoading,
    grupoJefe,
    metricas,
    personal,
    pendientes,
    autorizacionesGrupo,
    aprobarAutorizacion,
    rechazarAutorizacion,
  } = useDashboardJefe();

  const [authFiltro, setAuthFiltro] = useState<'todos' | 'licencia' | 'intercambio'>('todos');
  const [busqueda, setBusqueda]     = useState('');

  const handleAction = useCallback(
    async (id: string, action: 'aprobar' | 'rechazar', obs: string) => {
      if (action === 'aprobar') await aprobarAutorizacion(id, obs);
      else await rechazarAutorizacion(id, obs);
    },
    [aprobarAutorizacion, rechazarAutorizacion]
  );

  const licencias    = (pendientes as AuthPendiente[]).filter(a => !!a.licenciaId);
  const intercambios = (pendientes as AuthPendiente[]).filter(a => !!a.solicitudId);
  const altoImpacto  = (pendientes as AuthPendiente[]).filter(a => a.impacto?.nivel === 'alto');

  const pendientesFiltrados = useMemo<AuthPendiente[]>(() => {
    let base: AuthPendiente[] =
      authFiltro === 'licencia'    ? licencias :
      authFiltro === 'intercambio' ? intercambios :
      pendientes as AuthPendiente[];

    if (!busqueda.trim()) return base;

    const q = busqueda.toLowerCase().trim();
    return base.filter(a => {
      const nombre   = `${a.empleado?.apellido ?? a.empleado?.apellido ?? ''} ${a.empleado?.nombre ?? a.empleado?.nombre ?? ''}`.toLowerCase();
      const tipo     = (a.licencia?.tipo ?? a.tipo ?? '').toLowerCase().replace(/_/g, ' ');
      const motivo   = (a.solicitud?.motivo ?? a.solicitud?.motivo ?? '').toLowerCase();
      const destNombre = `${a.solicitud?.destinatario?.apellido ?? a.solicitud?.destinatario?.apellido ?? ''} ${a.solicitud?.destinatario?.nombre ?? a.solicitud?.destinatario?.nombre ?? ''}`.toLowerCase();
      return nombre.includes(q) || tipo.includes(q) || motivo.includes(q) || destNombre.includes(q);
    });
  }, [pendientes, authFiltro, licencias, intercambios, busqueda]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <LoadingSpinner />
        <p className="text-gray-500 dark:text-gray-400 mt-3 text-sm">Cargando dashboard...</p>
      </div>
    );
  }

  const hoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="flex-grow flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors overflow-y-auto">
      <div className="max-w-7xl mx-auto w-full px-4 py-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Bienvenid@, {user?.nombre} {user?.apellido}
              </h1>
              {grupoJefe && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                  Grupo {grupoJefe}
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 capitalize">{hoy}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {altoImpacto.length > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                <AlertCircle className="w-3.5 h-3.5" />
                {altoImpacto.length} alto impacto
              </span>
            )}
            {pendientes.length > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                <Clock className="w-3.5 h-3.5" />
                {pendientes.length} pendientes
              </span>
            )}
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20">
              <Users className="w-3.5 h-3.5" />
              {metricas?.total_activos ?? '—'} activos
            </span>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            {
              label:   'Empleados activos',
              value:   metricas?.total_activos ?? '—',
              aux:     '',
              icon:    <Users className="h-5 w-5 text-blue-500 dark:text-blue-400" />,
              iconBg:  'bg-blue-50 dark:bg-blue-900/30',
              color:   'text-gray-900 dark:text-white',
              href:    '/dashboard/personal',
            },
            {
              label:   'Ausentismo mes',
              value:   metricas?.ausentismo_mes_pct != null ? `${metricas.ausentismo_mes_pct}%` : '—',
              aux:     `${metricas?.total_faltas_mes ?? 0} faltas registradas`,
              icon:    metricas?.ausentismo_mes_pct > 10
                         ? <TrendingUp className="h-5 w-5 text-red-500 dark:text-red-400" />
                         : <TrendingDown className="h-5 w-5 text-green-500 dark:text-green-400" />,
              iconBg:  'bg-amber-50 dark:bg-amber-900/30',
              color:   metricas?.ausentismo_mes_pct > 10
                         ? 'text-red-600 dark:text-red-400'
                         : 'text-amber-600 dark:text-amber-400',
              href:    '/dashboard/faltas',
            },
            {
              label:   'Pendientes de aprobación',
              value:   pendientes.length,
              aux:     altoImpacto.length > 0 ? `${altoImpacto.length} de alto impacto` : 'Sin alto impacto',
              icon:    <Clock className="h-5 w-5 text-amber-500 dark:text-amber-400" />,
              iconBg:  'bg-amber-50 dark:bg-amber-900/30',
              color:   pendientes.length > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white',
              href:    '/dashboard/autorizaciones',
            },
            {
              label:   'Faltas justificadas',
              value:   metricas?.faltas_justificadas ?? '—',
              aux:     `de ${metricas?.total_faltas_mes ?? 0} totales`,
              icon:    <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />,
              iconBg:  'bg-green-50 dark:bg-green-900/30',
              color:   'text-gray-900 dark:text-white',
              href:    '/dashboard/faltas',
            },
          ].map((kpi, i) => (
            <Link
              key={i}
              href={kpi.href}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all block"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</p>
                <div className={`p-1.5 rounded-lg ${kpi.iconBg}`}>{kpi.icon}</div>
              </div>
              <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
              {kpi.aux && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{kpi.aux}</p>}
            </Link>
          ))}
        </div>

        {/* ── Heatmap operativo ── */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Movimientos Planificados por Turno
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
              pendientes + aprobadas
            </span>
          </div>
          <HeatmapOperativo
            autorizaciones={autorizacionesGrupo ?? []}
            empleados={personal?.empleados ?? []}
          />
        </div>

        {/* ── Personal global + Autorizaciones ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Personal global · hoy
            </h2>
            {personal?.empleados?.length > 0 ? (
              <PersonalGlobal empleados={personal.empleados} />
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-600">Sin datos de personal</p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Autorizaciones pendientes
              </h2>
              {pendientes.length > 0 && (
                <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center justify-center border border-amber-200 dark:border-amber-500/30">
                  {pendientes.length}
                </span>
              )}
            </div>

            <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-3 text-xs">
              {([
                { key: 'todos',       label: `Todas (${pendientes.length})` },
                { key: 'licencia',    label: `Licencias (${licencias.length})` },
                { key: 'intercambio', label: `Intercambios (${intercambios.length})` },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setAuthFiltro(tab.key)}
                  className={[
                    'flex-1 py-2 font-medium transition-colors',
                    authFiltro === tab.key
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                      : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Buscador */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, tipo o motivo..."
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto max-h-[440px] pr-0.5">
              {pendientesFiltrados.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-gray-400 dark:text-gray-600">
                    {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay autorizaciones pendientes'}
                  </p>
                </div>
              ) : (
                pendientesFiltrados.map(auth => (
                  <AuthCard key={auth.id} auth={auth} onAction={handleAction} />
                ))
              )}
            </div>

            <a
              href="/dashboard/autorizaciones"
              className="mt-4 flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Ver todas en Gestión de Autorizaciones →
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}