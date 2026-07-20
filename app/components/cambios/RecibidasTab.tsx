'use client';

import { MessageSquare, Check, X } from 'lucide-react';
import { useFormatters } from '@/hooks/useFormatters';
import { useState } from 'react';
import { Paginacion } from './Paginacion';

interface Props {
  solicitudesRecibidas: any[];
  onAceptar: (id: string) => void;
  onRechazar: (id: string) => void;
}

export function RecibidasTab({ solicitudesRecibidas, onAceptar, onRechazar }: Props) {
  const { formatDate, formatTimeAgo } = useFormatters();
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(5);

  const totalPaginas = Math.ceil(solicitudesRecibidas.length / porPagina);
  const solicitudesPaginadas = solicitudesRecibidas.slice((pagina - 1) * porPagina, pagina * porPagina);



  if (solicitudesRecibidas.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="font-medium text-gray-700 dark:text-gray-300">Sin solicitudes pendientes</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Cuando alguien te pida un cambio, aparecerá acá
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {solicitudesRecibidas.length}{' '}
        {solicitudesRecibidas.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}
      </p>

      {solicitudesPaginadas.map(solicitud => (
        <div
          key={solicitud.id}
          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {solicitud.solicitante.nombre} {solicitud.solicitante.apellido}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {formatTimeAgo(solicitud.fechaSolicitud)}
              </p>
            </div>
            {solicitud.prioridad === 'URGENTE' && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                Urgente
              </span>
            )}
          </div>

          {/* Turnos • mismo layout que el formulario papel */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-100 dark:border-blue-900">
              <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1.5">
                Te ofrece
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatDate(solicitud.turnoSolicitante.fecha)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {solicitud.turnoSolicitante.horario}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Guardia {solicitud.turnoSolicitante.grupoTurno}
              </p>
            </div>

            {solicitud.turnoDestinatario ? (
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-100 dark:border-green-900">
                <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-1.5">
                  Por tu guardia
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(solicitud.turnoDestinatario.fecha)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {solicitud.turnoDestinatario.horario}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Guardia {solicitud.turnoDestinatario.grupoTurno}
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Cobertura
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Te piden que cubras su turno sin dar otro a cambio
                </p>
              </div>
            )}
          </div>

          {solicitud.motivo && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-3">
              "{solicitud.motivo}"
            </p>
          )}

          {/* Acciones • menos agresivas visualmente */}
          <div className="flex gap-2">
            <button
              onClick={() => onAceptar(solicitud.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
            >
              <Check className="h-4 w-4" />
              Aceptar
            </button>
            <button
              onClick={() => onRechazar(solicitud.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <X className="h-4 w-4" />
              Rechazar
            </button>
          </div>
        </div>
      ))}

      <Paginacion
        pagina={pagina}
        totalPaginas={totalPaginas}
        porPagina={porPagina}
        onCambiarPagina={setPagina}
        onCambiarPorPagina={setPorPagina}
      />

    </div>
  );
}