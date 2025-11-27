import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../hooks/AuthContext'; // <-- cambia el import

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-white tracking-wider">
                SICEA
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-white">
                <User className="w-5 h-5 mr-2" />
                <span className="text-sm">
                  {user?.first_name || user?.email}
                </span>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white rounded-lg transition-all duration-200 border border-red-500/30 hover:border-red-500/50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Bienvenido al Dashboard
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Sample Cards */}
            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-medium text-white mb-2">
                Información del Usuario
              </h3>
              <div className="space-y-2 text-blue-200">
                <p><strong>Email:</strong> {user?.email}</p>
                {user?.first_name && (
                  <p><strong>Nombre:</strong> {user.first_name}</p>
                )}
                {user?.last_name && (
                  <p><strong>Apellido:</strong> {user.last_name}</p>
                )}
                <p><strong>ID:</strong> {user?.id}</p>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-medium text-white mb-2">
                Estado de Sesión
              </h3>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                <span className="text-green-200">Conectado</span>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-medium text-white mb-2">
                Acciones Rápidas
              </h3>
              <p className="text-blue-200 text-sm">
                Aquí puedes agregar funcionalidades específicas de tu aplicación.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;