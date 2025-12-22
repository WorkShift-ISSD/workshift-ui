"use client";

import { useState } from "react";
import { Eye, Pencil, Plus } from "lucide-react";
import { Sancion } from "@/app/api/types";
import { ModalSancion } from "./ModalSancion";

interface Props {
    sanciones: Sancion[];
    loading: boolean;
}

type ModalMode = "create" | "view" | "edit";

export function SancionesTable({
    sanciones,
    loading,
}: Props) {
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

    return (
        <>
            {/* HEADER */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Sanciones</h2>
                <button
                    onClick={abrirCrear}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded"
                >
                    <Plus size={16} />
                    Nueva sanción
                </button>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded shadow">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-left dark:text-gray-400">Empleado</th>
                            <th className="p-3 dark:text-gray-400">Desde</th>
                            <th className="p-3 dark:text-gray-400">Hasta</th>
                            <th className="p-3 dark:text-gray-400">Estado</th>
                            <th className="p-3 text-center dark:text-gray-400">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sanciones.map((s) => (
                            <tr
                                key={s.id}
                                className="border-t dark:border-gray-700"
                            >
                                <td className="p-3">{s.empleado_id}</td>
                                <td className="p-3">{s.fecha_desde}</td>
                                <td className="p-3">{s.fecha_hasta}</td>
                                <td className="p-3">
                                    <span
                                        className={`px-2 py-1 rounded text-xs ${s.estado === "ACTIVA"
                                                ? "bg-red-100 text-red-800"
                                                : "bg-gray-200 text-gray-700"
                                            }`}
                                    >
                                        {s.estado}
                                    </span>
                                </td>
                                <td className="p-3 flex justify-center gap-2">
                                    <button
                                        onClick={() => abrirVer(s)}
                                        title="Ver"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button
                                        onClick={() => abrirEditar(s)}
                                        title="Editar"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL ÚNICO */}
            <ModalSancion
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                modo={modo}
                sancion={sancionSeleccionada}
            />
        </>
    );
}
