import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/AuthContext';
import { useNavigate } from 'react-router-dom'; // <-- importar

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false); // solo para el botón
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate(); // <-- inicializar

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await login({ email, password });
      navigate('/'); // <-- redirigir al home
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en el inicio de sesión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo/Title */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-2 tracking-wider">
            SICEA
          </h1>
          <div className="w-24 h-1 bg-blue-400 mx-auto rounded-full"></div>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-200 text-sm text-center">{error}</p>
            </div>
          )}
          <h2 className="text-2xl font-semibold text-white text-center mb-8">
            Iniciar Sesión
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="relative">
              <label htmlFor="email" className="block text-sm font-medium text-blue-100 mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 hover:bg-white/15"
                  placeholder="ejemplo@correo.com"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-blue-100 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 hover:bg-white/15"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-300 hover:text-blue-200 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-blue-400 disabled:to-blue-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent shadow-lg hover:shadow-xl flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-blue-200/60 text-sm">
            © 2025 SICEA. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;