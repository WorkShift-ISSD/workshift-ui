"use client";

import { useState } from "react";
import Link from "next/link";
import NavLinks from "@/app/ui/dashboard/nav-links";
import MigraLogo from "@/app/ui/MigraLogo";
import LogoutButton from "@/app/components/LogoutButton";
import { MenuIcon } from "lucide-react";


export default function SideNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* BOTÓN HAMBURGUESA - SOLO EN MÓVILES - Solo visible cuando está CERRADO*/}
      {!open && (
        <div className="md:hidden fixed top-5 left-4 z-50">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-colors"
          >
            <MenuIcon className="h-6 w-6 text-gray-800 dark:text-gray-200" />
          </button>
        </div>
      )}

      {/* SIDENAV */}
      <aside
        className={`fixed md:relative top-0 left-0 h-screen w-16 md:w-56 flex flex-col bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out z-40
        ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* LOGO */}
        <div className="flex items-center justify-center h-20 border-b border-gray-200 dark:border-gray-700">
          {/* Icono en móvil - Clickeable para cerrar menú */}
          <button 
            onClick={() => setOpen(false)}
            className="block md:hidden w-10 h-10 hover:opacity-80 transition-opacity"
          >
            <MigraLogo iconOnly={true} className="w-full h-full" />
          </button>
          {/* Logo completo en desktop */}
          <div className="hidden md:block w-[80%] h-[60px]">
            <MigraLogo className="w-full h-full" />
          </div>
        </div>

        {/* MENÚ PRINCIPAL */}
        <nav className="flex flex-col flex-grow overflow-y-auto px-2 md:px-6 py-6 space-y-4">
          <NavLinks onLinkClick={() => setOpen(false)} />
        </nav>

        {/* BOTÓN DE LOGOUT */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-2 md:px-4 py-3">
          <LogoutButton />
        </div>
      </aside>

      {/* FONDO OSCURO CUANDO EL MENÚ ESTÁ ABIERTO (solo móvil) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setOpen(false)}
        ></div>
      )}
    </>
  );
}
