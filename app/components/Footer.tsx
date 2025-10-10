"use client";

import Link from "next/link";
import WSMSLogo from "@/app/ui/WSMSLogo";

export default function Footer() {
  return (
    <footer
      className="mt-auto flex flex-col items-center justify-center gap-3 px-4 py-4 bg-[#cddcea] text-gray-700 w-full md:flex-row md:justify-between md:gap-4 md:px-6"
    >
      {/* 🔹 Izquierda */}
      <div className="text-xs sm:text-sm text-center md:text-left">
        © {new Date().getFullYear()} <span className="font-semibold">Gestión de Turnos</span>.  
        Todos los derechos reservados.
      </div>

      {/* 🔹 Centro */}
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-xs sm:text-sm">
        <Link href="/privacy" className="hover:text-blue-600 transition">
          Política de Privacidad
        </Link>
        <span className="hidden sm:inline text-gray-400">|</span>
        <Link href="/terms" className="hover:text-blue-600 transition">
          Términos y Condiciones
        </Link>
      </div>

      {/* 🔹 Derecha */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs sm:text-sm">Powered by</span>
        <WSMSLogo className="h-8 w-8 sm:h-10 sm:w-10" />
      </div>
    </footer>
  );
}