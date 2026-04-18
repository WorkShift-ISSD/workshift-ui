import useSWR from "swr";
import { fetcher } from "@/app/api/fetcher";

export type LicenciaDelDia = {
  id: string;
  empleado_id: string;
  tipo: string;
  fecha_desde: string;
  fecha_hasta: string;
};

export function useLicenciasDelDia(fecha: string) {
  const { data, error, isLoading } = useSWR<LicenciaDelDia[]>(
    fecha ? `/api/licencias?fecha=${fecha}` : null,
    fetcher
  );

  return {
    licenciasDelDia: data ?? [],
    isLoading,
    error,
  };
}
