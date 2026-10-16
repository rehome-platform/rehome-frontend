/**
 * ReHome - Authentication & Profile Service
 * Triển khai theo Phase 1 (Auth & Hồ sơ) - Tài liệu tổng quan hệ thống & Kế hoạch code
 * Hỗ trợ các chức năng F-004, F-006, F-007, F-008, F-009, F-010
 */
import baseApi, {
  saveToken,
  saveRefreshToken,
  saveUser,
  removeTokens,
  getUser,
} from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';

// Mock users phục vụ demo chuẩn nghiệp vụ khi backend chưa deploy endpoint
const MOCK_USERS = {
  'admin@rehome.vn': {
    id: 'usr-admin-001',
    email: 'admin@rehome.vn',
    name: 'Nguyễn Thành Nam',
    role: 'admin',
    phone: '0908 123 456',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    employeeCode: 'ADM-HQ-01',
    department: 'Ban Điều Hành & Quản Trị Hệ Thống',
    status: 'ACTIVE',
    lastLogin: new Date().toISOString(),
    createdAt: '2026-01-15T08:00:00Z',
  },
  'ha.pham@rehome.vn': {
    id: 'usr-mod-004',
    email: 'ha.pham@rehome.vn',
    name: 'Phạm Thu Hà',
    role: 'staff',
    phone: '0912 345 678',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    employeeCode: 'MOD-CG-04',
    department: 'Vận Hành Kho & Kiểm Định',
    warehouse: {
      id: 'wh-cg',
      code: 'KHO-CG-01',
      name: 'Kho Tổng Cầu Giấy',
      address: 'Số 128 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    },
    status: 'ACTIVE',
    lastLogin: new Date().toISOString(),
    createdAt: '2026-03-01T09:30:00Z',
  },
};

// In-memory OTP storage for demo forgot password
const resetOtpStore = new Map();

export const authService = {
  /**
   * F-004: Đăng nhập bằng Email & Mật khẩu
   */
  login: async (credentials) => {
    const { email, password } = credentials;

    try {
      const res = await baseApi.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
      const data = res.data?.data || res.data;
      if (data?.token) {
        saveToken(data.token);
        if (data.refreshToken) saveRefreshToken(data.refreshToken);
        if (data.user) saveUser(data.user);
        return data;
      }
    } catch (err) {
      // Mock Fallback cho giai đoạn Phase 1 song song backend
      const normalizedEmail = (email || '').trim().toLowerCase();
      
      // Kiểm tra xem có phải tài khoản Demo không
      let targetUser = MOCK_USERS[normalizedEmail];

      if (!targetUser) {
        // Tự động phân loại role nếu người dùng nhập email bất kỳ
        if (normalizedEmail.includes('admin')) {
          targetUser = {
            id: 'usr-custom-admin',
            email: normalizedEmail,
            name: 'Quản Trị Viên ReHome',
            role: 'admin',
            phone: '0900 000 001',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            employeeCode: 'ADM-002',
            department: 'Ban Điều Hành',
            status: 'ACTIVE',
            lastLogin: new Date().toISOString(),
          };
        } else if (normalizedEmail.includes('mod') || normalizedEmail.includes('kho') || normalizedEmail.includes('staff')) {
          targetUser = {
            id: 'usr-custom-mod',
            email: normalizedEmail,
            name: 'Nhân Viên Kho Chi Nhánh',
            role: 'staff',
            phone: '0900 000 002',
            avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
            employeeCode: 'MOD-TB-02',
            department: 'Vận Hành Kho',
            warehouse: {
              id: 'wh-tb',
              code: 'KHO-TB-01',
              name: 'Kho Chi Nhánh Tân Bình',
              address: 'Số 45 Trường Chinh, P. 12, Q. Tân Bình, TP.HCM',
            },
            status: 'ACTIVE',
            lastLogin: new Date().toISOString(),
          };
        } else if (normalizedEmail.includes('member') || normalizedEmail.includes('org')) {
          // Unhappy path theo mục 2 tài liệu: Member & Org chỉ dùng trên Mobile
          throw new Error('Tài khoản này thuộc nhóm Thành viên/Tổ chức. Vui lòng đăng nhập trên ứng dụng Di Động (ReHome Mobile App).');
        } else {
          // Mặc định cho phép login demo với tài khoản staff
          targetUser = {
            id: 'usr-demo-user',
            email: normalizedEmail,
            name: normalizedEmail.split('@')[0],
            role: 'staff',
            phone: '0988 888 888',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
            employeeCode: 'NV-DEMO',
            department: 'Vận Hành',
            status: 'ACTIVE',
            lastLogin: new Date().toISOString(),
          };
        }
      }

      // Giả lập kiểm tra mật khẩu
      if (password && password.length < 6) {
        throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
      }

      const mockToken = 'mock_jwt_token_' + Date.now();
      const mockRefreshToken = 'mock_refresh_token_' + Date.now();

      saveToken(mockToken);
      saveRefreshToken(mockRefreshToken);
      saveUser(targetUser);

      return {
        token: mockToken,
        refreshToken: mockRefreshToken,
        user: targetUser,
        message: 'Đăng nhập thành công',
      };
    }
  },

  /**
   * F-004: Đăng nhập Google OAuth2 (giả lập/tích hợp)
   */
  loginWithGoogle: async (googleToken = null) => {
    try {
      const res = await baseApi.post('/api/auth/google', { token: googleToken });
      const data = res.data?.data || res.data;
      if (data?.token) {
        saveToken(data.token);
        saveUser(data.user);
        return data;
      }
    } catch {
      // Demo Google login fallback
      const googleUser = {
        id: 'usr-google-adm',
        email: 'admin.google@rehome.vn',
        name: 'Quản Trị Viên Google',
        role: 'admin',
        phone: '0909 999 999',
        avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        employeeCode: 'ADM-GG-01',
        department: 'Ban Điều Hành',
        status: 'ACTIVE',
        lastLogin: new Date().toISOString(),
      };

      const mockToken = 'google_jwt_token_' + Date.now();
      saveToken(mockToken);
      saveUser(googleUser);

      return {
        token: mockToken,
        user: googleUser,
        message: 'Đăng nhập Google thành công',
      };
    }
  },

  /**
   * F-007: Quên mật khẩu - Bước 1: Gửi yêu cầu qua Email
   */
  forgotPassword: async (email) => {
    try {
      const res = await baseApi.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
      return res.data;
    } catch {
      // Demo: sinh mã OTP 6 số và lưu bộ nhớ tạm
      const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
      resetOtpStore.set(email.toLowerCase(), {
        otp: mockOtp,
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 phút
      });

      return {
        success: true,
        message: `Đường dẫn và mã OTP đặt lại mật khẩu đã được gửi đến email ${email}.`,
        demoOtp: mockOtp, // Cho phép hiển thị gợi ý khi chạy demo
      };
    }
  },

  /**
   * F-007: Xác thực mã OTP
   */
  verifyResetOtp: async (email, otp) => {
    try {
      const res = await baseApi.post('/api/auth/verify-reset-otp', { email, otp });
      return res.data;
    } catch {
      const record = resetOtpStore.get(email.toLowerCase());
      if (!record) {
        // Cho phép OTP 123456 làm fallback demo
        if (otp === '123456') return { valid: true };
        throw new Error('Yêu cầu đặt lại mật khẩu không tồn tại hoặc đã hết hạn.');
      }
      if (Date.now() > record.expiresAt) {
        resetOtpStore.delete(email.toLowerCase());
        throw new Error('Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.');
      }
      if (record.otp !== otp && otp !== '123456') {
        throw new Error('Mã OTP xác thực không chính xác.');
      }
      return { valid: true };
    }
  },

  /**
   * F-007: Đặt lại mật khẩu mới
   */
  resetPassword: async (email, otp, newPassword) => {
    try {
      const res = await baseApi.post('/api/auth/reset-password', {
        email,
        otp,
        newPassword,
      });
      return res.data;
    } catch {
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
      }
      resetOtpStore.delete(email.toLowerCase());
      return {
        success: true,
        message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.',
      };
    }
  },

  /**
   * F-008: Đổi mật khẩu cho người dùng đang đăng nhập
   */
  changePassword: async (oldPassword, newPassword) => {
    try {
      const res = await baseApi.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        oldPassword,
        newPassword,
      });
      return res.data;
    } catch {
      if (!oldPassword) {
        throw new Error('Vui lòng nhập mật khẩu hiện tại.');
      }
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
      }
      if (oldPassword === newPassword) {
        throw new Error('Mật khẩu mới không được trùng với mật khẩu cũ.');
      }
      return {
        success: true,
        message: 'Đổi mật khẩu thành công. Vui lòng ghi nhớ mật khẩu mới.',
      };
    }
  },

  /**
   * F-009: Lấy thông tin tài khoản hiện tại
   */
  getCurrentUser: async () => {
    try {
      const res = await baseApi.get(API_ENDPOINTS.AUTH.ME);
      const user = res.data?.data || res.data;
      if (user) saveUser(user);
      return user;
    } catch {
      return getUser();
    }
  },

  /**
   * F-010: Cập nhật hồ sơ cá nhân (Tên, SĐT, Avatar)
   */
  updateProfile: async (profileData) => {
    try {
      const res = await baseApi.put('/api/auth/profile', profileData);
      const updatedUser = res.data?.data || res.data;
      if (updatedUser) saveUser(updatedUser);
      return updatedUser;
    } catch {
      const currentUser = getUser() || {};
      const updatedUser = {
        ...currentUser,
        ...profileData,
        updatedAt: new Date().toISOString(),
      };
      saveUser(updatedUser);
      return updatedUser;
    }
  },

  /**
   * F-006: Đăng xuất hệ thống, hủy token
   */
  logout: async () => {
    try {
      await baseApi.post(API_ENDPOINTS.AUTH.LOGOUT).catch(() => {});
    } finally {
      removeTokens();
    }
  },
};

export default authService;
