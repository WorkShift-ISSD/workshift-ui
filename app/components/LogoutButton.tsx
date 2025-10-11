"use client";

import { PowerIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = (e: React.FormEvent) => {
    e.preventDefault();

    // 🔹 Eliminar token del almacenamiento local
    localStorage.removeItem("token");

    // 🔹 Redirigir directamente al login
    router.push("/");
  };

  return (
    <form onSubmit={handleLogout}>
      <button
        type="submit"
        className="flex h-[48px] w-full grow items-center justify-center gap-2 rounded-md bg-gray-50 dark:bg-gray-800 p-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-400 md:flex-none md:justify-start md:p-2 md:px-3 transition-colors"
      >
        <PowerIcon className="w-6" />
        <div className="hidden md:block">Sign Out</div>
      </button>
    </form>
  );
}