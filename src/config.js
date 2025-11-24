const USE_PRODUCTION = true;

const API_BASE_URL = USE_PRODUCTION
  ? 'https://apimex.orionadministracion.com/'
  : 'http://localhost:3011/';

export default API_BASE_URL;
