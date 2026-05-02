'use client';

// app/components/dashboard/HeatmapOperativo.tsx
//
// Heatmap operativo para el dashboard del Jefe.
// Eje X: días del período seleccionado
// Eje Y: bloque horario (Mañana / Tarde / Noche)
// Celda: ausencias pendientes + aprobadas en ese bloque ese día
//
// Filtros:
//   - Período: esta semana / este mes / 4 meses / año
//   - Rol:     Inspectores / Supervisores / Ambos
//   - Tipo:    Intercambios / Licencias / Ambos

import { useState, useMemo } from 'react';
import { Autorizacion } from '@/app/api/types';

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────
type Periodo     = 'semana' | 'mes' | '4meses' | 'anio';
type FiltroRol   = 'ambos'  | 'INSPECTOR' | 'SUPERVISOR';
type FiltroTipo  = 'ambos'  | 'intercambio' | 'licencia';
type FiltroEstado = 'ambos' | 'PENDIENTE' | 'APROBADA';
type Turno      = 'Mañana' | 'Tarde' | 'Noche';

interface EmpleadoBase {
  id:         string;
  rol:        string;
  horario:    string;
  apellido?:  string;
}

interface Props {
  autorizaciones: Autorizacion[];
  empleados:      EmpleadoBase[];
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function horaInicio(horario: string): number {
  const match = horario?.match(/^(\d{1,2}):/);
  return match ? parseInt(match[1], 10) : -1;
}

/**
 * Clasifica un horario en Mañana / Tarde / Noche según los horarios
 * reales de la organización:
 *
 * Inspectores
 *   Mañana:  04:00-14:00 | 06:00-16:00
 *   Tarde:   13:00-23:00
 *   Noche:   19:00-05:00
 *
 * Supervisores
 *   Mañana:  05:00-14:00
 *   Tarde:   14:00-23:00
 *   Noche:   23:00-05:00
 */
function clasificarTurno(horario: string): Turno {
  const h = horaInicio(horario);
  // Mañana: inspectores 04:00 o 06:00, supervisores 05:00
  if (h === 4 || h === 5 || h === 6) return 'Mañana';
  // Tarde: inspectores 13:00, supervisores 14:00
  if (h === 13 || h === 14) return 'Tarde';
  // Noche: inspectores 19:00, supervisores 23:00
  if (h === 19 || h === 23) return 'Noche';
  // Fallback para horarios no reconocidos
  if (h >= 4  && h <= 11) return 'Mañana';
  if (h >= 12 && h <= 17) return 'Tarde';
  return 'Noche';
}

function rangoFechas(periodo: Periodo): { inicio: Date; fin: Date } {
  const hoy = new Date();
  const fin = new Date(hoy);
  fin.setHours(23, 59, 59, 999);
  const inicio = new Date(hoy);
  inicio.setHours(0, 0, 0, 0);

  if (periodo === 'semana') {
    const dow = hoy.getDay() || 7;
    inicio.setDate(hoy.getDate() - (dow - 1));
    fin.setDate(inicio.getDate() + 6);
  } else if (periodo === 'mes') {
    inicio.setDate(1);
    // último día del mes actual
    fin.setMonth(hoy.getMonth() + 1);
    fin.setDate(0);
  } else if (periodo === '4meses') {
    inicio.setMonth(hoy.getMonth() - 3);
    inicio.setDate(1);
    // último día del mes actual
    fin.setMonth(hoy.getMonth() + 1);
    fin.setDate(0);
  } else {
    // año: del 1 de enero al 31 de diciembre
    inicio.setMonth(0);
    inicio.setDate(1);
    fin.setMonth(11);
    fin.setDate(31);
  }
  return { inicio, fin };
}

function generarDias(inicio: Date, fin: Date): Date[] {
  const dias: Date[] = [];
  const cursor = new Date(inicio);
  while (cursor <= fin) {
    dias.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

function toKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

const CELL_COLORS: Record<number, string> = {
  0: 'bg-gray-200 dark:bg-gray-800',
  1: 'bg-amber-200 dark:bg-amber-900',
  2: 'bg-amber-400 dark:bg-amber-700',
  3: 'bg-red-400   dark:bg-red-700',
  4: 'bg-red-600   dark:bg-red-500',
};

function nivelColor(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4)  return 3;
  return 4;
}

const TURNOS: Turno[] = ['Mañana', 'Tarde', 'Noche'];

const PERIODO_LABELS: Record<Periodo, string> = {
  semana:   'Esta semana',
  mes:      'Este mes',
  '4meses': '4 meses',
  anio:     'Este año',
};

const DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Horarios reales por turno para mostrar en el eje Y
const TURNO_HORARIOS: Record<Turno, string> = {
  'Mañana': '04–06 → 14–16',
  'Tarde':  '13–14 → 23',
  'Noche':  '19–23 → 05',
};

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────
export function HeatmapOperativo({ autorizaciones, empleados }: Props) {
  const [periodo,      setPeriodo]      = useState<Periodo>('mes');
  const [filtroRol,      setFiltroRol]      = useState<FiltroRol>('ambos');
  const [filtroTipo,     setFiltroTipo]     = useState<FiltroTipo>('ambos');
  const [filtroEstado,   setFiltroEstado]   = useState<FiltroEstado>('ambos');
  const [personasActivas, setPersonasActivas] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip] = useState<{
    x: number; y: number;
    dia: string; turno: Turno; count: number; detalle: string[];
  } | null>(null);

  const empMap = useMemo(() =>
    Object.fromEntries(empleados.map(e => [e.id, e])),
    [empleados]
  );

  const { inicio, fin: finPeriodo } = useMemo(() => rangoFechas(periodo), [periodo]);

  // Extender el fin hasta la última fecha de licencia futura en los datos
  // EXCEPTO para "semana" donde queremos exactamente lun-dom de la semana actual
  const fin = useMemo(() => {
    if (periodo === 'semana') return finPeriodo;
    let maxFecha = new Date(finPeriodo);
    autorizaciones.forEach(auth => {
      if (auth.estado !== 'PENDIENTE' && auth.estado !== 'APROBADA') return;
      const lic = auth.licencia as any;
      if (!lic) return;
      const hastaStr = lic.fechaHasta ?? lic.fecha_hasta;
      if (!hastaStr) return;
      const hasta = new Date(hastaStr.split('T')[0] + 'T00:00:00');
      if (hasta > maxFecha) maxFecha = hasta;
    });
    return maxFecha;
  }, [finPeriodo, autorizaciones, periodo]);

  const dias = useMemo(() => generarDias(inicio, fin), [inicio, fin]);

  // ── Matriz turno × día ────────────────────────────────────
  const matriz = useMemo(() => {
    const m: Record<string, Record<Turno, string[]>> = {};
    dias.forEach(d => { m[toKey(d)] = { Mañana: [], Tarde: [], Noche: [] }; });

    autorizaciones.forEach(auth => {
      if (auth.estado !== 'PENDIENTE' && auth.estado !== 'APROBADA') return;
      if (filtroEstado !== 'ambos' && auth.estado !== filtroEstado) return;

      const emp = empMap[auth.empleadoId];
      if (!emp) return;

      if (filtroRol  !== 'ambos' && emp.rol !== filtroRol) return;

      const esIntercambio = !!auth.solicitudId;
      const esLicencia    = !!auth.licenciaId;
      if (filtroTipo === 'intercambio' && !esIntercambio) return;
      if (filtroTipo === 'licencia'    && !esLicencia)    return;

      const rolLabel    = emp.rol === 'INSPECTOR' ? 'Insp.' : 'Sup.';
      const apellido    = emp.apellido ?? auth.empleado?.apellido ?? '';
      const estadoLabel = auth.estado === 'PENDIENTE' ? '⏳' : '✓';
      const tipoLabel   = esIntercambio ? 'Intercambio' : 'Licencia';
      const item        = `${estadoLabel} ${rolLabel} ${apellido} · ${tipoLabel}`;

      // Filtro por personas activas — vacío = mostrar todas
      if (personasActivas.size > 0 && !personasActivas.has(`${rolLabel} ${apellido}`)) return;

      if (esIntercambio && auth.solicitudDirecta) {
        const sd        = auth.solicitudDirecta;
        // Fecha: usar fechaSolicitud de la SD, o createdAt como fallback
        const fechaStr  = sd.fechaSolicitud?.split('T')[0]
                       ?? auth.createdAt?.split('T')[0];
        if (!fechaStr || !m[fechaStr]) return;

        // Turno desde turnoSolicitante.horario, o horario del empleado
        const horario = sd.turnoSolicitante?.horario ?? emp.horario ?? '';
        const turno   = clasificarTurno(horario);
        m[fechaStr][turno].push(item);

      } else if (esLicencia && auth.licencia) {
        const lic       = auth.licencia as any;
        const desdeStr  = (lic.fechaDesde ?? lic.fecha_desde)?.split('T')[0];
        const hastaStr  = (lic.fechaHasta ?? lic.fecha_hasta)?.split('T')[0] ?? desdeStr;
        if (!desdeStr) return;

        const turno  = clasificarTurno(emp.horario ?? '');
        const licItem = `${estadoLabel} ${rolLabel} ${apellido} · ${lic.tipo}`;
        const cursor = new Date(desdeStr + 'T00:00:00');
        const hasta  = new Date(hastaStr  + 'T00:00:00');
        while (cursor <= hasta) {
          const k = toKey(cursor);
          if (m[k]) m[k][turno].push(licItem);
          cursor.setDate(cursor.getDate() + 1);
        }

      } else if (esLicencia && !auth.licencia) {
        // licencia no populada — inferir desde createdAt y horario del empleado
        const fechaStr = auth.createdAt?.split('T')[0];
        if (!fechaStr || !m[fechaStr]) return;
        const turno = clasificarTurno(emp.horario ?? '');
        m[fechaStr][turno].push(item);
      }
    });

    return m;
  }, [autorizaciones, dias, empMap, filtroRol, filtroTipo, filtroEstado, personasActivas]);

  // Totales por turno para el label del eje Y
  const totalesPorTurno = useMemo(() =>
    Object.fromEntries(
      TURNOS.map(t => [
        t,
        Object.values(matriz).reduce((s, day) => s + day[t].length, 0),
      ])
    ) as Record<Turno, number>,
    [matriz]
  );

  // Presión acumulada por día de la semana (insight)
  const acumPorDow = useMemo(() => {
    const acc: Record<number, number> = {0:0,1:0,2:0,3:0,4:0,5:0,6:0};
    dias.forEach(d => {
      const total = TURNOS.reduce((s, t) => s + (matriz[toKey(d)]?.[t].length ?? 0), 0);
      acc[d.getDay()] += total;
    });
    return acc;
  }, [matriz, dias]);

  const maxDow  = Math.max(...Object.values(acumPorDow), 1);
  const topDow  = Object.entries(acumPorDow)
    .map(([dow, count]) => ({ dow: parseInt(dow, 10), count: count as number }))
    .sort((a, b) => b.count - a.count);

  // Tamaño de celda según período
  const cellW = periodo === 'semana' ? 44
              : periodo === 'mes'    ? 20
              : periodo === '4meses' ? 11
              : 7;
  const cellH = 36;
  const gap   = 2;

  const hoy = toKey(new Date());

  // Label de día en el header
  function showDayLabel(d: Date): string | null {
    if (periodo === 'semana')  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
    if (periodo === 'mes')     return d.getDate() % 4 === 1 ? String(d.getDate()) : null;
    if (periodo === '4meses')  return d.getDay() === 1 ? d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : null;
    return d.getDate() === 1 ? d.toLocaleDateString('es-ES', { month: 'short' }) : null;
  }

  return (
    <div className="space-y-3">

      {/* ── Controles ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <TabGroup
          options={Object.entries(PERIODO_LABELS).map(([k, v]) => ({ key: k, label: v }))}
          value={periodo}
          onChange={v => setPeriodo(v as Periodo)}
        />
        <TabGroup
          options={[
            { key: 'ambos',      label: 'Todos' },
            { key: 'INSPECTOR',  label: 'Inspectores' },
            { key: 'SUPERVISOR', label: 'Supervisores' },
          ]}
          value={filtroRol}
          onChange={v => setFiltroRol(v as FiltroRol)}
        />
        <TabGroup
          options={[
            { key: 'ambos',       label: 'Todo' },
            { key: 'intercambio', label: 'Intercambios' },
            { key: 'licencia',    label: 'Licencias' },
          ]}
          value={filtroTipo}
          onChange={v => setFiltroTipo(v as FiltroTipo)}
        />
        <TabGroup
          options={[
            { key: 'ambos',     label: 'Todos' },
            { key: 'PENDIENTE', label: '⏳ Pendientes' },
            { key: 'APROBADA',  label: '✓ Aprobadas' },
          ]}
          value={filtroEstado}
          onChange={v => setFiltroEstado(v as FiltroEstado)}
        />

        {/* Indicador de personas activas con botón limpiar */}
        {personasActivas.size > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {[...personasActivas].map(p => (
              <span
                key={p}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300"
              >
                {p}
              </span>
            ))}
            <button
              onClick={() => setPersonasActivas(new Set())}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-300 dark:hover:border-red-500/40 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* ── Grilla ── */}
      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: dias.length * (cellW + gap) + 80 }}>

          {/* Header de días */}
          <div
            className="flex mb-1"
            style={{
              marginLeft: 76,
              gap,
              // Altura fija para que los labels nunca se corten
              height: periodo === 'anio' ? 28 : periodo === '4meses' ? 24 : 18,
              alignItems: 'flex-end',
            }}
          >
            {dias.map((d, i) => {
              const label = showDayLabel(d);
              const isHoy = toKey(d) === hoy;
              if (!label && !isHoy) {
                return <div key={i} style={{ width: cellW, flexShrink: 0 }} />;
              }
              return (
                <div
                  key={i}
                  style={{
                    width: cellW,
                    flexShrink: 0,
                    // En año rotar para que quepan los nombres de mes
                    transform: (periodo === 'anio' || periodo === '4meses') && label
                      ? 'rotate(-45deg) translateX(-2px)'
                      : undefined,
                    transformOrigin: 'bottom right',
                    whiteSpace: 'nowrap',
                  }}
                  className={[
                    'overflow-visible',
                    isHoy && !label
                      ? 'text-[9px] font-bold text-blue-500 dark:text-blue-400 text-center'
                      : 'text-[9px] text-gray-400 dark:text-gray-500',
                  ].join(' ')}
                >
                  {label ?? (isHoy ? '·' : '')}
                </div>
              );
            })}
          </div>

          {/* Filas de turnos */}
          {TURNOS.map(turno => {
            const totalTurno = totalesPorTurno[turno];
            return (
              <div key={turno} className="flex items-center mb-1" style={{ gap }}>
                {/* Eje Y */}
                <div className="flex-shrink-0 text-right pr-2" style={{ width: 72 }}>
                  <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 leading-tight">
                    {turno}
                  </p>
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 leading-tight">
                    {TURNO_HORARIOS[turno]}
                  </p>
                  <p className={[
                    'text-[9px] font-medium mt-0.5',
                    totalTurno > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-gray-400 dark:text-gray-600',
                  ].join(' ')}>
                    {totalTurno > 0 ? `${totalTurno} aus.` : '—'}
                  </p>
                </div>

                {/* Celdas */}
                {dias.map((d, i) => {
                  const key    = toKey(d);
                  const items  = matriz[key]?.[turno] ?? [];
                  const count  = items.length;
                  const nivel  = nivelColor(count);
                  const isHoy  = key === hoy;
                  const esFut  = d > new Date();
                  // Futuro sin ausencias → muy tenue; futuro con ausencias → visible con borde punteado
                  const futSinDatos = esFut && count === 0;

                  return (
                    <div
                      key={i}
                      style={{ width: cellW, height: cellH, flexShrink: 0 }}
                      className={[
                        'rounded-[3px] cursor-pointer transition-transform hover:scale-110 hover:z-10',
                        'flex items-center justify-center',
                        futSinDatos ? 'opacity-20' : '',
                        // Futuro con datos: borde punteado para distinguirlo del pasado
                        esFut && count > 0 ? 'ring-1 ring-dashed ring-amber-400 dark:ring-amber-500' : '',
                        isHoy  ? 'ring-1 ring-blue-400 dark:ring-blue-500' : '',
                        CELL_COLORS[nivel],
                      ].join(' ')}
                      onMouseEnter={e => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const diaLabel = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
                        setTooltip({
                          x:       rect.left + rect.width / 2,
                          y:       rect.top,
                          dia:     esFut ? `${diaLabel} · próximo` : diaLabel,
                          turno,
                          count,
                          detalle: items,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {count > 0 && cellW >= 16 && (
                        <span className={[
                          'text-[9px] font-bold select-none',
                          nivel >= 3 ? 'text-white' : 'text-gray-700 dark:text-gray-200',
                        ].join(' ')}>
                          {count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* ── Chips de personas involucradas en el período ── */}
          <PersonasInvolucradas
            matriz={matriz}
            dias={dias}
            personasActivas={personasActivas}
            onPersonaClick={p => setPersonasActivas(prev => {
              const next = new Set(prev);
              next.has(p) ? next.delete(p) : next.add(p);
              return next;
            })}
          />

          {/* ── Insight: presión por día de la semana ── */}
          {Object.values(acumPorDow).some(v => v > 0) && (
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800 flex items-start gap-4 flex-wrap">

              {/* Mini barras — column-reverse para que crezcan hacia arriba */}
              <div className="flex-shrink-0">
                <p className="text-[9px] text-gray-400 dark:text-gray-500 mb-2">
                  Presión por día de la semana
                </p>
                <div className="flex items-end gap-1.5">
                  {[1,2,3,4,5,6,0].map(dow => {
                    const val   = acumPorDow[dow] ?? 0;
                    const pct   = (val / maxDow) * 100;
                    const isTop = dow === topDow[0].dow && val > 0;
                    const barH  = Math.max(Math.round(pct * 0.32), val > 0 ? 3 : 0);
                    return (
                      <div key={dow} className="flex flex-col items-center gap-1">
                        {/* Contenedor de altura fija para que las barras tengan piso común */}
                        <div className="flex items-end" style={{ height: 32 }}>
                          <div
                            className={`w-5 rounded-t-sm flex-shrink-0 ${
                              isTop ? 'bg-red-400 dark:bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                            style={{ height: barH }}
                          />
                        </div>
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 leading-none">
                          {DIAS_ES[dow]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Insight textual */}
              {topDow[0].count >= 2 && (
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-3 py-2.5 max-w-xs self-end">
                  <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠</span>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">
                    <strong>{DIAS_ES[topDow[0].dow]}</strong> concentra más ausencias en el período seleccionado.
                    {topDow[0].count >= 5 && ' Posible problema estructural en ese día.'}
                  </p>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 flex-wrap">
        <span>sin ausencias</span>
        {[0,1,2,3,4].map(i => (
          <div key={i} className={`${CELL_COLORS[i]} rounded-[3px] flex-shrink-0`} style={{ width: 11, height: 11 }} />
        ))}
        <span>crítico</span>
        <span className="ml-2 text-blue-400 dark:text-blue-500 font-medium">■ hoy</span>
        <span className="ml-1 text-amber-400 dark:text-amber-500">⬚ futuro planificado</span>
        <span className="ml-1">· escala: ⏳ pendiente  ✓ aprobada</span>
      </div>

      {/* Tooltip fixed */}
      {tooltip && (
        <div
          className="fixed z-[9999] pointer-events-none -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 text-[11px] text-gray-700 dark:text-gray-200 max-w-[220px]">
            <p className="font-semibold text-gray-900 dark:text-white mb-1 capitalize">
              {tooltip.dia} · {tooltip.turno}
            </p>
            {tooltip.count === 0 ? (
              <p className="text-gray-400 dark:text-gray-500">Sin ausencias</p>
            ) : (
              <>
                <p className="text-gray-500 dark:text-gray-400 mb-1.5">
                  {tooltip.count} ausencia{tooltip.count !== 1 ? 's' : ''}
                </p>
                <ul className="space-y-0.5">
                  {tooltip.detalle.slice(0, 7).map((item, i) => (
                    <li key={i} className="text-[10px] text-gray-600 dark:text-gray-300">{item}</li>
                  ))}
                  {tooltip.detalle.length > 7 && (
                    <li className="text-[10px] text-gray-400">+{tooltip.detalle.length - 7} más</li>
                  )}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PersonasInvolucradas — chips agrupados por turno
// ─────────────────────────────────────────────────────────────
function PersonasInvolucradas({
  matriz,
  dias,
  personasActivas,
  onPersonaClick,
}: {
  matriz:          Record<string, Record<Turno, string[]>>;
  dias:            Date[];
  personasActivas: Set<string>;
  onPersonaClick:  (persona: string) => void;
}) {
  const [expandido, setExpandido] = useState(false);

  // Recolectar personas únicas por turno en todo el período visible
  const porTurno = useMemo(() => {
    const acc: Record<Turno, Set<string>> = {
      Mañana: new Set(),
      Tarde:  new Set(),
      Noche:  new Set(),
    };
    dias.forEach(d => {
      const key = d.toISOString().split('T')[0];
      const day = matriz[key];
      if (!day) return;
      (Object.keys(acc) as Turno[]).forEach(turno => {
        day[turno].forEach(item => {
          // El item tiene formato "⏳ Insp. Apellido · Tipo"
          // Extraer "Insp. Apellido" como identificador de persona
          const match = item.match(/^[⏳✓]\s(.+?)\s·/);
          if (match) acc[turno].add(match[1].trim());
        });
      });
    });
    return {
      Mañana: [...acc.Mañana].sort(),
      Tarde:  [...acc.Tarde].sort(),
      Noche:  [...acc.Noche].sort(),
    };
  }, [matriz, dias]);

  const totalPersonas = Object.values(porTurno).reduce((s, arr) => s + arr.length, 0);
  if (totalPersonas === 0) return null;

  const MAX_VISIBLE = 6; // chips por turno antes de colapsar

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] text-gray-400 dark:text-gray-500">
          Personal involucrado en el período · {totalPersonas} persona{totalPersonas !== 1 ? 's' : ''}
        </p>
        {Object.values(porTurno).some(arr => arr.length > MAX_VISIBLE) && (
          <button
            onClick={() => setExpandido(v => !v)}
            className="text-[9px] text-blue-500 dark:text-blue-400 hover:underline"
          >
            {expandido ? 'ver menos' : 'ver todos'}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {(Object.entries(porTurno) as [Turno, string[]][])
          .filter(([, personas]) => personas.length > 0)
          .map(([turno, personas]) => {
            const visible = expandido ? personas : personas.slice(0, MAX_VISIBLE);
            const ocultos = personas.length - visible.length;

            const turnoColor = turno === 'Mañana'
              ? 'text-amber-600 dark:text-amber-400'
              : turno === 'Tarde'
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-indigo-600 dark:text-indigo-400';

            return (
              <div key={turno} className="flex items-start gap-2 flex-wrap">
                {/* Label del turno */}
                <span className={`text-[10px] font-semibold flex-shrink-0 w-14 text-right pt-0.5 ${turnoColor}`}>
                  {turno}
                </span>

                {/* Chips */}
                <div className="flex flex-wrap gap-1 flex-1">
                  {visible.map((persona, i) => {
                    const esPendiente = dias.some(d => {
                      const key = d.toISOString().split('T')[0];
                      return matriz[key]?.[turno].some(
                        item => item.startsWith('⏳') && item.includes(persona)
                      );
                    });
                    const isActiva = personasActivas.has(persona);
                    const haySeleccion = personasActivas.size > 0;

                    return (
                      <button
                        key={i}
                        onClick={() => onPersonaClick(persona)}
                        className={[
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all cursor-pointer',
                          isActiva
                            ? 'bg-blue-100 dark:bg-blue-500/30 text-blue-700 dark:text-blue-200 border-blue-400 dark:border-blue-400 ring-1 ring-blue-400'
                            : haySeleccion
                              ? 'opacity-40 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:opacity-100'
                              : esPendiente
                                ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 hover:border-amber-400'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400',
                        ].join(' ')}
                      >
                        {esPendiente ? '⏳' : '✓'} {persona}
                      </button>
                    );
                  })}

                  {ocultos > 0 && (
                    <button
                      onClick={() => setExpandido(true)}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-400 transition-colors"
                    >
                      +{ocultos} más
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TabGroup — helper interno reutilizable para los controles
// ─────────────────────────────────────────────────────────────
function TabGroup({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: string; label: string }>;
  value:   string;
  onChange:(v: string) => void;
}) {
  return (
    <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden text-xs">
      {options.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={[
            'px-3 py-1.5 font-medium transition-colors whitespace-nowrap',
            value === key
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  );
}