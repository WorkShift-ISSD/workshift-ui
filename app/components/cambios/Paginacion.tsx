'use client';

interface Props {
    pagina: number;
    totalPaginas: number;
    porPagina: number;
    onCambiarPagina: (pagina: number) => void;
    onCambiarPorPagina: (cantidad: number) => void;
}

export function Paginacion({ pagina, totalPaginas, porPagina, onCambiarPagina, onCambiarPorPagina }: Props) {
    return (
        <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Mostrar</span>
                <select
                    value={porPagina}
                    onChange={e => { onCambiarPorPagina(Number(e.target.value)); onCambiarPagina(1); }}
                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                    {[5, 10, 15].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="text-xs text-gray-500 dark:text-gray-400">por página</span>
            </div>

            {totalPaginas > 1 && (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onCambiarPagina(pagina - 1)}
                        disabled={pagina === 1}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                        Anterior
                    </button>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {pagina} / {totalPaginas}
                    </span>
                    <button
                        onClick={() => onCambiarPagina(pagina + 1)}
                        disabled={pagina === totalPaginas}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                        Siguiente
                    </button>
                </div>
            )}
        </div>
    );
}