import useSWR from "swr";
import { apiClient } from "@/app/lib/apiclient";
import { Licencia, NuevaLicencia } from "@/app/api/types";

export function useLicencias() {
  const { data, error, isLoading, mutate } = useSWR<Licencia[]>(
    '/licencias',
    () => apiClient.get<Licencia[]>('/licencias')
  );

  const crearLicencia = async (licencia: NuevaLicencia) => {
    const res = await apiClient.post<Licencia>('/licencias', licencia);
    mutate();
    return res;
  };

  const modificarLicencia = async (id: string, data: Partial<NuevaLicencia>) => {
    const res = await apiClient.put<Licencia>(`/licencias/${id}`, data);
    mutate();
    return res;
  };

  const eliminarLicencia = async (id: string) => {
    await apiClient.delete(`/licencias/${id}`);
    mutate();
  };

  return {
    licencias: data || [],
    crearLicencia,
    modificarLicencia,
    eliminarLicencia,
    loading: isLoading,
    error,
    refetch: mutate,
  };
}