import useSWR from "swr";
import { fetcher, poster, putter, deleter } from "@/app/api/fetcher";
import { endpoints } from "@/app/api/endpoints";
import { Licencia, NuevaLicencia } from "@/app/api/types";

export function useLicencias() {
  const { data, error, isLoading, mutate } = useSWR<Licencia[]>(
    endpoints.licencias.list(),
    fetcher
  );

  const crearLicencia = async (licencia: NuevaLicencia) => {
    const res = await poster<Licencia>(
      endpoints.licencias.create(),
      licencia
    );
    mutate();
    return res;
  };

  const modificarLicencia = async (id: string, data: Partial<NuevaLicencia>) => {
    const res = await putter<Licencia>(
      endpoints.licencias.update(id),
      data
    );
    mutate();
    return res;
  };

  const eliminarLicencia = async (id: string) => {
    await deleter(endpoints.licencias.delete(id));
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
