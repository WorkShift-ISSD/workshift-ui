"use client";

import { useState, useRef } from "react";
import { User, Phone, MapPin, AlertCircle, Calendar } from "lucide-react";
import { useEmpleados } from "@/hooks/useEmpleados";
import { useFormatters } from '@/hooks/useFormatters';




interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    userData: {
        id: string;
        telefono?: string;
        direccion?: string;
        fecha_nacimiento?: string | null;
    };
    onSuccess: () => void;
}

export default function EditProfileModal({
    isOpen,
    onClose,
    userData,
    onSuccess
}: EditProfileModalProps) {
    const [telefono, setTelefono] = useState(userData.telefono || "");
    const [direccion, setDireccion] = useState(userData.direccion || "");
    const [fechaNacimiento, setFechaNacimiento] = useState(
        userData.fecha_nacimiento
            ? userData.fecha_nacimiento.substring(0, 10)
            : ""
    );
    const dateInputRef = useRef<HTMLInputElement | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { empleados, updateEmpleado } = useEmpleados();
    const { parseFechaLocal } = useFormatters();
    const [displayFecha, setDisplayFecha] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        // Convertir displayFecha a ISO si es necesario
        let fechaFinal = fechaNacimiento;
        if (!fechaFinal && displayFecha) {
            const match = displayFecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (match) {
                const [, dd, mm, yyyy] = match;
                fechaFinal = `${yyyy}-${mm}-${dd}`;
            }
        }

        // VALIDAR +18 AÑOS
        if (fechaFinal) {
            const fechaNac = new Date(fechaFinal);
            const hoy = new Date();
            let edad = hoy.getFullYear() - fechaNac.getFullYear();
            const mesActual = hoy.getMonth();
            const mesNac = fechaNac.getMonth();

            if (mesActual < mesNac || (mesActual === mesNac && hoy.getDate() < fechaNac.getDate())) {
                edad--;
            }

            if (edad < 18) {
                setError("Debes ser mayor de 18 años");
                setLoading(false);
                return;
            }
        }

        try {
            await updateEmpleado(userData.id, {
                telefono,
                direccion,
                fechaNacimiento: fechaFinal || null,
            });

            onSuccess();
        } catch (err: any) {
            setError(err.message || "Error al actualizar datos");
        } finally {
            setLoading(false);
        }
    };

    const handleFechaChange = (value: string) => {
        // Solo permitir números y /
        const cleaned = value.replace(/[^\d/]/g, '');

        // Limitar longitud a 10 caracteres (dd/mm/aaaa)
        if (cleaned.length > 10) return;

        // Auto-agregar / después de día y mes
        let formatted = cleaned;
        if (cleaned.length === 2 && !cleaned.includes('/')) {
            formatted = cleaned + '/';
        } else if (cleaned.length === 5 && cleaned.split('/').length === 2) {
            formatted = cleaned + '/';
        }

        setDisplayFecha(formatted);

        // Si está completo, actualizar fechaNacimiento
        const match = formatted.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (match) {
            const [, dd, mm, yyyy] = match;
            setFechaNacimiento(`${yyyy}-${mm}-${dd}`);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8">

                <div className="text-center mb-6">
                    <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
                        <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        Actualizar Datos Personales
                    </h2>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-red-700 dark:text-red-300 flex gap-2 mb-4">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Teléfono */}
                    <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                            Teléfono
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                className="w-full px-4 py-2 pr-10 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="Ejemplo: 1122334455"
                                disabled={loading}
                            />
                            <Phone className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>

                    {/* Dirección */}
                    <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                            Dirección
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={direccion}
                                onChange={(e) => setDireccion(e.target.value)}
                                className="w-full px-4 py-2 pr-10 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="Ejemplo: Av. Siempreviva 123"
                                disabled={loading}
                            />
                            <MapPin className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>

                    {/* Fecha de Nacimiento */}
                    <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                            Fecha de Nacimiento
                        </label>
                        <div className="relative">
                            {/* Input visible para escribir */}
                            <input
                                type="text"
                                value={displayFecha}
                                onChange={(e) => handleFechaChange(e.target.value)}
                                placeholder="dd/mm/aaaa"
                                maxLength={10}
                                className="w-full px-4 py-2 pr-10 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                style={{ position: 'relative', zIndex: 10 }}
                            />

                            {/* Input oculto del calendario */}
                            <input
                                ref={dateInputRef}
                                type="date"
                                value={fechaNacimiento}
                                onChange={(e) => {
                                    const isoDate = e.target.value;
                                    setFechaNacimiento(isoDate);
                                    // Actualizar el display cuando seleccionan del calendario
                                    if (isoDate) {
                                        const [yyyy, mm, dd] = isoDate.split('-');
                                        setDisplayFecha(`${dd}/${mm}/${yyyy}`);
                                    } else {
                                        setDisplayFecha('');
                                    }
                                }}
                                className="absolute right-10 top-0 bottom-0 opacity-0"
                                style={{ width: '40px', cursor: 'pointer', zIndex: 20 }}
                            />

                            {/* Botón del icono */}
                            <button
                                type="button"
                                onClick={() => dateInputRef.current?.showPicker?.()}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                style={{ zIndex: 30 }}
                            >
                                <Calendar className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                    </div>


                    {/* Botones */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border rounded-lg dark:border-gray-600 text-gray-700 dark:text-gray-300"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
                        >
                            {loading ? "Guardando..." : "Guardar Cambios"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
