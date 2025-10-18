import OfertaCambios from "@/app/oferta/OfertaCambios";

export default function CambiosPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Cambios de Turno</h1>
      <OfertaCambios/>
    </div>
  );
}