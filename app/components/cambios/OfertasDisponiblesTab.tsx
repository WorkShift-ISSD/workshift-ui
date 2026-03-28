'use client';

import { Gift, RefreshCw, ArrowRight, X } from 'lucide-react';
import { useFormatters } from '@/hooks/useFormatters';
import { TipoSolicitud } from '@/app/lib/enum';

interface Props {
  ofertas: any[];
  onMeInteresa: (id: string) => void;
}

export function OfertasDisponiblesTab({ ofertas, onMeInteresa }: Props) {  const { formatDate, formatTimeAgo } = useFormatters();

  if (ofertas.length === 0) {
    return (
      <div className="text-center py-12">
        <Gift className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="font-medium text-gray-700 dark:text-gray-300">No hay ofertas disponibles</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Cuando alguien publique una oferta, aparecerá acá
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {ofertas.length} {ofertas.length === 1 ? 'oferta disponible' : 'ofertas disponibles'}
      </p>

      {ofertas.map(oferta => {
        const esIntercambio = oferta.modalidadBusqueda === TipoSolicitud.INTERCAMBIO;

        return (
          <div
            key={oferta.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {oferta.ofertante?.nombre} {oferta.ofertante?.apellido}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {formatTimeAgo(oferta.publicado)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {oferta.prioridad === 'URGENTE' && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    Urgente
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${esIntercambio
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  }`}>
                  {esIntercambio
                    ? <><RefreshCw className="h-3 w-3" /> Intercambio</>
                    : <><Gift className="h-3 w-3" /> Abierto</>
                  }
                </span>
              </div>
            </div>

            {/* Contenido según tipo */}
            {esIntercambio && oferta.turnoOfrece ? (
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1 bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-100 dark:border-blue-900">
                  <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                    Ofrece
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(oferta.turnoOfrece.fecha)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {oferta.turnoOfrece.horario} · Guardia {oferta.turnoOfrece.grupoTurno}
                  </p>
                </div>

                {oferta.turnosBusca?.length > 0 && (
                  <>
                    <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-4" />
                    <div className="flex-1 bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-100 dark:border-green-900">
                      <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-1">
                        {oferta.turnosBusca.length === 1 ? 'Pide' : `Pide (${oferta.turnosBusca.length} opciones)`}
                      </p>
                      {oferta.turnosBusca.slice(0, 2).map((t: any, i: number) => (
                        <div key={i} className={i > 0 ? 'mt-1 pt-1 border-t border-green-100 dark:border-green-900' : ''}>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatDate(t.fecha)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t.horario}</p>
                        </div>
                      ))}
                      {oferta.turnosBusca.length > 2 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          +{oferta.turnosBusca.length - 2} más
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : oferta.fechasDisponibles?.length > 0 ? (
              <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 border border-purple-100 dark:border-purple-900 mb-3">
                <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-1.5">
                  Fechas disponibles
                </p>
                <div className="flex flex-wrap gap-2">
                  {oferta.fechasDisponibles.map((f: any, i: number) => (
                    <span
                      key={i}
                      className="text-xs bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 rounded px-2 py-0.5 text-gray-700 dark:text-gray-300"
                    >
                      {formatDate(f.fecha)} · {f.horario}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {oferta.descripcion && (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-3">
                "{oferta.descripcion}"
              </p>
            )}

            {/* Acciones */}
            <div className="flex gap-2">
              <button
                onClick={() => onMeInteresa(oferta.id)}
                className=" px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Me interesa
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}