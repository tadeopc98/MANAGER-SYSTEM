import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearToken } from '../../features/auth/authSlice';
import './TopBar.css';

const TopBar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(clearToken());
    toast.info('Sesión cerrada');
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div>
        <p className="topbar-title">Panel de administración Mintaka</p>
        <p className="topbar-subtitle">
          Gestiona catálogos principales y servicios en un solo lugar.
        </p>
      </div>
      <div className="topbar-actions">
        <div className="topbar-user">
          <span className="topbar-user-name">{user?.name ?? 'Usuario'}</span>
          <span className="topbar-user-role">{user?.rol ?? 'Administrador'}</span>
        </div>
        <button type="button" className="topbar-logout" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
};

export default TopBar;
