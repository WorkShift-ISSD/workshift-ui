'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, AlertCircle, Flame, RefreshCw, Shield } from 'lucide-react';
import { CustomDatePicker } from '../CustomDatePicker';
import { useAuth } from '@/app/context/AuthContext';
import { GrupoTurno } from '@/app/lib/turnosUtils';
import type { SolicitudDirectaForm } from '@/hooks/useSolicitudesDirectas';
import { useTurnosEfectivos } from '@/hooks/useTurnosEfectivos';
import { useFechasBloqueadas } from '@/hooks/useFechasBloqueadas';
import { useRef } from 'react';
import { Search } from 'lucide-react';
import { LoadingSpinner } from '../LoadingSpinner';


type TipoCambio = 'INTERCAMBIO' | 'COBERTURA';

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
  horario: string;
  grupoTurno: GrupoTurno;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (form: SolicitudDirectaForm) => Promise<void>;
  solicitudEditando?: {
    id: string;
    form: SolicitudDirectaForm;
    nombreDestinatario: string;
  } | null;
}

const FORM_VACIO: SolicitudDirectaForm = {
  solicitanteId: '',
  destinatarioId: '',
  fechaSolicitante: '',
  horarioSolicitante: '',
  grupoSolicitante: 'A',
  fechaDestinatario: '',
  horarioDestinatario: '',
  grupoDestinatario: 'A',
  motivo: '',
  prioridad: 'NORMAL',
};

export function ModalSolicitudDirecta({ isOpen, onClose, onSubmit, solicitudEditando }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<SolicitudDirectaForm>(FORM_VACIO);
  const [tipoCambio, setTipoCambio] = useState<TipoCambio>('INTERCAMBIO');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { turnosEfectivos, fechasCedidas } = useTurnosEfectivos();
  const { fechasBloqueadas: fechasBloqueadasPropias } = useFechasBloqueadas();
  const [turnosEfectivosCompanero, setTurnosEfectivosCompanero] = useState<string[]>([]);


  // Fechas extra del usuario — días que ganó por intercambios previos
  const fechasExtraUsuario = useMemo(
    () => turnosEfectivos.map((t: { fecha: string }) => t.fecha.split('T')[0]),
    [turnosEfectivos]
  );

  const esEdicion = !!solicitudEditando;
  const esCobertura = tipoCambio === 'COBERTURA';

  // Cargar usuarios del mismo rol
  useEffect(() => {
    if (!isOpen || !user) return;
    setLoadingUsuarios(true);
    fetch('/api/users', { credentials: 'include' })
      .then(r => r.json())
      .then((data: Usuario[]) => {
        setUsuarios(data.filter(u => u.rol === user.rol && u.id !== user.id));
      })
      .catch(() => setError('No se pudo cargar la lista de compañeros'))
      .finally(() => setLoadingUsuarios(false));
  }, [isOpen, user]);

  // Pre-cargar form si es edición
  useEffect(() => {
    if (solicitudEditando) {
      setForm(solicitudEditando.form);
    } else {
      setForm({
        ...FORM_VACIO,
        horarioSolicitante: user?.horario || '',
        grupoSolicitante: user?.grupoTurno || 'A',
      });
    }
    setError('');
  }, [solicitudEditando, isOpen, user]);

  const companeroSeleccionado = useMemo(
    () => usuarios.find(u => u.id === form.destinatarioId) || null,
    [usuarios, form.destinatarioId]
  );

  useEffect(() => {
    if (!companeroSeleccionado) {
      setTurnosEfectivosCompanero([]);
      return;
    }
    fetch(`/api/turnos-efectivos?userId=${companeroSeleccionado.id}`, {
      credentials: 'include'
    })
      .then(r => r.json())
      .then(data => {
        setTurnosEfectivosCompanero(data.ganados?.map((t: any) => t.fecha) || []);
      });
  }, [companeroSeleccionado?.id]);


  //
  const turnoEfectivoSeleccionado = useMemo(
    () => turnosEfectivos.find((t: any) => t.fecha === form.fechaSolicitante),
    [turnosEfectivos, form.fechaSolicitante]
  );

  const horarioAMostrar = turnoEfectivoSeleccionado?.horario_efectivo || user?.horario || '—';

  // Al seleccionar compañero, auto-completar su horario y grupo
  useEffect(() => {
    if (companeroSeleccionado) {
      setForm(prev => ({
        ...prev,
        horarioDestinatario: companeroSeleccionado.horario,
        grupoDestinatario: companeroSeleccionado.grupoTurno,
        fechaDestinatario: '',
      }));
    }
  }, [companeroSeleccionado]);

  // Al cambiar a cobertura, limpiar la fecha del destinatario
  useEffect(() => {
    if (esCobertura) {
      setForm(prev => ({
        ...prev,
        fechaDestinatario: '',
        horarioDestinatario: '',
        grupoDestinatario: 'A',
      }));
    }
  }, [esCobertura]);


  const [searchCompanero, setSearchCompanero] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputCompaneroRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const usuariosFiltrados = useMemo(() => {
    if (!searchCompanero) return usuarios;
    const palabras = searchCompanero.toLowerCase().trim().split(/\s+/);
    return usuarios.filter(u => {
      const nombre = u.nombre.toLowerCase();
      const apellido = u.apellido.toLowerCase();
      return palabras.every(p => nombre.includes(p) || apellido.includes(p));
    });
  }, [usuarios, searchCompanero]);


  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        inputCompaneroRef.current && !inputCompaneroRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!form.destinatarioId) return setError('Seleccioná un compañero');
      if (!form.fechaSolicitante) return setError('Seleccioná el turno que querés cambiar');
      if (!esCobertura && !form.fechaDestinatario) return setError('Seleccioná el turno que necesitás');
      if (
        !esCobertura &&
        form.fechaSolicitante === form.fechaDestinatario &&
        form.horarioSolicitante === form.horarioDestinatario
      )
        return setError('Los turnos no pueden ser idénticos');
      if (!form.motivo.trim()) return setError('Explicá el motivo del cambio');

      setSubmitting(true);
      try {
        await onSubmit(form);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al enviar la solicitud');
      } finally {
        setSubmitting(false);
      }
    },
    [form, onSubmit, onClose, esCobertura]
  );

  const handleClose = useCallback(() => {
    setForm(FORM_VACIO);
    setTipoCambio('INTERCAMBIO');
    setError('');
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const formatFecha = (str: string) => {
    if (!str) return '';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-solicitud-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
              Cambio de guardia
            </p>
            <h2 id="modal-solicitud-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {esEdicion ? 'Editar solicitud' : 'Nueva solicitud de cambio'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors mt-1"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Tipo de cambio */}
          {!esEdicion && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo de cambio
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTipoCambio('INTERCAMBIO')}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm transition-all ${tipoCambio === 'INTERCAMBIO'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                >
                  <RefreshCw className="h-4 w-4 flex-shrink-0" />
                  <div className="text-left">
                    <p className="font-medium">Intercambio</p>
                    <p className="text-[10px] opacity-70">Cambian turnos entre los dos</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setTipoCambio('COBERTURA')}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm transition-all ${tipoCambio === 'COBERTURA'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                >
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  <div className="text-left">
                    <p className="font-medium">Cobertura</p>
                    <p className="text-[10px] opacity-70">El compañero cubre tu turno</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Selector de compañero */}
          <div>
            <label
              htmlFor="companero"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Compañero
            </label>
            {esEdicion ? (
              <input
                value={searchCompanero}
                disabled
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={inputCompaneroRef}
                  type="text"
                  value={searchCompanero}
                  onChange={e => {
                    setSearchCompanero(e.target.value);
                    setShowSuggestions(true);
                    if (!e.target.value) setForm(prev => ({ ...prev, destinatarioId: '' }));
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={loadingUsuarios ? 'Cargando...' : 'Buscá por nombre, apellido o legajo...'}
                  disabled={loadingUsuarios}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
                {showSuggestions && searchCompanero && usuariosFiltrados.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                  >
                    {usuariosFiltrados.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setForm(prev => ({ ...prev, destinatarioId: u.id }));
                          setSearchCompanero(`${u.apellido}, ${u.nombre} — Guardia ${u.grupoTurno}`);
                          setShowSuggestions(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-gray-900 dark:text-white ${form.destinatarioId === u.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                      >
                        {u.apellido}, {u.nombre} — Guardia {u.grupoTurno}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {companeroSeleccionado && (
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Horario: {companeroSeleccionado.horario} · Guardia {companeroSeleccionado.grupoTurno}
              </p>
            )}
          </div>

          {/* Bloques de turno */}
          <div className={`grid gap-3 ${esCobertura ? 'grid-cols-1' : 'grid-cols-2'}`}>

            {/* Turno a cambiar (siempre visible) */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user?.grupoTurno || 'A'}
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                    Tu guardia
                  </p>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400">
                    {horarioAMostrar}
                  </p>
                </div>
              </div>
              <label className="block text-xs text-blue-700 dark:text-blue-400 mb-1">
                Turno a cambiar
              </label>
              <CustomDatePicker
                id="fecha-solicitante"
                value={form.fechaSolicitante}
                onChange={v => {
                  const turnoEfectivo = turnosEfectivos.find(
                    (t: { fecha: string; horario_efectivo: string; grupo_efectivo: string }) =>
                      t.fecha.split('T')[0] === v
                  );
                  setForm(prev => ({
                    ...prev,
                    fechaSolicitante: v,
                    horarioSolicitante: turnoEfectivo?.horario_efectivo || user?.horario || '',
                    grupoSolicitante: (turnoEfectivo?.grupo_efectivo || user?.grupoTurno || 'A') as GrupoTurno,
                  }));
                }}
                grupoObjetivo={user?.grupoTurno as GrupoTurno}
                fechasExtra={fechasExtraUsuario}
                fechasBloqueadas={[...fechasCedidas, ...fechasBloqueadasPropias]}
                minDate={new Date()}
                className="w-full px-2 py-1.5 text-sm border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Turno que necesitás (solo en intercambio) */}
            {!esCobertura && (
              <div
                className={`border rounded-lg p-3 transition-colors ${companeroSeleccionado
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                  : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
                  }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${companeroSeleccionado ? 'bg-green-600' : 'bg-gray-400'
                      }`}
                  >
                    {companeroSeleccionado?.grupoTurno || '?'}
                  </div>
                  <div>
                    <p
                      className={`text-xs font-semibold ${companeroSeleccionado
                        ? 'text-green-800 dark:text-green-300'
                        : 'text-gray-500 dark:text-gray-400'
                        }`}
                    >
                      {companeroSeleccionado
                        ? `Guardia de ${companeroSeleccionado.nombre}`
                        : 'Guardia del compañero'}
                    </p>
                    <p
                      className={`text-[11px] ${companeroSeleccionado
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-400 dark:text-gray-500'
                        }`}
                    >
                      {companeroSeleccionado?.horario || 'Seleccioná un compañero'}
                    </p>
                  </div>
                </div>
                <label
                  className={`block text-xs mb-1 ${companeroSeleccionado
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-500'
                    }`}
                >
                  Turno que necesitás
                </label>
                <CustomDatePicker
                  id="fecha-destinatario"
                  value={form.fechaDestinatario}
                  onChange={v => setForm(prev => ({ ...prev, fechaDestinatario: v }))}
                  grupoObjetivo={companeroSeleccionado?.grupoTurno as GrupoTurno | undefined}
                  fechasExtra={turnosEfectivosCompanero}
                  fechasBloqueadas={fechasBloqueadasPropias}
                  minDate={new Date()}
                  className={`w-full px-2 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${companeroSeleccionado
                    ? 'border-green-300 dark:border-green-700'
                    : 'border-gray-200 dark:border-gray-600 opacity-50 pointer-events-none'
                    }`}
                    
                />
              </div>
            )}
          </div>

          {/* Resumen visual */}
          {form.fechaSolicitante && companeroSeleccionado && (
            <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 flex items-center gap-3 text-sm">
              {esCobertura
                ? <Shield className="h-4 w-4 text-gray-400 flex-shrink-0" />
                : <RefreshCw className="h-4 w-4 text-gray-400 flex-shrink-0" />
              }
              <p className="text-gray-700 dark:text-gray-300">
                {esCobertura ? (
                  <>
                    <span className="font-medium">{companeroSeleccionado.nombre}</span> cubre el turno del{' '}
                    <span className="font-medium">{formatFecha(form.fechaSolicitante)}</span> de{' '}
                    <span className="font-medium">{user?.nombre}</span>
                  </>
                ) : form.fechaDestinatario ? (
                  <>
                    <span className="font-medium">{user?.nombre}</span> cambia el{' '}
                    <span className="font-medium">{formatFecha(form.fechaSolicitante)}</span> por el{' '}
                    <span className="font-medium">{formatFecha(form.fechaDestinatario)}</span> de{' '}
                    <span className="font-medium">{companeroSeleccionado.nombre}</span>
                  </>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">Seleccioná el turno que necesitás</span>
                )}
              </p>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label
              htmlFor="motivo"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Motivo
            </label>
            <textarea
              id="motivo"
              rows={2}
              required
              value={form.motivo}
              onChange={e => setForm(prev => ({ ...prev, motivo: e.target.value }))}
              placeholder="Explicá brevemente por qué necesitás el cambio..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm resize-none"
            />
          </div>

          {/* Urgente */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.prioridad === 'URGENTE'}
              onChange={e =>
                setForm(prev => ({
                  ...prev,
                  prioridad: e.target.checked ? 'URGENTE' : 'NORMAL',
                }))
              }
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
              disabled={submitting || !form.destinatarioId}
              style={{ flex: 2 }}
              className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="xs" padding="p-1" />
                  {esEdicion ? 'Actualizando...' : 'Enviando...'}
                </>
              ) : esEdicion ? (
                'Actualizar solicitud'
              ) : (
                `Enviar a ${companeroSeleccionado?.nombre || 'compañero'}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}