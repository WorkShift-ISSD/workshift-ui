'use client';

import { Plus, Trash2, Calendar, CalendarRange } from 'lucide-react';
import { CustomDatePicker } from '../CustomDatePicker';
import { GrupoTurno } from '@/app/lib/turnosUtils';

interface FechaItem {
    fecha: string;
    horario: string;
}

interface RangoItem {
    desde: string;
    hasta: string;
    horario: string;
}

interface Props {
    modo: 'OFREZCO_COBERTURA' | 'BUSCO_COBERTURA' | 'OFREZCO_INTERCAMBIO' | 'BUSCO_INTERCAMBIO';
    colors: { bg: string; text: string };
    form: {
        fechaOfrece: string;
        horarioOfrece: string;
        fechasBusca: FechaItem[];
        fechasDisponibles: FechaItem[];
        usaRangoDisponibles: boolean;
        rangoDisponibles: RangoItem;
        usaRangoBusca: boolean;
        rangoBusca: RangoItem;
    };
    horarios: string[];
    user: { horario?: string; grupoTurno?: string } | null;
    turnosEfectivos: any[];
    fechasExtraUsuario: string[];
    fechasCedidas: string[];
    fechasBloqueadasPropias: string[];
    onFechaOfrecerChange: (v: string) => void;
    onHorarioOfrecerChange?: (v: string) => void;
    onUpdateFechaBusca: (index: number, field: 'fecha' | 'horario', value: string) => void;
    onUpdateFechaDisponible: (index: number, field: 'fecha' | 'horario', value: string) => void;
    onAddFechaBusca: () => void;
    onRemoveFechaBusca: (index: number) => void;
    onAddFechaDisponible: (horario?: string) => void;
    onRemoveFechaDisponible: (index: number) => void;
    onToggleRangoDisponibles: (v: boolean) => void;
    onUpdateRangoDisponibles: (field: 'desde' | 'hasta' | 'horario', value: string) => void;
    onToggleRangoBusca: (v: boolean) => void;
    onUpdateRangoBusca: (field: 'desde' | 'hasta' | 'horario', value: string) => void;
}

function ToggleModo({ usaRango, onChange }: { usaRango: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            <button
                type="button"
                onClick={() => onChange(false)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${!usaRango
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
            >
                <Calendar className="h-3 w-3" /> Día concreto
            </button>
            <button
                type="button"
                onClick={() => onChange(true)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${usaRango
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
            >
                <CalendarRange className="h-3 w-3" /> Rango
            </button>
        </div>
    );
}

export function FormularioOferta({
    modo,
    colors,
    form,
    horarios,
    user,
    turnosEfectivos,
    fechasExtraUsuario,
    fechasCedidas,
    fechasBloqueadasPropias,
    onFechaOfrecerChange,
    onHorarioOfrecerChange,
    onUpdateFechaBusca,
    onUpdateFechaDisponible,
    onAddFechaBusca,
    onRemoveFechaBusca,
    onAddFechaDisponible,
    onRemoveFechaDisponible,
    onToggleRangoDisponibles,
    onUpdateRangoDisponibles,
    onToggleRangoBusca,
    onUpdateRangoBusca,
}: Props) {
    const esIntercambio = modo === 'OFREZCO_INTERCAMBIO' || modo === 'BUSCO_INTERCAMBIO';
    const horariosConConvenir = ['A convenir', ...horarios];

    // COBERTURA
    if (!esIntercambio) {
        const titulo = modo === 'OFREZCO_COBERTURA'
            ? 'Fechas en las que podés cubrir'
            : 'Fechas en las que necesitás cobertura';
        const horarioFijo = modo === 'BUSCO_COBERTURA';

        return (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{titulo}</p>
                    {!horarioFijo && (
                        <ToggleModo usaRango={form.usaRangoDisponibles} onChange={onToggleRangoDisponibles} />
                    )}
                </div>

                {form.usaRangoDisponibles && !horarioFijo ? (
                    // MODO RANGO
                    <div className="space-y-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                            Indicá el rango de días en el que estás disponible para cubrir un turno. Se acordará un día específico con quien te contacte.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Desde</label>
                                <CustomDatePicker
                                    id="rango-disponibles-desde"
                                    value={form.rangoDisponibles.desde}
                                    onChange={v => onUpdateRangoDisponibles('desde', v)}
                                    fechasBloqueadas={fechasBloqueadasPropias}
                                    minDate={new Date()}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
                                <CustomDatePicker
                                    id="rango-disponibles-hasta"
                                    value={form.rangoDisponibles.hasta}
                                    onChange={v => onUpdateRangoDisponibles('hasta', v)}
                                    fechasBloqueadas={fechasBloqueadasPropias}
                                    minDate={form.rangoDisponibles.desde ? new Date(form.rangoDisponibles.desde + 'T00:00:00') : new Date()}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Horario</label>
                            <select
                                value={form.rangoDisponibles.horario}
                                onChange={e => onUpdateRangoDisponibles('horario', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                                {horariosConConvenir.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                    </div>
                ) : (
                    // MODO DÍA CONCRETO — una sola fecha
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Fecha</label>
                            <CustomDatePicker
                                id="fecha-disponible-0"
                                value={form.fechasDisponibles[0]?.fecha || ''}
                                onChange={v => {
                                    const turnoEfectivo = turnosEfectivos.find((t: any) => t.fecha === v);
                                    onUpdateFechaDisponible(0, 'fecha', v);
                                    onUpdateFechaDisponible(0, 'horario', turnoEfectivo?.horario_efectivo || user?.horario || horarios[0]);
                                }}
                                grupoObjetivo={horarioFijo ? user?.grupoTurno as GrupoTurno : undefined}
                                fechasExtra={fechasExtraUsuario}
                                fechasBloqueadas={horarioFijo ? [...fechasCedidas, ...fechasBloqueadasPropias] : fechasBloqueadasPropias}
                                minDate={new Date()}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Horario</label>
                            {horarioFijo ? (
                                <input
                                    type="text"
                                    disabled
                                    value={form.fechasDisponibles[0]?.horario || user?.horario || '—'}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/30 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                />
                            ) : (
                                <select
                                    value={form.fechasDisponibles[0]?.horario || horarios[0]}
                                    onChange={e => onUpdateFechaDisponible(0, 'horario', e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                >
                                    {horariosConConvenir.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // INTERCAMBIO
    return (
        <>
            {/* OFREZCO_INTERCAMBIO */}
            {modo === 'OFREZCO_INTERCAMBIO' && (
                <>
                    {/* Bloque 1: turno que me ofrezco a hacer — con toggle rango */}
                    <div className={`border rounded-lg p-4 ${colors.bg}`}>
                        <div className="flex items-center justify-between mb-3">
                            <p className={`text-sm font-medium ${colors.text}`}>Turno que me ofrezco a hacer</p>
                            <ToggleModo usaRango={form.usaRangoBusca} onChange={onToggleRangoBusca} />
                        </div>

                        {form.usaRangoBusca ? (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                    Indicá el rango de días en el que estás disponible para hacer el turno. Se acordará un día específico con quien te contacte.
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Desde</label>
                                        <CustomDatePicker
                                            id="rango-busca-desde"
                                            value={form.rangoBusca.desde}
                                            onChange={v => onUpdateRangoBusca('desde', v)}
                                            fechasBloqueadas={fechasBloqueadasPropias}
                                            minDate={new Date()}
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
                                        <CustomDatePicker
                                            id="rango-busca-hasta"
                                            value={form.rangoBusca.hasta}
                                            onChange={v => onUpdateRangoBusca('hasta', v)}
                                            fechasBloqueadas={fechasBloqueadasPropias}
                                            minDate={form.rangoBusca.desde ? new Date(form.rangoBusca.desde + 'T00:00:00') : new Date()}
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Horario</label>
                                    <select
                                        value={form.rangoBusca.horario}
                                        onChange={e => onUpdateRangoBusca('horario', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    >
                                        {horariosConConvenir.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Fecha</label>
                                    <CustomDatePicker
                                        id="fecha-busca-0"
                                        value={form.fechasBusca[0]?.fecha || ''}
                                        onChange={v => onUpdateFechaBusca(0, 'fecha', v)}
                                        fechasBloqueadas={fechasBloqueadasPropias}
                                        minDate={new Date()}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Horario</label>
                                    <select
                                        value={form.fechasBusca[0]?.horario || horariosConConvenir[0]}
                                        onChange={e => onUpdateFechaBusca(0, 'horario', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    >
                                        {horariosConConvenir.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bloque 2: turno que quiero a cambio — siempre día concreto */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Turno que querés que te cubran</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Fecha</label>
                                <CustomDatePicker
                                    id="fecha-ofrece"
                                    value={form.fechaOfrece}
                                    onChange={onFechaOfrecerChange}
                                    grupoObjetivo={user?.grupoTurno as GrupoTurno}
                                    fechasExtra={fechasExtraUsuario}
                                    fechasBloqueadas={[...fechasCedidas, ...fechasBloqueadasPropias]}
                                    minDate={new Date()}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Horario</label>
                                <input
                                    type="text"
                                    disabled
                                    value={form.horarioOfrece || user?.horario || '—'}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/30 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* BUSCO_INTERCAMBIO */}
            {modo === 'BUSCO_INTERCAMBIO' && (
                <>
                    {/* Bloque 1: turno que necesito cambiar — siempre día concreto */}
                    <div className={`border rounded-lg p-4 ${colors.bg}`}>
                        <p className={`text-sm font-medium mb-3 ${colors.text}`}>Turno que necesito cambiar</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Fecha</label>
                                <CustomDatePicker
                                    id="fecha-busca-0"
                                    value={form.fechasBusca[0]?.fecha || ''}
                                    onChange={v => {
                                        const turnoEfectivo = turnosEfectivos.find((t: any) => t.fecha === v);
                                        onUpdateFechaBusca(0, 'fecha', v);
                                        onUpdateFechaBusca(0, 'horario', turnoEfectivo?.horario_efectivo || user?.horario || horarios[0]);
                                    }}
                                    grupoObjetivo={user?.grupoTurno as GrupoTurno}
                                    fechasExtra={fechasExtraUsuario}
                                    fechasBloqueadas={[...fechasCedidas, ...fechasBloqueadasPropias]}
                                    minDate={new Date()}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Horario</label>
                                <input
                                    type="text"
                                    disabled
                                    value={form.fechasBusca[0]?.horario || user?.horario || '—'}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/30 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bloque 2: días que puedo hacer a cambio — con toggle rango */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Días que puedo hacer a cambio</p>
                            <ToggleModo usaRango={form.usaRangoDisponibles} onChange={onToggleRangoDisponibles} />
                        </div>

                        {form.usaRangoDisponibles ? (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                    "Indicá el rango de días en los que podés hacer el turno a cambio. Se acordará un día específico con quien te contacte."
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Desde</label>
                                        <CustomDatePicker
                                            id="rango-disponibles-desde"
                                            value={form.rangoDisponibles.desde}
                                            onChange={v => onUpdateRangoDisponibles('desde', v)}
                                            fechasBloqueadas={fechasBloqueadasPropias}
                                            minDate={new Date()}
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
                                        <CustomDatePicker
                                            id="rango-disponibles-hasta"
                                            value={form.rangoDisponibles.hasta}
                                            onChange={v => onUpdateRangoDisponibles('hasta', v)}
                                            fechasBloqueadas={fechasBloqueadasPropias}
                                            minDate={form.rangoDisponibles.desde ? new Date(form.rangoDisponibles.desde + 'T00:00:00') : new Date()}
                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Horario</label>
                                    <select
                                        value={form.rangoDisponibles.horario}
                                        onChange={e => onUpdateRangoDisponibles('horario', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    >
                                        {horariosConConvenir.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Fecha</label>
                                    <CustomDatePicker
                                        id="fecha-disponible-0"
                                        value={form.fechasDisponibles[0]?.fecha || ''}
                                        onChange={v => onUpdateFechaDisponible(0, 'fecha', v)}
                                        fechasBloqueadas={fechasBloqueadasPropias}
                                        minDate={new Date()}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Horario</label>
                                    <select
                                        value={form.fechasDisponibles[0]?.horario || horariosConConvenir[0]}
                                        onChange={e => onUpdateFechaDisponible(0, 'horario', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    >
                                        {horariosConConvenir.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </>
    );
}