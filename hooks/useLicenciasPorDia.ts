import useSWR from "swr";
import { apiClient } from "@/app/lib/apiclient";

export type LicenciaDelDia = {
  id: string;
  empleado_id: string;
  tipo: string;
  fecha_desde: string;
  fecha_hasta: string;
};

export function useLicenciasDelDia(fecha: string) {
  const path = fecha ? `/licencias?fecha=${fecha}` : null;

  const { data, error, isLoading } = useSWR<LicenciaDelDia[]>(
    path,
    () => apiClient.get<LicenciaDelDia[]>(path!)
  );

  return {
    licenciasDelDia: data ?? [],
    isLoading,
    error,
  };
}