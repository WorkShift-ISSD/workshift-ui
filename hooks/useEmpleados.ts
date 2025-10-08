// hooks/useEmpleados.ts
import useSWR from 'swr';
import { deleter, fetcher, poster, putter } from '../app/api/fetcher';

const API_BASE = '/api';

interface Inspector {
  id: string;
  legajo: number;
  email: string;
  nombre: string;
  apellido: string;
  rol: 'SUPERVISOR' | 'INSPECTOR' | 'JEFE';
  telefono: string | null;
  direccion: string | null;
  horario: string | null;
  fechaNacimiento: string | null;
  activo: boolean;
  grupoTurno: 'A' | 'B';
  fotoPerfil: string | null;
  ultimoLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useEmpleados() {
  const { data, error, isLoading, mutate } = useSWR<Inspector[]>(
    `${API_BASE}/empleados`,
    fetcher
  );

  const createEmpleado = async (empleado: Omit<Inspector, 'id' | 'createdAt' | 'updatedAt' | 'ultimoLogin' | 'fotoPerfil'>) => {
    const newEmpleado = await poster<Inspector>(
      `${API_BASE}/empleados`,
      empleado
    );
    mutate([...(data || []), newEmpleado], false);
    return newEmpleado;
  };

  const updateEmpleado = async (id: string, empleado: Partial<Inspector>) => {
    const updated = await putter<Inspector>(
      `${API_BASE}/empleados/${id}`,
      empleado
    );
    mutate(
      data?.map((e) => (e.id === id ? updated : e)),
      false
    );
    return updated;
  };

  const deleteEmpleado = async (id: string) => {
    await deleter(`${API_BASE}/empleados/${id}`);
    mutate(
      data?.filter((e) => e.id !== id),
      false
    );
  };

  return {
    empleados: data,
    isLoading,
    error,
    createEmpleado,
    updateEmpleado,
    deleteEmpleado,
    mutate,
  };
}