/**
 * ReHome - Authentication & Profile Service
 * Phase 1 — Auth & Hồ sơ (F-004, F-006, F-007, F-008, F-009, F-010)
 * Hoàn toàn kết nối với Backend API thật tại https://re-backend-9a98.onrender.com
 * Không sử dụng mock data, fake fallback hay hardcoded credentials.
 */
import baseApi, {
  saveToken,
  saveRefreshToken,
  saveUser,
  removeTokens,
  getUser,
  getToken,
  getRefreshToken,
  parseJwt,
  isTokenExpired,
} from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { formatApiError } from '../../../utils/api.js';

/**
 * Chuẩn hóa role từ Spring Security authorities sang role client
 * ROLE_ADMIN -> 'admin'
 * ROLE_MODERATOR -> 'staff' (theo ROLES.MODERATOR trong role.config.js)
 * ROLE_ORGANIZATION -> 'organization'
 * ROLE_MEMBER -> 'member'
 */
export function normalizeRole(rawRole) {
  if (!rawRole) return 'member';
  const str = String(rawRole).toUpperCase();
  if (str.includes('ADMIN')) return 'admin';
  if (str.includes('MODERATOR') || str.includes('STAFF')) return 'staff';
  if (str.includes('ORGANIZATION')) return 'organization';
  if (str.includes('MEMBER')) return 'member';
  return 'member';
}

/**
 * Lấy thông tin chi tiết tài khoản từ backend
 */
async function fetchUserProfileFromBackend(claims) {
  let accountMeData = null;
  let memberData = null;

  // 1. Gọi /api/account/me để lấy email và authorities chính thức từ backend
  try {
    const res = await baseApi.get(API_ENDPOINTS.AUTH.ME);
    accountMeData = res.data;
  } catch (err) {
    if ([401, 403].includes(err.response?.status)) throw err;
    console.warn('[authService] Không thể gọi /api/account/me:', err.message);
  }

  // 2. Thử gọi /members/me để lấy hồ sơ chi tiết (fullName, phone, avatarUrl, memberCode)
  try {
    const memberRes = await baseApi.get(API_ENDPOINTS.MEMBER.ME);
    const result = memberRes.data?.result || memberRes.data?.data || memberRes.data;
    if (result && typeof result === 'object') {
      memberData = result;
    }
  } catch (err) {
    // Với tài khoản thuần admin nếu không có record member_profile, backend trả 403 hoặc 400
    // Không ném lỗi để luồng auth vẫn hoạt động với thông tin account
  }

  const email = memberData?.email || accountMeData?.email || claims?.sub || '';
  const rawRole = accountMeData?.authorities || claims?.roles || '';
  const normalizedRole = normalizeRole(rawRole);

  const user = {
    id: memberData?.accountId || claims?.sub || email,
    accountId: memberData?.accountId || null,
    email: email,
    name: memberData?.fullName || (email ? email.split('@')[0] : 'Người dùng'),
    fullName: memberData?.fullName || '',
    phone: memberData?.phone || '',
    avatar: memberData?.avatarUrl || '',
    avatarUrl: memberData?.avatarUrl || '',
    memberCode: memberData?.memberCode || '',
    emailVerified: memberData?.emailVerified ?? true,
    role: normalizedRole,
    rawRole: rawRole,
    authorities: rawRole,
  };

  saveUser(user);
  return user;
}

export const authService = {
  /**
   * F-004: Đăng nhập bằng Email & Mật khẩu
   * POST /api/auth/login
   */
  login: async (credentials) => {
    const { email, password } = credentials || {};
    if (!email || !password) {
      throw new Error('Vui lòng nhập đầy đủ email và mật khẩu.');
    }

    let receivedTokens = false;
    try {
      const res = await baseApi.post(API_ENDPOINTS.AUTH.LOGIN, {
        email: email.trim(),
        password: password,
      });

      const result = res.data?.result || res.data;
      const accessToken = result.accessToken || result.token;
      const refreshToken = result.refreshToken;

      if (!accessToken) {
        throw new Error('Máy chủ không trả về access token xác thực.');
      }

      saveToken(accessToken);
      receivedTokens = true;
      if (refreshToken) {
        saveRefreshToken(refreshToken);
      }

      const claims = parseJwt(accessToken);
      const user = await fetchUserProfileFromBackend(claims);

      return {
        token: accessToken,
        accessToken,
        refreshToken,
        user,
        message: 'Đăng nhập thành công',
      };
    } catch (err) {
      if (receivedTokens) removeTokens();
      const msg = formatApiError(err, 'đăng nhập');
      throw new Error(msg);
    }
  },

  /**
   * F-004: Đăng nhập bằng Google ID Token
   * POST /api/auth/google
   */
  loginWithGoogle: async (idToken) => {
    if (!idToken) {
      throw new Error('Không tìm thấy Google ID Token xác thực.');
    }

    let receivedTokens = false;
    try {
      const res = await baseApi.post(API_ENDPOINTS.AUTH.GOOGLE, { idToken });
      const result = res.data?.result || res.data;
      const accessToken = result.accessToken || result.token;
      const refreshToken = result.refreshToken;

      if (!accessToken) {
        throw new Error('Máy chủ không trả về access token xác thực.');
      }

      saveToken(accessToken);
      receivedTokens = true;
      if (refreshToken) {
        saveRefreshToken(refreshToken);
      }

      const claims = parseJwt(accessToken);
      const user = await fetchUserProfileFromBackend(claims);

      return {
        token: accessToken,
        accessToken,
        refreshToken,
        user,
        message: 'Đăng nhập Google thành công',
      };
    } catch (err) {
      if (receivedTokens) removeTokens();
      const msg = formatApiError(err, 'đăng nhập bằng Google');
      throw new Error(msg);
    }
  },

  /**
   * F-009: Lấy thông tin tài khoản và hồ sơ người dùng hiện tại
   * Kết nối /api/account/me và /members/me
   */
  getCurrentUser: async () => {
    const token = getToken();
    if (!token) return null;

    try {
      const claims = parseJwt(token);
      const user = await fetchUserProfileFromBackend(claims);
      return user;
    } catch (err) {
      if ([401, 403].includes(err.response?.status)) {
        removeTokens();
        return null;
      }
      console.warn('[authService] getCurrentUser failed:', err.message);
      // Nếu token hết hạn và không thể refresh, trả về user đã lưu hoặc null
      return getUser();
    }
  },

  /**
   * F-010: Cập nhật hồ sơ cá nhân (Họ tên, SĐT, Avatar)
   * PATCH /members/me
   */
  updateProfile: async (profileData) => {
    const { fullName, name, phone, avatarUrl, avatar } = profileData || {};

    const payload = {};
    const targetName = (fullName || name || '').trim();
    if (targetName) payload.fullName = targetName;

    const targetPhone = (phone || '').trim();
    if (targetPhone) payload.phone = targetPhone;

    const targetAvatar = (avatarUrl || avatar || '').trim();
    if (targetAvatar) payload.avatarUrl = targetAvatar;

    try {
      const res = await baseApi.patch(API_ENDPOINTS.MEMBER.ME, payload);
      const updated = res.data?.result || res.data?.data || res.data;

      const currentUser = getUser() || {};
      const newUser = {
        ...currentUser,
        fullName: updated?.fullName || payload.fullName || currentUser.fullName,
        name: updated?.fullName || payload.fullName || currentUser.name,
        phone: updated?.phone || payload.phone || currentUser.phone,
        avatar: updated?.avatarUrl || payload.avatarUrl || currentUser.avatar,
        avatarUrl: updated?.avatarUrl || payload.avatarUrl || currentUser.avatarUrl,
      };

      saveUser(newUser);
      return newUser;
    } catch (err) {
      const msg = formatApiError(err, 'cập nhật thông tin hồ sơ');
      throw new Error(msg);
    }
  },

  /**
   * F-008: Đổi mật khẩu tài khoản đang đăng nhập
   * POST /api/auth/password/change
   */
  changePassword: async ({ oldPassword, newPassword, newPasswordRepeat }) => {
    if (!oldPassword) {
      throw new Error('Vui lòng nhập mật khẩu hiện tại.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
    }
    if (newPasswordRepeat && newPassword !== newPasswordRepeat) {
      throw new Error('Mật khẩu nhập lại không khớp với mật khẩu mới.');
    }

    try {
      const res = await baseApi.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        oldPassword,
        newPassword,
        newPasswordRepeat: newPasswordRepeat || newPassword,
      });

      return {
        success: true,
        message: res.data?.message || 'Đổi mật khẩu thành công.',
      };
    } catch (err) {
      const msg = formatApiError(err, 'đổi mật khẩu');
      throw new Error(msg);
    }
  },

  /**
   * F-007: Bước 1 - Quên mật khẩu: Gửi liên kết qua email
   * POST /api/auth/password/forgot
   */
  forgotPassword: async (email) => {
    if (!email) {
      throw new Error('Vui lòng nhập địa chỉ email của bạn.');
    }

    try {
      await baseApi.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        email: email.trim(),
      });

      return {
        success: true,
        message: 'Nếu email này được đăng ký và đủ điều kiện, bạn sẽ nhận được liên kết đặt lại mật khẩu. Vui lòng kiểm tra email và nhấn vào liên kết được gửi để đặt lại mật khẩu.',
      };
    } catch (err) {
      const msg = formatApiError(err, 'yêu cầu đặt lại mật khẩu');
      throw new Error(msg);
    }
  },

  /**
   * F-007: Bước 2A - Xác thực mã OTP đặt lại mật khẩu
   * POST /api/auth/verify-otp
   */
  verifyOtp: async ({ email, otp, purpose = 'FORGOT_PASSWORD' }) => {
    if (!email || !otp) {
      throw new Error('Vui lòng nhập đầy đủ email và mã OTP 6 số.');
    }

    try {
      const res = await baseApi.post(API_ENDPOINTS.AUTH.VERIFY_OTP, {
        email: email.trim(),
        otp: otp.trim(),
        purpose,
      });

      return res.data; // { message, resetToken }
    } catch (err) {
      const msg = formatApiError(err, 'xác thực mã OTP');
      throw new Error(msg);
    }
  },

  /**
   * F-007: Gửi lại mã OTP
   * POST /api/auth/resend-otp
   */
  resendOtp: async ({ email, purpose = 'FORGOT_PASSWORD' }) => {
    if (!email) {
      throw new Error('Vui lòng cung cấp email để gửi lại mã OTP.');
    }

    try {
      const res = await baseApi.post(API_ENDPOINTS.AUTH.RESEND_OTP, {
        email: email.trim(),
        purpose,
      });

      return res.data;
    } catch (err) {
      const msg = formatApiError(err, 'gửi lại mã OTP');
      throw new Error(msg);
    }
  },

  /**
   * F-007: Bước 2B - Đặt lại mật khẩu với resetToken
   * POST /api/auth/password/reset
   */
  resetPassword: async ({ email, resetToken, newPassword, confirmPassword }) => {
    if (!email || !resetToken) {
      throw new Error('Thiếu thông tin xác thực token đặt lại mật khẩu.');
    }
    if (!newPassword || !newPassword.trim() || newPassword.length < 6 || newPassword.length > 72) {
      throw new Error('Mật khẩu mới phải có từ 6 đến 72 ký tự.');
    }
    if (newPassword !== confirmPassword) {
      throw new Error('Mật khẩu xác nhận không trùng khớp.');
    }

    try {
      const res = await baseApi.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        email: email.trim(),
        resetToken: resetToken.trim(),
        newPassword,
        confirmPassword,
      });

      return {
        success: true,
        message: res.data?.message || 'Đặt lại mật khẩu thành công!',
      };
    } catch (err) {
      const msg = formatApiError(err, 'đặt lại mật khẩu');
      throw new Error(msg);
    }
  },

  /**
   * F-006: Đăng xuất hệ thống, thu hồi token trên backend
   * POST /api/auth/logout
   */
  logout: async () => {
    try {
      const token = getToken();
      if (token) {
        await baseApi.post(API_ENDPOINTS.AUTH.LOGOUT);
      }
    } catch (err) {
      console.warn('[authService] Backend logout call warning:', err.message);
    } finally {
      removeTokens();
    }
  },

  /**
   * Kiểm tra quyền truy cập Admin qua backend
   * GET /api/admin/dashboard
   */
  checkAdminAccess: async () => {
    try {
      const res = await baseApi.get(API_ENDPOINTS.ADMIN.DASHBOARD);
      return {
        authorized: true,
        message: res.data?.message || 'Xác thực quyền Admin thành công.',
      };
    } catch (err) {
      return {
        authorized: false,
        status: err.response?.status || 403,
        message: formatApiError(err, 'kiểm tra quyền quản trị Admin'),
      };
    }
  },
};

export default authService;
