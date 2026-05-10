'use client';

import { History, RefreshCw, Gift, ArrowRight } from 'lucide-react';
import { useFormatters } from '@/hooks/useFormatters';
import { TipoSolicitud } from '@/app/lib/enum';
import { useState } from 'react';
import { Paginacion } from './Paginacion';

function ModalConfirmarCancelar({ onConfirmar, onCerrar }: { onConfirmar: () => void; onCerrar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
          ¿Cancelar solicitud?
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Esta acción cancelará la solicitud de autorización. El jefe ya no la verá y la oferta volverá a estar disponible.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            No, volver
          </button>
          <button
            onClick={onConfirmar}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Sí, cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

interface FechaAcordada {
  fecha: string;
  tomadorId: string;
  tomadorNombre: string;
  tomadorApellido: string;
  autorizacionId?: string;
  estadoAutorizacion?: string;
}

interface Props {
  ofertas: any[];
  solicitudesDirectas: any[];
  userId?: string;
  onTomarOferta: (id: string) => void;
  onCancelarAutorizacion: (autorizacionId: string) => void;
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; className: string }> = {
    COMPLETADO: { label: 'Completado', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    APROBADO: { label: 'Pendiente de jefe', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    CANCELADO: { label: 'Cancelado', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    RECHAZADO: { label: 'Rechazado', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    DISPONIBLE: { label: 'En espera', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    SOLICITADO: { label: 'Pendiente de respuesta', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  };
  const s = map[estado] || { label: estado, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

export function HistoricoTab({ ofertas, solicitudesDirectas, userId, onTomarOferta, onCancelarAutorizacion }: Props) {
  const { formatDate, formatTimeAgo } = useFormatters();
  const [autorizacionAConfirmar, setAutorizacionAConfirmar] = useState<string | null>(null);

  const ofertasHistorico = ofertas.filter(o => {
    const soyOfertante = o.ofertante?.id === userId;
    const soyTomador = o.tomador?.id === userId;
    if (['COMPLETADO', 'APROBADO', 'DISPONIBLE', 'SOLICITADO'].includes(o.estado)) {
      return soyOfertante || soyTomador;
    }
    if (o.estado === 'CANCELADO') return soyOfertante;
    return false;
  });

  const solicitudesHistorico = solicitudesDirectas.filter(s => {
    if (s.origen === 'TABLERO') return false;
    return s.solicitante?.id === userId || s.destinatario?.id === userId;
  });

  const items = [
    ...ofertasHistorico.map(o => ({ tipo: 'oferta' as const, data: o, fecha: o.publicado })),
    ...solicitudesHistorico.map(s => ({ tipo: 'solicitud' as const, data: s, fecha: s.fechaSolicitud })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  const totalPaginas = Math.ceil(items.length / porPagina);
  const itemsPaginados = items.slice((pagina - 1) * porPagina, pagina * porPagina);

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="font-medium text-gray-700 dark:text-gray-300">Sin historial todavía</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Acá vas a ver tus cambios completados y cancelados
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        {items.length} {items.length === 1 ? 'cambio' : 'cambios'} en tu historial
      </p>

      {itemsPaginados.map((item, idx) => {
        if (item.tipo === 'oferta') {
          const oferta = item.data;
          const soyOfertante = oferta.ofertante?.id === userId;
          const esIntercambio = oferta.modalidadBusqueda === TipoSolicitud.INTERCAMBIO;
          const otraParte = soyOfertante ? oferta.tomador : oferta.ofertante;

          return (
            <div
              key={`oferta-${oferta.id}`}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${esIntercambio
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                    }`}>
                    {esIntercambio ? <RefreshCw className="h-3 w-3" /> : <Gift className="h-3 w-3" />}
                    {esIntercambio ? 'Intercambio' : oferta.estado === 'COMPLETADO' ? 'Oferta de cobertura completada' : 'Oferta abierta'}
                  </span>
                  <EstadoBadge estado={oferta.estado} />
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatTimeAgo(oferta.publicado)}
                </span>
              </div>

              {/* Resumen */}
              {esIntercambio && oferta.turnoOfrece ? (
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 my-2">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {soyOfertante ? 'Ofreciste' : 'Recibiste'}
                    </p>
                    <p className="font-medium">{formatDate(oferta.turnoOfrece.fecha)}</p>
                    <p className="text-[10px] text-gray-500">{oferta.turnoOfrece.horario}</p>
                  </div>
                  {(oferta.turnosBusca?.length > 0 || (oferta.fechaDesde && oferta.fechaHasta)) && (
                    <>
                      <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {soyOfertante ? 'A cambio de' : 'Diste'}
                        </p>
                        {oferta.fechaDesde && oferta.fechaHasta ? (
                          <>
                            <p className="font-medium text-xs">Del {formatDate(oferta.fechaDesde)}</p>
                            <p className="font-medium text-xs">al {formatDate(oferta.fechaHasta)}</p>
                            {oferta.horarioRango && <p className="text-[10px] text-gray-500">{oferta.horarioRango}</p>}
                          </>
                        ) : oferta.turnosBusca.length === 1 ? (
                          <>
                            <p className="font-medium">{formatDate(oferta.turnosBusca[0].fecha)}</p>
                            <p className="text-[10px] text-gray-500">{oferta.turnosBusca[0].horario}</p>
                          </>
                        ) : (
                          <p className="font-medium">{oferta.turnosBusca.length} fechas</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="my-2">
                  {/* Fechas ya acordadas */}
                  {oferta.fechasAcordadas?.length > 0 && (
                    <div className="space-y-2 mb-1">
                      {oferta.fechasAcordadas.map((fa: FechaAcordada, i: number) => {
                        const puedeCancelar =
                          fa.autorizacionId &&
                          fa.estadoAutorizacion === 'PENDIENTE' &&
                          (soyOfertante || fa.tomadorId === userId);
                        return (
                          <div key={i} className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              📅 {formatDate(fa.fecha)} con {fa.tomadorNombre} {fa.tomadorApellido}
                              {fa.estadoAutorizacion === 'PENDIENTE' && (
                                <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">— pendiente de aprobación</span>
                              )}
                              {fa.estadoAutorizacion === 'APROBADA' && (
                                <span className="ml-2 text-xs text-green-600 dark:text-green-400">— aprobado</span>
                              )}
                              {fa.estadoAutorizacion === 'CANCELADA' && (
                                <span className="ml-2 text-xs text-red-500 dark:text-red-400">— cancelado</span>
                              )}
                            </p>
                            {puedeCancelar && (
                              <button
                                onClick={() => setAutorizacionAConfirmar(fa.autorizacionId!)}
                                className="shrink-0 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Rango de fechas */}
                  {oferta.fechaDesde && oferta.fechaHasta && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Del {formatDate(oferta.fechaDesde)} al {formatDate(oferta.fechaHasta)}
                      {oferta.horarioRango && ` · ${oferta.horarioRango}`}
                    </p>
                  )}

                  {/* Fechas todavía disponibles */}
                  {!oferta.fechaDesde && oferta.fechasDisponibles?.length > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {oferta.fechasDisponibles.length === 1
                        ? `${formatDate(oferta.fechasDisponibles[0].fecha)} — disponible`
                        : `${oferta.fechasDisponibles.length} fechas disponibles`
                      }
                    </p>
                  )}
                </div>
              )}

              {/* Estado autorización — para intercambio (cobertura lo muestra por fechasAcordadas) */}
              {esIntercambio && oferta.estadoAutorizacion && (
                <div className={`mt-2 text-xs px-2 py-1 rounded inline-flex items-center gap-1 ${
                  oferta.estadoAutorizacion === 'APROBADA'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : oferta.estadoAutorizacion === 'RECHAZADA'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                }`}>
                  {oferta.estadoAutorizacion === 'APROBADA'
                    ? '✅ Aprobado por el jefe'
                    : oferta.estadoAutorizacion === 'RECHAZADA'
                      ? '❌ Rechazado por el jefe'
                      : '⏳ Pendiente de aprobación del jefe'}
                </div>
              )}

              {/* Con quién — solo si no hay fechasAcordadas */}
              {!oferta.fechasAcordadas?.length && otraParte?.nombre && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Con {otraParte.nombre} {otraParte.apellido}
                </p>
              )}

              {oferta.descripcion && (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-1">
                  "{oferta.descripcion}"
                </p>
              )}

              {['DISPONIBLE', 'SOLICITADO'].includes(oferta.estado) && !soyOfertante && (
                <button
                  onClick={() => onTomarOferta(oferta.id)}
                  className="mt-3 w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Tomar oferta
                </button>
              )}

              {/* Estado de espera o aprobación — solo si ninguna fechaAcordada tiene estadoAutorizacion */}
              {oferta.fechasAcordadas?.length > 0 && !oferta.fechasAcordadas[0]?.estadoAutorizacion && (
                <div className={`mt-2 text-xs px-2 py-1 rounded inline-flex items-center gap-1 ${oferta.estadoAutorizacion === 'APROBADA'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                  }`}>
                  {oferta.estadoAutorizacion === 'APROBADA'
                    ? '✅ Fecha acordada aprobada por el jefe'
                    : '⏳ Fecha acordada pendiente de aprobación del jefe'}
                </div>
              )}

              {['DISPONIBLE', 'SOLICITADO'].includes(oferta.estado) && soyOfertante && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  {oferta.fechasAcordadas?.length > 0
                    ? 'Todavía hay fechas disponibles esperando tomador'
                    : 'Esperando que alguien tome tu oferta'}
                </p>
              )}
            </div>
          );
        }

        // Solicitud directa
        const solicitud = item.data;
        const soyElSolicitante = solicitud.solicitante?.id === userId;
        const otraParte = soyElSolicitante ? solicitud.destinatario : solicitud.solicitante;

        return (
          <div
            key={`solicitud-${solicitud.id}`}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  Solicitud directa
                </span>
                <EstadoBadge estado={solicitud.estado} />
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatTimeAgo(solicitud.fechaSolicitud)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 my-2">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {soyElSolicitante ? 'Ofreciste' : 'Recibiste'}
                </p>
                <p className="font-medium">
                  {formatDate(soyElSolicitante
                    ? solicitud.turnoSolicitante?.fecha
                    : solicitud.turnoDestinatario?.fecha
                  )}
                </p>
              </div>

              {solicitud.turnoDestinatario ? (
                <>
                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {soyElSolicitante ? 'Pediste' : 'Diste'}
                    </p>
                    <p className="font-medium">
                      {formatDate(soyElSolicitante
                        ? solicitud.turnoDestinatario.fecha
                        : solicitud.turnoSolicitante?.fecha
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                  Cobertura
                </span>
              )}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Con {otraParte?.nombre} {otraParte?.apellido}
            </p>

            {['APROBADO', 'COMPLETADO'].includes(solicitud.estado) && (
              <div className={`mt-2 text-xs px-2 py-1 rounded inline-flex items-center gap-1 ${
                solicitud.estado === 'COMPLETADO'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
              }`}>
                {solicitud.estado === 'COMPLETADO'
                  ? '✅ Aprobado por el jefe'
                  : '⏳ Pendiente de aprobación del jefe'}
              </div>
            )}

            {solicitud.motivo && (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-1">
                "{solicitud.motivo}"
              </p>
            )}
          </div>
        );
      })}

      <Paginacion
        pagina={pagina}
        totalPaginas={totalPaginas}
        porPagina={porPagina}
        onCambiarPagina={setPagina}
        onCambiarPorPagina={setPorPagina}
      />

      {autorizacionAConfirmar && (
        <ModalConfirmarCancelar
          onConfirmar={() => {
            onCancelarAutorizacion(autorizacionAConfirmar);
            setAutorizacionAConfirmar(null);
          }}
          onCerrar={() => setAutorizacionAConfirmar(null)}
        />
      )}
    </div>
  );
}