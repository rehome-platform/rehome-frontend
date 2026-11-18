import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import baseApi, {
  getUser,
  saveUser,
  getToken,
  removeTokens,
  isTokenExpired,
} from '../services/baseApi.js';
import authService, { isMemberRole } from '../features/auth/services/auth.service.js';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getToken());
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
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
      // Đối với Moderator/Staff và Admin (hoặc vai trò không có endpoint riêng): gọi PUT /api/auth/me
      if (user && !isMemberRole(user.role || user.authorities)) {
        const targetName = (profileData?.fullName || profileData?.name || '').trim();
        const targetPhone = (profileData?.phone || '').trim();
        const targetAvatar = (profileData?.avatarUrl || profileData?.avatar || '').trim();
        const payload = {
          ...(targetName ? { fullName: targetName } : {}),
          ...(profileData?.phone !== undefined ? { phone: targetPhone } : {}),
          ...(targetAvatar ? { avatarUrl: targetAvatar } : {}),
        };
        const res = await baseApi.put('/api/auth/me', payload);
        const raw = res?.data?.data ?? res?.data ?? {};
        const resolvedName = raw.fullName || raw.name || targetName || user.fullName || user.name;
        const resolvedPhone = raw.phone !== undefined ? raw.phone : (profileData?.phone !== undefined ? targetPhone : user.phone);
        const resolvedAvatar = raw.avatarUrl || targetAvatar || user.avatarUrl || user.avatar || '';
        const updated = {
          ...user,
          ...raw,
          name: resolvedName,
          fullName: resolvedName,
          phone: resolvedPhone,
          avatar: resolvedAvatar,
          avatarUrl: resolvedAvatar,
        };
        saveUser(updated);
        setUser(updated);
        return updated;
      }
      const updatedUser = await authService.updateProfile(profileData);
      setUser(updatedUser);
      return updatedUser;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (passwordData) => {
    // Profile owns this request's loading state; auth loading would unmount it.
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
  };

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    window.dispatchEvent(new CustomEvent('auth:logout'));
    // Phản hồi tức thì trên UI bằng cách xoá token & session state ngay trước khi chờ API logout
    removeTokens();
    setUser(null);
    setIsAuthenticated(false);
    try {
      await authService.logout();
    } catch {
      // Ignore logout network error since local session is already cleared
    } finally {
      setLoggingOut(false);
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
        loggingOut,
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
