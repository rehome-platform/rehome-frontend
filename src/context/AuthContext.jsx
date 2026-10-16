import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getUser,
  saveUser,
  getToken,
  removeTokens,
} from '../services/baseApi.js';
import authService from '../features/auth/services/auth.service.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getToken());
  const [loading, setLoading] = useState(false);

  const refreshAuth = useCallback(() => {
    const currentUser = getUser();
    const token = getToken();
    setUser(currentUser);
    setIsAuthenticated(!!token);
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const data = await authService.login(credentials);
      if (data?.user) {
        setUser(data.user);
        setIsAuthenticated(true);
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (googleToken = null) => {
    setLoading(true);
    try {
      const data = await authService.loginWithGoogle(googleToken);
      if (data?.user) {
        setUser(data.user);
        setIsAuthenticated(true);
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    setLoading(true);
    try {
      const updatedUser = await authService.updateProfile(profileData);
      setUser(updatedUser);
      saveUser(updatedUser);
      return updatedUser;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    return await authService.changePassword(oldPassword, newPassword);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      removeTokens();
      setUser(null);
      setIsAuthenticated(false);
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        loginWithGoogle,
        logout,
        updateProfile,
        changePassword,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
