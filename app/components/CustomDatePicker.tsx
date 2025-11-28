'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { GrupoTurno, calcularGrupoTrabaja, getDiasTrabajo } from '../lib/turnosUtils';

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
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    // Convertir domingo (0) a 7 para que lunes sea 1
    return day === 0 ? 6 : day - 1;
  };

  const formatDisplayDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Obtener los días que trabaja cada grupo en el mes actual usando turnosUtils
    const mes = currentMonth.getMonth();
    const anio = currentMonth.getFullYear();
    const diasGrupoA = getDiasTrabajo(mes, anio, 'A');
    const diasGrupoB = getDiasTrabajo(mes, anio, 'B');

    // Espacios vacíos antes del primer día
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square p-1">
          <div className="w-full h-full"></div>
        </div>
      );
    }

    // Renderizar cada día del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      
      // Usar calcularGrupoTrabaja de turnosUtils
      const grupoQueTrabaja = calcularGrupoTrabaja(date);
      const esGrupoA = grupoQueTrabaja === 'A';
      
      const isDisabled = date < minDate;
      const isSelected = value === date.toISOString().split('T')[0];
      const isCurrentDay = isToday(date);

      // Validar si la fecha es válida para el grupo del compañero seleccionado
      const esValidoParaCompanero = companeroSeleccionado 
        ? esFechaValidaParaGrupo(date, companeroSeleccionado.grupo)
        : true;

      days.push(
        <div key={day} className="aspect-square p-1">
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
            className={`
              w-full h-full rounded-lg text-sm font-medium transition-all relative
              flex flex-col items-center justify-center
              ${isSelected 
                ? 'bg-blue-600 text-white shadow-lg scale-105 ring-2 ring-blue-400' 
                : ''
              }
              ${!isSelected && !isDisabled && esGrupoA 
                ? 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/50 text-gray-900 dark:text-gray-100' 
                : ''
              }
              ${!isSelected && !isDisabled && !esGrupoA 
                ? 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-900/50 text-gray-900 dark:text-gray-100' 
                : ''
              }
              ${isDisabled 
                ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed bg-gray-50 dark:bg-gray-900/20' 
                : 'cursor-pointer hover:shadow-md'
              }
              ${isCurrentDay && !isSelected 
                ? 'ring-2 ring-blue-500 ring-offset-1' 
                : ''
              }
              ${!esValidoParaCompanero && !isDisabled && !isSelected
                ? 'opacity-40 cursor-not-allowed' 
                : ''
              }
            `}
            title={
              isDisabled 
                ? 'Fecha no disponible' 
                : `${day} - Grupo ${grupoQueTrabaja}${!esValidoParaCompanero ? ' (No disponible)' : ''}`
            }
          >
            <span className={`
              ${isSelected ? 'font-bold' : ''}
              ${isCurrentDay && !isSelected ? 'font-bold' : ''}
            `}>
              {day}
            </span>
            {!isSelected && !isDisabled && (
              <span className={`
                text-[9px] font-semibold mt-0.5
                ${esGrupoA ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}
              `}>
                {grupoQueTrabaja}
              </span>
            )}
          </button>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="relative w-full" ref={pickerRef}>
      <div className="relative">
        <input
          id={id}
          type="text"
          readOnly
          value={formatDisplayDate(value)}
          onClick={() => setIsOpen(!isOpen)}
          required
          className={`${className} pr-10 cursor-pointer`}
          placeholder="dd/mm/aaaa"
        />
        <Calendar 
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" 
          size={18} 
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 z-50 min-w-[320px]">
          {/* Header del calendario */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100 capitalize">
                {currentMonth.toLocaleDateString('es-ES', { month: 'long' })}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {currentMonth.getFullYear()}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, index) => (
              <div 
                key={index} 
                className="aspect-square flex items-center justify-center text-xs font-semibold text-gray-500 dark:text-gray-400"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid de días */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>

          {/* Leyenda */}
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-blue-200 dark:bg-blue-900/50 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Grupo A</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-orange-200 dark:bg-orange-900/50 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Grupo B</span>
            </div>
          </div>

          {/* Nota informativa */}
          <div className="mt-2 text-center text-[10px] text-gray-500 dark:text-gray-500">
            Los grupos se alternan día por día
          </div>
        </div>
      )}
    </div>
  );
}