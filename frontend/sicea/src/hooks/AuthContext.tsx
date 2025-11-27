import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, type LoginCredentials, type AuthResponse } from '../services/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthResponse['user'] | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = authService.getToken();
        if (token) {
          const isValid = await authService.verifyToken();
          if (isValid) {
            setIsAuthenticated(true);
            let storedUser = localStorage.getItem('user_data');
            if (!storedUser) {
              // Si no hay usuario en localStorage, obtenerlo del backend
              const response = await fetch('http://127.0.0.1:8000/api/users/me/', {
                method: 'GET',
                headers: {
                  'Authorization': `Token ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              if (response.ok) {
                const user = await response.json();
                localStorage.setItem('user_data', JSON.stringify(user));
                setUser(user);
              } else {
                setUser(null);
                setIsAuthenticated(false);
                authService.clearAuth();
              }
            } else {
              setUser(JSON.parse(storedUser));
            }
          } else {
            setIsAuthenticated(false);
            setUser(null);
            authService.clearAuth();
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
        authService.clearAuth();
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    // NO modificar setLoading aquí
    const response = await authService.login(credentials);
    setIsAuthenticated(true);
    setUser(response.user);
    // Guardar usuario en localStorage con la clave correcta
    localStorage.setItem('user_data', JSON.stringify(response.user));
    return response;
  };

  const logout = async () => {
    // NO modificar setLoading aquí
    await authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('user_data');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};