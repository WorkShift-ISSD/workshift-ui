// hooks/useAutorizaciones.ts
"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/app/lib/apiclient";
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
        ? `/autorizaciones?estado=${estado}`
        : `/autorizaciones`;

      const data = await apiClient.get<Autorizacion[]>(url);
      setAutorizaciones(Array.isArray(data) ? data : []);
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
    }, 300000); // cada 5 minutos

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
      try { pusher.unsubscribe(`usuario-${user.id}`); } catch (e) { }
      try { pusher.disconnect(); } catch (e) { }
    };
  }, [user?.id]);

  const aprobarAutorizacion = async (id: string, observaciones?: string) => {
    try {
      await apiClient.post(`/autorizaciones/${id}/aprobar`, { observaciones });
      await cargarAutorizaciones();
    } catch (err) {
      console.error('Error aprobando autorización:', err);
      throw err;
    }
  };

  const rechazarAutorizacion = async (id: string, observaciones: string) => {
    try {
      await apiClient.post(`/autorizaciones/${id}/rechazar`, { observaciones });
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