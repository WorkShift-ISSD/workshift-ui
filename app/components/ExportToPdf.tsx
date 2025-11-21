// src/components/ExportData.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, FileCode2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

// Tipos
type Rol = 'SUPERVISOR' | 'INSPECTOR' | 'JEFE' | 'ADMINISTRADOR';
type GrupoTurno = 'A' | 'B';
type EstadoEmpleado = 'ACTIVO' | 'LICENCIA' | 'AUSENTE' | 'INACTIVO';

interface Inspector {
  id: string;
  legajo: number;
  email: string;
  nombre: string;
  apellido: string;
  rol: Rol;
  telefono: string | null;
  direccion: string | null;
  horario: string | null;
  fechaNacimiento: string | null;
  activo: boolean;
  grupoTurno: GrupoTurno;
  fotoPerfil: string | null;
  ultimoLogin: string | null;
  createdAt: string;
  updatedAt: string;
  estado?: EstadoEmpleado;
  turnosEsteMes?: number;
  horasAcumuladas?: number;
  intercambiosPendientes?: number;
  enLicencia?: boolean;
  ausente?: boolean;
}

interface Falta {
  id: string;
  empleadoId: string;
  fecha: string;
  motivo: string;
  justificada: boolean;
  observaciones?: string;
}

type ExportMode = 'personal' | 'faltas';

interface ExportDataProps {
  employees: Inspector[];
  stats: {
    total: number;
    activos: number;
    enLicencia: number;
    ausentes: number;
  };
  filters?: {
    searchTerm?: string;
    selectedRole?: string;
    selectedShift?: string;
    selectedHorario?: string;
  };
  calcularEstado: (empleado: Inspector) => EstadoEmpleado | 'presente' | 'ausente';
  className?: string;
  mode: ExportMode; // Modo de exportación
  faltasDelDia?: Falta[] | null; // Solo para modo faltas
  fechaSeleccionada?: string; // Solo para modo faltas
}

export const ExportData: React.FC<ExportDataProps> = ({
  employees,
  stats,
  filters,
  calcularEstado,
  className = '',
  mode = 'personal',
  faltasDelDia = null,
  fechaSeleccionada
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

  // ======== PDF MEJORADO ========
  const exportToPDF = async () => {
    try {
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const primary = [31, 41, 55];
      const logoMigraciones = await loadImage("/icon migra bco.png").catch(() => "");
      const logoWS = await loadImage("/LogoWSv4-2.png").catch(() => "");

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
        const subtitle = mode === 'faltas' ? 'Control de Faltas - Reporte Detallado' : 'Gestión de Empleados - Reporte Detallado';
        doc.text(subtitle, pageWidth / 2, 25, { align: "center" });

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
        doc.text(`Total empleados: ${employees.length}`, pageWidth - 15, pageHeight - 7, { align: "right" });
      };

      let y = 45;
      drawHeader();

      // ===================== CARDS ======================
      if (mode === 'personal') {
        // Cards para modo personal
        const cards = [
          { label: "Total", value: stats.total, color: [37, 99, 235] },
          { label: "Activos", value: stats.activos, color: [34, 197, 94] },
          { label: "Licencia", value: stats.enLicencia, color: [234, 179, 8] },
          { label: "Ausentes", value: stats.ausentes, color: [239, 68, 68] },
        ];

        const cardWidth = (pageWidth - 40) / 4;
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
        
        y += 30;
      } else {
        // Cards para modo faltas
        const presentes = employees.length - (faltasDelDia?.length || 0);
        const cards = [
          { label: "Total", value: employees.length, color: [37, 99, 235] },
          { label: "Presentes", value: presentes, color: [34, 197, 94] },
          { label: "Faltas", value: faltasDelDia?.length || 0, color: [239, 68, 68] },
        ];

        const cardWidth = (pageWidth - 40) / 3;
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

        y += 23;

        // Mostrar fecha seleccionada
        if (fechaSeleccionada) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(60, 60, 60);
          try {
            const fechaFormateada = new Date(fechaSeleccionada.replace(/-/g, '/')).toLocaleDateString('es-AR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            doc.text(`Fecha: ${fechaFormateada}`, pageWidth / 2, y, { align: "center" });
          } catch (e) {
            doc.text(`Fecha: ${fechaSeleccionada}`, pageWidth / 2, y, { align: "center" });
          }
          y += 7;
        }
      }

      y += 0; // Eliminar el y += 30 duplicado

      // ===================== COLUMNAS ======================
      let headers: string[];
      let colWidth: number[];

      if (mode === 'personal') {
        headers = ["Legajo", "Nombre y Apellido", "Rol", "Turno", "Horario", "Estado", "Teléfono"];
        colWidth = [15, 50, 25, 13, 25, 20, 25];
      } else {
        headers = ["Turno", "Nombre y Apellido", "Rol", "Estado", "Motivo"];
        colWidth = [22, 50, 22, 22, 57];
      }

      const drawTableHeader = () => {
        let x = 15;
        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.rect(15, y, pageWidth - 30, 10, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);

        headers.forEach((h, i) => {
          const colCenter = x + colWidth[i] / 2;
          doc.text(h, colCenter, y + 7, { align: "center" });
          x += colWidth[i];
        });

        y += 14;
      };

      drawTableHeader();

      // ===================== FILAS ======================
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      let page = 1;

      for (let emp of employees) {
        if (y > pageHeight - 30) {
          doc.addPage();
          page++;
          y = 45;
          drawHeader();
          drawTableHeader();
        }

        const estado = calcularEstado(emp);
        const colorEstado =
          estado === "ACTIVO" || estado === "presente"
            ? [34, 197, 94]
            : estado === "LICENCIA"
            ? [234, 179, 8]
            : estado === "AUSENTE" || estado === "ausente"
            ? [239, 68, 68]
            : [156, 163, 175];

        let row: string[];
        if (mode === 'personal') {
          row = [
            emp.legajo.toString(),
            `${emp.nombre} ${emp.apellido}`,
            emp.rol,
            emp.grupoTurno || "-",
            emp.horario || "No asignado",
            estado === 'presente' ? 'PRESENTE' : estado === 'ausente' ? 'FALTA' : estado,
            emp.telefono || "-",
          ];
        } else {
          const falta = faltasDelDia?.find(f => f.empleadoId === emp.id);
          const motivoCompleto = falta?.motivo || '-';
          // Limitar el motivo a 40 caracteres para que quepa en la celda
          const motivo = motivoCompleto.length > 40 ? motivoCompleto.substring(0, 37) + '...' : motivoCompleto;
          row = [
            emp.horario || "-",
            `${emp.apellido}, ${emp.nombre}`,
            emp.rol,
            estado === 'presente' ? 'PRESENTE' : 'FALTA',
            motivo,
          ];
        }

        let x = 15;

        row.forEach((text, i) => {
          const colCenter = x + colWidth[i] / 2;

          // Color del estado
          if ((mode === 'personal' && i === 5) || (mode === 'faltas' && i === 3)) {
            doc.setTextColor(colorEstado[0], colorEstado[1], colorEstado[2]);
            doc.setFont("helvetica", "bold");
          } else {
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "normal");
          }

          doc.setFontSize(8);

          // Alineación
          if ((mode === 'personal' && i === 1) || (mode === 'faltas' && (i === 1 || i === 4))) {
            // Nombre y motivo alineados a la izquierda
            doc.text(text, x + 2, y);
          } else {
            // Resto centrado
            doc.text(text, colCenter, y, { align: "center" });
          }

          x += colWidth[i];
        });

        y += 9;
      }

      // ===================== FOOTER FINAL ======================
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        drawFooter(p, totalPages);
      }

      const fecha = new Date().toISOString().split("T")[0];
      const nombreArchivo = mode === 'faltas' ? `faltas_${fecha}.pdf` : `empleados_${fecha}.pdf`;
      doc.save(nombreArchivo);
    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("Error generando PDF");
    }
  };

  // ======== EXCEL MEJORADO ========
  const exportToExcel = () => {
    let data;
    
    if (mode === 'personal') {
      data = employees.map(emp => ({
        Legajo: emp.legajo,
        Nombre: emp.nombre,
        Apellido: emp.apellido,
        Rol: emp.rol,
        "Grupo Turno": emp.grupoTurno,
        Horario: emp.horario || "No asignado",
        Estado: calcularEstado(emp),
        Email: emp.email,
        Teléfono: emp.telefono || "-",
      }));
    } else {
      data = employees.map(emp => {
        const estado = calcularEstado(emp);
        const falta = faltasDelDia?.find(f => f.empleadoId === emp.id);
        return {
          Legajo: emp.legajo,
          Apellido: emp.apellido,
          Nombre: emp.nombre,
          Rol: emp.rol,
          Turno: emp.grupoTurno,
          Horario: emp.horario || "No asignado",
          Estado: estado === 'presente' ? 'PRESENTE' : 'FALTA',
          Motivo: falta?.motivo || '-',
          Justificada: falta ? (falta.justificada ? 'SÍ' : 'NO') : '-',
          Observaciones: falta?.observaciones || '-',
        };
      });
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    const sheetName = mode === 'faltas' ? 'Faltas' : 'Empleados';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = mode === 'faltas' ? `faltas_${fecha}.xlsx` : `empleados_${fecha}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  };

  // ======== XML MEJORADO ========
  const exportToXML = () => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<workshift>\n`;
    xml += `  <metadata>\n`;
    xml += `    <fecha_generacion>${new Date().toISOString()}</fecha_generacion>\n`;
    xml += `    <tipo_reporte>${mode === 'faltas' ? 'control_faltas' : 'gestion_empleados'}</tipo_reporte>\n`;
    
    if (mode === 'faltas' && fechaSeleccionada) {
      xml += `    <fecha_consulta>${fechaSeleccionada}</fecha_consulta>\n`;
    }
    
    xml += `    <total_empleados>${employees.length}</total_empleados>\n`;
    xml += `    <estadisticas>\n`;
    
    if (mode === 'personal') {
      xml += `      <activos>${stats.activos}</activos>\n`;
      xml += `      <en_licencia>${stats.enLicencia}</en_licencia>\n`;
      xml += `      <ausentes>${stats.ausentes}</ausentes>\n`;
    } else {
      const presentes = employees.length - (faltasDelDia?.length || 0);
      xml += `      <presentes>${presentes}</presentes>\n`;
      xml += `      <faltas>${faltasDelDia?.length || 0}</faltas>\n`;
    }
    
    xml += `    </estadisticas>\n`;
    xml += `  </metadata>\n`;
    xml += `  <empleados>\n`;

    employees.forEach(emp => {
      const estado = calcularEstado(emp);
      xml += `    <empleado id="${emp.id}">\n`;
      xml += `      <legajo>${emp.legajo}</legajo>\n`;
      xml += `      <nombre>${emp.nombre}</nombre>\n`;
      xml += `      <apellido>${emp.apellido}</apellido>\n`;
      xml += `      <rol>${emp.rol}</rol>\n`;
      xml += `      <grupo_turno>${emp.grupoTurno}</grupo_turno>\n`;
      xml += `      <horario>${emp.horario || 'No asignado'}</horario>\n`;
      xml += `      <estado>${estado}</estado>\n`;
      
      if (mode === 'faltas') {
        const falta = faltasDelDia?.find(f => f.empleadoId === emp.id);
        if (falta) {
          xml += `      <falta>\n`;
          xml += `        <motivo>${falta.motivo || ''}</motivo>\n`;
          xml += `        <justificada>${falta.justificada}</justificada>\n`;
          xml += `        <observaciones>${falta.observaciones || ''}</observaciones>\n`;
          xml += `      </falta>\n`;
        }
      } else {
        xml += `      <email>${emp.email}</email>\n`;
        xml += `      <telefono>${emp.telefono || ''}</telefono>\n`;
        xml += `      <activo>${emp.activo}</activo>\n`;
      }
      
      xml += `    </empleado>\n`;
    });

    xml += `  </empleados>\n`;
    xml += `</workshift>`;

    const blob = new Blob([xml], { type: 'application/xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = mode === 'faltas' ? `faltas_workshift_${fecha}.xml` : `empleados_workshift_${fecha}.xml`;
    link.download = nombreArchivo;
    link.click();
  };

  const handleExport = (format: 'pdf' | 'excel' | 'xml') => {
    setIsOpen(false);
    switch (format) {
      case 'pdf': exportToPDF(); break;
      case 'excel': exportToExcel(); break;
      case 'xml': exportToXML(); break;
    }
  };

  // Helper para cargar imágenes
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
    });

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={className || "flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"}
      >
        <Download className="h-4 w-4" />
        Exportar Datos
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
                  <div className="text-xs text-gray-500 dark:text-gray-400">Documento con diseño</div>
                </div>
              </button>

              <button
                onClick={() => handleExport('excel')}
                className="flex items-center w-full gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
              >
                <FileSpreadsheet className="h-5 w-5 text-green-500 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-gray-100">Excel</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Hoja de cálculo (.xlsx)</div>
                </div>
              </button>

              <button
                onClick={() => handleExport('xml')}
                className="flex items-center w-full gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
              >
                <FileCode2 className="h-5 w-5 text-orange-500 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-gray-100">XML</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Datos estructurados</div>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
