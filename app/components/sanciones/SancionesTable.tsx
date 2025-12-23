"use client";

import { useState } from "react";
import { Eye, Pencil, Plus } from "lucide-react";
import { Sancion } from "@/app/api/types";
import { ModalSancion } from "./ModalSancion";
import { useEmpleados } from "@/hooks/useEmpleados";
import { useSanciones } from "@/hooks/useSanciones";
import { useFormatters} from "@/hooks/useFormatters"

interface Props {
    sanciones: Sancion[];
    loading: boolean;
}

type ModalMode = "create" | "view" | "edit";

export function SancionesTable({
    sanciones,
    loading,
}: Props) {
    const { empleados } = useEmpleados();
    const { cargarSanciones } = useSanciones();
    const [modalOpen, setModalOpen] = useState(false);
    const [modo, setModo] = useState<ModalMode>("view");
    const [sancionSeleccionada, setSancionSeleccionada] =
        useState<Sancion | null>(null);

    const abrirCrear = () => {
        setModo("create");
        setSancionSeleccionada(null);
        setModalOpen(true);
    };

    const abrirVer = (s: Sancion) => {
        setModo("view");
        setSancionSeleccionada(s);
        setModalOpen(true);
    };

    const abrirEditar = (s: Sancion) => {
        setModo("edit");
        setSancionSeleccionada(s);
        setModalOpen(true);
    };

    const { parseFechaLocal, formatTimeAgo, formatDate, formatDate2 } = useFormatters();

    return (
        <>
            {/* HEADER */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Sanciones
                </h2>
                <button
                    onClick={abrirCrear}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                >
                    <Plus size={16} />
                    Nueva sanción
                </button>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
                {loading ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        Cargando sanciones...
                    </div>
                ) : sanciones.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        No hay sanciones registradas
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <th className="p-3 text-left text-gray-700 dark:text-gray-400">
                                    Empleado
                                </th>
                                <th className="p-3 text-gray-700 dark:text-gray-400">
                                    Desde
                                </th>
                                <th className="p-3 text-gray-700 dark:text-gray-400">
                                    Hasta
                                </th>
                                <th className="p-3 text-gray-700 dark:text-gray-400">
                                    Estado
                                </th>
                                <th className="p-3 text-center text-gray-700 dark:text-gray-400">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sanciones.map((s) => {
                                const empleado = empleados?.find(
                                    (e) => e.id === s.empleado_id
                                );

                                return (
                                    <tr
                                        key={s.id}
                                        className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                                    >
                                        <td className="p-3 text-gray-900 dark:text-white">
                                            {empleado
                                                ? `${empleado.apellido}, ${empleado.nombre}`
                                                : "Empleado no encontrado"}
                                        </td>
                                        <td className="p-3 text-center text-gray-900 dark:text-white">
                                            {formatDate2(s.fecha_desde)}
                                        </td>
                                        <td className="p-3 text-center text-gray-900 dark:text-white">
                                            {formatDate2(s.fecha_hasta)}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-medium ${
                                                    s.estado === "ACTIVA"
                                                        ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400"
                                                        : s.estado === "FINALIZADA"
                                                        ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                                        : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400"
                                                }`}
                                            >
                                                {s.estado}
                                            </span>
                                        </td>
                                        <td className="p-3 flex justify-center gap-2">
                                            <button
                                                onClick={() => abrirVer(s)}
                                                title="Ver"
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => abrirEditar(s)}
                                                title="Editar"
                                                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 transition"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* MODAL ÚNICO */}
            <ModalSancion
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                modo={modo}
                sancion={sancionSeleccionada}
                onSancionCreada={cargarSanciones}
            />
        </>
    );
}