"use client";

import { useState, useRef } from "react";
import { User, Phone, MapPin, AlertCircle, Calendar } from "lucide-react";
import { putter } from "@/app/api/fetcher";

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

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await putter(`/api/users/${userData.id}`, {
                telefono,
                direccion,
                fecha_nacimiento: fechaNacimiento || null,
            });

            onSuccess();
        } catch (err: any) {
            setError(err.message || "Error al actualizar datos");
        } finally {
            setLoading(false);
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
                            <input
                                type="text"
                                readOnly
                                value={
                                    fechaNacimiento
                                        ? new Date(fechaNacimiento).toLocaleDateString("es-AR")
                                        : ""
                                }
                                placeholder="dd/mm/aaaa"
                                className="w-full px-4 py-2 pr-10 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                            <input
                                ref={dateInputRef}
                                type="date"
                                value={fechaNacimiento}
                                onChange={(e) => setFechaNacimiento(e.target.value)}
                                disabled={loading}
                                className="absolute left-0 right-10 top-0 bottom-0 opacity-0 cursor-pointer z-20"
                                aria-hidden="true"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const el = dateInputRef.current;
                                    if (!el) return;
                                    if (typeof (el as any).showPicker === "function") {
                                        try { (el as any).showPicker(); } catch { el.focus(); el.click(); }
                                    } else {
                                        el.focus();
                                        el.click();
                                    }
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 z-30"
                                aria-label="Abrir selector de fecha"
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
