import React, { useState } from 'react';
import { Menu, LogOut, FileText, Download, UploadCloud, Gauge, Users, Home } from 'lucide-react';
import { useAuth } from '../hooks/AuthContext';
import { useNavigate } from 'react-router-dom';

const NavBar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  const menuItems = [
    { label: 'Inicio', icon: Home, path: '/', showFor: 'all' },
    { label: 'Subir Facturas', icon: UploadCloud, path: '/subir-facturas', showFor: 'staff' },
    { label: 'Ver Facturas', icon: FileText, path: '/facturas', showFor: 'all' },
    { label: 'Exportar Datos', icon: Download, path: '/exportar', showFor: 'all' },
    { label: 'Medidores', icon: Gauge, path: '/medidores', showFor: 'staff' },
    { label: 'Usuarios', icon: Users, path: '/gestion-usuarios', showFor: 'staff' },
  ];

  const visibleMenuItems = menuItems.filter(item => 
    item.showFor === 'all' || (item.showFor === 'staff' && user?.is_staff)
  );

  return (
    <nav className="w-full bg-slate-900/90 border-b border-blue-900/40 shadow-lg py-3 px-4 flex items-center justify-between fixed top-0 left-0 z-50">
      <div className="relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="text-blue-300 hover:text-blue-100 transition-colors duration-200 p-2 rounded-lg focus:outline-none hover:bg-white/10"
          aria-label="Menú de navegación"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <>
            {/* Overlay para cerrar el menú al hacer clic fuera */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Menú desplegable */}
            <div className="absolute left-0 top-full mt-2 w-64 bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-2xl border border-blue-900/40 overflow-hidden z-50">
              {visibleMenuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleNavigate(item.path)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-blue-200 hover:bg-blue-600/30 hover:text-white transition-colors duration-200 border-b border-blue-900/20 last:border-b-0"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 flex justify-center">
        <button
            onClick={() => handleNavigate('/')}
            className="text-4xl font-bold text-white tracking-wide hover:text-blue-300 transition-colors duration-200">
            SICEA
        </button>
      </div>
      
      <button
        onClick={handleLogout}
        className="text-blue-300 hover:text-blue-100 transition-colors duration-200 p-2 rounded-lg focus:outline-none"
        aria-label="Cerrar sesión"
      >
        <LogOut className="w-6 h-6" />
      </button>
    </nav>
  );
};

export default NavBar;
