import React from 'react';
import { ArrowLeft, HomeIcon, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/AuthContext';
import { useNavigate } from 'react-router-dom';

const NavBar: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleHome = () => {
    navigate('/');
  }

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  return (
    <nav className="w-full bg-slate-900/90 border-b border-blue-900/40 shadow-lg py-3 px-4 flex items-center justify-between fixed top-0 left-0 z-50">
      <button
        onClick={handleHome}
        className="text-blue-300 hover:text-blue-100 transition-colors duration-200 p-2 rounded-lg focus:outline-none"
        aria-label="Volver atrás"
      >
        <HomeIcon className="w-6 h-6" />
      </button>
      <div className="flex-1 flex justify-center">
        <button
            onClick={handleHome}
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
