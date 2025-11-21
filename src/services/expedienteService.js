import apiClient, { withAuth } from './apiClient';

export const fetchExpediente = async (token, noColaborador, { fechaInicio, fechaFin } = {}) => {
  if (!noColaborador) {
    throw new Error('Debes ingresar un número de colaborador');
  }

  const params = {};
  if (fechaInicio) params.fechaInicio = fechaInicio;
  if (fechaFin) params.fechaFin = fechaFin;

  const { data } = await apiClient.get(
    `api/operadores/${encodeURIComponent(noColaborador)}/expediente`,
    withAuth(token, { params }),
  );

  return data;
};

export default fetchExpediente;
