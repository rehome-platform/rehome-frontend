import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getUser,
  saveUser,
  getToken,
  removeTokens,
  isTokenExpired,
} from '../services/baseApi.js';
import authService from '../features/auth/services/auth.service.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getToken());
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Khôi phục và đồng bộ phiên đăng nhập từ backend khi load lại trang
  const refreshAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      setIsInitializing(false);
      return;
    }

    try {
      const freshUser = await authService.getCurrentUser();
      if (freshUser) {
        setUser(freshUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        removeTokens();
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
      removeTokens();
    } finally {
      setIsInitializing(false);
    }
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
      return updatedUser;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (passwordData) => {
    setLoading(true);
    try {
      // Cho phép truyền object { oldPassword, newPassword, newPasswordRepeat }
      // hoặc 2 tham số (oldPassword, newPassword)
      let payload = {};
      if (typeof passwordData === 'object') {
        payload = passwordData;
      } else {
        const args = Array.from(arguments);
        payload = {
          oldPassword: args[0],
          newPassword: args[1],
          newPasswordRepeat: args[2] || args[1],
        };
      }
      return await authService.changePassword(payload);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
    } finally {
      removeTokens();
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  };

  useEffect(() => {
    refreshAuth();

    // Lắng nghe sự kiện hết hạn token từ interceptor
    const handleAuthExpired = () => {
      setUser(null);
      setIsAuthenticated(false);
      removeTokens();
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, [refreshAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading: loading || isInitializing,
        isInitializing,
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
