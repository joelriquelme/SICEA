import { useNavigate } from 'react-router-dom';
import NavBar from './NavBar';
import { FileText, FileSpreadsheet } from 'lucide-react';
import React from 'react';
import { useAuth } from '../hooks/AuthContext'; // Importar el contexto de autenticación

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Obtener el usuario autenticado

  return (
    <div>
      <NavBar />
      <div className="pt-20 min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex flex-col items-center justify-center">
        <div className="flex flex-row gap-12 mt-12">
          {/* Subir Facturas */}
          {user?.is_staff && ( // Mostrar solo si el usuario es staff
            <div className="bg-blue-800/80 rounded-2xl shadow-2xl p-10 flex flex-col items-center w-80 hover:scale-105 transition-transform duration-200">
              <FileText className="w-24 h-24 text-blue-200 mb-6" />
              <button
                className="w-full bg-blue-900 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-lg hover:bg-blue-700 transition-colors duration-200"
                onClick={() => navigate('/subir-facturas')}
              >
                Subir Facturas
              </button>
            </div>
          )}
          {/* Ver y Modificar Facturas */}
          <div className="bg-blue-800/80 rounded-2xl shadow-2xl p-10 flex flex-col items-center w-80 hover:scale-105 transition-transform duration-200">
            <FileText className="w-24 h-24 text-blue-200 mb-6" />
            <button
              className="w-full bg-blue-900 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-lg hover:bg-blue-700 transition-colors duration-200"
              onClick={() => navigate('/facturas')}
            >
              Ver Facturas
            </button>
          </div>
          {/* Exportar Información */}
          <div className="bg-blue-800/80 rounded-2xl shadow-2xl p-10 flex flex-col items-center w-80 hover:scale-105 transition-transform duration-200">
            <FileSpreadsheet className="w-24 h-24 text-blue-200 mb-6" />
            <button
              className="w-full bg-blue-900 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-lg hover:bg-blue-700 transition-colors duration-200"
              onClick={() => navigate('/exportar')}
            >
              Exportar Información
            </button>
          </div>
        </div>
        <div className="text-center mt-16">
          <p className="text-blue-200/60 text-sm">
            © 2025 SICEA. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
