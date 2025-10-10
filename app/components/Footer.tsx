"use client";

import Link from "next/link";
import WSMSLogo from "@/app/ui/WSMSLogo";

export default function Footer() {
  return (
    <footer
      className="mt-auto flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 bg-[#cddcea] text-gray-700 w-full"
    >
      {/* 🔹 Izquierda */}
      <div className="text-sm text-center md:text-left">
        © {new Date().getFullYear()} <span className="font-semibold">Gestión de Turnos</span>.  
        Todos los derechos reservados.
      </div>

      {/* 🔹 Centro */}
      <div className="flex items-center gap-6 text-sm">
        <Link href="/privacy" className="hover:text-blue-600 transition">
          Política de Privacidad
        </Link>
        <Link href="/terms" className="hover:text-blue-600 transition">
          Términos y Condiciones
        </Link>
      </div>

      {/* 🔹 Derecha */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm">Powered by</span>
        <WSMSLogo className="h-10 w-10" />
      </div>
    </footer>
  );
}