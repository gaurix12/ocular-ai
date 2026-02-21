import { createContext, useContext, useState, useCallback } from 'react';
import axiosInstance from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('iris_user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    const [token, setToken] = useState(() => localStorage.getItem('iris_token') || null);

    const login = useCallback(async (email, password) => {
        const payload = {
            email: typeof email === 'string' ? email.trim().toLowerCase() : '',
            password: typeof password === 'string' ? password : '',
        };
        const response = await axiosInstance.post('/api/v1/auth/login', payload);
        const data = response?.data?.data;
        if (!data || !data.access_token) {
            throw new Error(response?.data?.message || 'Invalid response from server.');
        }
        const { access_token, user: userData } = data;
        localStorage.setItem('iris_token', access_token);
        localStorage.setItem('iris_user', JSON.stringify(userData));
        setToken(access_token);
        setUser(userData);
        return userData;
    }, []);

    const register = useCallback(async (full_name, email, password, role = 'patient') => {
        const response = await axiosInstance.post('/api/v1/auth/register', {
            full_name,
            email,
            password,
            role,
        });
        return response.data;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('iris_token');
        localStorage.removeItem('iris_user');
        setToken(null);
        setUser(null);
    }, []);

    const isAuthenticated = Boolean(token && user);

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
    return ctx;
}

export default AuthContext;
