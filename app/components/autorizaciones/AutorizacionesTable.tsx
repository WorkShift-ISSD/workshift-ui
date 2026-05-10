'use client';

// app/components/autorizaciones/AutorizacionesTable.tsx
import { useState } from 'react';
import { Check, X, Eye, Clock, AlertTriangle } from 'lucide-react';
import { Autorizacion } from '@/app/api/types';
import { useFormatters } from '@/hooks/useFormatters';
import { ModalAutorizacion } from './ModalAutorizacion';
import { ImpactoBadge, Impacto } from './ImpactoBadge';

interface Props {
  autorizaciones: Autorizacion[];
  loading:        boolean;
  onAprobar:      (id: string, observaciones?: string) => Promise<void>;
  onRechazar:     (id: string, observaciones: string)  => Promise<void>;
  // Mapa opcional de id → impacto calculado (lo provee useDashboardJefe)
  // Si no se pasa, la columna de impacto no se muestra
  impactoMap?:    Record<string, Impacto>;
}

export function AutorizacionesTable({
  autorizaciones,
  loading,
  onAprobar,
  onRechazar,
  impactoMap,
}: Props) {
  const [modalOpen, setModalOpen]                         = useState(false);
  const [autorizacionSeleccionada, setAutorizacionSeleccionada] =
    useState<Autorizacion | null>(null);

  const { formatFechaSafe } = useFormatters();

  const mostrarImpacto = !!impactoMap;

  const abrirDetalle = (autorizacion: Autorizacion) => {
    setAutorizacionSeleccionada(autorizacion);
    setModalOpen(true);
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'CAMBIO_TURNO':        return 'Cambio de Turno';
      case 'LICENCIA_ORDINARIA':  return 'Licencia Ordinaria';
      default:                    return tipo;
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return (
          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3" /> Pendiente
          </span>
        );
      case 'APROBADA':
        return (
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
            <Check className="w-3 h-3" /> Aprobada
          </span>
        );
      case 'RECHAZADA':
        return (
          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
            <X className="w-3 h-3" /> Rechazada
          </span>
        );
      case 'CANCELADA':
        return (
          <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium w-fit">
            Cancelada
          </span>
        );
      default:
        return <span>{estado}</span>;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          Cargando autorizaciones...
        </div>
      </div>
    );
  }

  if (autorizaciones.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No hay autorizaciones</p>
          <p className="text-sm mt-1">
            Cuando los empleados soliciten cambios o licencias, aparecerán aquí
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-3 text-left text-gray-700 dark:text-gray-400">Tipo</th>
                <th className="p-3 text-left text-gray-700 dark:text-gray-400">Empleado</th>
                <th className="p-3 text-left text-gray-700 dark:text-gray-400">Fecha Solicitud</th>
                {mostrarImpacto && (
                  <th className="p-3 text-left text-gray-700 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      Impacto en cobertura
                    </span>
                  </th>
                )}
                <th className="p-3 text-center text-gray-700 dark:text-gray-400">Estado</th>
                <th className="p-3 text-center text-gray-700 dark:text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {autorizaciones.map((auth, index) => {
                const impacto     = impactoMap?.[auth.id];
                const esIntercambio = !!auth.solicitudId;
                // Últimas 3 filas abren el tooltip hacia abajo para no salir de la tabla
                const direction   = index >= autorizaciones.length - 3 ? 'down' : 'up';

                return (
                  <tr
                    key={auth.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    <td className="p-3 text-gray-900 dark:text-white font-medium">
                      {getTipoLabel(auth.tipo)}
                    </td>
                    <td className="p-3 text-gray-900 dark:text-white">
                      {auth.empleado
                        ? `${auth.empleado.apellido}, ${auth.empleado.nombre}`
                        : 'N/A'}
                    </td>
                    <td className="p-3 text-gray-900 dark:text-white">
                      {formatFechaSafe(auth.createdAt)}
                    </td>
                    {mostrarImpacto && (
                      <td className="p-3">
                        {impacto ? (
                          <ImpactoBadge
                            impacto={impacto}
                            empRol={auth.empleado?.rol}
                            empGrupo={(auth.empleado as any)?.grupoTurno}
                            esIntercambio={esIntercambio}
                            direction={direction}
                          />
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                        )}
                      </td>
                    )}
                    <td className="p-3">
                      <div className="flex justify-center">
                        {getEstadoBadge(auth.estado)}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => abrirDetalle(auth)}
                          title="Ver detalle"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ModalAutorizacion
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        autorizacion={autorizacionSeleccionada}
        onAprobar={onAprobar}
        onRechazar={onRechazar}
      />
    </>
  );
}