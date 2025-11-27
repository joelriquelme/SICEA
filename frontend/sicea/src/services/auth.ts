const API_BASE_URL = 'http://127.0.0.1:8000/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
    date_joined: string;
    is_active: boolean;
    is_staff: boolean;
  };
}

export interface ApiError {
  message: string;
  details?: any;
}

class AuthService {
  private tokenKey = 'auth_token';
  private userKey = 'user_data';

  // Login function
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Login failed:', errorData);

        // Extraer mensaje útil de varios formatos comunes de error del backend
        let message = 'Error en el inicio de sesión';
        if (errorData) {
          if (errorData.message) {
            message = errorData.message;
          } else if (errorData.detail) {
            message = Array.isArray(errorData.detail) ? errorData.detail.join(' ') : String(errorData.detail);
          } else if (errorData.non_field_errors) {
            message = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors.join(' ') : String(errorData.non_field_errors);
          } else {
            // Buscar primer error de campo si existe
            const firstArray = Object.values(errorData).find(v => Array.isArray(v) && v.length > 0) as any[] | undefined;
            if (firstArray) message = firstArray.join(' ');
          }
        }

        throw new Error(message);
      }

      const data: AuthResponse = await response.json();

      // Store token and user data
      this.setToken(data.token);
      this.setUser(data.user);

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error de conexión con el servidor');
    }
  }

  // Logout function
  async logout(): Promise<void> {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(`${API_BASE_URL}/users/logout/`, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Always clear local storage
      this.clearAuth();
    }
  }

  // Token management
  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // User data management
  setUser(user: AuthResponse['user']): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getUser(): AuthResponse['user'] | null {
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Clear authentication data
  clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  // Get authorization headers
  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { 'Authorization': `Token ${token}` } : {};
  }

  // Verify token validity
  async verifyToken(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) return false;

      const response = await fetch(`${API_BASE_URL}/users/me/`, {
        method: 'GET',
        headers: {
          ...this.getAuthHeaders(), // <-- usa la función para obtener el header
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.clearAuth();
        return false;
      }

      return true;
    } catch (error) {
      this.clearAuth();
      return false;
    }
  }
}

export const authService = new AuthService();