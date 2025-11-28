import { parseFechaSinTimezone } from "./utils";

export type GrupoTurno = 'A' | 'B';

/**
 * LÓGICA DE TURNOS: ALTERNANCIA DÍA POR DÍA
 * 
 * Los grupos se alternan cada día de forma continua a través de los meses.
 * 
 * Fecha de referencia: 1 de Enero de 2025 = Grupo A
 * A partir de ahí:
 * - Si han pasado un número PAR de días desde la referencia → Grupo A
 * - Si han pasado un número IMPAR de días desde la referencia → Grupo B
 * 
 * Esto garantiza que los grupos SIEMPRE alternen, sin importar el cambio de mes.
 */

// Fecha de referencia: 1 de Enero de 2025, trabaja el Grupo A
const FECHA_REFERENCIA = new Date(2025, 0, 1); // 1 de Enero de 2025
const GRUPO_REFERENCIA: GrupoTurno = 'A';

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

  // Calcular días transcurridos desde la fecha de referencia
  const diffTime = dateObj.getTime() - FECHA_REFERENCIA.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Si han pasado un número par de días (0, 2, 4, ...), es el mismo grupo que la referencia
  // Si han pasado un número impar de días (1, 3, 5, ...), es el grupo opuesto
  const esParDias = diffDays % 2 === 0;
  
  if (esParDias) {
    return GRUPO_REFERENCIA; // Grupo A
  } else {
    return GRUPO_REFERENCIA === 'A' ? 'B' : 'A'; // Grupo B
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
 * Calcula el resumen del mes
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
  
  // Calcular qué grupo trabaja el día 1 de este mes
  const fechaDia1 = new Date(anio, mes, 1);
  const grupoQueTrabajaDia1 = calcularGrupoTrabaja(fechaDia1);
  
  // Determinar si la regla está "invertida" (B trabaja impares en lugar de A)
  const seInvierte = grupoQueTrabajaDia1 === 'B';
  const esImpar = diasEnMes % 2 !== 0;
  
  let tipo: 'impares' | 'pares';
  let grupoA: 'impares' | 'pares';
  let grupoB: 'impares' | 'pares';
  
  if (seInvierte) {
    // B trabaja el día 1 (impar), entonces B trabaja impares
    tipo = esImpar ? 'impares' : 'pares';
    grupoA = 'pares';
    grupoB = 'impares';
  } else {
    // A trabaja el día 1 (impar), entonces A trabaja impares
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
 * Formatea la descripción del cálculo
 */
export function getDescripcionCalculo(mes: number, anio: number): string {
  const resumen = getResumenMes(mes, anio);
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  let descripcion = `${nombresMeses[mes]} ${anio}:\n`;
  descripcion += `Grupo A trabaja días ${resumen.grupoA.tipo} (${resumen.grupoA.cantidad} días)\n`;
  descripcion += `Grupo B trabaja días ${resumen.grupoB.tipo} (${resumen.grupoB.cantidad} días)`;
  
  if (resumen.seInvierte) {
    const mesAnt = mes === 0 ? 11 : mes - 1;
    descripcion += `\n\n⚠️ Este mes el Grupo B empieza el día 1`;
    descripcion += `\nEl mes anterior (${nombresMeses[mesAnt]}) terminó con el Grupo A`;
  }
  
  return descripcion;
}

/**
 * Función de utilidad para verificar la continuidad entre meses
 */
export function verificarContinuidad(mes: number, anio: number): {
  mesActual: string;
  ultimoDiaMesAnterior: { dia: number, grupo: GrupoTurno };
  primerDiaMesActual: { dia: number, grupo: GrupoTurno };
  esContinuo: boolean;
} {
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const mesAnterior = mes === 0 ? 11 : mes - 1;
  const anioMesAnterior = mes === 0 ? anio - 1 : anio;
  const diasMesAnterior = new Date(anioMesAnterior, mesAnterior + 1, 0).getDate();
  
  const fechaUltimoDiaAnterior = new Date(anioMesAnterior, mesAnterior, diasMesAnterior);
  const fechaPrimerDiaActual = new Date(anio, mes, 1);
  
  const grupoUltimoDiaAnterior = calcularGrupoTrabaja(fechaUltimoDiaAnterior);
  const grupoPrimerDiaActual = calcularGrupoTrabaja(fechaPrimerDiaActual);
  
  // Los grupos deben ser diferentes para que sea continuo
  const esContinuo = grupoUltimoDiaAnterior !== grupoPrimerDiaActual;
  
  return {
    mesActual: nombresMeses[mes],
    ultimoDiaMesAnterior: {
      dia: diasMesAnterior,
      grupo: grupoUltimoDiaAnterior
    },
    primerDiaMesActual: {
      dia: 1,
      grupo: grupoPrimerDiaActual
    },
    esContinuo
  };
}