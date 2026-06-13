import useSWR from "swr";
import { apiClient } from "@/app/lib/apiclient";


export const useSancionesDelDia = (fecha: string) => {
  const path = `/sanciones?fecha=${fecha}`;
  const { data, error, mutate } = useSWR(path, () => apiClient.get(path));
  return {
    sancionesDelDia: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
};