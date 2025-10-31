// src/components/ExportData.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, FileCode2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';

// Tipos (mismos que tenías)
type Rol = 'SUPERVISOR' | 'INSPECTOR' | 'JEFE';
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
  calcularEstado: (empleado: Inspector) => EstadoEmpleado;
  className?: string;
}

export const ExportData: React.FC<ExportDataProps> = ({
  employees,
  stats,
  filters,
  calcularEstado,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar menú si se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ======== PDF ========
  const exportToPDF = async () => {
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    const doc = new jsPDF();
    doc.text('Gestión de Empleados - WorkShift', 20, 20);
    let y = 30;
    employees.forEach(emp => {
      const estado = calcularEstado(emp);
      doc.text(`${emp.legajo} | ${emp.nombre} ${emp.apellido} | ${emp.rol} | ${estado}`, 20, y);
      y += 8;
    });
    const fileName = `empleados_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  // ======== EXCEL ========
  const exportToExcel = () => {
    const data = employees.map(emp => ({
      Legajo: emp.legajo,
      Nombre: emp.nombre,
      Apellido: emp.apellido,
      Rol: emp.rol,
      Turno: emp.grupoTurno,
      Horario: emp.horario || 'N/A',
      Estado: calcularEstado(emp),
      Email: emp.email,
      Teléfono: emp.telefono || 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Empleados");
    const fileName = `empleados_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // ======== XML ========
  const exportToXML = () => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<empleados>\n`;
    employees.forEach(emp => {
      const estado = calcularEstado(emp);
      xml += `  <empleado>\n`;
      xml += `    <legajo>${emp.legajo}</legajo>\n`;
      xml += `    <nombre>${emp.nombre}</nombre>\n`;
      xml += `    <apellido>${emp.apellido}</apellido>\n`;
      xml += `    <rol>${emp.rol}</rol>\n`;
      xml += `    <turno>${emp.grupoTurno}</turno>\n`;
      xml += `    <horario>${emp.horario || 'N/A'}</horario>\n`;
      xml += `    <estado>${estado}</estado>\n`;
      xml += `    <email>${emp.email}</email>\n`;
      xml += `    <telefono>${emp.telefono || ''}</telefono>\n`;
      xml += `  </empleado>\n`;
    });
    xml += `</empleados>`;

    const blob = new Blob([xml], { type: 'application/xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `empleados_${new Date().toISOString().split('T')[0]}.xml`;
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

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={className || "flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-500 transition-colors"}
      >
        <Download className="h-4 w-4" />
        Exportar datos
      </button>

      {/* Menú animado */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute mt-2 right-0 bg-white dark:bg-gray-700 border border-gray-500 dark:border-gray-400 rounded-lg shadow-lg w-48 z-50 overflow-hidden"
          >
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center w-full gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-300"
            >
              <FileText className="h-4 w-4 text-blue-500" /> PDF
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="flex items-center w-full gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-300"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-500" /> Excel (.xlsx)
            </button>
            <button
              onClick={() => handleExport('xml')}
              className="flex items-center w-full gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-300"
            >
              <FileCode2 className="h-4 w-4 text-yellow-500" /> XML
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
