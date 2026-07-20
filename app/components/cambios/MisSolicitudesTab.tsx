'use client';

import { Pencil, X, RefreshCw, Gift, Clock, CheckCircle } from 'lucide-react';
import { useFormatters } from '@/hooks/useFormatters';
import { TipoSolicitud } from '@/app/lib/enum';
import { useState } from 'react';
import { Paginacion } from './Paginacion';

interface Props {
  misOfertas: any[];
  solicitudesEnviadas: any[];
  onEditarOferta: (oferta: any) => void;
  onCancelarOferta: (id: string) => void;
  onEditarSolicitud: (solicitud: any) => void;
  onCancelarSolicitud: (id: string) => void;
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; className: string }> = {
    SOLICITADO: { label: 'Pendiente', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
    APROBADO: { label: 'Aceptado', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    COMPLETADO: { label: 'Completado', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    CANCELADO: { label: 'Cancelado', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    EXPIRADO: { label: 'Vencida', className: 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400' },
  };
  const s = map[estado] || { label: estado, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

export function MisSolicitudesTab({
  misOfertas,
  solicitudesEnviadas,
  onEditarOferta,
  onCancelarOferta,
  onEditarSolicitud,
  onCancelarSolicitud,
}: Props) {
  const { formatDate, formatFechaSafe, formatTimeAgo } = useFormatters();


  const solicitudesActivas = solicitudesEnviadas.filter(s =>
    ['SOLICITADO', 'APROBADO'].includes(s.estado)
  );

  const [paginaOfertas, setPaginaOfertas] = useState(1);
  const [porPaginaOfertas, setPorPaginaOfertas] = useState(5);
  const [paginaSolicitudes, setPaginaSolicitudes] = useState(1);
  const [porPaginaSolicitudes, setPorPaginaSolicitudes] = useState(5);

  const totalPaginasOfertas = Math.ceil(misOfertas.length / porPaginaOfertas);
  const ofertasPaginadas = misOfertas.slice((paginaOfertas - 1) * porPaginaOfertas, paginaOfertas * porPaginaOfertas);

  const totalPaginasSolicitudes = Math.ceil(solicitudesActivas.length / porPaginaSolicitudes);
  const solicitudesPaginadas = solicitudesActivas.slice((paginaSolicitudes - 1) * porPaginaSolicitudes, paginaSolicitudes * porPaginaSolicitudes);

  const isEmpty = misOfertas.length === 0 && solicitudesActivas.length === 0;


  if (isEmpty) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="font-medium text-gray-700 dark:text-gray-300">Sin solicitudes activas</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Publicá una oferta o enviá una solicitud directa
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Mis ofertas publicadas */}
      {misOfertas.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Mis ofertas publicadas
          </h3>
          <div className="space-y-3">
            {ofertasPaginadas.map(oferta => {
              const esIntercambio = oferta.modalidadBusqueda === TipoSolicitud.INTERCAMBIO;
              return (
                <div
                  key={oferta.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${esIntercambio
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        }`}>
                        {esIntercambio
                          ? <><RefreshCw className="h-3 w-3" /> Intercambio</>
                          : <><Gift className="h-3 w-3" /> Abierto</>
                        }
                      </span>
                      {oferta.prioridad === 'URGENTE' && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                          Urgente
                        </span>
                      )}
                      {oferta.estado === 'EXPIRADO' && (
                        <EstadoBadge estado="EXPIRADO" />
                      )}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatTimeAgo(oferta.publicado)}
                    </span>
                  </div>

                  {/* Resumen de turnos */}
                  {esIntercambio && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-1 flex-wrap">
                      {oferta.tipo === 'OFREZCO' ? (
                        // OFREZCO_INTERCAMBIO: muestra lo que se ofrece a hacer → lo que quiere que le cubren
                        <>
                          <span className="font-medium text-blue-700 dark:text-blue-400">
                            {oferta.fechaDesde && oferta.fechaHasta
                              ? `Del ${formatDate(oferta.fechaDesde)} al ${formatDate(oferta.fechaHasta)}`
                              : formatDate(oferta.turnosBusca?.[0]?.fecha)
                            }
                          </span>
                          {oferta.turnoOfrece && (
                            <>
                              <span className="text-gray-400 mx-1">→</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                a cambio de que le cubran el {formatDate(oferta.turnoOfrece.fecha)} · {oferta.turnoOfrece.horario}
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        // BUSCO_INTERCAMBIO: muestra el turno que necesita cambiar → lo que ofrece a cambio
                        <>
                          <span className="font-medium text-blue-700 dark:text-blue-400">
                            {formatDate(oferta.turnosBusca?.[0]?.fecha)}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">{oferta.turnosBusca?.[0]?.horario}</span>
                          <span className="text-gray-400 mx-1">→</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {oferta.fechaDesde && oferta.fechaHasta
                              ? `ofrece ir del ${formatDate(oferta.fechaDesde)} al ${formatDate(oferta.fechaHasta)}`
                              : `ofrece ir el ${formatDate(oferta.fechasDisponibles?.[0]?.fecha)}`
                            }
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {!esIntercambio && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {oferta.fechaDesde && oferta.fechaHasta
                        ? `Del ${formatDate(oferta.fechaDesde)} al ${formatDate(oferta.fechaHasta)}`
                        : oferta.fechasDisponibles?.length > 0
                          ? oferta.fechasDisponibles.length === 1
                            ? formatDate(oferta.fechasDisponibles[0].fecha)
                            : `${oferta.fechasDisponibles.length} fechas disponibles`
                          : null
                      }
                    </div>
                  )}

                  {oferta.descripcion && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-3">
                      "{oferta.descripcion}"
                    </p>
                  )}

                  {/* Acciones */}
                  {oferta.estado !== 'EXPIRADO' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => onEditarOferta(oferta)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Pencil className="h-3 w-3" /> Editar
                      </button>
                      <button
                        onClick={() => onCancelarOferta(oferta.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <X className="h-3 w-3" /> Cancelar oferta
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Solicitudes directas enviadas */}
      {solicitudesActivas.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Solicitudes de cambio enviadas
          </h3>
          <div className="space-y-3">
            {solicitudesPaginadas.map(solicitud => (
              <div
                key={solicitud.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {solicitud.destinatario.nombre} {solicitud.destinatario.apellido}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatTimeAgo(solicitud.fechaSolicitud)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {solicitud.prioridad === 'URGENTE' && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        Urgente
                      </span>
                    )}
                    <EstadoBadge estado={solicitud.estado} />
                  </div>
                </div>

                {/* Resumen del intercambio — compacto */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded p-2.5 border border-blue-100 dark:border-blue-900">
                    <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mb-1">Ofrezco</p>
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(solicitud.turnoSolicitante?.fecha)}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {solicitud.turnoSolicitante?.horario} · Guardia {solicitud.turnoSolicitante?.grupoTurno}
                    </p>
                  </div>

                  {solicitud.turnoDestinatario ? (
                    <div className="bg-green-50 dark:bg-green-950/20 rounded p-2.5 border border-green-100 dark:border-green-900">
                      <p className="text-[10px] font-medium text-green-600 dark:text-green-400 mb-1">Pido</p>
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(solicitud.turnoDestinatario.fecha)}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {solicitud.turnoDestinatario.horario} · Guardia {solicitud.turnoDestinatario.grupoTurno}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-900/20 rounded p-2.5 border border-gray-100 dark:border-gray-800">
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Cobertura</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Sin turno a cambio</p>
                    </div>
                  )}
                </div>

                {solicitud.motivo && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-3">
                    "{solicitud.motivo}"
                  </p>
                )}

                {solicitud.estado === 'APROBADO' && (
                  <div className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded px-3 py-2 mb-3">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Aceptado · Pendiente de autorización del jefe
                  </div>
                )}

                {solicitud.estado === 'SOLICITADO' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEditarSolicitud(solicitud)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </button>
                    <button
                      onClick={() => onCancelarSolicitud(solicitud.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <X className="h-3 w-3" /> Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <Paginacion pagina={paginaSolicitudes}
        totalPaginas={totalPaginasSolicitudes}
        porPagina={porPaginaSolicitudes}
        onCambiarPagina={setPaginaSolicitudes}
        onCambiarPorPagina={setPorPaginaSolicitudes}
      />

    </div>
  );
}