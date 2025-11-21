import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';

import API_BASE_URL from '../config';

const normalizeItems = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  if (payload && typeof payload === 'object') {
    return [payload];
  }
  return [];
};

const useCrudResource = (resource) => {
  const token = useSelector((state) => state.auth.token);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const baseUrl = `${API_BASE_URL}${resource.endpoint}`;
  const listUrl = resource.listEndpoint
    ? `${API_BASE_URL}${resource.listEndpoint}`
    : baseUrl;

  const buildHeaders = () => {
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(listUrl, { headers: buildHeaders() });
      setItems(normalizeItems(data));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [listUrl, token]);

  const createItem = async (body) => {
    await axios.post(baseUrl, body, { headers: buildHeaders() });
    await fetchItems();
  };

  const updateItem = async (id, body) => {
    await axios.put(`${baseUrl}/${id}`, body, { headers: buildHeaders() });
    await fetchItems();
  };

  const deleteItem = async (id) => {
    await axios.delete(`${baseUrl}/${id}`, { headers: buildHeaders() });
    await fetchItems();
  };

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    loading,
    error,
    refresh: fetchItems,
    createItem,
    updateItem,
    deleteItem,
  };
};

export default useCrudResource;
