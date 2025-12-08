export const useFormatters = () => {

  // Fechas sin UTC ---
  const parseFechaLocal = (fechaString: string) => {
    const [y, m, d] = fechaString.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';

    if (dateString.includes('T')) {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }

    const date = parseFechaLocal(dateString);

    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return '';

    const date = dateString.includes('T')
      ? new Date(dateString)
      : parseFechaLocal(dateString);

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;

    return formatDate(dateString);
  };

  // ⬅️ Faltaba esto
  return { parseFechaLocal, formatDate, formatTimeAgo };
};
