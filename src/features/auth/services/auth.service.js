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
  parseJwt,
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
 * Kiểm tra xem account có phải role MEMBER hợp lệ không.
 * Chỉ cho phép gọi GET /members/me khi xác định chắc chắn là MEMBER.
 * Không suy diễn, không mặc định role lạ/rỗng là MEMBER.
 */
export function isMemberRole(rawRole) {
  if (!rawRole) return false;
  const str = (Array.isArray(rawRole)
    ? rawRole.map((r) => (typeof r === 'string' ? r : r?.authority || '')).join(' ')
    : String(rawRole)
  ).toUpperCase().trim();
  if (!str) return false;
  if (str.includes('ADMIN') || str.includes('MODERATOR') || str.includes('STAFF') || str.includes('ORGANIZATION')) {
    return false;
  }
  return str.includes('MEMBER');
}

/**
 * Lấy thông tin chi tiết tài khoản từ backend
 */
async function fetchUserProfileFromBackend(claims) {
  const accountMeData = await fetchAccount();
  const rawRole = accountMeData?.authorities || claims?.roles || '';
  const isMember = isMemberRole(rawRole);
  const memberData = isMember ? await fetchMemberProfile() : null;
  const user = buildUser(memberData ?? {}, accountMeData ?? {}, claims ?? {});
  saveUser(user);
  return user;
}

async function fetchAccount() {
  // 1. Gọi /api/account/me để lấy email và authorities chính thức từ backend
  try {
    const res = await baseApi.get(API_ENDPOINTS.AUTH.ME);
    return res.data;
  } catch (err) {
    if ([401, 403].includes(err.response?.status)) throw err;
    console.warn('[authService] Không thể gọi /api/account/me:', err.message);
  }
  return null;
}

function unwrapResponse(data) {
  return data?.result || data?.data || data;
}

async function fetchMemberProfile() {
  // 2. Thử gọi /members/me để lấy hồ sơ chi tiết (fullName, phone, avatarUrl, memberCode)
  try {
    const memberRes = await baseApi.get(API_ENDPOINTS.MEMBER.ME);
    const result = unwrapResponse(memberRes.data);
    if (result && typeof result === 'object') {
      return result;
    }
  } catch (err) {
    // Với tài khoản thuần admin nếu không có record member_profile, backend trả 403 hoặc 400
    // Không ném lỗi để luồng auth vẫn hoạt động với thông tin account
  }
  return null;
}

function buildUser(memberData, accountMeData, claims) {
  const email = memberData.email || accountMeData.email || claims.sub || '';
  const rawRole = accountMeData.authorities || claims.roles || '';
  const normalizedRole = normalizeRole(rawRole);

  return {
    id: memberData.accountId || accountMeData.id || claims.sub || email,
    accountId: memberData.accountId || accountMeData.id || null,
    email: email,
    ...memberProfileFields(memberData, email, accountMeData),
    role: normalizedRole,
    rawRole: rawRole,
    authorities: rawRole,
    warehouseId: accountMeData.warehouseId ?? accountMeData.warehouse?.id ?? null,
    warehouseName: accountMeData.warehouseName ?? accountMeData.warehouse?.name ?? '',
  };
}

function memberProfileFields(memberData, email, accountMeData = {}) {
  const fullName = memberData.fullName || accountMeData.fullName || accountMeData.name || '';
  return {
    name: fullName || (email ? email.split('@')[0] : 'Người dùng'),
    fullName: fullName,
    phone: memberData.phone || accountMeData.phone || '',
    avatar: memberData.avatarUrl || accountMeData.avatarUrl || '',
    avatarUrl: memberData.avatarUrl || accountMeData.avatarUrl || '',
    memberCode: memberData.memberCode || accountMeData.memberCode || '',
    emailVerified: memberData.emailVerified ?? accountMeData.emailVerified ?? true,
  };
}

function profilePayload(profileData) {
  const { fullName, name, phone, avatarUrl, avatar } = profileData || {};
  const payload = {};
  const targetName = (fullName || name || '').trim();
  if (targetName) payload.fullName = targetName;
  const targetPhone = (phone || '').trim();
  if (targetPhone) payload.phone = targetPhone;
  const targetAvatar = (avatarUrl || avatar || '').trim();
  if (targetAvatar) payload.avatarUrl = targetAvatar;
  return payload;
}

function mergeProfile(currentUser, updated, payload) {
  const fields = {
    fullName: 'fullName', name: 'fullName', phone: 'phone',
    avatar: 'avatarUrl', avatarUrl: 'avatarUrl',
  };
  const user = { ...currentUser };
  for (const [target, source] of Object.entries(fields)) {
    user[target] = updated?.[source] || payload[source] || currentUser[target];
  }
  return user;
}

async function createSession(request, message, errorContext) {
  let receivedTokens = false;
  try {
    const { data } = await request();
    const result = unwrapResponse(data);
    const accessToken = result.accessToken || result.token;
    const refreshToken = result.refreshToken;
    if (!accessToken) {
      throw new Error('Máy chủ không trả về access token xác thực.');
    }

    saveToken(accessToken);
    receivedTokens = true;
    if (refreshToken) saveRefreshToken(refreshToken);
    const user = await fetchUserProfileFromBackend(parseJwt(accessToken));
    return { token: accessToken, accessToken, refreshToken, user, message };
  } catch (err) {
    if (receivedTokens) removeTokens();
    throw new Error(formatApiError(err, errorContext));
  }
}

async function postOtp(request, errorContext) {
  try {
    const res = await request();
    return res.data;
  } catch (err) {
    throw new Error(formatApiError(err, errorContext));
  }
}

function validatePasswordChange(oldPassword, newPassword, newPasswordRepeat) {
  if (!oldPassword) {
    throw new Error('Vui lòng nhập mật khẩu hiện tại.');
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
  }
  if (newPasswordRepeat && newPassword !== newPasswordRepeat) {
    throw new Error('Mật khẩu nhập lại không khớp với mật khẩu mới.');
  }
}

function invalidResetPassword(password) {
  if (!password || !password.trim()) return true;
  return password.length < 6 || password.length > 72;
}

function validatePasswordReset(email, resetToken, newPassword, confirmPassword) {
  if (!email || !resetToken) {
    throw new Error('Thiếu thông tin xác thực token đặt lại mật khẩu.');
  }
  if (invalidResetPassword(newPassword)) {
    throw new Error('Mật khẩu mới phải có từ 6 đến 72 ký tự.');
  }
  if (newPassword !== confirmPassword) {
    throw new Error('Mật khẩu xác nhận không trùng khớp.');
  }
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

    return createSession(
      () => baseApi.post(API_ENDPOINTS.AUTH.LOGIN, { email: email.trim(), password }),
      'Đăng nhập thành công',
      'đăng nhập',
    );
  },

  /**
   * F-004: Đăng nhập bằng Google ID Token
   * POST /api/auth/google
   */
  loginWithGoogle: async (idToken) => {
    if (!idToken) {
      throw new Error('Không tìm thấy Google ID Token xác thực.');
    }

    return createSession(
      () => baseApi.post(API_ENDPOINTS.AUTH.GOOGLE, { idToken }),
      'Đăng nhập Google thành công',
      'đăng nhập bằng Google',
    );
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
    const payload = profilePayload(profileData);

    try {
      const res = await baseApi.patch(API_ENDPOINTS.MEMBER.ME, payload);
      const updated = unwrapResponse(res.data);

      const currentUser = getUser() || {};
      const newUser = mergeProfile(currentUser, updated, payload);

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
    validatePasswordChange(oldPassword, newPassword, newPasswordRepeat);

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

    return postOtp(
      () => baseApi.post(API_ENDPOINTS.AUTH.VERIFY_OTP, { email: email.trim(), otp: otp.trim(), purpose }),
      'xác thực mã OTP',
    );
  },

  /**
   * F-007: Gửi lại mã OTP
   * POST /api/auth/resend-otp
   */
  resendOtp: async ({ email, purpose = 'FORGOT_PASSWORD' }) => {
    if (!email) {
      throw new Error('Vui lòng cung cấp email để gửi lại mã OTP.');
    }

    return postOtp(
      () => baseApi.post(API_ENDPOINTS.AUTH.RESEND_OTP, { email: email.trim(), purpose }),
      'gửi lại mã OTP',
    );
  },

  /**
   * F-007: Bước 2B - Đặt lại mật khẩu với resetToken
   * POST /api/auth/password/reset
   */
  resetPassword: async ({ email, resetToken, newPassword, confirmPassword }) => {
    validatePasswordReset(email, resetToken, newPassword, confirmPassword);

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
