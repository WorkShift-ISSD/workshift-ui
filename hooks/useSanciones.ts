"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/app/lib/apiclient";
import { Sancion, NuevaSancion, User } from "@/app/api/types";

export function useSanciones() {
  const [sanciones, setSanciones] = useState<Sancion[]>([]);
  const [loading, setLoading] = useState(false);

  const cargarSanciones = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<Sancion[]>('/sanciones');
      setSanciones(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSanciones();
  }, []);


  const crearSancion = async (data: NuevaSancion) => {
    const nueva = await apiClient.post<Sancion>('/sanciones', data);
    setSanciones((prev) => [nueva, ...prev]);
  };

  const actualizarSancion = async (
    id: string,
    data: Partial<NuevaSancion>
  ) => {
    const actualizada = await apiClient.put<Sancion>(`/sanciones/${id}`, data);

    setSanciones((prev) =>
      prev.map((s) => (s.id === id ? actualizada : s))
    );
  };


  const tieneSancionActiva = (empleadoId: string): boolean => {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

    return sanciones.some(
      (s) =>
        s.empleado_id === empleadoId &&
        s.estado === "ACTIVA" &&
        hoy >= s.fecha_desde &&
        hoy <= s.fecha_hasta
    );
  };

  return {
    sanciones,
    loading,
    cargarSanciones,
    crearSancion,
    actualizarSancion,
    tieneSancionActiva,
  };
}