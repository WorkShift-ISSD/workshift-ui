#!/usr/bin/env python3
"""
planilla_to_excel.py
Convierte planillas diarias de horario (formato GB) a los Excels de importación
que acepta la app Workshift.

Genera dos archivos en la carpeta de salida:
  - cambios_YYYYMMDD.xlsx   → subir en Autorizaciones > Importar cambios
  - licencias_YYYYMMDD.xlsx → subir en Licencias > Importar Excel

Uso:
  python planilla_to_excel.py HORARIO_REAL_GB_12-07-2026.xlsx
  python planilla_to_excel.py HORARIO_REAL_GB_12-07-2026.xlsx --fecha 2026-07-12
  python planilla_to_excel.py HORARIO_REAL_GB_12-07-2026.xlsx --empleados Listado_Empleados.xlsx

Dependencias:
  pip install pandas openpyxl
"""

import sys
import re
import argparse
import unicodedata
from pathlib import Path

try:
    import pandas as pd
    import openpyxl
except ImportError:
    print("Falta instalar dependencias. Corré: pip install pandas openpyxl")
    sys.exit(1)


# ── Textos que NO son nombres de personas ─────────────────────────────────────

PREFIJOS_NOTA = ['AUT ', 'AUT.', 'AEROPARQUE', 'CAMBIO HORARIO', 'HORA ', 'HORA IMG', 'S/CREDENCIAL']

ABREV_LICENCIA = {
    'LO', 'LM', 'LG', 'LE', 'LX', 'SM', 'SG', 'SF', 'L.O',
    'COMPENSATORIO', 'FC', 'COMP', 'ROU', 'FRANCO', 'COMISION', 'COMISIÓN',
    'LIC', 'LICENCIA', 'CURSO',
}

TIPOS_LICENCIA_MAP = {
    'LO':                    'ORDINARIA',
    'L.O':                   'ORDINARIA',
    'LIC ORDINARIA':         'ORDINARIA',
    'FC':                    'COMPENSATORIO',
    'COMP':                  'COMPENSATORIO',
    'COMPENSATORIO':         'COMPENSATORIO',
    'FRANCO COMPENSATORIO':  'COMPENSATORIO',
    'FRANCO':                'COMPENSATORIO',
    'LM':                    'MEDICA',
    'LIC MEDICA':            'MEDICA',
    'LIC MÉDICA':            'MEDICA',
    'LG':                    'GREMIAL',
    'LIC GREMIAL':           'GREMIAL',
    'LE':                    'ESTUDIO',
    'LEX':                   'ESTUDIO',
    'LIC ESTUDIO':           'ESTUDIO',
    'SM':                    'PATERNIDAD',
    'SF':                    'PATERNIDAD',
    'SG':                    'PATERNIDAD',
    'ROU':                   'COMISION',
    'COMISION':              'COMISION',
    'COMISIÓN':              'COMISION',
    'CURSO':                 'CURSO',
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def norm(texto):
    """Normaliza texto: sin acentos, mayúsculas, espacios simples."""
    if not texto:
        return ''
    s = str(texto).strip()
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', s).upper()


def es_nota(texto):
    """True si el texto es una nota/abreviatura, no un nombre de persona."""
    if not texto:
        return True
    t = norm(texto)
    if not t:
        return True
    if t[0].isdigit() or t[0] == '(':
        return True
    for prefijo in PREFIJOS_NOTA:
        if t.startswith(norm(prefijo)):
            return True
    if 'CREDENCIAL' in t:
        return True
    if len(t) <= 4 and ' ' not in t:
        return True
    return False


def tipo_licencia(texto):
    """
    Si el texto es una licencia/ausencia devuelve el tipo (ej 'ORDINARIA').
    Si es un nombre de persona devuelve None.
    """
    if not texto:
        return None
    t = norm(texto)

    # Buscar coincidencia exacta o que empiece con la abreviatura
    for clave, tipo in TIPOS_LICENCIA_MAP.items():
        cn = norm(clave)
        if t == cn or t.startswith(cn + ' '):
            return tipo

    # Si contiene LIC → licencia genérica (para no confundir con nombres)
    if re.search(r'\bLIC\b', t):
        return 'LICENCIA'

    return None


def limpiar_nombre(texto):
    """Quita prefijos C/P y sufijos GA/GB."""
    if not texto:
        return ''
    t = str(texto).strip()
    t = re.sub(r'^C/P\s*', '', t, flags=re.IGNORECASE).strip()
    t = re.sub(r'\s+(GA|GB)\s*$', '', t, flags=re.IGNORECASE).strip()
    return t.upper()


def extraer_fecha(path):
    """Intenta extraer la fecha del nombre del archivo (dd-mm-yyyy o dd_mm_yyyy)."""
    m = re.search(r'(\d{2})[-_](\d{2})[-_](\d{4})', Path(path).stem)
    if m:
        dia, mes, anio = m.groups()
        return f'{anio}-{mes}-{dia}'
    return None


# ── Parser GB ─────────────────────────────────────────────────────────────────

def parse_gb(path, fecha):
    """
    Lee la hoja 'HORARIO REAL' de un archivo GB y devuelve
    (cambios: list[dict], licencias: list[dict]).
    """
    wb = openpyxl.load_workbook(path, data_only=True)

    hoja = next(
        (n for n in wb.sheetnames if 'HORARIO' in n.upper() and 'REAL' in n.upper()),
        None
    )
    if not hoja:
        raise ValueError(f"No se encontró hoja 'HORARIO REAL' en {path}")

    ws = wb[hoja]
    filas = list(ws.values)

    # Detectar inicio del bloque de Supervisores (header 'APELLIDO Y NOMBRE' repetido)
    idx_sup = None
    for i, fila in enumerate(filas):
        contenido = ' '.join(str(c or '') for c in fila).upper()
        if 'APELLIDO Y NOMBRE' in contenido and i > 5:
            idx_sup = i
            break

    # Detectar sección 'CAMBIOS DE GUARDIA' al final (resumen, se ignora)
    idx_fin = len(filas)
    for i, fila in enumerate(filas):
        contenido = ' '.join(str(c or '') for c in fila).upper()
        if 'CAMBIOS DE GUARDIA' in contenido and i > len(filas) // 2:
            idx_fin = i
            break

    cambios = []
    licencias = []
    avisos = []

    def procesar(nombre_e, texto_f, nombre_h, hora):
        nombre_e = limpiar_nombre(nombre_e)
        nombre_h = limpiar_nombre(nombre_h)

        if not nombre_e or es_nota(nombre_e):
            return

        lic = tipo_licencia(texto_f) if texto_f else None

        if lic:
            # Es ausencia/licencia
            licencias.append({
                'nombre':   nombre_e,
                'tipo':     lic,
                'tipo_raw': str(texto_f or '').strip(),
                'fecha':    fecha,
            })
            return

        nombre_f = ''
        if texto_f and not es_nota(texto_f):
            nombre_f = limpiar_nombre(texto_f)
        elif texto_f:
            # es_nota lo descartó (abreviatura corta) pero no es una licencia conocida.
            # Si parece un código alfabético, avisar para no perder la ausencia.
            t = norm(str(texto_f).strip())
            if t and t.isalpha() and len(t) <= 6:
                avisos.append(
                    f'  ⚠  {nombre_e}: abreviatura desconocida "{str(texto_f).strip()}" — verificar manualmente'
                )

        if nombre_f and nombre_h:
            # COMBINADO: intercambio E↔F + cobertura de F por H
            cambios.append({'tipo': 'INTERCAMBIO', 'solicitante': nombre_e, 'destinatario': nombre_f, 'hora': hora})
            cambios.append({'tipo': 'COBERTURA',   'solicitante': nombre_f, 'destinatario': nombre_h, 'hora': hora})
        elif nombre_f:
            # INTERCAMBIO simple
            cambios.append({'tipo': 'INTERCAMBIO', 'solicitante': nombre_e, 'destinatario': nombre_f, 'hora': hora})
        elif nombre_h:
            # COBERTURA simple
            cambios.append({'tipo': 'COBERTURA', 'solicitante': nombre_e, 'destinatario': nombre_h, 'hora': hora})

    # Bloque principal: HORA=col D (idx3), E=idx4, F=idx5, H=idx7
    fin_principal = idx_sup if idx_sup else idx_fin
    for i, fila in enumerate(filas[:fin_principal]):
        if i < 2:
            continue
        fila = list(fila) + [None] * 10
        hora    = str(fila[3] or '').strip()
        col_e   = fila[4]
        col_f   = fila[5]
        col_h   = fila[7]
        procesar(col_e, col_f, col_h, hora)

    # Bloque Supervisores: HORA=col C (idx2), E=idx4, F=idx5 (sin col H)
    if idx_sup:
        for i, fila in enumerate(filas[idx_sup:idx_fin]):
            if i < 1:
                continue
            fila = list(fila) + [None] * 10
            hora  = str(fila[2] or '').strip()
            col_e = fila[4]
            col_f = fila[5]
            procesar(col_e, col_f, None, hora)

    return cambios, licencias, avisos


# ── Deduplicar intercambios ───────────────────────────────────────────────────

def deduplicar(cambios):
    """
    Cada intercambio aparece dos veces en la planilla (una por cada participante).
    Deduplica por el par de nombres sin importar el orden.
    """
    vistos = set()
    resultado = []
    for c in cambios:
        if c['tipo'] == 'INTERCAMBIO':
            par = frozenset([c['solicitante'], c['destinatario']])
            if par in vistos:
                continue
            vistos.add(par)
        resultado.append(c)
    return resultado


# ── Generar Excels de salida ──────────────────────────────────────────────────

def generar_cambios(cambios, fecha, output_dir):
    filas = [
        {
            'fecha':        fecha,
            'tipo':         c['tipo'],
            'solicitante':  c['solicitante'],
            'destinatario': c['destinatario'],
            'horario':      '',   # la app usa el horario base de la DB; completar solo si difiere
        }
        for c in cambios
    ]
    df = pd.DataFrame(filas, columns=['fecha', 'tipo', 'solicitante', 'destinatario', 'horario'])
    out = Path(output_dir) / f'cambios_{fecha.replace("-", "")}.xlsx'
    df.to_excel(out, index=False)
    print(f'  → {out}  ({len(filas)} cambios)')
    return out


def generar_licencias(licencias, fecha, output_dir, empleados_df=None):
    filas = []
    sin_legajo = []

    for l in licencias:
        legajo = ''
        if empleados_df is not None:
            match = empleados_df[empleados_df['_norm'] == norm(l['nombre'])]
            if not match.empty:
                legajo = int(match.iloc[0]['LEGAJO'])
            else:
                sin_legajo.append(l['nombre'])

        filas.append({
            'legajo':        legajo,
            'tipo':          l['tipo'],
            'fecha_desde':   fecha,
            'fecha_hasta':   fecha,
            'observaciones': l['tipo_raw'],
        })

    df = pd.DataFrame(filas, columns=['legajo', 'tipo', 'fecha_desde', 'fecha_hasta', 'observaciones'])
    out = Path(output_dir) / f'licencias_{fecha.replace("-", "")}.xlsx'
    df.to_excel(out, index=False)
    print(f'  → {out}  ({len(filas)} licencias)')

    if sin_legajo:
        print(f'  ⚠  Sin legajo (no encontrados en listado):')
        for nombre in sin_legajo:
            print(f'       {nombre}')

    return out


def generar_faltas(licencias, fecha, output_dir, empleados_df=None):
    filas = []
    sin_legajo = []

    for l in licencias:
        legajo = ''
        if empleados_df is not None:
            match = empleados_df[empleados_df['_norm'] == norm(l['nombre'])]
            if not match.empty:
                legajo = int(match.iloc[0]['LEGAJO'])
            else:
                sin_legajo.append(l['nombre'])

        filas.append({
            'legajo':        legajo,
            'fecha':         fecha,
            'motivo':        l['tipo'],
            'observaciones': l['tipo_raw'],
            'justificada':   'SI',
        })

    df = pd.DataFrame(filas, columns=['legajo', 'fecha', 'motivo', 'observaciones', 'justificada'])
    out = Path(output_dir) / f'faltas_{fecha.replace("-", "")}.xlsx'
    df.to_excel(out, index=False)
    print(f'  → {out}  ({len(filas)} faltas)')

    if empleados_df is None:
        print('  ⚠  Sin listado de empleados: la columna legajo quedó vacía.')
        print('     Pasá --empleados para completarla automáticamente, o completála a mano antes de subir.')
    elif sin_legajo:
        print(f'  ⚠  Sin legajo (no encontrados en listado):')
        for nombre in sin_legajo:
            print(f'       {nombre}')

    return out


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(
        description='Convierte planilla GB a Excels de importación para Workshift'
    )
    ap.add_argument('archivo',      help='Planilla Excel  (HORARIO_REAL_GB_DD-MM-YYYY.xlsx)')
    ap.add_argument('--fecha',      help='Fecha del turno (YYYY-MM-DD). Si se omite se extrae del nombre del archivo.')
    ap.add_argument('--empleados',  help='Listado de empleados (Listado_Empleados.xlsx). Necesario para generar legajos en licencias.')
    ap.add_argument('--output',     default='.', help='Carpeta de salida (por defecto: carpeta actual)')
    args = ap.parse_args()

    # Fecha
    fecha = args.fecha or extraer_fecha(args.archivo)
    if not fecha:
        print('❌  No se pudo extraer la fecha. Usá: --fecha YYYY-MM-DD')
        sys.exit(1)

    print(f'\n📅  Fecha: {fecha}')
    print(f'📄  Archivo: {args.archivo}')

    # Cargar listado de empleados (opcional, para legajos en licencias)
    empleados_df = None
    if args.empleados:
        empleados_df = pd.read_excel(args.empleados)
        empleados_df['_norm'] = (
            empleados_df['APELLIDO'].astype(str) + ' ' + empleados_df['NOMBRE'].astype(str)
        ).apply(norm)
        print(f'👥  Empleados cargados: {len(empleados_df)}')

    # Parsear planilla
    cambios_raw, licencias, avisos = parse_gb(args.archivo, fecha)
    cambios = deduplicar(cambios_raw)

    print(f'\n📊  Encontrado:')
    print(f'    Cambios de turno : {len(cambios)}')
    print(f'    Licencias        : {len(licencias)}')

    if cambios:
        print(f'\n🔄  Cambios:')
        for c in cambios:
            flecha = '↔' if c['tipo'] == 'INTERCAMBIO' else '→'
            print(f'    [{c["tipo"][:3]}]  {c["solicitante"]} {flecha} {c["destinatario"]}')

    if licencias:
        print(f'\n🏥  Licencias:')
        for l in licencias:
            print(f'    {l["nombre"]} — {l["tipo"]}')

    # Generar Excels
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f'\n💾  Generando archivos en {output_dir.resolve()}:')

    if cambios:
        generar_cambios(cambios, fecha, output_dir)

    if licencias:
        generar_licencias(licencias, fecha, output_dir, empleados_df)
        generar_faltas(licencias, fecha, output_dir, empleados_df)

    if avisos:
        print(f'\n⚠️   Abreviaturas no reconocidas — revisar antes de subir:')
        for a in avisos:
            print(a)

    print('\n✅  Listo. Subí los archivos generados a la app.')


if __name__ == '__main__':
    main()
