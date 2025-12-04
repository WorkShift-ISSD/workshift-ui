import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

type TipoInforme = 'asistencia' | 'ausentismo' | 'comparativo' | 'individual';

interface ExportInformesProps {
  tipoInforme: TipoInforme;
  datos: any;
  estadisticas: {
    totalEmpleados: number;
    totalFaltas: number;
    justificadas: number;
    injustificadas: number;
    tasaAusentismo: string;
    promedioFaltasPorEmpleado: string;
  };
  fechaInicio: string;
  fechaFin: string;
  filtros?: {
    rol?: string;
    turno?: string;
    empleado?: string;
  };
  className?: string;
}

export const ExportInformes: React.FC<ExportInformesProps> = ({
  tipoInforme,
  datos,
  estadisticas,
  fechaInicio,
  fechaFin,
  filtros,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const usuarioNombre = `${user?.nombre ?? ""} ${user?.apellido ?? ""}`;

  // ======== FUNCIONES AUXILIARES ========
  const formatFecha = (fecha: string) => {
    try {
      const [year, month, day] = fecha.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return fecha;
    }
  };

  const getTituloInforme = () => {
    const titulos = {
      asistencia: 'Informe de Asistencia - Detalle por Empleado',
      ausentismo: 'Informe de Ausentismo - Análisis Estadístico',
      comparativo: 'Informe Comparativo - Grupos A y B',
      individual: 'Informe Individual - Detalle de Empleado'
    };
    return titulos[tipoInforme];
  };

  const getCardsData = () => {
    return [
      { label: "Empleados", value: estadisticas.totalEmpleados, color: [37, 99, 235] },
      { label: "Total Faltas", value: estadisticas.totalFaltas, color: [239, 68, 68] },
      { label: "Justificadas", value: estadisticas.justificadas, color: [34, 197, 94] },
      { label: "Ausentismo", value: estadisticas.tasaAusentismo + "%", color: [234, 179, 8] },
    ];
  };

  const loadImage = (src: string): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve("");
    });

  const getColumnWidths = () => {
    switch (tipoInforme) {
      case 'asistencia':
        return [
          { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 10 },
          { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }
        ];
      case 'ausentismo':
        return [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      case 'comparativo':
        return [{ wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 18 }];
      case 'individual':
        return [{ wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 30 }];
      default:
        return [];
    }
  };

  // ======== PDF ========
  const exportToPDF = async () => {
    try {
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const primary = [31, 41, 55];

      const logoMigraciones = await loadImage("/icon migra bco.png");
      const logoWS = await loadImage("/LogoWSv4-2.png");

      // ===================== HEADER ======================
      const drawHeader = () => {
        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.rect(0, 0, pageWidth, 35, "F");

        if (logoMigraciones) doc.addImage(logoMigraciones, "PNG", 12, 7, 22, 22);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text("Dirección Nacional de Migraciones - WSMS", pageWidth / 2, 17, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const subtitulo = getTituloInforme();
        doc.text(subtitulo, pageWidth / 2, 25, { align: "center" });

        const now = new Date();
        const fecha = now.toLocaleDateString("es-AR");
        const hora = now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

        doc.setFontSize(8);
        doc.text(`Generado: ${fecha} ${hora} | Usuario: ${usuarioNombre}`, pageWidth / 2, 31, { align: "center" });
      };

      // ===================== FOOTER ======================
      const drawFooter = (pageNumber: number, totalPages: number) => {
        doc.setDrawColor(200, 200, 200);
        doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);

        if (logoWS) doc.addImage(logoWS, "PNG", 15, pageHeight - 18, 20, 8);

        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text("Migraciones - WSMS © 2025", 40, pageHeight - 12);
        doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 15, pageHeight - 12, { align: "right" });
      };

      let y = 45;
      drawHeader();

      // ===================== PERÍODO ======================
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      const periodoTexto = `Período: ${formatFecha(fechaInicio)} - ${formatFecha(fechaFin)}`;
      doc.text(periodoTexto, pageWidth / 2, y, { align: "center" });
      y += 7;

      // ===================== FILTROS ======================
      if (filtros && (filtros.rol !== 'TODOS' || filtros.turno !== 'TODOS' || filtros.empleado !== 'TODOS')) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        let filtrosTexto = "Filtros aplicados: ";
        const filtrosAplicados = [];
        if (filtros.rol && filtros.rol !== 'TODOS') filtrosAplicados.push(`Rol: ${filtros.rol}`);
        if (filtros.turno && filtros.turno !== 'TODOS') filtrosAplicados.push(`Turno: ${filtros.turno}`);
        if (filtros.empleado && filtros.empleado !== 'TODOS') filtrosAplicados.push("Empleado específico");
        filtrosTexto += filtrosAplicados.join(" | ");
        doc.text(filtrosTexto, pageWidth / 2, y, { align: "center" });
        y += 7;
      }

      // ===================== CARDS ESTADÍSTICAS ======================
      y += 5;
      const cards = getCardsData();
      const cardWidth = (pageWidth - 40) / Math.min(cards.length, 4);
      
      cards.forEach((card, i) => {
        const x = 15 + i * (cardWidth + 2);
        doc.setFillColor(card.color[0], card.color[1], card.color[2]);
        doc.roundedRect(x, y, cardWidth, 18, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text(String(card.value), x + cardWidth / 2, y + 10, { align: "center" });
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(card.label, x + cardWidth / 2, y + 15, { align: "center" });
      });

      y += 28;

      // ===================== CONTENIDO SEGÚN TIPO ======================
      switch (tipoInforme) {
        case 'asistencia':
          y = await drawAsistencia(doc, y, pageWidth, pageHeight, drawHeader);
          break;
        case 'ausentismo':
          y = await drawAusentismo(doc, y, pageWidth, pageHeight, drawHeader);
          break;
        case 'comparativo':
          y = await drawComparativo(doc, y, pageWidth, pageHeight, drawHeader);
          break;
        case 'individual':
          y = await drawIndividual(doc, y, pageWidth, pageHeight, drawHeader);
          break;
      }

      // ===================== FOOTER FINAL ======================
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        drawFooter(p, totalPages);
      }

      const fecha = new Date().toISOString().split("T")[0];
      const nombreArchivo = `informe_${tipoInforme}_${fecha}.pdf`;
      doc.save(nombreArchivo);
    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("Error generando PDF");
    }
  };

  // ======== FUNCIONES DE DIBUJO PDF ========
  const drawAsistencia = async (doc: any, y: number, pageWidth: number, pageHeight: number, drawHeader: Function) => {
    const headers = ["Legajo", "Empleado", "Rol", "Turno", "Días trabajó", "Faltas", "Just.", "Injust.", "% Asist."];
    const colWidth = [15, 45, 20, 13, 20, 15, 12, 15, 18];
    
    let x = 15;
    doc.setFillColor(31, 41, 55);
    doc.rect(15, y, pageWidth - 30, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);

    headers.forEach((h, i) => {
      doc.text(h, x + colWidth[i] / 2, y + 7, { align: "center" });
      x += colWidth[i];
    });

    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    for (let dato of datos) {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 45;
        drawHeader();
        x = 15;
        doc.setFillColor(31, 41, 55);
        doc.rect(15, y, pageWidth - 30, 10, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        headers.forEach((h, i) => {
          doc.text(h, x + colWidth[i] / 2, y + 7, { align: "center" });
          x += colWidth[i];
        });
        y += 14;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }

      x = 15;
      const row = [
        dato.legajo.toString(),
        dato.nombre.length > 25 ? dato.nombre.substring(0, 22) + '...' : dato.nombre,
        dato.rol,
        dato.turno,
        dato.diasDebioTrabajar.toString(),
        dato.faltas.toString(),
        dato.faltasJustificadas.toString(),
        dato.faltasInjustificadas.toString(),
        dato.porcentajeAsistencia + "%",
      ];

      row.forEach((text, i) => {
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        
        if (i === 8) {
          const porcentaje = parseFloat(dato.porcentajeAsistencia);
          if (porcentaje >= 95) doc.setTextColor(34, 197, 94);
          else if (porcentaje >= 90) doc.setTextColor(234, 179, 8);
          else doc.setTextColor(239, 68, 68);
          doc.setFont("helvetica", "bold");
        }

        doc.text(text, x + colWidth[i] / 2, y, { align: "center" });
        x += colWidth[i];
      });

      y += 8;
    }

    return y;
  };

  const drawAusentismo = async (doc: any, y: number, pageWidth: number, pageHeight: number, drawHeader: Function) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text("Ausentismo por Rol", 15, y);
    y += 10;

    const headers1 = ["Rol", "Total Faltas", "Promedio por Empleado", "Nivel"];
    const colWidth1 = [40, 35, 45, 30];
    
    let x = 15;
    doc.setFillColor(31, 41, 55);
    doc.rect(15, y, pageWidth - 30, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);

    headers1.forEach((h, i) => {
      doc.text(h, x + colWidth1[i] / 2, y + 7, { align: "center" });
      x += colWidth1[i];
    });

    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    for (let dato of datos.porRol) {
      x = 15;
      const promedio = parseFloat(dato.promedio);
      const nivel = promedio >= 5 ? 'Crítico' : promedio >= 3 ? 'Moderado' : 'Bajo';
      const colorNivel = promedio >= 5 ? [239, 68, 68] : promedio >= 3 ? [234, 179, 8] : [34, 197, 94];

      const row = [dato.rol, dato.total.toString(), dato.promedio, nivel];

      row.forEach((text, i) => {
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        
        if (i === 3) {
          doc.setTextColor(colorNivel[0], colorNivel[1], colorNivel[2]);
          doc.setFont("helvetica", "bold");
        }

        doc.text(text, x + colWidth1[i] / 2, y, { align: "center" });
        x += colWidth1[i];
      });

      y += 8;
    }

    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text("Ausentismo por Grupo Turno", 15, y);
    y += 10;

    const headers2 = ["Turno", "Total Faltas", "Promedio por Empleado"];
    const colWidth2 = [50, 50, 50];
    
    x = 15;
    doc.setFillColor(31, 41, 55);
    doc.rect(15, y, pageWidth - 30, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);

    headers2.forEach((h, i) => {
      doc.text(h, x + colWidth2[i] / 2, y + 7, { align: "center" });
      x += colWidth2[i];
    });

    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    for (let dato of datos.porTurno) {
      x = 15;
      const row = [dato.turno, dato.total.toString(), dato.promedio];

      row.forEach((text) => {
        doc.setTextColor(0, 0, 0);
        doc.text(text, x + colWidth2[0] / 2, y, { align: "center" });
        x += colWidth2[0];
      });

      y += 8;
    }

    return y;
  };

  const drawComparativo = async (doc: any, y: number, pageWidth: number, pageHeight: number, drawHeader: Function) => {
    const headers = ["Grupo", "Empleados", "Faltas Totales", "Justificadas", "Promedio Faltas"];
    const colWidth = [30, 30, 35, 30, 35];
    
    let x = 15;
    doc.setFillColor(31, 41, 55);
    doc.rect(15, y, pageWidth - 30, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);

    headers.forEach((h, i) => {
      doc.text(h, x + colWidth[i] / 2, y + 7, { align: "center" });
      x += colWidth[i];
    });

    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    for (let dato of datos.comparacion) {
      x = 15;
      const promedio = (dato.faltas / dato.empleados).toFixed(2);
      const row = [
        dato.grupo,
        dato.empleados.toString(),
        dato.faltas.toString(),
        dato.justificadas.toString(),
        promedio
      ];

      row.forEach((text, i) => {
        doc.setTextColor(0, 0, 0);
        doc.text(text, x + colWidth[i] / 2, y, { align: "center" });
        x += colWidth[i];
      });

      y += 8;
    }

    return y;
  };

  const drawIndividual = async (doc: any, y: number, pageWidth: number, pageHeight: number, drawHeader: Function) => {
    if (!datos?.empleado) return y;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text(`${datos.empleado.nombre} ${datos.empleado.apellido}`, 15, y);
    y += 8;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`Legajo: ${datos.empleado.legajo} | ${datos.empleado.rol} | Grupo ${datos.empleado.grupoTurno}`, 15, y);
    y += 10;

    const metricas = [
      { label: "Total Faltas", value: datos.faltas || 0 },
      { label: "Justificadas", value: datos.faltasJustificadas || 0 },
      { label: "Injustificadas", value: datos.faltasInjustificadas || 0 },
      { label: "% Asistencia", value: (datos.porcentajeAsistencia || 0) + "%" }
    ];

    const metricWidth = (pageWidth - 40) / 4;
    metricas.forEach((m, i) => {
      const x = 15 + i * (metricWidth + 2);
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(x, y, metricWidth, 15, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text(m.value.toString(), x + metricWidth / 2, y + 7, { align: "center" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(m.label, x + metricWidth / 2, y + 12, { align: "center" });
    });

    y += 25;

    if (datos.detallesFaltas && datos.detallesFaltas.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text("Detalle de Faltas", 15, y);
      y += 8;

      const headers = ["Fecha", "Motivo", "Estado", "Observaciones"];
      const colWidth = [25, 50, 25, 60];
      
      let x = 15;
      doc.setFillColor(31, 41, 55);
      doc.rect(15, y, pageWidth - 30, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);

      headers.forEach((h, i) => {
        doc.text(h, x + colWidth[i] / 2, y + 7, { align: "center" });
        x += colWidth[i];
      });

      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);

      for (let falta of datos.detallesFaltas) {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = 45;
          drawHeader();
        }

        x = 15;
        const fecha = new Date(falta.fecha).toLocaleDateString('es-AR');
        const motivo = (falta.causa || falta.motivo || '').length > 30 ? 
          (falta.causa || falta.motivo || '').substring(0, 27) + '...' : 
          (falta.causa || falta.motivo || '');
        const estado = falta.justificada ? 'Justificada' : 'Injustificada';
        const obs = falta.observaciones ? 
          (falta.observaciones.length > 35 ? falta.observaciones.substring(0, 32) + '...' : falta.observaciones) : 
          '-';

        const row = [fecha, motivo, estado, obs];

        row.forEach((text, i) => {
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
          
          if (i === 2) {
            const color = falta.justificada ? [34, 197, 94] : [239, 68, 68];
            doc.setTextColor(color[0], color[1], color[2]);
            doc.setFont("helvetica", "bold");
          }

          if (i === 1 || i === 3) {
            doc.text(text, x + 2, y);
          } else {
            doc.text(text, x + colWidth[i] / 2, y, { align: "center" });
          }
          x += colWidth[i];
        });

        y += 7;
      }
    }

    return y;
  };

  // ======== EXCEL ========
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const sheetName = getTituloInforme().split(' - ')[0];

    const wsData: (string | number)[][] = [];

    wsData.push(['DIRECCIÓN NACIONAL DE MIGRACIONES - WSMS']);
    wsData.push([getTituloInforme()]);

    const now = new Date();
    const fechaGen = now.toLocaleDateString("es-AR");
    const horaGen = now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    wsData.push([`Generado: ${fechaGen} ${horaGen} | Usuario: ${usuarioNombre}`]);
    wsData.push([]);

    wsData.push([`Período: ${formatFecha(fechaInicio)} - ${formatFecha(fechaFin)}`]);
    wsData.push([]);

    wsData.push(['', '', 'EMPLEADOS', 'TOTAL FALTAS', 'JUSTIFICADAS', 'TASA AUSENTISMO']);
    wsData.push(['', '', estadisticas.totalEmpleados, estadisticas.totalFaltas, estadisticas.justificadas, estadisticas.tasaAusentismo + '%']);
    wsData.push([]);

    const headerRowIndex = wsData.length;

    switch (tipoInforme) {
      case 'asistencia':
        wsData.push(['LEGAJO', 'EMPLEADO', 'ROL', 'TURNO', 'DÍAS TRABAJÓ', 'FALTAS', 'JUSTIF.', 'INJUSTIF.', '% ASISTENCIA']);
        datos.forEach((d: any) => {
          wsData.push([
            d.legajo,
            d.nombre,
            d.rol,
            d.turno,
            d.diasDebioTrabajar,
            d.faltas,
            d.faltasJustificadas,
            d.faltasInjustificadas,
            d.porcentajeAsistencia + '%'
          ]);
        });
        break;

      case 'ausentismo':
        wsData.push(['AUSENTISMO POR ROL']);
        wsData.push(['ROL', 'TOTAL FALTAS', 'PROMEDIO', 'NIVEL']);
        datos.porRol.forEach((d: any) => {
          const promedio = parseFloat(d.promedio);
          const nivel = promedio >= 5 ? 'Crítico' : promedio >= 3 ? 'Moderado' : 'Bajo';
          wsData.push([d.rol, d.total, d.promedio, nivel]);
        });
        wsData.push([]);
        wsData.push(['AUSENTISMO POR TURNO']);
        wsData.push(['TURNO', 'TOTAL FALTAS', 'PROMEDIO']);
        datos.porTurno.forEach((d: any) => {
          wsData.push([d.turno, d.total, d.promedio]);
        });
        break;

      case 'comparativo':
        wsData.push(['GRUPO', 'EMPLEADOS', 'FALTAS TOTALES', 'JUSTIFICADAS', 'PROMEDIO FALTAS']);
        datos.comparacion.forEach((d: any) => {
          const promedio = (d.faltas / d.empleados).toFixed(2);
          wsData.push([d.grupo, d.empleados, d.faltas, d.justificadas, promedio]);
        });
        break;

      case 'individual':
        if (datos?.empleado) {
          wsData.push([`EMPLEADO: ${datos.empleado.nombre} ${datos.empleado.apellido}`]);
          wsData.push([`LEGAJO: ${datos.empleado.legajo} | ${datos.empleado.rol} | Grupo ${datos.empleado.grupoTurno}`]);
          wsData.push([]);
          wsData.push(['TOTAL FALTAS', 'JUSTIFICADAS', 'INJUSTIFICADAS', '% ASISTENCIA']);
          wsData.push([datos.faltas || 0, datos.faltasJustificadas || 0, datos.faltasInjustificadas || 0, (datos.porcentajeAsistencia || 0) + '%']);
          
          if (datos.detallesFaltas && datos.detallesFaltas.length > 0) {
            wsData.push([]);
            wsData.push(['DETALLE DE FALTAS']);
            wsData.push(['FECHA', 'MOTIVO', 'ESTADO', 'OBSERVACIONES']);
            datos.detallesFaltas.forEach((f: any) => {
              const fecha = new Date(f.fecha).toLocaleDateString('es-AR');
              wsData.push([fecha, f.causa || f.motivo || '', f.justificada ? 'Justificada' : 'Injustificada', f.observaciones || '-']);
            });
          }
        }
        break;
    }

    wsData.push([]);
    wsData.push([`Migraciones - WSMS © 2025`]);
    wsData.push([`Total empleados analizados: ${estadisticas.totalEmpleados}`]);
const ws = XLSX.utils.aoa_to_sheet(wsData);
ws['!cols'] = getColumnWidths();

const titleStyle = {
  font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  fill: { fgColor: { rgb: '1F2937' } }
};

const headerStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  fill: { fgColor: { rgb: '1F2937' } }
};

const dataStyle = {
  alignment: { horizontal: 'center', vertical: 'center' },
  fill: { fgColor: { rgb: 'FFFFFF' } }
};

if (ws['A1']) ws['A1'].s = titleStyle;
if (ws['A2']) ws['A2'].s = titleStyle;
if (ws['A3']) ws['A3'].s = dataStyle;

const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const numCols = tipoInforme === 'asistencia' ? 9 : 
                tipoInforme === 'comparativo' ? 5 : 4;

for (let i = 0; i < numCols; i++) {
  const cellRef = `${cols[i]}${headerRowIndex + 1}`;
  if (ws[cellRef]) {
    ws[cellRef].s = headerStyle;
  }
}

const maxCol = Math.max(numCols - 1, 8);
ws['!merges'] = [
  { s: { r: 0, c: 0 }, e: { r: 0, c: maxCol } },
  { s: { r: 1, c: 0 }, e: { r: 1, c: maxCol } },
  { s: { r: 2, c: 0 }, e: { r: 2, c: maxCol } },
  { s: { r: 4, c: 0 }, e: { r: 4, c: maxCol } },
];

XLSX.utils.book_append_sheet(wb, ws, sheetName);

const fechaArchivo = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
const nombreArchivo = `Informe_${tipoInforme}_${fechaArchivo}.xlsx`;
XLSX.writeFile(wb, nombreArchivo);
};
const handleExport = (format: 'pdf' | 'excel') => {
setIsOpen(false);
if (format === 'pdf') exportToPDF();
else exportToExcel();
};
return (
<div ref={dropdownRef} className="relative inline-block text-left">
<button
onClick={() => setIsOpen(!isOpen)}
className={className || "flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"}
>
<Download className="h-4 w-4" />
Exportar Informe
</button>
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.15 }}
        className="absolute mt-2 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-52 z-50 overflow-hidden"
      >
        <div className="p-2">
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center w-full gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
          >
            <FileText className="h-5 w-5 text-red-500 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="font-medium text-gray-900 dark:text-gray-100">PDF</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Informe completo</div>
            </div>
          </button>

          <button
            onClick={() => handleExport('excel')}
            className="flex items-center w-full gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
          >
            <FileSpreadsheet className="h-5 w-5 text-green-500 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="font-medium text-gray-900 dark:text-gray-100">Excel</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Datos para análisis</div>
            </div>
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</div>
);
};