// hooks/useAutorizaciones.ts
"use client";

import { useState, useEffect } from "react";
import { endpoints } from "@/app/api/endpoints";
import { fetcher, poster } from "@/app/api/fetcher";
import { Autorizacion } from "@/app/api/types";

export function useAutorizaciones(estado?: string) {
  const [autorizaciones, setAutorizaciones] = useState<Autorizacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarAutorizaciones = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = estado 
        ? endpoints.autorizaciones.list(estado)
        : endpoints.autorizaciones.list();
        
      const data = await fetcher<Autorizacion[]>(url);
      setAutorizaciones(data);
    } catch (err) {
      console.error('Error cargando autorizaciones:', err);
      setError('Error al cargar autorizaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAutorizaciones();
  }, [estado]);

  const aprobarAutorizacion = async (id: string, observaciones?: string) => {
    try {
      await poster(
        endpoints.autorizaciones.aprobar(id),
        { observaciones }
      );
      await cargarAutorizaciones();
    } catch (err) {
      console.error('Error aprobando autorización:', err);
      throw err;
    }
  };

  const rechazarAutorizacion = async (id: string, observaciones: string) => {
    try {
      await poster(
        endpoints.autorizaciones.rechazar(id),
        { observaciones }
      );
      await cargarAutorizaciones();
    } catch (err) {
      console.error('Error rechazando autorización:', err);
      throw err;
    }
  };

  return {
    autorizaciones,
    loading,
    error,
    cargarAutorizaciones,
    aprobarAutorizacion,
    rechazarAutorizacion,
  };
}