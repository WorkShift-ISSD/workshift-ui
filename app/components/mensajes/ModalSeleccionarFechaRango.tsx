'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useFormatters } from '@/hooks/useFormatters';

interface FechaDisponible {
    fecha: string;
    grupoTurno: string;
}

interface Props {
    isOpen: boolean;
    ofertanteNombre: string;
    fechasDisponibles: FechaDisponible[];
    horarioUsuario: string;
    onConfirmar: (fecha: string, horario: string) => void;
    onCerrar: () => void;
}

export function ModalSeleccionarFechaRango({
    isOpen,
    ofertanteNombre,
    fechasDisponibles,
    horarioUsuario,
    onConfirmar,
    onCerrar,
}: Props) {
    const { formatDate } = useFormatters();
    const [fechaSeleccionada, setFechaSeleccionada] = useState<string>('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            Seleccioná el día que te conviene
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Se acordará con {ofertanteNombre} por chat
                        </p>
                    </div>
                    <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                    {fechasDisponibles.map((f) => (
                        <button
                            key={f.fecha}
                            type="button"
                            onClick={() => setFechaSeleccionada(f.fecha)}
                            className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                                fechaSeleccionada === f.fecha
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            <span className="font-medium">{formatDate(f.fecha)}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">· {horarioUsuario}</span>
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onCerrar}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => fechaSeleccionada && onConfirmar(fechaSeleccionada, horarioUsuario)}
                        disabled={!fechaSeleccionada}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}