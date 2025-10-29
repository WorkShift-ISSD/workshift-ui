import { useState, useEffect, useMemo } from 'react';

export type Rol = 'SUPERVISOR' | 'INSPECTOR' | 'JEFE';
export type GrupoTurno = 'A' | 'B';
export type TipoOferta = 'INTERCAMBIO' | 'ABIERTO';
export type Prioridad = 'NORMAL' | 'URGENTE';
export type EstadoOferta = 'DISPONIBLE' | 'SOLICITADO' | 'APROBADO' | 'COMPLETADO' | 'CANCELADO';

export interface Oferta {
  id: string;
  ofertante: {
    id: string;
    nombre: string;
    apellido: string;
    rol: Rol;
    calificacion: number;
    totalIntercambios: number;
  };
  tipo: TipoOferta;
  turnoOfrece: {
    fecha: string;
    horario: string;
    grupoTurno: GrupoTurno;
  } | null;
  turnoBusca: {
    fecha: string;
    horario: string;
    grupoTurno: GrupoTurno;
  } | null;
  rangoFechas?: {
    desde: string;
    hasta: string;
  };
  descripcion: string;
  prioridad: Prioridad;
  validoHasta: string;
  publicado: string;
  estado: EstadoOferta;
  fechaOfrece?: any;
  fechaSolicitante?: any;
}

export interface SolicitudDirecta {
  id: string;
  solicitante: {
    id: string;
    nombre: string;
    apellido: string;
  };
  destinatario: {
    id: string;
    nombre: string;
    apellido: string;
  };
  turnoSolicitante: {
    fecha: string;
    horario: string;
    grupoTurno: GrupoTurno;
  };
  turnoDestinatario: {
    fecha: string;
    horario: string;
    grupoTurno: GrupoTurno;
  };
  motivo: string;
  prioridad: Prioridad;
  estado: EstadoOferta;
  fechaSolicitud: string;
}

export interface NuevaOfertaForm {
  tipo: TipoOferta;
  fechaOfrece: string;
  horarioOfrece: string;
  grupoOfrece: GrupoTurno;
  fechaBusca: string;
  horarioBusca: string;
  grupoBusca: GrupoTurno;
  fechaDesde: string;
  fechaHasta: string;
  descripcion: string;
  prioridad: Prioridad;
}

export interface SolicitudDirectaForm {
  destinatarioId: string;
  fechaSolicitante: string;
  horarioSolicitante: string;
  grupoSolicitante: GrupoTurno;
  fechaDestinatario: string;
  horarioDestinatario: string;
  grupoDestinatario: GrupoTurno;
  motivo: string;
  prioridad: Prioridad;
}

export const useOfertas = () => {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [solicitudesDirectas, setSolicitudesDirectas] = useState<SolicitudDirecta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Peticiones en paralelo
      const [ofertasRes, solicitudesRes] = await Promise.all([
        fetch('/api/ofertas'),
        fetch('/api/solicitudes-directas')
      ]);

      if (!ofertasRes.ok || !solicitudesRes.ok) {
        throw new Error('Error al cargar datos');
      }

      const ofertasData = await ofertasRes.json();
      const solicitudesData = await solicitudesRes.json();

      setOfertas(ofertasData);
      setSolicitudesDirectas(solicitudesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const agregarOferta = async (oferta: any) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Usuario no autenticado");

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ofertas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(oferta),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al crear oferta");
  return data;
};


  const agregarSolicitudDirecta = async (formData: SolicitudDirectaForm) => {
    try {
      const response = await fetch('/api/solicitudes-directas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear solicitud');
      }

      const nuevaSolicitud = await response.json();
      setSolicitudesDirectas(prev => [nuevaSolicitud, ...prev]);
      return nuevaSolicitud;
    } catch (err) {
      console.error('Error adding solicitud:', err);
      throw err;
    }
  };

  const actualizarEstadoOferta = async (id: string, nuevoEstado: EstadoOferta) => {
    try {
      const response = await fetch(`/api/ofertas/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar estado');
      }

      const ofertaActualizada = await response.json();
      setOfertas(prev => 
        prev.map(o => o.id === id ? ofertaActualizada : o)
      );
      
      return ofertaActualizada;
    } catch (err) {
      console.error('Error updating oferta:', err);
      throw err;
    }
  };

  const eliminarOferta = async (id: string) => {
    try {
      const response = await fetch(`/api/ofertas/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar oferta');
      }

      setOfertas(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      console.error('Error deleting oferta:', err);
      throw err;
    }
  };

  const stats = useMemo(() => ({
    total: ofertas.length,
    intercambios: ofertas.filter(o => o.tipo === 'INTERCAMBIO').length,
    abiertos: ofertas.filter(o => o.tipo === 'ABIERTO').length,
    urgentes: ofertas.filter(o => o.prioridad === 'URGENTE').length,
  }), [ofertas]);

  return { 
    ofertas, 
    setOfertas, 
    solicitudesDirectas,
    setSolicitudesDirectas,
    stats, 
    agregarOferta,
    agregarSolicitudDirecta,
    actualizarEstadoOferta,
    eliminarOferta,
    isLoading,
    error,
    refetch: fetchData,
  };
};