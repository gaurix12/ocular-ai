import axios from 'axios';

// In dev: use relative URL so Vite proxy forwards /api to backend (avoids CORS)
// In prod: use full backend URL from env
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
    || (import.meta.env.DEV ? '' : 'http://localhost:5001');

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor — attach JWT
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('iris_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — redirect to login on 401 (except when already on login/register)
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const isAuthRequest = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
            if (!isAuthRequest) {
                localStorage.removeItem('iris_token');
                localStorage.removeItem('iris_user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
