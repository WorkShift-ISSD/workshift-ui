'use client';

import { Plus, Trash2 } from 'lucide-react';
import { CustomDatePicker } from '../CustomDatePicker';
import { GrupoTurno } from '@/app/lib/turnosUtils';

interface FechaItem {
    fecha: string;
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
    };
    horarios: string[];
    user: { horario?: string; grupoTurno?: string } | null;
    turnosEfectivos: any[];
    fechasExtraUsuario: string[];
    fechasCedidas: string[];
    fechasBloqueadasPropias: string[];
    onFechaOfrecerChange: (v: string) => void;
    onUpdateFechaBusca: (index: number, field: 'fecha' | 'horario', value: string) => void;
    onUpdateFechaDisponible: (index: number, field: 'fecha' | 'horario', value: string) => void;
    onAddFechaBusca: () => void;
    onRemoveFechaBusca: (index: number) => void;
    onAddFechaDisponible: (horario?: string) => void;
    onRemoveFechaDisponible: (index: number) => void;
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
    onUpdateFechaBusca,
    onUpdateFechaDisponible,
    onAddFechaBusca,
    onRemoveFechaBusca,
    onAddFechaDisponible,
    onRemoveFechaDisponible,
}: Props) {
    const esIntercambio = modo === 'OFREZCO_INTERCAMBIO' || modo === 'BUSCO_INTERCAMBIO';

    if (!esIntercambio) {
        // OFREZCO_COBERTURA o BUSCO_COBERTURA
        const titulo = modo === 'OFREZCO_COBERTURA'
            ? 'Fechas en las que podés cubrir'
            : 'Fechas en las que necesitás cobertura';
        const horarioFijo = modo === 'BUSCO_COBERTURA';

        return (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{titulo}</p>
                    {form.fechasDisponibles.length < 4 && (
                        <button
                            type="button"
                            onClick={() => onAddFechaDisponible(horarioFijo ? user?.horario : undefined)}
                            className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                        >
                            <Plus className="h-3 w-3" /> Agregar fecha
                        </button>
                    )}
                </div>
                <div className="space-y-3">
                    {form.fechasDisponibles.map((item, index) => (
                        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Fecha</label>
                                <CustomDatePicker
                                    id={`fecha-disponible-${index}`}
                                    value={item.fecha}
                                    onChange={v => {
                                        const turnoEfectivo = turnosEfectivos.find((t: any) => t.fecha === v);
                                        onUpdateFechaDisponible(index, 'fecha', v);
                                        onUpdateFechaDisponible(index, 'horario', turnoEfectivo?.horario_efectivo || user?.horario || horarios[0]);
                                    }}
                                    grupoObjetivo={horarioFijo ? user?.grupoTurno as GrupoTurno : undefined}
                                    fechasExtra={fechasExtraUsuario}
                                    fechasBloqueadas={[...fechasCedidas, ...fechasBloqueadasPropias]}
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
                                        value={item.horario || user?.horario || '—'}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/30 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                    />
                                ) : (
                                    <select
                                        value={item.horario}
                                        onChange={e => onUpdateFechaDisponible(index, 'horario', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    >
                                        {horarios.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                )}
                            </div>
                            {form.fechasDisponibles.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => onRemoveFechaDisponible(index)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // INTERCAMBIO
    return (
        <>
            {/* BUSCO_INTERCAMBIO: turno que necesita */}
            {modo === 'BUSCO_INTERCAMBIO' && (
                <div className={`border rounded-lg p-4 ${colors.bg}`}>
                    <p className={`text-sm font-medium mb-3 ${colors.text}`}>Turno que necesitás</p>
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
                                value={form.fechasBusca[0]?.horario || horarios[0]}
                                onChange={e => onUpdateFechaBusca(0, 'horario', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                                {horarios.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Mi turno */}
            <div className={`border rounded-lg p-4 ${modo === 'OFREZCO_INTERCAMBIO' ? colors.bg : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'}`}>
                <p className={`text-sm font-medium mb-3 ${modo === 'OFREZCO_INTERCAMBIO' ? colors.text : 'text-gray-700 dark:text-gray-300'}`}>
                    {modo === 'OFREZCO_INTERCAMBIO' ? 'Tu turno (el que ofrecés)' : 'Tus turnos disponibles para dar a cambio'}
                </p>

                {modo === 'OFREZCO_INTERCAMBIO' && (
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
                )}

                {modo === 'BUSCO_INTERCAMBIO' && (
                    <div className="space-y-3">
                        {form.fechasDisponibles.map((item, index) => (
                            <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Fecha</label>
                                    <CustomDatePicker
                                        id={`fecha-disponible-${index}`}
                                        value={item.fecha}
                                        onChange={v => {
                                            const turnoEfectivo = turnosEfectivos.find((t: any) => t.fecha === v);
                                            onUpdateFechaDisponible(index, 'fecha', v);
                                            if (turnoEfectivo) onUpdateFechaDisponible(index, 'horario', turnoEfectivo.horario_efectivo);
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
                                        value={item.horario || user?.horario || '—'}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/30 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                    />
                                </div>
                                {form.fechasDisponibles.length > 1 && (
                                    <button type="button" onClick={() => onRemoveFechaDisponible(index)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {form.fechasDisponibles.length < 4 && (
                            <button type="button" onClick={() => onAddFechaDisponible()} className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline">
                                <Plus className="h-3 w-3" /> Agregar fecha
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* OFREZCO_INTERCAMBIO: fechas que quiere a cambio */}
            {modo === 'OFREZCO_INTERCAMBIO' && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Fechas que querés a cambio</p>
                        {form.fechasBusca.length < 4 && (
                            <button type="button" onClick={onAddFechaBusca} className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline">
                                <Plus className="h-3 w-3" /> Agregar fecha
                            </button>
                        )}
                    </div>
                    <div className="space-y-3">
                        {form.fechasBusca.map((item, index) => (
                            <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Fecha</label>
                                    <CustomDatePicker
                                        id={`fecha-busca-${index}`}
                                        value={item.fecha}
                                        onChange={v => onUpdateFechaBusca(index, 'fecha', v)}
                                        fechasBloqueadas={fechasBloqueadasPropias}
                                        minDate={new Date()}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Horario</label>
                                    <select
                                        value={item.horario}
                                        onChange={e => onUpdateFechaBusca(index, 'horario', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    >
                                        {horarios.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                {form.fechasBusca.length > 1 && (
                                    <button type="button" onClick={() => onRemoveFechaBusca(index)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}