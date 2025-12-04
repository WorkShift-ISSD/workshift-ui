"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ChangePasswordModal from "./ChangePasswordModal";

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Estados para primer ingreso
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [primerIngreso, setPrimerIngreso] = useState(false);
  const [tempUserData, setTempUserData] = useState<any>(null);

  // Estados para recuperar contraseña
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  // Cargar email guardado al montar
  useState(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('remembered-email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await response.json();

      if (response.ok) {
        // Guardar o eliminar email según checkbox
        if (rememberMe) {
          localStorage.setItem('remembered-email', email);
        } else {
          localStorage.removeItem('remembered-email');
        }

        // Verificar si es primer ingreso
        if (data.primerIngreso) {
          setPrimerIngreso(true);
          setTempUserData(data.user);
          setShowChangePasswordModal(true);
        } else {
          // Login normal
          await login(data.user);
          router.push("/loading");
          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        }
      } else {
        setError(data.error || "Credenciales incorrectas");
      }
    } catch (err) {
      console.error("Error en login:", err);
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeSuccess = async () => {
    setShowChangePasswordModal(false);
    
    // Continuar con el login después de cambiar contraseña
    if (tempUserData) {
      await login({ ...tempUserData, primerIngreso: false });
      router.push("/loading");
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al enviar el correo");
      }

      setResetMessage("✓ Se ha enviado un correo con las instrucciones para restablecer tu contraseña");
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetEmail("");
        setResetMessage("");
      }, 3000);
    } catch (err: any) {
      setResetMessage(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-lg transition-colors">
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md w-full max-w-sm transition-colors"
        >
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100 transition-colors">
            Iniciar sesión
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring focus:ring-blue-300 rounded w-full mb-4 px-3 py-2 transition-colors disabled:opacity-50"
          />

          <div className="relative mb-4">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring focus:ring-blue-300 rounded w-full px-3 py-2 pr-10 transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Checkbox Recordarme */}
          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer disabled:opacity-50"
              />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                Recordarme
              </span>
            </label>
            
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              disabled={loading}
              className="text-sm text-blue-600 p-1 dark:text-blue-400 hover:underline transition disabled:opacity-50"
            >
                ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Iniciando sesión...
              </>
            ) : (
              "Ingresar"
            )}
          </button>
        </form>
      </div>

      {/* Modal Cambiar Contraseña (Primer Ingreso) */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        isPrimerIngreso={primerIngreso}
        onSuccess={handlePasswordChangeSuccess}
      />

      {/* Modal Recuperar Contraseña */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Recuperar Contraseña
              </h3>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmail("");
                  setResetMessage("");
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring focus:ring-blue-300"
                />
              </div>

              {resetMessage && (
                <div className={`text-sm p-3 rounded ${
                  resetMessage.startsWith('✓') 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}>
                  {resetMessage}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail("");
                    setResetMessage("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {resetLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    "Enviar Instrucciones"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}