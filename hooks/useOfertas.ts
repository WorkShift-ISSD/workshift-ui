// useOfertas.ts
import useSWR from 'swr';
import { Oferta, OfertaPayload, NuevaOfertaForm } from '@/app/api/types';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => res.json());

export const useOfertas = () => {
  const { data: response, error, isLoading, mutate } = useSWR<Oferta[]>('/api/ofertas', fetcher, {
    refreshInterval: 30000,
  });

  const data = Array.isArray(response) ? response : [];

  const agregarOferta = async (oferta: NuevaOfertaForm) => {
    console.log('📤 Datos del formulario:', oferta);

    // ✅ Construir payload limpio según modalidad
    const payload: OfertaPayload = {
      tipo: oferta.tipo,
      modalidadBusqueda: oferta.modalidadBusqueda,
      descripcion: oferta.descripcion.trim(),
      prioridad: oferta.prioridad,
    };

    if (oferta.modalidadBusqueda === 'INTERCAMBIO') {
      // Validar que tenemos los datos
      if (!oferta.fechaOfrece) {
        throw new Error('Falta fecha que ofreces');
      }

      payload.turnoOfrece = {
        fecha: oferta.fechaOfrece,
        horario: oferta.horarioOfrece,
        grupoTurno: oferta.grupoOfrece,
      };

      // Filtrar fechas vacías y construir array de turnosBusca
      const fechasBuscaValidas = (oferta.fechasBusca || [])
        .filter(f => f && f.fecha && f.fecha.trim() !== '');

      if (fechasBuscaValidas.length === 0) {
        throw new Error('Falta al menos una fecha que buscas');
      }

      payload.turnosBusca = fechasBuscaValidas.map(f => ({
        fecha: f.fecha,
        horario: f.horario,
      }));

    } else if (oferta.modalidadBusqueda === 'ABIERTO') {
      const fechasDisponiblesValidas = (oferta.fechasDisponibles || [])
        .filter(f => f && f.fecha && f.fecha.trim() !== '');

      if (fechasDisponiblesValidas.length === 0) {
        throw new Error('Falta al menos una fecha disponible');
      }

      payload.fechasDisponibles = fechasDisponiblesValidas.map(f => ({
        fecha: f.fecha,
        horario: f.horario,
      }));
    }

    console.log('📤 Payload limpio a enviar:', JSON.stringify(payload, null, 2));

    const res = await fetch("/api/ofertas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log('📥 Respuesta del servidor:', data);
    
    if (!res.ok) {
      console.error('❌ Error del servidor:', data);
      throw new Error(data.error || "Error al crear oferta");
    }

    mutate(); // Refrescar lista
    return data;
  };

  const actualizarEstado = async (id: string, nuevoEstado: string) => {
    const res = await fetch(`/api/ofertas/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: 'include',
      body: JSON.stringify({ estado: nuevoEstado }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Error al actualizar estado");
    }

    mutate();
    return await res.json();
  };

  const eliminarOferta = async (id: string) => {
    const res = await fetch(`/api/ofertas/${id}`, {
      method: "DELETE",
      credentials: 'include',
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Error al eliminar oferta");
    }

    mutate();
    return await res.json();
  };

  // Estadísticas calculadas
  const stats = {
    total: data?.length || 0,
    busco: (data || []).filter(o => o.tipo === 'BUSCO').length,
    ofrezco: (data || []).filter(o => o.tipo === 'OFREZCO').length,
    urgentes: (data || []).filter(o => o.prioridad === 'URGENTE').length,
  };

  return {
    ofertas: data,
    stats,
    isLoading,
    error,
    agregarOferta,
    actualizarEstado,
    eliminarOferta,
    mutate,
  };
};