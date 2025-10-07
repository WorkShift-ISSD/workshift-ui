"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // Estado para el spinner

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); // Activar el spinner

    // Simulamos la verificación del login
    if (email === "admin@workshift.com" && password === "1234") {
      // Guardar token o usuario en localStorage (opcional)
      localStorage.setItem("token", "fake-jwt-token");

      // Simulamos un tiempo de carga y luego redirigimos al dashboard
      setTimeout(() => {
        // ✅ Redirigir al home (pantalla principal)
        router.push("/dashboard");
      }, 2000); // 2 segundos de espera para simular carga
    } else {
      setError("Correo o contraseña incorrectos");
      setLoading(false); // Detener el spinner si hay error
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
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

        {/* Mostrar spinner mientras está cargando */}
        {loading ? (
          <div className="spinner">
            <div></div><div></div><div></div><div></div>
            <div></div><div></div><div></div><div></div>
          </div>
        ) : (
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Ingresar
          </button>
        )}
      </form>
    </div>
  );
}
