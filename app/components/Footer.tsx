"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Detectar si el modo oscuro está activo
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    // Observar cambios en el modo oscuro
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <footer className="mt-auto flex flex-col items-center justify-center gap-3 px-4 py-4 bg-[#cddcea] dark:bg-gray-800 text-gray-700 dark:text-gray-300 w-full md:flex-row md:justify-between md:gap-4 md:px-6 transition-colors">
      {/* 🔹 Izquierda */}
      <div className="text-xs sm:text-sm text-center md:text-left">
        © {new Date().getFullYear()}{" "}
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          Gestión de Turnos
        </span>
        . Todos los derechos reservados.
      </div>

      {/* 🔹 Centro */}
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-xs sm:text-sm">
        <Link
          href="/privacy"
          className="hover:text-blue-600 dark:hover:text-blue-400 transition"
        >
          Política de Privacidad
        </Link>
        <span className="hidden sm:inline text-gray-400 dark:text-gray-500">
          |
        </span>
        <Link
          href="/terms"
          className="hover:text-blue-600 dark:hover:text-blue-400 transition"
        >
          Términos y Condiciones
        </Link>
      </div>

      {/* 🔹 Derecha */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs sm:text-sm">Powered by</span>
        <div className="relative h-8 w-8 sm:h-10 sm:w-10">
          {isDark ? (
            <Image
              src="/Logo-v4-2a.png"
              alt="WSMS Logo"
              fill
              className="object-contain"
            />
          ) : (
            <Image
              src="/Logo-v4-2.png"
              alt="WSMS Logo"
              fill
              className="object-contain dark:invert"
            />
          )}
        </div>
      </div>
    </footer>
  );
}