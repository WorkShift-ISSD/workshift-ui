// hooks/useAutorizaciones.ts
"use client";

import { useState, useEffect } from "react";
import { endpoints } from "@/app/api/endpoints";
import { fetcher, poster } from "@/app/api/fetcher";
import { Autorizacion } from "@/app/api/types";
import { useAuth } from "@/app/context/AuthContext";
import Pusher from "pusher-js";

export function useAutorizaciones(estado?: string) {
  const { user } = useAuth();
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


useEffect(() => {
    const interval = setInterval(() => {
        cargarAutorizaciones();
    }, 300000); // cada 30 segundos
    
    return () => clearInterval(interval);
}, [estado]);


  useEffect(() => {
    if (!user?.id) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe(`usuario-${user.id}`);
    channel.bind('autorizacion-actualizada', () => {
      cargarAutorizaciones();
    });

    return () => {
      try { channel.unbind_all(); } catch (e) { }
      try { pusher.disconnect(); } catch (e) { }
    };
  }, [user?.id]);

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