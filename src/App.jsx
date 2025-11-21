import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ToastContainer } from 'react-toastify';

import './App.css';
import Login from './pages/Login';
import DashboardLayout from './components/layout/DashboardLayout';
import ResourcePage from './pages/ResourcePage';
import ExpedientePage from './pages/ExpedientePage';
import { resources } from './constants/resourceConfig';

const ProtectedRoute = ({ children }) => {
  const token = useSelector((state) => state.auth.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const token = useSelector((state) => state.auth.token);
  if (token) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const defaultResource = resources[0]?.key ?? 'colaboradores';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to={`/manage/${defaultResource}`} replace />} />
            <Route path="manage/:resourceKey" element={<ResourcePage />} />
            <Route path="expedientes" element={<ExpedientePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} newestOnTop />
    </>
  );
}

export default App;
