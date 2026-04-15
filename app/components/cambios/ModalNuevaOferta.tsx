'use client';

import { useState, useCallback, useMemo } from 'react';
import { X, AlertCircle, Flame, Shield, RefreshCw, HandHelping, Search } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { GrupoTurno, esFechaValidaParaGrupo } from '@/app/lib/turnosUtils';
import { TipoSolicitud } from '@/app/lib/enum';
import type { NuevaOfertaForm, TipoOferta, Prioridad, ModalidadBusqueda } from '@/hooks/useOfertas';
import { useTurnosEfectivos } from '@/hooks/useTurnosEfectivos';
import { useFechasBloqueadas } from '@/hooks/useFechasBloqueadas';
import { FormularioOferta } from './FormularioOferta';

type ModoOferta =
  | 'OFREZCO_COBERTURA'
  | 'BUSCO_COBERTURA'
  | 'OFREZCO_INTERCAMBIO'
  | 'BUSCO_INTERCAMBIO';

const MODOS: {
  value: ModoOferta;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
}[] = [
    { value: 'OFREZCO_COBERTURA', label: 'Me ofrezco a cubrir', desc: 'Estoy disponible para cubrir turnos', icon: Shield, color: 'blue' },
    { value: 'BUSCO_COBERTURA', label: 'Necesito que me cubran', desc: 'Busco a alguien que cubra mi turno', icon: Search, color: 'orange' },
    { value: 'OFREZCO_INTERCAMBIO', label: 'Ofrezco intercambio', desc: 'Doy mi turno y pido otro a cambio', icon: RefreshCw, color: 'green' },
    { value: 'BUSCO_INTERCAMBIO', label: 'Necesito intercambio', desc: 'Busco cambiar mi turno por otro', icon: HandHelping, color: 'purple' },
  ];

const COLOR_CLASSES: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  blue: { border: 'border-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', icon: 'text-blue-600 dark:text-blue-400' },
  orange: { border: 'border-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', icon: 'text-orange-500 dark:text-orange-400' },
  green: { border: 'border-green-600', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', icon: 'text-green-600 dark:text-green-400' },
  purple: { border: 'border-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', icon: 'text-purple-600 dark:text-purple-400' },
};

function modoToTipoModalidad(modo: ModoOferta): { tipo: TipoOferta; modalidadBusqueda: ModalidadBusqueda } {
  switch (modo) {
    case 'OFREZCO_COBERTURA': return { tipo: 'OFREZCO', modalidadBusqueda: TipoSolicitud.ABIERTO as ModalidadBusqueda };
    case 'BUSCO_COBERTURA': return { tipo: 'BUSCO', modalidadBusqueda: TipoSolicitud.ABIERTO as ModalidadBusqueda };
    case 'OFREZCO_INTERCAMBIO': return { tipo: 'OFREZCO', modalidadBusqueda: TipoSolicitud.INTERCAMBIO as ModalidadBusqueda };
    case 'BUSCO_INTERCAMBIO': return { tipo: 'BUSCO', modalidadBusqueda: TipoSolicitud.INTERCAMBIO as ModalidadBusqueda };
  }
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (form: NuevaOfertaForm) => Promise<void>;
  ofertaEditando?: { id: string; form: NuevaOfertaForm } | null;
}

export function ModalNuevaOferta({ isOpen, onClose, onSubmit, ofertaEditando }: Props) {
  const { user } = useAuth();
  const { turnosEfectivos, fechasCedidas } = useTurnosEfectivos();
  const { fechasBloqueadas: fechasBloqueadasPropias } = useFechasBloqueadas();

  const HORARIOS = useMemo(() => {
    if (!user) return ['04:00-14:00', '06:00-16:00', '10:00-20:00', '13:00-23:00', '19:00-05:00'];
    if (user.rol === 'SUPERVISOR') return ['05:00-14:00', '14:00-23:00', '23:00-05:00'];
    return ['04:00-14:00', '06:00-16:00', '10:00-20:00', '13:00-23:00', '19:00-05:00'];
  }, [user]);

  const FORM_INICIAL: NuevaOfertaForm = useMemo(() => ({
    tipo: 'OFREZCO' as TipoOferta,
    modalidadBusqueda: TipoSolicitud.ABIERTO,
    fechaOfrece: '',
    horarioOfrece: user?.horario || HORARIOS[0],
    grupoOfrece: (user?.grupoTurno ?? 'A') as GrupoTurno,
    descripcion: '',
    prioridad: 'NORMAL' as Prioridad,
    fechasBusca: [{ fecha: '', horario: user?.horario || HORARIOS[0] }],
    fechasDisponibles: [{ fecha: '', horario: user?.horario || HORARIOS[0] }],
  }), [user, HORARIOS]);

  const modoInicial = useMemo((): ModoOferta => {
    if (!ofertaEditando) return 'OFREZCO_COBERTURA';
    const { tipo, modalidadBusqueda } = ofertaEditando.form;
    if (tipo === 'OFREZCO' && modalidadBusqueda === TipoSolicitud.ABIERTO) return 'OFREZCO_COBERTURA';
    if (tipo === 'BUSCO' && modalidadBusqueda === TipoSolicitud.ABIERTO) return 'BUSCO_COBERTURA';
    if (tipo === 'OFREZCO' && modalidadBusqueda === TipoSolicitud.INTERCAMBIO) return 'OFREZCO_INTERCAMBIO';
    return 'BUSCO_INTERCAMBIO';
  }, [ofertaEditando]);

  const [modo, setModo] = useState<ModoOferta>(modoInicial);
  const [form, setForm] = useState<NuevaOfertaForm>(ofertaEditando?.form || FORM_INICIAL);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fechasExtraUsuario = useMemo(
    () => turnosEfectivos.map((t: any) => t.fecha),
    [turnosEfectivos]
  );

  const esEdicion = !!ofertaEditando;
  const esIntercambio = modo === 'OFREZCO_INTERCAMBIO' || modo === 'BUSCO_INTERCAMBIO';
  const modoActual = MODOS.find(m => m.value === modo)!;
  const colors = COLOR_CLASSES[modoActual.color];

  const handleModoChange = (nuevoModo: ModoOferta) => {
    setModo(nuevoModo);
    const { tipo, modalidadBusqueda } = modoToTipoModalidad(nuevoModo);
    setForm(prev => ({ ...prev, tipo, modalidadBusqueda }));
    setError('');
  };

  const validate = useCallback((): string => {
    if (esIntercambio) {
      if (!form.fechaOfrece) return 'Seleccioná la fecha de tu turno';
      if (user && !esFechaValidaParaGrupo(new Date(form.fechaOfrece + 'T00:00:00'), user.grupoTurno as GrupoTurno)) {
        return `Ese día no corresponde a tu Guardia ${user.grupoTurno}`;
      }
      const fechasValidas = form.fechasBusca.filter(f => f.fecha.trim() !== '');
      if (fechasValidas.length === 0) return 'Agregá al menos una fecha';
    } else {
      const fechasValidas = form.fechasDisponibles.filter(f => f.fecha.trim() !== '');
      if (fechasValidas.length === 0) return 'Agregá al menos una fecha';
    }
    if (!form.descripcion || form.descripcion.trim().length < 10)
      return 'La descripción debe tener al menos 10 caracteres';
    return '';
  }, [form, esIntercambio, user]);

  const handleClose = useCallback(() => {
    setForm(FORM_INICIAL);
    setModo('OFREZCO_COBERTURA');
    setError('');
    onClose();
  }, [FORM_INICIAL, onClose]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const err = validate();
    if (err) return setError(err);
    setSubmitting(true);
    try {
      const { tipo, modalidadBusqueda } = modoToTipoModalidad(modo);
      await onSubmit({ ...form, tipo, modalidadBusqueda });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al publicar la oferta');
    } finally {
      setSubmitting(false);
    }
  }, [form, modo, validate, onSubmit, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Tablero de guardias</p>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {esEdicion ? 'Editar oferta' : 'Nueva oferta'}
            </h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 mt-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Selector de modo */}
          {!esEdicion && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">¿Qué necesitás?</label>
              <div className="grid grid-cols-2 gap-2">
                {MODOS.map(m => {
                  const c = COLOR_CLASSES[m.color];
                  const Icon = m.icon;
                  const activo = modo === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => handleModoChange(m.value)}
                      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border-2 text-left transition-all ${activo
                        ? `${c.border} ${c.bg}`
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                    >
                      <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${activo ? c.icon : 'text-gray-400'}`} />
                      <div>
                        <p className={`text-sm font-medium ${activo ? c.text : 'text-gray-700 dark:text-gray-300'}`}>{m.label}</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{m.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Formulario según modo */}
          <FormularioOferta
            modo={modo}
            colors={colors}
            form={form}
            horarios={HORARIOS}
            user={user}
            turnosEfectivos={turnosEfectivos}
            fechasExtraUsuario={fechasExtraUsuario}
            fechasCedidas={fechasCedidas}
            fechasBloqueadasPropias={fechasBloqueadasPropias}
            onFechaOfrecerChange={(v: string) => {
              const turnoEfectivo = turnosEfectivos.find((t: any) => t.fecha === v);
              setForm(prev => ({
                ...prev,
                fechaOfrece: v,
                horarioOfrece: turnoEfectivo?.horario_efectivo || user?.horario || '',
                grupoOfrece: (turnoEfectivo?.grupo_efectivo || user?.grupoTurno || 'A') as GrupoTurno,
              }));
            }}
            onUpdateFechaBusca={(index: number, field: 'fecha' | 'horario', value: string) => {
              setForm(prev => {
                const updated = [...prev.fechasBusca];
                updated[index] = { ...updated[index], [field]: value };
                return { ...prev, fechasBusca: updated };
              });
            }}
            onUpdateFechaDisponible={(index: number, field: 'fecha' | 'horario', value: string) => {
              setForm(prev => {
                const updated = [...prev.fechasDisponibles];
                updated[index] = { ...updated[index], [field]: value };
                return { ...prev, fechasDisponibles: updated };
              });
            }}
            onAddFechaBusca={() => setForm(prev => ({ ...prev, fechasBusca: [...prev.fechasBusca, { fecha: '', horario: HORARIOS[0] }] }))}
            onRemoveFechaBusca={(index: number) => setForm(prev => ({ ...prev, fechasBusca: prev.fechasBusca.filter((_, i) => i !== index) }))}
            onAddFechaDisponible={(horario?: string) => setForm(prev => ({ ...prev, fechasDisponibles: [...prev.fechasDisponibles, { fecha: '', horario: horario || HORARIOS[0] }] }))}
            onRemoveFechaDisponible={(index: number) => setForm(prev => ({ ...prev, fechasDisponibles: prev.fechasDisponibles.filter((_, i) => i !== index) }))}
          />

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Descripción</label>
            <textarea
              rows={2}
              required
              value={form.descripcion}
              onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Describí los detalles de tu oferta..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm resize-none"
            />
          </div>

          {/* Urgente */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.prioridad === 'URGENTE' as Prioridad}
              onChange={e => setForm(prev => ({ ...prev, prioridad: (e.target.checked ? 'URGENTE' : 'NORMAL') as Prioridad }))}
              className="w-4 h-4 rounded border-gray-300 text-red-600"
            />
            <Flame className="h-4 w-4 text-red-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Marcar como urgente</span>
          </label>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${modoActual.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                modoActual.color === 'orange' ? 'bg-orange-500 hover:bg-orange-600' :
                  modoActual.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
                    'bg-purple-600 hover:bg-purple-700'
                }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {esEdicion ? 'Actualizando...' : 'Publicando...'}
                </>
              ) : esEdicion ? 'Actualizar oferta' : 'Publicar oferta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}