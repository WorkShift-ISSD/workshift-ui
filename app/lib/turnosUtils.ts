import { parseFechaSinTimezone } from "./utils";

export type GrupoTurno = 'A' | 'B';

/**
 * Determina qué grupo trabaja en una fecha específica
 * Regla: 
 * - Grupo A: días impares del mes (1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31)
 * - Grupo B: días pares del mes (2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30)
 * 
 * Excepción en meses con 31 días:
 * - Si el mes anterior tiene días impares (31 días), se invierte:
 *   - A trabaja pares
 *   - B trabaja impares
 */
export function calcularGrupoTrabaja(fecha: string | Date): GrupoTurno {

  let dateObj: Date;

  if (typeof fecha === 'string') {
    // Si viene en formato YYYY-MM-DD (sin hora), parsear sin timezone
    if (fecha.includes('-') && !fecha.includes('T')) {
      dateObj = parseFechaSinTimezone(fecha);
    } else {
      dateObj = new Date(fecha);
    }
  } else {
    dateObj = fecha;
  }

  const dia = dateObj.getDate();
  const mes = dateObj.getMonth();
  const anio = dateObj.getFullYear();
  
  // Determinar si el mes anterior tenía 31 días
  const mesAnterior = mes === 0 ? 11 : mes - 1;
  const anioMesAnterior = mes === 0 ? anio - 1 : anio;
  const diasMesAnterior = new Date(anioMesAnterior, mesAnterior + 1, 0).getDate();
  
  // Si el mes anterior tiene 31 días (impar), se invierte la regla
  const seInvierte = diasMesAnterior === 31;
  
  const esImpar = dia % 2 !== 0;
  
  if (seInvierte) {
    return esImpar ? 'B' : 'A';
  } else {
    return esImpar ? 'A' : 'B';
  }
}

/**
 * Obtiene todos los días que trabaja un grupo en un mes específico
 */
export function getDiasTrabajo(mes: number, anio: number, grupo: GrupoTurno): number[] {
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const diasTrabajo: number[] = [];
  
  for (let dia = 1; dia <= diasEnMes; dia++) {
    const fecha = new Date(anio, mes, dia);
    if (calcularGrupoTrabaja(fecha) === grupo) {
      diasTrabajo.push(dia);
    }
  }
  
  return diasTrabajo;
}

/**
 * Calcula el resumen del mes (para mostrar como en la imagen)
 */
export function getResumenMes(mes: number, anio: number) {
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const mesAnterior = mes === 0 ? 11 : mes - 1;
  const anioMesAnterior = mes === 0 ? anio - 1 : anio;
  const diasMesAnterior = new Date(anioMesAnterior, mesAnterior + 1, 0).getDate();
  
  const seInvierte = diasMesAnterior === 31;
  const esImpar = diasEnMes % 2 !== 0;
  
  let tipo: 'impares' | 'pares';
  let grupoA: 'impares' | 'pares';
  let grupoB: 'impares' | 'pares';
  
  if (seInvierte) {
    tipo = esImpar ? 'impares' : 'pares';
    grupoA = 'pares';
    grupoB = 'impares';
  } else {
    tipo = esImpar ? 'impares' : 'pares';
    grupoA = 'impares';
    grupoB = 'pares';
  }
  
  const diasGrupoA = getDiasTrabajo(mes, anio, 'A');
  const diasGrupoB = getDiasTrabajo(mes, anio, 'B');
  
  return {
    mes: nombresMeses[mes],
    anio,
    totalDias: diasEnMes,
    tipo,
    seInvierte,
    diasMesAnterior,
    grupoA: {
      tipo: grupoA,
      dias: diasGrupoA,
      cantidad: diasGrupoA.length
    },
    grupoB: {
      tipo: grupoB,
      dias: diasGrupoB,
      cantidad: diasGrupoB.length
    }
  };
}

/**
 * Verifica si una fecha es válida para un grupo específico
 */
export function esFechaValidaParaGrupo(fecha: Date, grupo: GrupoTurno): boolean {
  return calcularGrupoTrabaja(fecha) === grupo;
}

/**
 * Obtiene el siguiente día disponible para un grupo
 */
export function getSiguienteDiaDisponible(fechaActual: Date, grupo: GrupoTurno): Date {
  let siguiente = new Date(fechaActual);
  siguiente.setDate(siguiente.getDate() + 1);
  
  while (!esFechaValidaParaGrupo(siguiente, grupo)) {
    siguiente.setDate(siguiente.getDate() + 1);
  }
  
  return siguiente;
}

/**
 * Formatea la descripción del cálculo como en la imagen
 */
export function getDescripcionCalculo(mes: number, anio: number): string {
  const resumen = getResumenMes(mes, anio);
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  let descripcion = `${nombresMeses[mes]} ${anio}: `;
  
  if (resumen.tipo === 'impares') {
    descripcion += `A → impares (dato tuyo). (${resumen.totalDias} días → impar)`;
  } else {
    descripcion += `A → pares (dato tuyo). (${resumen.totalDias} días → par)`;
  }
  
  if (resumen.seInvierte) {
    const mesAnt = mes === 0 ? 11 : mes - 1;
    descripcion += `\n⚠️ El mes anterior (${nombresMeses[mesAnt]}) tiene ${resumen.diasMesAnterior} días (impar) → Se invierte: A = pares, B = impares`;
  }
  
  return descripcion;
}