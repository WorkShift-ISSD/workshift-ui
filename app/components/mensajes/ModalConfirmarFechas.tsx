'use client';

interface Props {
    onMantener: () => void;
    onCerrar: () => void;
}

export function ModalConfirmarFechas({ onMantener, onCerrar }: Props) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    ¿Qué hacemos con las otras fechas?
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Tu oferta tiene más fechas disponibles. ¿Querés mantenerlas activas o cerrar la oferta?
                </p>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={onMantener}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                    >
                        Mantener oferta activa para las otras fechas
                    </button>
                    <button
                        onClick={onCerrar}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        Cerrar la oferta completa
                    </button>
                </div>
            </div>
        </div>
    );
}