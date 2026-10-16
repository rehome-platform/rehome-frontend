import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Logo from '../../../components/common/Logo.jsx';
import { validateEmail, validatePassword } from '../../../utils/validators.js';

/**
 * Trang Đăng nhập Hệ thống Quản trị & Vận hành ReHome (Web)
 * Phase 1 — Auth & Hồ sơ (F-004, F-005)
 * Kết nối hoàn toàn với Backend API thật tại https://re-backend-9a98.onrender.com
 * Không có tài khoản demo, không hardcode credentials, điều hướng chuẩn theo role.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login, loginWithGoogle, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fromLocation = location.state?.from?.pathname;

  // Nếu người dùng đã có session hợp lệ, chuyển thẳng tới dashboard theo vai trò, tránh bắt đăng nhập lại
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const userRole = user.role;
      if (userRole === 'admin') {
        const dest = fromLocation && fromLocation.startsWith('/admin') ? fromLocation : '/admin';
        navigate(dest, { replace: true });
      } else if (userRole === 'staff' || userRole === 'moderator') {
        const dest = fromLocation && fromLocation.startsWith('/moderator') ? fromLocation : '/moderator/counter';
        navigate(dest, { replace: true });
      }
    }
  }, [loading, isAuthenticated, user, navigate, fromLocation]);

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    // Validation
    const emailErr = validateEmail(email);
    if (emailErr) {
      setErrorMessage(emailErr);
      return;
    }
    const passErr = validatePassword(password);
    if (passErr) {
      setErrorMessage(passErr);
      return;
    }

    setIsLoading(true);

    try {
      const res = await login({ email, password });
      const user = res?.user;
      const userRole = user?.role;

      // Phân quyền và điều hướng theo vai trò thực tế từ backend (F-005)
      if (userRole === 'admin') {
        const dest = fromLocation && fromLocation.startsWith('/admin') ? fromLocation : '/admin';
        navigate(dest, { replace: true });
      } else if (userRole === 'staff' || userRole === 'moderator') {
        const dest = fromLocation && fromLocation.startsWith('/moderator') ? fromLocation : '/moderator/counter';
        navigate(dest, { replace: true });
      } else {
        // Tài khoản Member hoặc Organization (chỉ dùng trên Mobile theo Mục 2 tài liệu)
        setErrorMessage(
          'Tài khoản này thuộc nhóm Thành viên / Tổ chức từ thiện. Cổng Web vận hành chỉ dành riêng cho Quản trị viên (Admin) và Nhân viên kiểm định kho (Moderator). Vui lòng đăng nhập trên ứng dụng Di Động (ReHome Mobile App).'
        );
      }
    } catch (err) {
      setErrorMessage(err.message || 'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrorMessage('');
    try {
      const res = await loginWithGoogle();
      const userRole = res?.user?.role;
      if (userRole === 'admin') {
        navigate('/admin', { replace: true });
      } else if (userRole === 'staff' || userRole === 'moderator') {
        navigate('/moderator/counter', { replace: true });
      } else {
        setErrorMessage(
          'Tài khoản Google này thuộc nhóm Thành viên/Tổ chức. Vui lòng đăng nhập trên ứng dụng Di Động ReHome.'
        );
      }
    } catch (err) {
      setErrorMessage(err.message || 'Không thể đăng nhập bằng Google lúc này.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9F4] flex flex-col justify-between items-center px-4 py-8 sm:py-12 select-none">
      {/* Main Login Card */}
      <div className="w-full max-w-[440px] bg-white rounded-2xl border border-[#DDE5D9] shadow-card p-8 sm:p-10 my-auto transition-all duration-300">
        {/* Header Logo theo chuẩn Design tokens */}
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" showText={true} to={null} subtitle="Cổng Vận Hành Nội Bộ" />
          <p className="text-xs text-[#5B6776] mt-3 max-w-xs leading-relaxed">
            Hệ thống đăng nhập dành cho Quản trị viên (Admin) và Nhân viên kiểm định kho (Moderator).
          </p>
        </div>

        {/* Thông báo lỗi (Unhappy paths) */}
        {errorMessage && (
          <div
            id="login-error-alert"
            className="mt-6 p-3.5 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/30 text-[#D92D20] text-xs font-medium flex items-start gap-2.5 animate-shake"
          >
            <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Form Đăng nhập */}
        <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email-input"
              className="block text-xs font-semibold text-[#1F2A37] mb-1.5"
            >
              Email nhân sự
            </label>
            <div className="relative">
              <input
                id="email-input"
                type="email"
                required
                disabled={isLoading || isGoogleLoading}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="name@example.com"
                className={`w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border transition-all outline-none ${
                  errorMessage
                    ? 'border-[#D92D20] bg-[#FFF5F5] focus:ring-2 focus:ring-[#D92D20]/20'
                    : 'border-[#DDE5D9] bg-white hover:border-[#006B2C]/50 focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15'
                } text-[#1F2A37]`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-lg text-[#5B6776] pointer-events-none">
                mail
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password-input"
                className="text-xs font-semibold text-[#1F2A37]"
              >
                Mật khẩu
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-[#006B2C] hover:text-[#005523] hover:underline font-semibold"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLoading || isGoogleLoading}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="••••••••"
                className={`w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border transition-all outline-none ${
                  errorMessage
                    ? 'border-[#D92D20] bg-[#FFF5F5] focus:ring-2 focus:ring-[#D92D20]/20'
                    : 'border-[#DDE5D9] bg-white hover:border-[#006B2C]/50 focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15'
                } text-[#1F2A37]`}
              />
              <button
                type="button"
                tabIndex={-1}
                disabled={isLoading || isGoogleLoading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6776] hover:text-[#1F2A37] transition-colors p-0.5 rounded"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Nút Đăng nhập chính */}
          <div className="pt-2">
            <button
              id="submit-login-button"
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className={`w-full py-3 px-4 rounded-xl text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
                isLoading
                  ? 'bg-[#006B2C]/80 cursor-wait'
                  : 'bg-[#006B2C] hover:bg-[#005523] active:scale-[0.99] hover:shadow'
              }`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Đang xác thực với máy chủ...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">login</span>
                  <span>Đăng nhập hệ thống</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Đường phân cách */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#DDE5D9]"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-[#5B6776] font-medium">hoặc</span>
          </div>
        </div>

        {/* Đăng nhập bằng Google Workspace */}
        <button
          type="button"
          id="google-login-button"
          onClick={handleGoogleLogin}
          disabled={isLoading || isGoogleLoading}
          className="w-full py-2.5 px-4 rounded-xl border border-[#DDE5D9] bg-white hover:bg-[#F6F9F4] text-xs font-bold text-[#1F2A37] transition-all flex items-center justify-center gap-3 shadow-xs hover:border-[#006B2C]/40"
        >
          {isGoogleLoading ? (
            <span className="inline-block w-4 h-4 border-2 border-[#006B2C] border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          )}
          <span>Đăng nhập với Google Workspace</span>
        </button>

        {/* Lưu ý phân quyền theo Mục 2 tài liệu */}
        <div className="p-3 bg-[#F6F9F4] rounded-xl border border-[#DDE5D9] text-[11px] text-[#5B6776] mt-6 leading-relaxed flex items-start gap-2">
          <span className="material-symbols-outlined text-sm text-[#00685F] shrink-0 mt-0.5">info</span>
          <div>
            <strong>Lưu ý nghiệp vụ (Mục 2):</strong> Tác nhân <strong>Member</strong> (mua bán, ký gửi, thử đồ AI) và <strong>Tổ chức</strong> (chiến dịch từ thiện) thực thi trên <strong>Ứng dụng Di động (Mobile App)</strong>.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-[#5B6776] flex items-center justify-center gap-2">
        <span>Cổng Điều Hành & Vận Hành Tập Trung ReHome</span>
        <span>•</span>
        <span>Quản trị viên & Nhân viên Kho</span>
      </div>
    </div>
  );
}
