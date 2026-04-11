'use client';

import { TrendingUp, ArrowLeftRight, Gift, Flame, MessageSquare, Search } from 'lucide-react';

interface Props {
    totalSinLeer: number;
    enNegociacionComoOfertante: number;
    enNegociacionComoInteresado: number;
    solicitudesRecibidas: number;
    misOfertas: number;
    ofertasDisponibles: number;
    ofertasUrgentes: number;
}

export function StatsBar({
    totalSinLeer,
    enNegociacionComoOfertante,
    enNegociacionComoInteresado,
    solicitudesRecibidas,
    misOfertas,
    ofertasDisponibles,
    ofertasUrgentes,
}: Props) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">

            {/* Mensajes sin leer */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-start justify-between min-h-[88px]">
                <div>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalSinLeer}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Mensajes sin leer</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    {totalSinLeer > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                            {totalSinLeer > 9 ? '9+' : totalSinLeer}
                        </span>
                    )}
                </div>
            </div>

            {/* En negociación */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-start justify-between min-h-[88px]">
                <div>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {enNegociacionComoOfertante + enNegociacionComoInteresado}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">En negociación</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {enNegociacionComoOfertante} oferente. · {enNegociacionComoInteresado} interesado
                    </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <ArrowLeftRight className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
            </div>

            {/* Solicitudes recibidas */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-start justify-between min-h-[88px]">
                <div>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{solicitudesRecibidas}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Solicitudes recibidas</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
            </div>

            {/* Mis ofertas activas */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-start justify-between min-h-[88px]">
                <div>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{misOfertas}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Mis ofertas activas</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Gift className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
            </div>

            {/* Disponibles */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-start justify-between min-h-[88px]">
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{ofertasDisponibles}</p>
                        {ofertasUrgentes > 0 && (
                            <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400">
                                <Flame className="h-4 w-4" />
                                <span className="text-sm font-bold">{ofertasUrgentes}</span>
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Disponibles</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Search className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
            </div>

        </div>
    );
}