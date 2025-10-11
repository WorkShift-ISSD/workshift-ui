"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (email === "admin@workshift.com" && password === "Workshift25") {
      localStorage.setItem("token", "fake-jwt-token");
      router.push("/loading");
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } else {
      setError("Correo o contraseña incorrectos");
    }
  };

  return (
    <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-900 py-36 rounded-lg transition-colors">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md w-full max-w-sm transition-colors"
      >
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100 transition-colors">
          Iniciar sesión
        </h2>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring focus:ring-blue-300 rounded w-full mb-4 transition-colors"
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring focus:ring-blue-300 rounded w-full mb-6 transition-colors"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Ingresar
        </button>

        <div className="flex items-center justify-between mt-8 text-sm">
          <label className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span>Recordarme</span>
          </label>

          <a
            href="#"
            className="text-blue-600 dark:text-blue-400 hover:underline transition"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </form>
    </div>
  );
}
