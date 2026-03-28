import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * Generic CRUD hook for admin module pages.
 * @param {string} endpoint - e.g. '/api/admin/residents'
 */
const useAdminCrud = (endpoint) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(endpoint, getHeaders());
      if (res.data.success) setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const create = async (payload) => {
    const res = await axios.post(endpoint, payload, getHeaders());
    if (res.data.success) await fetchData();
    return res.data;
  };

  const update = async (id, payload) => {
    const res = await axios.put(`${endpoint}/${id}`, payload, getHeaders());
    if (res.data.success) await fetchData();
    return res.data;
  };

  const remove = async (id) => {
    const res = await axios.delete(`${endpoint}/${id}`, getHeaders());
    if (res.data.success) await fetchData();
    return res.data;
  };

  return { data, loading, error, fetchData, create, update, remove };
};

export default useAdminCrud;
