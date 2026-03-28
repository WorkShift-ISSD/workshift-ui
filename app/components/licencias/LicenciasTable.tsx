import { FileSearch } from "lucide-react";
import { Licencia } from "@/app/api/types";
import { useFormatters } from "@/hooks/useFormatters";

interface Props {
  licencias: Licencia[];
}

export function LicenciasTable({ licencias }: Props) {
  const { formatDate, formatDate2 } = useFormatters();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* HEADER */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Licencias solicitadas
        </h2>
      </div>

      {/* EMPTY */}
      {licencias.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <FileSearch className="w-16 h-16 mx-auto mb-4 opacity-50" />
          No hay licencias registradas
        </div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {["Tipo", "Desde", "Hasta", "Estado"].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-xs uppercase text-gray-600 dark:text-gray-300 text-left"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {licencias.map((l) => (
              <tr key={l.id}>
                <td className="px-6 py-4 dark:text-gray-300">{l.tipo}</td>
                <td className="px-6 py-4 dark:text-gray-300">{formatDate2(l.fecha_desde)}</td>
                <td className="px-6 py-4 dark:text-gray-300">{formatDate2(l.fecha_hasta)}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold
                      ${
                        l.estado === "APROBADA"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          : l.estado === "PENDIENTE"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      }`}
                  >
                    {l.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
