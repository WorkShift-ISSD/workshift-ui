"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function LoadingPage() {
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900">
      {/* Logo centrado - cambia según el modo */}
      <div className="relative h-60 w-60 mb-10">
        {isDark ? (
          <Image 
            src="/Logo_v4a.png" 
            alt="Logo modo oscuro"
            fill
            className="object-contain"
            priority
          />
        ) : (
          <Image 
            src="/LogoWSv4.png" 
            alt="Logo modo claro"
            fill
            className="object-contain"
            priority
          />
        )}
      </div>

      {/* Spinner debajo del logo */}
      <div className="spinner mt-8">
        <div className="bg-blue-600 dark:bg-blue-400"></div>
        <div className="bg-blue-600 dark:bg-blue-400"></div>
        <div className="bg-blue-600 dark:bg-blue-400"></div>
        <div className="bg-blue-600 dark:bg-blue-400"></div>
        <div className="bg-blue-600 dark:bg-blue-400"></div>
        <div className="bg-blue-600 dark:bg-blue-400"></div>
        <div className="bg-blue-600 dark:bg-blue-400"></div>
        <div className="bg-blue-600 dark:bg-blue-400"></div>
      </div>
    </div>
  );
}