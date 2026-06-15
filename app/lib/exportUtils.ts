import * as XLSX from 'xlsx-js-style';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ExportStat {
  label: string;
  value: string | number;
  color: string; // hex sin #
}

export interface ExcelColumn {
  header: string;
  width: number;
  // Si la columna necesita estilo especial por valor (ej: SÍ/NO en verde/rojo)
  colorMap?: Record<string, string>; // valor → color hex
}

export interface PDFColumn {
  label: string;
  x: number;
  w: number;
  truncate?: number; // max chars antes de cortar
  wrap?: boolean;    // permitir múltiples líneas
}

export interface ExportConfig {
  title?: string;
  subtitle: string;
  usuario?: string;
  stats?: ExportStat[];
  filename: string;
}

// ─── Excel ────────────────────────────────────────────────────────────────────

export function generarExcel(
  config: ExportConfig & { sheetName?: string },
  columns: ExcelColumn[],
  rows: (string | number)[][]
) {
  const wb = XLSX.utils.book_new();
  const wsData: (string | number)[][] = [];

  const now = new Date();
  const fechaGen = now.toLocaleDateString('es-AR');
  const horaGen = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const usuarioNombre = config.usuario ?? '';

  // Encabezado
  wsData.push(['DIRECCIÓN NACIONAL DE MIGRACIONES - WSMS']);
  wsData.push([config.subtitle.toUpperCase()]);
  wsData.push([`Generado: ${fechaGen} ${horaGen}${usuarioNombre ? ` | Usuario: ${usuarioNombre}` : ''}`]);
  wsData.push([]);

  // Stats
  const statsStartRow = wsData.length;
  if (config.stats?.length) {
    const offset = Math.max(0, Math.floor((columns.length - config.stats.length) / 2));
    const labelRow: (string | number)[] = Array(columns.length).fill('');
    const valueRow: (string | number)[] = Array(columns.length).fill('');
    config.stats.forEach((s, i) => {
      labelRow[offset + i] = s.label;
      valueRow[offset + i] = s.value;
    });
    wsData.push(labelRow);
    wsData.push(valueRow);
    wsData.push([]);
  }

  // Encabezados tabla
  const headerRowIndex = wsData.length;
  wsData.push(columns.map(c => c.header));

  // Datos
  const dataStartRow = wsData.length;
  rows.forEach(row => wsData.push(row));

  // Footer
  wsData.push([]);
  wsData.push(['Migraciones - WSMS © 2025']);
  wsData.push([`Total: ${rows.length} registros`]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = columns.map(c => ({ wch: c.width }));

  const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, columns.length).split('');
  const lastCol = columns.length - 1;

  // Estilos base
  const titleStyle = { font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } }, alignment: { horizontal: 'center' }, fill: { fgColor: { rgb: '1F2937' } } };
  const subtitleStyle = { font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } }, alignment: { horizontal: 'center' }, fill: { fgColor: { rgb: '1F2937' } } };
  const infoStyle = { font: { color: { rgb: 'FFFFFF' } }, alignment: { horizontal: 'center' }, fill: { fgColor: { rgb: '1F2937' } } };
  const headerStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, alignment: { horizontal: 'center' }, fill: { fgColor: { rgb: '1F2937' } } };
  const dataStyle = { alignment: { horizontal: 'center' }, fill: { fgColor: { rgb: 'FFFFFF' } }, border: { bottom: { style: 'thin', color: { rgb: '1F2937' } } } };
  const emptyStyle = { fill: { fgColor: { rgb: 'FFFFFF' } } };
  const footerStyle = { alignment: { horizontal: 'left' }, fill: { fgColor: { rgb: 'FFFFFF' } } };

  if (ws['A1']) ws['A1'].s = titleStyle;
  if (ws['A2']) ws['A2'].s = subtitleStyle;
  if (ws['A3']) ws['A3'].s = infoStyle;

  // Estilos stats
  if (config.stats?.length) {
    const offset = Math.max(0, Math.floor((columns.length - config.stats.length) / 2));
    config.stats.forEach((s, i) => {
      const col = COLS[offset + i];
      const statStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, alignment: { horizontal: 'center' }, fill: { fgColor: { rgb: s.color } } };
      if (ws[`${col}${statsStartRow + 1}`]) ws[`${col}${statsStartRow + 1}`].s = statStyle;
      if (ws[`${col}${statsStartRow + 2}`]) ws[`${col}${statsStartRow + 2}`].s = statStyle;
    });
  }

  // Estilos encabezados tabla
  COLS.forEach(col => {
    const cell = `${col}${headerRowIndex + 1}`;
    if (ws[cell]) ws[cell].s = headerStyle;
  });

  // Estilos datos
  for (let row = dataStartRow; row < dataStartRow + rows.length; row++) {
    COLS.forEach((col, colIdx) => {
      const cell = `${col}${row + 1}`;
      if (!ws[cell]) return;
      const colorMap = columns[colIdx]?.colorMap;
      if (colorMap) {
        const val = String(ws[cell].v);
        const color = colorMap[val];
        ws[cell].s = color
          ? { ...dataStyle, font: { bold: true, color: { rgb: color } } }
          : dataStyle;
      } else {
        ws[cell].s = dataStyle;
      }
    });
  }

  // Celdas vacías
  for (let row = 0; row < wsData.length; row++) {
    COLS.forEach(col => {
      const cell = `${col}${row + 1}`;
      if (!ws[cell]) ws[cell] = { v: '', s: emptyStyle };
      else if (!ws[cell].s) ws[cell].s = emptyStyle;
    });
  }

  // Footer
  const footerRow1 = wsData.length - 1;
  const footerRow2 = wsData.length;
  if (ws[`A${footerRow1}`]) ws[`A${footerRow1}`].s = footerStyle;
  if (ws[`A${footerRow2}`]) ws[`A${footerRow2}`].s = footerStyle;

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } },
    { s: { r: wsData.length - 2, c: 0 }, e: { r: wsData.length - 2, c: Math.min(2, lastCol) } },
    { s: { r: wsData.length - 1, c: 0 }, e: { r: wsData.length - 1, c: Math.min(2, lastCol) } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, config.sheetName ?? 'Reporte');
  XLSX.writeFile(wb, config.filename);
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

export async function generarPDF(
  config: ExportConfig & { orientation?: 'portrait' | 'landscape' },
  columns: PDFColumn[],
  rows: ((doc: any) => { cells: string[]; rowH?: number })[]
) {
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default;
  const doc = new jsPDF({ orientation: config.orientation ?? 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const now = new Date();
  const fechaGen = now.toLocaleDateString('es-AR');
  const horaGen = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const drawHeader = () => {
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('Dirección Nacional de Migraciones - WSMS', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(config.subtitle, pageWidth / 2, 23, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`Generado: ${fechaGen} ${horaGen}${config.usuario ? ` | Usuario: ${config.usuario}` : ''}`, pageWidth / 2, 30, { align: 'center' });
  };

  const drawFooter = (page: number, total: number) => {
    doc.setDrawColor(200, 200, 200);
    doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Migraciones - WSMS © 2025', 15, pageHeight - 8);
    doc.text(`Página ${page} de ${total}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
  };

  const drawTableHeader = (y: number) => {
    doc.setFillColor(29, 78, 216);
    doc.rect(15, y, pageWidth - 30, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    columns.forEach(c => doc.text(c.label, c.x + 1, y + 5.5));
    return y + 10;
  };

  drawHeader();
  let y = 45;
  let page = 1;
  y = drawTableHeader(y);

  rows.forEach((rowFn, idx) => {
    const { cells, rowH: customRowH } = rowFn(doc);

    // Calcular altura según columnas con wrap
    let rowH = customRowH ?? 9;
    columns.forEach((col, i) => {
      if (col.wrap && cells[i]) {
        const lines = doc.splitTextToSize(cells[i], col.w - 2);
        rowH = Math.max(rowH, lines.length * 4.5 + 4);
      }
    });

    if (y > pageHeight - 30) {
      drawFooter(page, 1);
      doc.addPage();
      page++;
      drawHeader();
      y = 45;
      y = drawTableHeader(y);
    }

    doc.setFillColor(idx % 2 === 0 ? 249 : 243, idx % 2 === 0 ? 250 : 244, idx % 2 === 0 ? 251 : 246);
    doc.rect(15, y - 1, pageWidth - 30, rowH, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 30, 30);

    columns.forEach((col, i) => {
      const text = cells[i] ?? '';
      if (col.wrap) {
        const lines = doc.splitTextToSize(text, col.w - 2);
        doc.text(lines, col.x + 1, y + 4.5);
      } else {
        const truncated = col.truncate && text.length > col.truncate ? text.slice(0, col.truncate) + '.' : text;
        doc.text(truncated, col.x + 1, y + 4.5);
      }
    });

    y += rowH;
  });

  drawFooter(page, page);
  doc.save(config.filename);
}
