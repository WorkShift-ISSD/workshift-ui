export const CRITERIOS = [
  { key: "comunicacion", label: "Comunicación" },
  { key: "responsabilidad", label: "Responsabilidad" },
  { key: "recomendacion", label: "Recomendación" },
];

export function diasRestantes(fecha: string): number {
  const turnoDate = new Date(fecha + 'T00:00:00');
  const limite = new Date(turnoDate);
  limite.setDate(limite.getDate() + 7);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((limite.getTime() - hoy.getTime()) / 86400000));
}

export function urgencyColor(dias: number) {
  if (dias <= 1) return "bg-red-900/40 text-red-300 border border-red-800/50";
  if (dias <= 2) return "bg-yellow-900/40 text-yellow-300 border border-yellow-800/50";
  return "bg-green-900/40 text-green-300 border border-green-800/50";
}

export function urgencyLabel(dias: number) {
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  return `${dias} días restantes`;
}

export function formatFecha(fecha: string) {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short'
  });
}

export function getIniciales(nombre: string): string {
  const partes = nombre.trim().split(' ');
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return partes[0].slice(0, 2).toUpperCase();
}
