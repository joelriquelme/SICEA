import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import { useAuth } from './hooks/AuthContext';
import FileUploadPage from './components/FileUploadPage';
import HomePage from './components/HomePage';
import ExportPage from "./components/ExportPage.tsx";
import BillsPage from './components/BillsPage';
import ChargesPage from './components/ChargesPage';
import MetersPage from './components/MetersPage';
import UsersPage from './components/UsersPage';



function PrivateRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <HomePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/subir-facturas"
          element={
            <PrivateRoute>
              <FileUploadPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/exportar"
          element={
            <PrivateRoute>
              <ExportPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/facturas"
          element={
            <PrivateRoute>
              <BillsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/cargos"
          element={
            <PrivateRoute>
              <ChargesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/medidores"
          element={
            <PrivateRoute>
              <MetersPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/gestion-usuarios"
          element={
            <PrivateRoute>
              <UsersPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
