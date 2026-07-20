"use client";

import { useState } from "react";
import { Download, Search } from "lucide-react";
import { useListadoCalificaciones } from "@/hooks/useCalificaciones";
import { useAuth } from "@/app/context/AuthContext";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";
import { generarExcel, generarPDF } from "@/app/lib/exportUtils";
import { StarRow } from "./StarRow";
import { AvatarCalif } from "./AvatarCalif";
import { formatFecha, getIniciales } from "./calificacionesUtils";

export function TabListado() {
  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [turno, setTurno] = useState<"" | "A" | "B">("");
  const { user } = useAuth();

  const { listado, isLoading } = useListadoCalificaciones({
    desde: desde || undefined,
    hasta: hasta || undefined,
    turno: turno || undefined,
  });

  const listadoFiltrado = listado.filter(e =>
    busqueda === "" ||
    e.calificado_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.calificador_nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const fechaArchivo = new Date().toISOString().slice(0, 10);

  const usuarioNombre = `${user?.nombre ?? ''} ${user?.apellido ?? ''}`.trim();
  const cumplieron = listadoFiltrado.filter(e => e.cumplimiento).length;
  const noCumplieron = listadoFiltrado.filter(e => !e.cumplimiento).length;
  const promedioGeneral = listadoFiltrado.length
    ? (listadoFiltrado.reduce((s, e) => s + Number(e.promedio), 0) / listadoFiltrado.length).toFixed(1)
    : '•';

  const excelColumns = [
    { header: 'CALIFICADO', width: 25 },
    { header: 'TURNO', width: 10 },
    { header: 'CALIFICADOR', width: 25 },
    { header: 'FECHA', width: 14 },
    { header: 'PROMEDIO', width: 12 },
    { header: 'CUMPLIÓ', width: 12, colorMap: { 'SÍ': '22C55E', 'NO': 'EF4444' } },
    { header: 'COMENTARIO', width: 40 },
  ];

  const pdfColumns = [
    { label: 'Calificado', x: 15, w: 50, truncate: 18 },
    { label: 'Turno', x: 67, w: 16 },
    { label: 'Calificador', x: 85, w: 50, truncate: 17 },
    { label: 'Fecha', x: 137, w: 24 },
    { label: 'Promedio', x: 163, w: 18 },
    { label: 'Cumplió', x: 183, w: 16 },
    { label: 'Comentario', x: 201, w: 66, wrap: true },
  ];

  const exportConfig = {
    subtitle: 'Calificaciones de Personal - Reporte Detallado',
    usuario: usuarioNombre,
    stats: [
      { label: 'TOTAL', value: listadoFiltrado.length, color: '0EA5E9' },
      { label: 'CUMPLIERON', value: cumplieron, color: 'EAB308' },
      { label: 'NO CUMPLIERON', value: noCumplieron, color: 'EF4444' },
      { label: 'PROMEDIO', value: promedioGeneral, color: '0EA5E9' },
    ],
  };

  const exportToExcel = () => {
    const rows = listadoFiltrado.map(e => [
      e.calificado_nombre,
      `Grupo ${e.calificado_turno}`,
      e.calificador_nombre,
      formatFecha(e.fecha),
      Number(e.promedio).toFixed(1),
      e.cumplimiento ? 'SÍ' : 'NO',
      e.comentario || '•',
    ]);
    generarExcel(
      { ...exportConfig, filename: `Calificaciones_${fechaArchivo}.xlsx`, sheetName: 'Calificaciones' },
      excelColumns,
      rows
    );
  };

  const exportToPDF = async () => {
    const rows = listadoFiltrado.map(e => (_doc: any) => ({
      cells: [
        e.calificado_nombre,
        `Grupo ${e.calificado_turno}`,
        e.calificador_nombre,
        formatFecha(e.fecha),
        Number(e.promedio).toFixed(1),
        e.cumplimiento ? 'Sí' : 'No',
        e.comentario || '•',
      ],
    }));
    await generarPDF(
      { ...exportConfig, orientation: 'landscape', filename: `Calificaciones_${fechaArchivo}.pdf` },
      pdfColumns,
      rows
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        {/* Búsqueda - ancho completo */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-400 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {/* Turno + PDF/Excel en la misma fila */}
        <div className="flex gap-2 items-center">
          <select
            value={turno}
            onChange={(e) => setTurno(e.target.value as "" | "A" | "B")}
            className="flex-1 py-2 px-3 bg-white dark:bg-gray-800 border border-gray-400 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los turnos</option>
            <option value="A">Grupo A</option>
            <option value="B">Grupo B</option>
          </select>
          <button onClick={exportToPDF} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-400 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded-lg hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all">
            <Download size={13} /> PDF
          </button>
          <button onClick={exportToExcel} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-400 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded-lg hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all">
            <Download size={13} /> Excel
          </button>
        </div>
        {/* Fechas lado a lado */}
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
            className="w-full py-2 px-3 bg-white dark:bg-gray-800 border border-gray-400 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
            className="w-full py-2 px-3 bg-white dark:bg-gray-800 border border-gray-400 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-400 dark:border-gray-700/50 overflow-hidden">
          <div className="overflow-x-auto">
              {/* TABLA - solo desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-400 dark:border-gray-700/50">
                      {["Calificado", "Turno", "Calificador", "Fecha", "Promedio", "Cumplió", "Comentario"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-gray-500 dark:text-gray-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listadoFiltrado.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500 dark:text-gray-500">No hay calificaciones registradas.</td></tr>
                    ) : listadoFiltrado.map((e) => (
                      <tr key={e.id} className="border-b border-gray-200 dark:border-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <AvatarCalif iniciales={getIniciales(e.calificado_nombre)} size="sm" />
                            <span className="text-gray-800 dark:text-gray-200">{e.calificado_nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${e.calificado_turno === 'A' ? 'bg-blue-900/40 text-blue-300' : 'bg-orange-900/40 text-orange-300'}`}>
                            Grupo {e.calificado_turno}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{e.calificador_nombre}</td>
                        <td className="px-4 py-3 text-gray-400">{formatFecha(e.fecha)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <StarRow value={Math.round(Number(e.promedio))} size={11} />
                            <span className="text-gray-700 dark:text-gray-300">{Number(e.promedio).toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={e.cumplimiento ? 'text-green-400' : 'text-red-400'}>
                            {e.cumplimiento ? '✓ Sí' : '✗ No'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-500 max-w-[160px] truncate">{e.comentario || '•'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CARDS - solo móvil */}
              <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700/30">
                {listadoFiltrado.length === 0 ? (
                  <p className="px-4 py-10 text-center text-gray-500 dark:text-gray-500 text-sm">No hay calificaciones registradas.</p>
                ) : listadoFiltrado.map((e) => (
                  <div key={e.id} className="p-4">
                    {/* Fila 1: Calificado + Turno */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <AvatarCalif iniciales={getIniciales(e.calificado_nombre)} size="sm" />
                        <span className="text-gray-800 dark:text-gray-200 font-medium text-sm truncate">{e.calificado_nombre}</span>
                      </div>
                      <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded ${e.calificado_turno === 'A' ? 'bg-blue-900/40 text-blue-300' : 'bg-orange-900/40 text-orange-300'}`}>
                        Grupo {e.calificado_turno}
                      </span>
                    </div>
                    {/* Fila 2: Calificador + Fecha */}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                      <span>Por: <span className="text-gray-700 dark:text-gray-300">{e.calificador_nombre}</span></span>
                      <span>{formatFecha(e.fecha)}</span>
                    </div>
                    {/* Fila 3: Promedio + Cumplió */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <StarRow value={Math.round(Number(e.promedio))} size={12} />
                        <span className="text-gray-700 dark:text-gray-300 text-xs">{Number(e.promedio).toFixed(1)}</span>
                      </div>
                      <span className={`text-xs font-medium ${e.cumplimiento ? 'text-green-400' : 'text-red-400'}`}>
                        {e.cumplimiento ? '✓ Cumplió' : '✗ No cumplió'}
                      </span>
                    </div>
                    {/* Comentario */}
                    {e.comentario && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 truncate">{e.comentario}</p>
                    )}
                  </div>
                ))}
              </div>
          </div>
          <div className="px-4 py-2 border-t border-gray-400 dark:border-gray-700/50 text-gray-400 dark:text-gray-600 text-xs">
            {listadoFiltrado.length} calificación{listadoFiltrado.length !== 1 ? 'es' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
