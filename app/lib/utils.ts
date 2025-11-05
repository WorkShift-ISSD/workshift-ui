import { Revenue } from './definitions';

export const formatCurrency = (amount: number) => {
  return (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
};

export const formatDateToLocal = (
  dateStr: string,
  locale: string = 'en-US',
) => {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  const formatter = new Intl.DateTimeFormat(locale, options);
  return formatter.format(date);
};

/**
 * Convierte una fecha en formato YYYY-MM-DD a Date sin desfase de timezone
 */
export const parseFechaSinTimezone = (fechaStr: string): Date => {
  const [year, month, day] = fechaStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Formatea una fecha para mostrar en formato argentino sin desfase de timezone
 * Uso: formatFechaLocal('2025-01-15') → '15/01/2025'
 */
export const formatFechaLocal = (fecha: string | Date): string => {
  if (!fecha) return 'Fecha no disponible';

  try {
    let dateObj: Date;
    
    if (typeof fecha === 'string') {
      // Si viene en formato YYYY-MM-DD, parsear sin timezone
      if (fecha.includes('-') && !fecha.includes('T')) {
        dateObj = parseFechaSinTimezone(fecha);
      } else {
        dateObj = new Date(fecha);
      }
    } else {
      dateObj = fecha;
    }

    if (isNaN(dateObj.getTime())) return 'Fecha inválida';

    return dateObj.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (error) {
    return 'Error en fecha';
  }
};

/**
 * Formatea fecha y hora en formato argentino
 * Uso: formatFechaHoraLocal('2025-01-15T10:30:00') → '15/01/2025, 10:30'
 */
export const formatFechaHoraLocal = (fecha: string | Date): string => {
  if (!fecha) return 'Fecha no disponible';

  try {
    const dateObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    
    if (isNaN(dateObj.getTime())) return 'Fecha inválida';

    return dateObj.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return 'Error en fecha';
  }
};

/**
 * Formatea solo la hora
 * Uso: formatHora('2025-01-15T10:30:00') → '10:30'
 */
export const formatHora = (fecha: string | Date): string => {
  if (!fecha) return 'Hora no disponible';

  try {
    const dateObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    
    if (isNaN(dateObj.getTime())) return 'Hora inválida';

    return dateObj.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return 'Error en hora';
  }
};

/**
 * Obtiene cuánto tiempo pasó desde una fecha
 * Uso: timeAgo('2025-01-15T10:30:00') → 'hace 2 horas'
 */
export const timeAgo = (fecha: string | Date): string => {
  if (!fecha) return '';

  try {
    const dateObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    const ahora = new Date();
    const diffMs = ahora.getTime() - dateObj.getTime();
    const diffSeg = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSeg / 60);
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffDias > 7) {
      return formatFechaLocal(dateObj);
    } else if (diffDias > 0) {
      return `hace ${diffDias} día${diffDias > 1 ? 's' : ''}`;
    } else if (diffHoras > 0) {
      return `hace ${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
    } else if (diffMin > 0) {
      return `hace ${diffMin} minuto${diffMin > 1 ? 's' : ''}`;
    } else {
      return 'justo ahora';
    }
  } catch (error) {
    return 'Error en fecha';
  }
};

export const generateYAxis = (revenue: Revenue[]) => {
  // Calculate what labels we need to display on the y-axis
  // based on highest record and in 1000s
  const yAxisLabels = [];
  const highestRecord = Math.max(...revenue.map((month) => month.revenue));
  const topLabel = Math.ceil(highestRecord / 1000) * 1000;

  for (let i = topLabel; i >= 0; i -= 1000) {
    yAxisLabels.push(`$${i / 1000}K`);
  }

  return { yAxisLabels, topLabel };
};

export const generatePagination = (currentPage: number, totalPages: number) => {
  // If the total number of pages is 7 or less,
  // display all pages without any ellipsis.
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // If the current page is among the first 3 pages,
  // show the first 3, an ellipsis, and the last 2 pages.
  if (currentPage <= 3) {
    return [1, 2, 3, '...', totalPages - 1, totalPages];
  }

  // If the current page is among the last 3 pages,
  // show the first 2, an ellipsis, and the last 3 pages.
  if (currentPage >= totalPages - 2) {
    return [1, 2, '...', totalPages - 2, totalPages - 1, totalPages];
  }

  // If the current page is somewhere in the middle,
  // show the first page, an ellipsis, the current page and its neighbors,
  // another ellipsis, and the last page.
  return [
    1,
    '...',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    '...',
    totalPages,
  ];
};