import axios from 'axios';
import { db } from './db';

const api = axios.create({
    baseURL: 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('email');
            localStorage.removeItem('lastSync');
            await db.clearAll();
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default api;
