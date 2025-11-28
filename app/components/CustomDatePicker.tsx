import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Calendar } from 'lucide-react';

interface CustomDatePickerProps {
  id: string;
  value: string;
  onChange: (dateStr: string) => void;
  onValidate?: (dateObj: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  companeroSeleccionado?: any;
  esFechaValidaParaGrupo?: (fecha: Date, grupo: string) => boolean;
  setFormError?: (error: string) => void;
  formError?: string;
  className?: string;
  disabled?: boolean;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  id,
  value,
  onChange,
  onValidate,
  minDate,
  maxDate,
  companeroSeleccionado,
  esFechaValidaParaGrupo,
  setFormError,
  formError,
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    if (value) {
      return new Date(value + 'T00:00:00');
    }
    return new Date();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const dayNames = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];

  // Cerrar calendario al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const getPreviousMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 0).getDate();
  };

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  const handleDateClick = (day: number, isCurrentMonth: boolean, month: number, year: number) => {
    if (!isCurrentMonth) return;

    const selectedDate = new Date(year, month, day);
    
    // Validar fecha mínima
    if (minDate) {
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < min) {
        return;
      }
    }

    // Validar fecha máxima
    if (maxDate) {
      const max = new Date(maxDate);
      max.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate > max) {
        return;
      }
    }

    const dateStr = selectedDate.toISOString().split('T')[0];
    onChange(dateStr);
    
    // Ejecutar validación personalizada
    if (onValidate) {
      onValidate(selectedDate);
    }
    
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    onChange(dateStr);
    setCurrentDate(today);
    
    if (onValidate) {
      onValidate(today);
    }
    
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const previousMonthDays = getPreviousMonthDays(currentDate);
    const days = [];

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Días del mes anterior
    for (let i = firstDay - 1; i >= 0; i--) {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      days.push({
        day: previousMonthDays - i,
        isCurrentMonth: false,
        isPreviousMonth: true,
        month: prevMonth,
        year: prevYear
      });
    }

    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        isPreviousMonth: false,
        month: currentMonth,
        year: currentYear
      });
    }

    // Días del mes siguiente
    const remainingDays = 42 - days.length;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        isPreviousMonth: false,
        month: nextMonth,
        year: nextYear
      });
    }

    return days;
  };

  const isSelectedDate = (day: number, month: number, year: number, isCurrentMonth: boolean) => {
    if (!value || !isCurrentMonth) return false;
    const selectedDate = new Date(value + 'T00:00:00');
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    );
  };

  const isDateDisabled = (day: number, month: number, year: number) => {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);

    if (minDate) {
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      if (date < min) return true;
    }

    if (maxDate) {
      const max = new Date(maxDate);
      max.setHours(0, 0, 0, 0);
      if (date > max) return true;
    }

    // Validación de grupo (si está disponible)
    if (companeroSeleccionado && esFechaValidaParaGrupo) {
      if (!esFechaValidaParaGrupo(date, companeroSeleccionado.grupoTurno)) {
        return true;
      }
    }

    return false;
  };

  const formatDisplayValue = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const days = renderCalendar();

  return (
    <div ref={containerRef} className="relative">
      {/* Input de texto */}
      <div className="relative">
        <input
          id={id}
          type="text"
          value={formatDisplayValue(value)}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onChange={(e) => {
            // Permitir edición manual
            const inputValue = e.target.value;
            // Solo números y barras
            if (/^[\d/]*$/.test(inputValue)) {
              // Intentar parsear la fecha en formato DD/MM/YYYY
              const parts = inputValue.split('/');
              if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const year = parseInt(parts[2]);
                
                if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                  const date = new Date(year, month, day);
                  if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) {
                    const dateStr = date.toISOString().split('T')[0];
                    onChange(dateStr);
                    if (onValidate) {
                      onValidate(date);
                    }
                  }
                }
              }
            }
          }}
          placeholder="dd/mm/aaaa"
          disabled={disabled}
          className={`pr-10 ${className}`}
          readOnly={false}
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
        >
          <Calendar className="h-5 w-5" />
        </button>
      </div>

      {/* Calendario desplegable */}
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 shadow-lg rounded-lg" style={{ width: '280px' }}>
          {/* Header con mes/año y flechas */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-300 dark:border-gray-700">
            <span className="text-sm font-normal text-gray-900 dark:text-gray-100">
              {monthNames[currentDate.getMonth()]} de {currentDate.getFullYear()}
            </span>
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                style={{ width: '20px', height: '14px' }}
              >
                <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                style={{ width: '20px', height: '14px' }}
              >
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Nombres de los días */}
          <div className="grid grid-cols-7 border-b border-gray-300 dark:border-gray-700">
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center py-1 text-xs font-medium text-gray-700 dark:text-gray-300"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Días del calendario */}
          <div className="grid grid-cols-7">
            {days.map((dayInfo, index) => {
              const isSelected = isSelectedDate(dayInfo.day, dayInfo.month, dayInfo.year, dayInfo.isCurrentMonth);
              const isDisabled = isDateDisabled(dayInfo.day, dayInfo.month, dayInfo.year);
              
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDateClick(dayInfo.day, dayInfo.isCurrentMonth, dayInfo.month, dayInfo.year)}
                  disabled={isDisabled}
                  className={`
                    text-center py-1 text-sm transition-colors
                    ${!dayInfo.isCurrentMonth 
                      ? 'text-gray-400 dark:text-gray-600' 
                      : isDisabled
                        ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                        : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                    ${isSelected 
                      ? 'bg-blue-600 text-white hover:bg-blue-700 font-medium' 
                      : ''
                    }
                  `}
                  style={{ height: '32px' }}
                >
                  {dayInfo.day}
                </button>
              );
            })}
          </div>

          {/* Footer con botones */}
          <div className="flex justify-between px-3 py-2 border-t border-gray-300 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClear}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};