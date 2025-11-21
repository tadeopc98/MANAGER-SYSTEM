import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';

import { setToken, setUser } from '../features/auth/authSlice';
import API_BASE_URL from '../config';
import './Login.css';
import logo from '../assets/react.svg';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE_URL}auth/login`, { email, password });
      if (!data?.token) {
        throw new Error('La respuesta no incluye token');
      }

      dispatch(setToken(data.token));
      try {
        dispatch(setUser(jwtDecode(data.token)));
      } catch (err) {
        console.warn('No fue posible decodificar el token', err);
      }

      toast.success('Sesión iniciada');
      navigate('/');
    } catch (error) {
      console.error('Error en el inicio de sesión:', error);
      const message = error.response?.data?.message ?? 'Credenciales inválidas';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img src={logo} alt="Mintaka" className="login-logo" />
        <h1>Manager Mintaka</h1>
        <p className="login-subtitle">Ingresa con tu usuario corporativo</p>
        <form onSubmit={handleLogin}>
          <label className="login-label">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@mintaka.mx"
              required
            />
          </label>
          <label className="login-label">
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
            />
          </label>
          <button className="login-button" type="submit" disabled={loading}>
            {loading ? 'Validando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
