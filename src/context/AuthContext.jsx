import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUser, saveUser, saveToken, saveRefreshToken, removeTokens, getToken } from '../services/baseApi.js';
import baseApi from '../services/baseApi.js';
import { API_ENDPOINTS } from '../configs/api.config.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
  const [loading, setLoading] = useState(false);

  const refreshAuth = () => {
    const currentUser = getUser();
    const token = getToken();
    setUser(currentUser);
    setIsAuthenticated(!!token);
  };

  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await baseApi.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
      const data = response.data?.data || response.data;
      if (data?.token) {
        saveToken(data.token);
        if (data.refreshToken) saveRefreshToken(data.refreshToken);
        if (data.user) saveUser(data.user);
        setUser(data.user);
        setIsAuthenticated(true);
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await baseApi.post(API_ENDPOINTS.AUTH.LOGOUT).catch(() => {});
    } finally {
      removeTokens();
      setUser(null);
      setIsAuthenticated(false);
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
