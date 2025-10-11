"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (email === "admin@workshift.com" && password === "Workshift25") {
      localStorage.setItem("token", "fake-jwt-token");
      router.push("/loading"); // ← redirige a pantalla de carga
      setTimeout(() => {
        router.push("/dashboard"); // ← luego va al dashboard
      }, 3000);
    } else {
      setError("Correo o contraseña incorrectos");
    }
  };

  return (
    <div className="flex items-center justify-center bg-gray-100 py-36 rounded-lg">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold text-center mb-6">Iniciar sesión</h2>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-gray-300 p-2 rounded w-full mb-4 focus:outline-none focus:ring focus:ring-blue-300"
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-gray-300 p-2 rounded w-full mb-6 focus:outline-none focus:ring focus:ring-blue-300"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Ingresar
        </button>
      </form>
    </div>
  );
}
