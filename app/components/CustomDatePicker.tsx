'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { GrupoTurno, calcularGrupoTrabaja } from '../lib/turnosUtils';
import { createPortal } from 'react-dom';

interface CustomDatePickerProps {
  id?: string;
  value: string | null;
  onChange: (date: string) => void;
  onValidate?: (date: Date) => void;
  minDate?: Date;
  grupoObjetivo?: GrupoTurno;
  fechasExtra?: string[];
  fechasBloqueadas?: string[];
  className?: string;
  placeholder?: string;
  showGrupo?: boolean;
}

export function CustomDatePicker({
  id,
  value,
  onChange,
  onValidate,
  minDate = new Date(),
  grupoObjetivo,
  fechasExtra,
  fechasBloqueadas,
  className = '',
  placeholder = 'dd/mm/aaaa',
  showGrupo = true,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    return new Date();
  });
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calcular posición del dropdown al abrir
  const handleOpen = () => {
    if (inputWrapperRef.current) {
      const rect = inputWrapperRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
    setIsOpen(prev => !prev);
  };

  // Cerrar al hacer click fuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideInput = inputWrapperRef.current?.contains(target);
      const clickedInsideDropdown = dropdownRef.current?.contains(target);
      if (!clickedInsideInput && !clickedInsideDropdown) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const getDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const getFirstDayOfMonth = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const formatDisplayDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const normalizeDate = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    const minDateNorm = normalizeDate(minDate);

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const dateNorm = normalizeDate(date);
      const grupoDelDia = calcularGrupoTrabaja(date);
      const esGrupoA = grupoDelDia === 'A';

      const isPasado = dateNorm < minDateNorm;
      const dateStr = date.toISOString().split('T')[0];
      const esFechaExtra = fechasExtra?.includes(dateStr) ?? false;
      const esGrupoIncorrecto = grupoObjetivo ? grupoDelDia !== grupoObjetivo : false;
      const esFechaCedida = fechasBloqueadas?.includes(dateStr) ?? false;
      const esFechaBloqueada = fechasBloqueadas?.includes(dateStr) ?? false;
      const isDisabled = isPasado || (esGrupoIncorrecto && !esFechaExtra) || esFechaCedida || esFechaBloqueada;
      const isSelected = value === date.toISOString().split('T')[0];
      const isCurrentDay = isToday(date);

      days.push(
        <div key={day} className="h-8 w-8">
          <button
            type="button"
            onClick={() => {
              if (!isDisabled) {
                const dateStr = date.toISOString().split('T')[0];
                onChange(dateStr);
                onValidate?.(date);
                setIsOpen(false);
              }
            }}
            disabled={isDisabled}
            title={
              isDisabled
                ? isPasado
                  ? 'Fecha pasada'
                  : esGrupoIncorrecto && !esFechaExtra && !esFechaCedida && !esFechaBloqueada
                    ? `Día del Grupo ${grupoDelDia} — solo podés seleccionar días del Grupo ${grupoObjetivo}`
                    : 'Fecha no disponible por cambio, licencia o sanción'
                : esFechaExtra
                  ? `${day} — Turno efectivo (Grupo ${grupoDelDia})`
                  : `${day} — Grupo ${grupoDelDia}`
            }
            className={[
              'w-full h-full rounded-md text-xs font-medium transition-all flex flex-col items-center justify-center',
              isSelected
                ? 'bg-blue-600 text-white shadow-md scale-105 ring-2 ring-blue-400'
                : '',
              !isSelected && !isDisabled
                ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                : '',
              isDisabled
                ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                : '',
              isCurrentDay && !isSelected && !isDisabled
                ? 'ring-2 ring-blue-500 ring-offset-1'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className={[
              isSelected || (isCurrentDay && !isDisabled) ? 'font-bold' : '',
              isSelected
                ? 'text-white'
                : isDisabled
                  ? 'text-gray-300 dark:text-gray-600'
                  : 'text-gray-900 dark:text-gray-100'
            ].filter(Boolean).join(' ')}>
              {day}
            </span>
            {showGrupo && !isSelected && !isDisabled && (
              <span className={`text-[9px] font-semibold mt-0.5 ${esGrupoA
                ? 'text-blue-500 dark:text-blue-400'
                : 'text-orange-500 dark:text-orange-400'
                }`}>
                {grupoDelDia}
              </span>
            )}
          </button>
        </div>
      );
    }

    return days;
  };

  const dropdown = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: dropdownPos.top,
        left: dropdownPos.left,
        zIndex: 9999,
        minWidth: '260px',
      }}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() =>
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
          }
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft size={16} className="text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 capitalize">
            {currentMonth.toLocaleDateString('es-ES', { month: 'long' })}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {currentMonth.getFullYear()}
          </span>
        </div>
        <button
          type="button"
          onClick={() =>
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
          }
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
          <div
            key={i}
            className="h-6 flex items-center justify-center text-[10px] font-semibold text-gray-400 dark:text-gray-500"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-0.5">{renderCalendar()}</div>

      {/* Leyenda compacta */}
      {showGrupo && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-200 dark:bg-blue-900/50 rounded" />
            <span className="text-gray-500 dark:text-gray-400">A</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-orange-200 dark:bg-orange-900/50 rounded" />
            <span className="text-gray-500 dark:text-gray-400">B</span>
          </div>
          {grupoObjetivo && (
            <span className="text-gray-400 dark:text-gray-500">
              Solo Grupo {grupoObjetivo}
            </span>
          )}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="relative w-full" ref={inputWrapperRef}>
      <div className="relative">
        <input
          id={id}
          type="text"
          readOnly
          value={formatDisplayDate(value)}
          onClick={handleOpen}
          className={`${className} pr-10 cursor-pointer`}
          placeholder={placeholder}
        />
        <Calendar
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          size={18}
        />
      </div>

      {/* Portal: renderiza el dropdown fuera del DOM del modal */}
      {typeof document !== 'undefined' && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  );
}