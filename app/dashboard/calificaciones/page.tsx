"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { Clock, BarChart2, List } from "lucide-react";
import { useCalificaciones, TurnoPendiente, HistorialCalificacion } from "@/hooks/useCalificaciones";
import { ModalCalificar } from "@/app/components/calificaciones/ModalCalificar";
import { TabPendientes } from "@/app/components/calificaciones/TabPendientes";
import { TabMiPerfil } from "@/app/components/calificaciones/TabMiPerfil";
import { TabListado } from "@/app/components/calificaciones/TabListado";
import { useSearchParams } from "next/navigation";

type Tab = "pendientes" | "perfil" | "listado";

const TABS: { key: Tab; label: string; labelShort: string; icon: React.ElementType }[] = [
  { key: "pendientes", label: "Pendientes", labelShort: "Pendientes", icon: Clock },
  { key: "perfil", label: "Mi perfil", labelShort: "Mi Perfil", icon: BarChart2 },
  { key: "listado", label: "Listado general", labelShort: "Listado", icon: List },
];

export default function CalificacionesPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const [tab, setTab] = useState<Tab>(tabParam || "pendientes");
  const [modalItem, setModal] = useState<TurnoPendiente | null>(null);
  const [editItem, setEditItem] = useState<HistorialCalificacion | null>(null);

  const { pendientes, historial, miScore, isLoading, crearCalificacion, editarCalificacion, eliminarCalificacion, refetch } = useCalificaciones();

  async function handleSubmitCalificacion(
    turnoEfectivoId: string,
    calificadoId: string,
    data: { comunicacion: number; responsabilidad: number; recomendacion: number; cumplimiento: boolean; comentario?: string }
  ) {
    await crearCalificacion({ turnoEfectivoId, calificadoId, ...data });
    refetch();
  }

  async function handleEditarCalificacion(data: {
    comunicacion?: number; responsabilidad?: number; recomendacion?: number; cumplimiento?: boolean; comentario?: string;
  }) {
    if (!editItem) return;
    await editarCalificacion(editItem.id, data);
    setEditItem(null);
    refetch();
    toast.success("Calificación actualizada.");
  }

  async function handleEliminarCalificacion(item: HistorialCalificacion) {
    if (!confirm(`¿Eliminar la calificación a ${item.otro_nombre}? Esta acción no se puede deshacer.`)) return;
    await eliminarCalificacion(item.id);
    refetch();
    toast.success("Calificación eliminada.");
  }

  return (
    <>
      <div className="space-y-6">
        <div className="pl-6 sm:pl-0">
          <h1 className="text-2xl font-bold text-gray-100">Calificaciones</h1>
          <p className="text-gray-500 text-sm mt-1 ">
            Calificá a tus compañeros luego de completar un cambio de turno.
          </p>
        </div>

        <div className="flex gap-0 border-b border-gray-700/50 overflow-x-auto scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-all -mb-px whitespace-nowrap flex-shrink-0 ${
                tab === t.key ? "border-blue-500 text-blue-400 font-medium" : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              <t.icon size={15} />
              <span className="sm:hidden">{t.labelShort}</span>
              <span className="hidden sm:inline">{t.label}</span>
              {t.key === "pendientes" && pendientes.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {pendientes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {tab === "pendientes" && (
              <TabPendientes
                pendientes={pendientes}
                historial={historial}
                miScore={miScore}
                isLoading={isLoading}
                onCalificar={setModal}
              />
            )}
            {tab === "perfil" && (
              <TabMiPerfil
                historial={historial}
                miScore={miScore}
                isLoading={isLoading}
                onEditar={setEditItem}
                onEliminar={handleEliminarCalificacion}
              />
            )}
            {tab === "listado" && <TabListado />}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {modalItem && (
          <ModalCalificar
            item={modalItem}
            onClose={() => setModal(null)}
            onSubmit={handleSubmitCalificacion}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editItem && (
          <ModalCalificar
            item={editItem}
            onClose={() => setEditItem(null)}
            onSubmit={async (_turnoId, _calificadoId, data) => handleEditarCalificacion(data)}
            initialValues={editItem}
          />
        )}
      </AnimatePresence>
    </>
  );
}
