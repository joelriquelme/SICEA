import React, { useEffect, useState } from 'react';
import NavBar from './NavBar';
import { usersService } from '../services/users';
import { Edit3, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isStaff, setIsStaff] = useState(false);
  const [createErrors, setCreateErrors] = useState<Record<string, string[]>>({});
  const [createLoading, setCreateLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editIsStaff, setEditIsStaff] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPassword, setEditPassword] = useState('');
  const [editErrors, setEditErrors] = useState<Record<string, string[]>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sortField, setSortField] = useState<'email' | 'first_name' | 'is_staff' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersService.listUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Error al obtener usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateErrors({});

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      setCreateErrors({ confirmPassword: ['Las contraseñas no coinciden'] });
      setCreateLoading(false);
      return;
    }

    try {
      await usersService.createUser({ email, password, first_name: firstName, last_name: lastName, is_staff: isStaff });
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFirstName('');
      setLastName('');
      setIsStaff(false);
      setIsCreateModalOpen(false);
      void fetchUsers();
    } catch (err: any) {
      // If backend returned field errors as an object (e.g. { email: ["error"], password: ["..."] }), show them
      const translateMessage = (m: string) => {
        if (!m) return m;
        const known: Record<string, string> = {
          'This field is required.': 'Este campo es obligatorio.',
          'Enter a valid email address.': 'Introduce una dirección de correo válida.',
          'A user with that email already exists.': 'Ya existe un usuario con ese correo.',
          'Ensure this field has at least 8 characters.': 'Debe tener al menos 8 caracteres.',
        };
        return known[m] || m;
      };

      if (err && typeof err === 'object') {
        if (err.detail) {
          const details = Array.isArray(err.detail) ? err.detail.map((d: any) => translateMessage(String(d))) : [translateMessage(String(err.detail))];
          setCreateErrors({ non_field_errors: details });
        } else {
          const mapped: Record<string, string[]> = {};
          Object.entries(err).forEach(([k, v]) => {
            if (Array.isArray(v)) mapped[k] = v.map((x) => translateMessage(String(x)));
            else mapped[k] = [translateMessage(String(v))];
          });
          setCreateErrors(mapped);
        }
      } else {
        setCreateErrors({ non_field_errors: [translateMessage(String(err) || 'Error al crear usuario')] });
      }
    } finally {
      setCreateLoading(false);
    }
  };

  // Open a platform modal to confirm deletion (instead of browser confirm)
  const openDeleteModal = (user: any) => {
    setUserToDelete(user);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setUserToDelete(null);
    setDeleteError(null);
    setIsDeleteModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await usersService.deleteUser(userToDelete.id);
      closeDeleteModal();
      void fetchUsers();
    } catch (err: any) {
      // Try to show a friendly Spanish message
      const msg = (err && err.message) || String(err) || 'Error al eliminar usuario';
      setDeleteError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    setEditFirstName(user.first_name || '');
    setEditLastName(user.last_name || '');
    setEditIsStaff(!!user.is_staff);
    setEditIsActive(!!user.is_active);
    setEditPassword('');
    setEditErrors({});
    setEditLoading(false);
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditPassword('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);
    setEditErrors({});
    const translateMessage = (m: string) => {
      if (!m) return m;
      const known: Record<string, string> = {
        'This field is required.': 'Este campo es obligatorio.',
        'Enter a valid email address.': 'Introduce una dirección de correo válida.',
        'A user with that email already exists.': 'Ya existe un usuario con ese correo.',
        'Ensure this field has at least 8 characters.': 'Debe tener al menos 8 caracteres.',
      };
      return known[m] || m;
    };

    try {
      // Build a partial payload: include only fields that actually changed
      const payload: any = {};
      if ((editingUser.first_name || '') !== editFirstName) payload.first_name = editFirstName;
      if ((editingUser.last_name || '') !== editLastName) payload.last_name = editLastName;
      if ((!!editingUser.is_staff) !== editIsStaff) payload.is_staff = editIsStaff;
      if ((!!editingUser.is_active) !== editIsActive) payload.is_active = editIsActive;
      if (editPassword) payload.password = editPassword;

      // If nothing changed, just close modal
      if (Object.keys(payload).length === 0) {
        closeEdit();
        setEditLoading(false);
        return;
      }

      await usersService.updateUser(editingUser.id, payload);
      closeEdit();
      void fetchUsers();
    } catch (err: any) {
      // Show errors in the edit modal (do not clear the main list)
      if (err && typeof err === 'object') {
        if (err.detail) {
          const details = Array.isArray(err.detail) ? err.detail.map((d: any) => translateMessage(String(d))) : [translateMessage(String(err.detail))];
          setEditErrors({ non_field_errors: details });
        } else {
          const mapped: Record<string, string[]> = {};
          Object.entries(err).forEach(([k, v]) => {
            if (Array.isArray(v)) mapped[k] = v.map((x) => translateMessage(String(x)));
            else mapped[k] = [translateMessage(String(v))];
          });
          setEditErrors(mapped);
        }
      } else {
        setEditErrors({ non_field_errors: [translateMessage(String(err) || 'Error al actualizar usuario')] });
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleSort = (field: 'email' | 'first_name' | 'is_staff') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: 'email' | 'first_name' | 'is_staff') => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4" /> 
      : <ArrowDown className="w-4 h-4" />;
  };

  const sortedUsers = React.useMemo(() => {
    if (!sortField) return users;
    
    return [...users].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle booleans (is_staff)
      if (typeof aValue === 'boolean') {
        aValue = aValue ? 1 : 0;
        bValue = bValue ? 1 : 0;
      }

      // Handle strings (email, first_name)
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue?.toLowerCase() || '';
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });
  }, [users, sortField, sortDirection]);

  return (
    <div>
      <NavBar />
      <div className="pt-20 min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-8">
        <div className="max-w-4xl mx-auto bg-white/5 p-6 rounded-2xl shadow-xl border border-white/10">
          <h2 className="text-2xl text-white font-semibold mb-4">Gestión de Usuarios</h2>

          {/* Botón para abrir modal de crear usuario */}
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Agregar Usuario
            </button>
          </div>

          {/* Lista usuarios */}
          {loading ? (
            <p className="text-white">Cargando...</p>
          ) : error ? (
            <p className="text-red-300">{error}</p>
          ) : (
            <table className="w-full text-left text-white">
              <thead>
                <tr>
                  <th 
                    className="cursor-pointer hover:bg-white/10 transition-colors select-none py-2"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-2">
                      Correo
                      {getSortIcon('email')}
                    </div>
                  </th>
                  <th 
                    className="cursor-pointer hover:bg-white/10 transition-colors select-none py-2"
                    onClick={() => handleSort('first_name')}
                  >
                    <div className="flex items-center gap-2">
                      Nombre
                      {getSortIcon('first_name')}
                    </div>
                  </th>
                  <th 
                    className="cursor-pointer hover:bg-white/10 transition-colors select-none py-2"
                    onClick={() => handleSort('is_staff')}
                  >
                    <div className="flex items-center gap-2">
                      Rol
                      {getSortIcon('is_staff')}
                    </div>
                  </th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((u) => (
                  <tr key={u.id} className="border-t border-white/10">
                    <td className="py-2">{u.email}</td>
                    <td className="py-2">{u.first_name} {u.last_name}</td>
                    <td className="py-2">{u.is_staff ? 'Administrador' : 'Visualizador'}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600 transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(u)}
                          className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {/* Edit modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800/90 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Editar Usuario</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Correo</label>
                <input value={editingUser.email} readOnly className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2">Nombre</label>
                  <input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30" />
                  {editErrors.first_name && editErrors.first_name.map((m) => (
                    <p key={m} className="text-red-400 text-sm mt-1">{m}</p>
                  ))}
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Apellido</label>
                  <input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30" />
                  {editErrors.last_name && editErrors.last_name.map((m) => (
                    <p key={m} className="text-red-400 text-sm mt-1">{m}</p>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-gray-300">
                  <input type="checkbox" checked={editIsStaff} onChange={(e) => setEditIsStaff(e.target.checked)} className="accent-blue-500" />
                  Administrador
                </label>
                <label className="flex items-center gap-2 text-gray-300">
                  <input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} className="accent-blue-500" />
                  Activo
                </label>
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Nueva contraseña (opcional)</label>
                <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30" />
                {editErrors.password && editErrors.password.map((m) => (
                  <p key={m} className="text-red-400 text-sm mt-1">{m}</p>
                ))}
              </div>
              {editErrors.non_field_errors && editErrors.non_field_errors.map((m) => (
                <p key={m} className="text-red-300 text-sm">{m}</p>
              ))}
              <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={closeEdit} className="bg-gray-500/80 text-white px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors" disabled={editLoading}>Cancelar</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors" disabled={editLoading}>
                  {editLoading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Create modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800/90 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Crear Usuario</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Correo</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30" required />
                {createErrors.email && createErrors.email.map((m) => (
                  <p key={m} className="text-red-400 text-sm mt-1">{m}</p>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2">Nombre</label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nombre" className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30" />
                  {createErrors.first_name && createErrors.first_name.map((m) => (
                    <p key={m} className="text-red-400 text-sm mt-1">{m}</p>
                  ))}
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Apellido</label>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Apellido" className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30" />
                  {createErrors.last_name && createErrors.last_name.map((m) => (
                    <p key={m} className="text-red-400 text-sm mt-1">{m}</p>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Contraseña</label>
                <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" type="password" className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30" required />
                {createErrors.password && createErrors.password.map((m) => (
                  <p key={m} className="text-red-400 text-sm mt-1">{m}</p>
                ))}
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Confirmar Contraseña</label>
                <input 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="Repetir contraseña" 
                  type="password" 
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30" 
                  required 
                />
                {createErrors.confirmPassword && createErrors.confirmPassword.map((m) => (
                  <p key={m} className="text-red-400 text-sm mt-1">{m}</p>
                ))}
              </div>
              <div>
                <label className="flex items-center gap-2 text-gray-300">
                  <input 
                    type="checkbox" 
                    checked={isStaff} 
                    onChange={(e) => setIsStaff(e.target.checked)} 
                    className="w-4 h-4 accent-blue-500 rounded"
                  />
                  <span>Administrador</span>
                </label>
                <p className="text-gray-400 text-xs mt-1 ml-6">
                  Los administradores pueden gestionar usuarios y acceder a todas las funcionalidades del sistema.
                </p>
              </div>
              {/* non_field_errors */}
              {createErrors.non_field_errors && createErrors.non_field_errors.map((m) => (
                <p key={m} className="text-red-300 text-sm">{m}</p>
              ))}
              <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="bg-gray-500/80 text-white px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors" disabled={createLoading}>Cancelar</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors" disabled={createLoading}>
                  {createLoading ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete modal (platform alert) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800/90 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Eliminar Usuario</h2>
            <p className="text-blue-200 mb-4">
              ¿Estás seguro de que deseas eliminar al usuario <span className="font-bold">{userToDelete?.email}</span>?
            </p>
            <p className="text-red-400 mb-6 text-sm font-semibold">
              <span className="font-bold">Advertencia:</span> Al eliminar este usuario, se revocará su acceso y no podrá iniciar sesión. Esta acción es irreversible.
            </p>
            {deleteError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
                {deleteError}
              </div>
            )}
            <div className="flex justify-end gap-4 mt-6">
              <button type="button" onClick={closeDeleteModal} className="bg-gray-500/80 text-white px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors" disabled={deleteLoading}>Cancelar</button>
              <button type="button" onClick={confirmDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition-colors" disabled={deleteLoading}>
                {deleteLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
