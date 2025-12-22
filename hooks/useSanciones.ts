"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { endpoints } from "@/app/api/endpoints";
import { fetcher, poster, putter } from "@/app/api/fetcher";
import { Sancion, NuevaSancion, User } from "@/app/api/types";

export function useSanciones() {
  const [sanciones, setSanciones] = useState<Sancion[]>([]);
  const [loading, setLoading] = useState(false);

  /* -------------------- */
  /* Cargar sanciones */
  /* -------------------- */
  const cargarSanciones = async () => {
    setLoading(true);
    try {
      const data = await fetcher<Sancion[]>(
        endpoints.sanciones.list()
      );
      setSanciones(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSanciones();
  }, []);


  /* Crear sanción */
  const crearSancion = async (data: NuevaSancion) => {
    const nueva = await poster<Sancion>(
      endpoints.sanciones.create(),
      data
    );
    setSanciones((prev) => [nueva, ...prev]);
  };

  /* Actualizar sanción */
  const actualizarSancion = async (
    id: string,
    data: Partial<NuevaSancion>
  ) => {
    const actualizada = await putter<Sancion>(
      endpoints.sanciones.update(id),
      data
    );

    setSanciones((prev) =>
      prev.map((s) => (s.id === id ? actualizada : s))
    );
  };

  
  /* ¿Tiene sanción activa? */
  const tieneSancionActiva = (empleadoId: string): boolean => {
    const hoy = new Date().toISOString().slice(0, 10);

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
