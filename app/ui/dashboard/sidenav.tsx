"use client";

import { useState } from "react";
import NavLinks from "@/app/ui/dashboard/nav-links";
import MigraLogo from "@/app/ui/MigraLogo";
import LogoutButton from "@/app/components/LogoutButton";
import { MenuIcon, Lock, User, UserCog, Image } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import ChangePasswordModal from "@/app/components/ChangePasswordModal";
import ChangeImageModal from "@/app/components/ChangeImageModal";
import EditProfileModal from "@/app/components/EditProfileModal";



export default function SideNav() {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isChangeImageOpen, setIsChangeImageOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();



  return (
    <>
      {/* BOTÓN HAMBURGUESA - SOLO EN MÓVILES */}
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
        className={`fixed md:relative top-0 left-0 h-screen w-16 md:w-64 flex flex-col bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out z-40
        ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* LOGO */}
        <div className="flex items-center justify-center h-20 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setOpen(false)}
            className="block md:hidden w-10 h-10 hover:opacity-80 transition-opacity"
          >
            <MigraLogo iconOnly={true} className="w-full h-full" />
          </button>
          <div className="hidden md:block w-[80%] h-[60px]">
            <MigraLogo className="w-full h-full" />
          </div>
        </div>

        {/* INFORMACIÓN DEL USUARIO */}
        {user && (
          <div className="hidden md:block px-4 py-4 border-b border-gray-200 dark:border-gray-700 relative">
            <div className="flex items-center gap-3">

              {/* Avatar */}
              <button
                onClick={() => setIsUserMenuOpen(prev => !prev)}
                className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center hover:opacity-80 transition"
              >
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user.nombre} {user.apellido}
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.rol}
                </p>
              </div>
            </div>

            {/* 🔽 MENÚ DESPLEGABLE */}
            {isUserMenuOpen && (
              <div
                className="absolute left-12 top-16 w-52 bg-white dark:bg-gray-800 shadow-xl 
               rounded-xl border border-gray-200 dark:border-gray-700 z-50 py-2"
              >
                <button
                  className="w-full flex items-start gap-2 text-left px-4 py-2 text-sm 
                  text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 
                  rounded-lg transition"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsEditProfileOpen(true);
                  }}
                >
                  <UserCog size={16} className="opacity-70 mt-1" />
                  <span>
                    Actualizar Datos<br />
                    Personales
                  </span>
                </button>

                <button
                  className="w-full flex items-start gap-2 text-left px-4 py-2 text-sm 
                 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 
                 rounded-lg transition"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsChangeImageOpen(true); // abrir modal imagen
                  }}
                >
                  <Image size={14} className="opacity-70 mt-1" />
                  Cambiar Imagen
                </button>

                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 
                 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition 
                 flex items-center gap-2"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsPasswordModalOpen(true);
                  }}
                >
                  <Lock size={14} className="opacity-70" />
                  Cambiar Contraseña
                </button>
              </div>
            )}
          </div>
        )}


        {/* MENÚ PRINCIPAL */}
        <nav className="flex flex-col flex-grow dark:text-gray-400 px-2 md:px-4 py-4 space-y-2">
          <NavLinks onLinkClick={() => setOpen(false)} />
        </nav>
        {/* BOTÓN DE LOGOUT */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-2 md:px-4 py-3">
          <LogoutButton />
        </div>
      </aside>

      {/* FONDO OSCURO (solo móvil) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setOpen(false)}
        ></div>
      )}



      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        isPrimerIngreso={false}
        onSuccess={() => {
          setIsPasswordModalOpen(false);
        }}
      />

      <ChangeImageModal
        isOpen={isChangeImageOpen}
        onClose={() => setIsChangeImageOpen(false)}
        onSuccess={() => {
          setIsChangeImageOpen(false);
        }}
        currentImage={user?.imagen}
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        onSuccess={() => {
          setIsEditProfileOpen(false);
        }}
        userData={{
          id: user?.id!,
          telefono: user?.telefono,
          direccion: user?.direccion,
          fecha_nacimiento: user?.fechaNacimiento,
        }}
      />


    </>
  );
}