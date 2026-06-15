'use client';

import { Gift, RefreshCw } from 'lucide-react';
import Can from '../Can';

interface Props {
    onNuevaOferta: () => void;
    onNuevaSolicitud: () => void;
}

export function AccionesPrincipales({ onNuevaOferta, onNuevaSolicitud }: Props) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Can do="ofertar_turno">
                <button
                    onClick={onNuevaOferta}
                    className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl p-6 text-center transition-all group"
                >
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <Gift className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Nueva oferta</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Publicá en el tablero</p>
                </button>
            </Can>

            <Can do="enviar_solicitud_directa">
                <button
                    onClick={onNuevaSolicitud}
                    className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 rounded-xl p-6 text-center transition-all group"
                >
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <RefreshCw className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Solicitud de cambio de turno</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">A un compañero específico</p>
                </button>
            </Can>
        </div>
    );
}