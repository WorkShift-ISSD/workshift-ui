'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Tipos
interface User {
  id: string;
  legajo: number;
  email: string;
  nombre: string;
  apellido: string;
  rol: 'ADMINISTRADOR' | 'SUPERVISOR' | 'INSPECTOR' | 'JEFE';
  grupoTurno: 'A' | 'B';
  horario: string;
  activo: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Crear contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar si hay sesión activa al cargar
  useEffect(() => {
    checkAuth();
  }, []);

  // Verificar autenticación
  const checkAuth = async () => {
    try {
      // El token está en las cookies, no necesitamos enviarlo manualmente
      const res = await fetch('/api/auth/me', {
        credentials: 'include', // Importante: envía las cookies automáticamente
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Token inválido o no existe
        setUser(null);
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Login - Ahora recibe directamente los datos del usuario
  const login = (userData: User) => {
    setUser(userData);
  };

  // Logout
  const logout = async () => {
    try {
      // Llamar al endpoint de logout (eliminará la cookie en el servidor)
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include', // Importante: envía las cookies
      });
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      // Limpiar estado
      setUser(null);
    }
  };

  // Refrescar datos del usuario
  const refreshUser = async () => {
    setIsLoading(true);
    await checkAuth();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook personalizado para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  
  return context;
}