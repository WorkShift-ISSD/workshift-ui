// hooks/useEmpleados.ts
import useSWR from 'swr';
import { apiClient } from '../app/lib/apiclient';

interface Inspector {
  turno: string;
  fechaIngreso: string;
  id: string;
  legajo: number;
  email: string;
  nombre: string;
  apellido: string;
  password: string;
  rol: 'SUPERVISOR' | 'INSPECTOR' | 'JEFE';
  telefono: string | null;
  direccion: string | null;
  horario: string | null;
  fechaNacimiento: string | null;
  activo: boolean;
  grupoTurno: 'A' | 'B';
  fotoPerfil: string | null;
  calificacion:      number | null;
  totalIntercambios: number;
  ultimoLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useEmpleados() {
  const { data, error, isLoading, mutate } = useSWR<Inspector[]>(
    '/empleados',
    () => apiClient.get<Inspector[]>('/empleados')
  );

  console.log('empleados data:', data);

  const createEmpleado = async (empleado: Omit<Inspector, 'id' | 'createdAt' | 'updatedAt' | 'ultimoLogin' | 'fotoPerfil'>) => {
    const newEmpleado = await apiClient.post<Inspector>('/empleados', empleado);
    mutate([...(data || []), newEmpleado], false);
    return newEmpleado;
  };

  const updateEmpleado = async (id: string, empleado: Partial<Inspector>) => {
    const updated = await apiClient.patch<Inspector>(`/empleados/${id}`, empleado);
    mutate(
      data?.map((e) => (e.id === id ? updated : e)),
      false
    );
    return updated;
  };

  const deleteEmpleado = async (id: string) => {
    await apiClient.delete(`/empleados/${id}`);
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