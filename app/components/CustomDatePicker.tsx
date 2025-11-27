'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GrupoTurno } from '../lib/turnosUtils';

interface CustomDatePickerProps {
  id?: string;
  value: string | null;
  onChange: (date: string) => void;
  onValidate?: (date: Date) => void;
  minDate?: Date;
  companeroSeleccionado?: any;
  esFechaValidaParaGrupo: (fecha: Date, grupo: GrupoTurno) => boolean;
  setFormError: (error: string) => void;
  formError: string;
  className: string;
}

export function CustomDatePicker({
  id,
  value,
  onChange,
  onValidate,
  minDate = new Date(),
  companeroSeleccionado,
  esFechaValidaParaGrupo,
  setFormError,
  formError,
  className
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const pickerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
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

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isEven = day % 2 === 0;
      const isDisabled = date < minDate;
      const isSelected = value === date.toISOString().split('T')[0];

      days.push(
        <button
          key={day}
          onClick={() => {
            if (!isDisabled) {
              const dateStr = date.toISOString().split('T')[0];
              onChange(dateStr);
              onValidate?.(date);
              setIsOpen(false);
            }
          }}
          disabled={isDisabled}
          className={`
            p-2 rounded text-center text-sm font-medium transition-colors
            ${isSelected ? 'bg-green-500 text-white font-bold' : ''}
            ${!isSelected && isEven ? 'bg-blue-100 dark:bg-green-300' : ''}
            ${!isSelected && !isEven ? 'bg-orange-100 dark:bg-red-100' : ''}
            ${isDisabled ? 'text-gray-100 dark:text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
          `}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="relative w-full" ref={pickerRef}>
      <input
        id={id}
        type="text"
        readOnly
        value={value || ''}
        onClick={() => setIsOpen(!isOpen)}
        required
        className={className}
        placeholder="Selecciona una fecha"
      />

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 z-50 w-80">
          <div className="flex justify-between items-center mb-4">
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-bold text-gray-900 dark:text-gray-100">
              {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-black-600 dark:text-black-400">
                {day}
              </div>
            ))}
            {renderCalendar()}
          </div>
        </div>
      )}
    </div>
  );
}