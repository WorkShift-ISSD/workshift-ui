import useSWR from "swr";
import { fetcher } from "@/app/api/fetcher";


export const useSancionesDelDia = (fecha: string) => {
  const { data, error, mutate } = useSWR(`/api/sanciones?fecha=${fecha}`, fetcher);
  return {
    sancionesDelDia: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
};