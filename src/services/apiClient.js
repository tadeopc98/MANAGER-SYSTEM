import axios from 'axios';
import API_BASE_URL from '../config';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

export const withAuth = (token, config = {}) => {
  const headers = {
    ...(config.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return {
    ...config,
    headers,
  };
};

export default apiClient;
