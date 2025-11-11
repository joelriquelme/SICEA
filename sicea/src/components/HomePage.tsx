import { useNavigate } from 'react-router-dom';
import NavBar from './NavBar';
import { FileText, Download, UploadCloud, Gauge, Users } from 'lucide-react';
import { useAuth } from '../hooks/AuthContext'; // Importar el contexto de autenticación

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Obtener el usuario autenticado

  return (
    <div>
      <NavBar />
      <div className="pt-20 min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          {/* Encabezado */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-white mb-2">
              Sistema de Control de Energía y Agua
            </h1>
            <p className="text-blue-200/70 text-sm max-w-xl mx-auto">
              Gestiona tus facturas, medidores y exporta información de manera eficiente
            </p>
          </div>

          {/* Grid de tarjetas adaptativo */}
          <div className="flex flex-col gap-6 max-w-5xl mx-auto">
            {/* Primera fila - 3 columnas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Subir Facturas - Solo administradores */}
              {user?.is_staff && (
                <div 
                  onClick={() => navigate('/subir-facturas')}
                  className="bg-gradient-to-br from-blue-600/30 to-blue-800/50 backdrop-blur-sm rounded-xl shadow-xl p-6 flex flex-col items-center border border-blue-400/20 hover:border-blue-400/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                >
                  <div className="bg-blue-500/20 p-4 rounded-full mb-4 group-hover:bg-blue-500/40 transition-colors duration-300">
                    <UploadCloud className="w-10 h-10 text-blue-100" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Subir Facturas</h3>
                  <p className="text-blue-200/60 text-center text-xs leading-relaxed">
                    Carga nuevas facturas al sistema
                  </p>
                </div>
              )}

              {/* Ver y Modificar Facturas - Disponible para todos */}
              <div 
                onClick={() => navigate('/facturas')}
                className="bg-gradient-to-br from-blue-600/30 to-blue-800/50 backdrop-blur-sm rounded-xl shadow-xl p-6 flex flex-col items-center border border-blue-400/20 hover:border-blue-400/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
              >
                <div className="bg-blue-500/20 p-4 rounded-full mb-4 group-hover:bg-blue-500/40 transition-colors duration-300">
                  <FileText className="w-10 h-10 text-blue-100" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Ver Facturas</h3>
                <p className="text-blue-200/60 text-center text-xs leading-relaxed">
                  Consulta y administra todas las facturas registradas
                </p>
              </div>

              {/* Exportar Información - Disponible para todos */}
              <div 
                onClick={() => navigate('/exportar')}
                className="bg-gradient-to-br from-blue-600/30 to-blue-800/50 backdrop-blur-sm rounded-xl shadow-xl p-6 flex flex-col items-center border border-blue-400/20 hover:border-blue-400/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
              >
                <div className="bg-blue-500/20 p-4 rounded-full mb-4 group-hover:bg-blue-500/40 transition-colors duration-300">
                  <Download className="w-10 h-10 text-blue-100" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Exportar Datos</h3>
                <p className="text-blue-200/60 text-center text-xs leading-relaxed">
                  Descarga información en diferentes formatos
                </p>
              </div>
            </div>

            {/* Segunda fila - 2 columnas centradas */}
            {user?.is_staff && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto w-full">
                {/* Gestión de Medidores - Solo administradores */}
                <div 
                  onClick={() => navigate('/medidores')}
                  className="bg-gradient-to-br from-blue-600/30 to-blue-800/50 backdrop-blur-sm rounded-xl shadow-xl p-6 flex flex-col items-center border border-blue-400/20 hover:border-blue-400/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                >
                  <div className="bg-blue-500/20 p-4 rounded-full mb-4 group-hover:bg-blue-500/40 transition-colors duration-300">
                    <Gauge className="w-10 h-10 text-blue-100" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Medidores</h3>
                  <p className="text-blue-200/60 text-center text-xs leading-relaxed">
                    Administra los medidores del sistema
                  </p>
                </div>

                {/* Gestión de Usuarios - Solo administradores */}
                <div 
                  onClick={() => navigate('/gestion-usuarios')}
                  className="bg-gradient-to-br from-blue-600/30 to-blue-800/50 backdrop-blur-sm rounded-xl shadow-xl p-6 flex flex-col items-center border border-blue-400/20 hover:border-blue-400/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                >
                  <div className="bg-blue-500/20 p-4 rounded-full mb-4 group-hover:bg-blue-500/40 transition-colors duration-300">
                    <Users className="w-10 h-10 text-blue-100" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Usuarios</h3>
                  <p className="text-blue-200/60 text-center text-xs leading-relaxed">
                    Gestiona los usuarios del sistema
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6 mt-8">
          <p className="text-blue-200/50 text-xs">
            © 2025 SICEA. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
