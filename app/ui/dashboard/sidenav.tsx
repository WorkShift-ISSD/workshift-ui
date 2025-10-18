"use client";

import { useState } from "react";
import Link from "next/link";
import NavLinks from "@/app/ui/dashboard/nav-links";
import MigraLogo from "@/app/ui/MigraLogo";
import LogoutButton from "@/app/components/LogoutButton";
import { MenuIcon, XIcon } from "lucide-react";


export default function SideNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* BOTÓN HAMBURGUESA - SOLO EN MÓVILES */}
      <div className="md:hidden fixed top-5 left-4 z-50">
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-colors"
        >
          {open ? (
            <XIcon className="h-6 w-6 text-gray-800 dark:text-gray-200" />
          ) : (
            <MenuIcon className="h-6 w-6 text-gray-800 dark:text-gray-200" />
          )}
        </button>
      </div>

      {/* SIDENAV */}
      <aside
        className={`fixed md:relative top-0 left-0 h-screen w-64 md:w-60 flex flex-col bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out z-40
        ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* LOGO */}
        <Link
          href="/"
          className="flex items-center justify-center h-20 border-b border-gray-200 dark:border-gray-700"
          onClick={() => setOpen(false)} // cierra el menú al hacer click
        >
          <MigraLogo className="w-[80%] h-[60px]" />
        </Link>

        {/* MENÚ PRINCIPAL */}
        <nav className="flex flex-col flex-grow overflow-y-auto px-6 py-6 space-y-4">
          <NavLinks onLinkClick={() => setOpen(false)} />
        </nav>

        {/* BOTÓN DE LOGOUT */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
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
