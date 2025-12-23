export const useFormatters = () => {

  /* =========================
     Parse fecha SIN UTC
  ========================= */
  const parseFechaLocal = (fechaString: string) => {
    if (!fechaString) return null;

    const soloFecha = fechaString.includes('T')
      ? fechaString.split('T')[0]
      : fechaString;

    const [y, m, d] = soloFecha.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  /* =========================
     Fecha larga (12 sep 2025)
  ========================= */
  const formatDate = (dateString: string) => {
    if (!dateString) return '';

    const date = parseFechaLocal(dateString);
    if (!date) return '';

    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  /* =========================
     Fecha corta (12/09/2025)
  ========================= */
  const formatDate2 = (dateString: string) => {
    if (!dateString) return '';

    const date = parseFechaLocal(dateString);
    if (!date) return '';

    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  /* =========================
     Hace X tiempo
  ========================= */
  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return '';

    const date = parseFechaLocal(dateString);
    if (!date) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;

    return formatDate(dateString);
  };

  /* =========================
     Fecha hoy (YYYY-MM-DD)
  ========================= */
  const getTodayDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  };

  return {
    parseFechaLocal,
    formatDate,
    formatDate2,
    formatTimeAgo,
    getTodayDate,
  };
};
