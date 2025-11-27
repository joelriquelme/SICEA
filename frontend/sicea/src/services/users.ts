import { authService } from './auth';
import { API_BASE } from './config';

export interface AdminUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
}

class UsersService {
  private base = `${API_BASE}/users`;

  async listUsers(): Promise<AdminUser[]> {
    const res = await fetch(`${API_BASE}/admin-users/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...authService.getAuthHeaders() },
    });
    if (!res.ok) throw new Error('Error al obtener usuarios');
    return await res.json();
  }

  async createUser(data: Partial<AdminUser> & { password?: string }) {
    const res = await fetch(`${API_BASE}/admin-users/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authService.getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      // Throw the parsed error object so the UI can display field-level messages when available
      const errorToThrow = err || { message: 'Error al crear usuario' };
      throw errorToThrow;
    }
    return await res.json();
  }

  async updateUser(id: string, data: Partial<AdminUser> & { password?: string }) {
    const res = await fetch(`${API_BASE}/admin-users/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authService.getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      const errorToThrow = err || { message: 'Error al actualizar usuario' };
      throw errorToThrow;
    }
    return await res.json();
  }

  async deleteUser(id: string) {
    const res = await fetch(`${API_BASE}/admin-users/${id}/`, { method: 'DELETE', headers: { ...authService.getAuthHeaders() } });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      const errorToThrow = err || { message: 'Error al eliminar usuario' };
      throw errorToThrow;
    }
    return true;
  }
}

export const usersService = new UsersService();
