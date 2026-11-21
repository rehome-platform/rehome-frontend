import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import rehomeLogo from '../../../assets/logo/rehome-logo.png';
import { validateEmail, validatePassword } from '../../../utils/validators.js';
import Button from '../../../components/common/Button.jsx';

/**
 * Trang Đăng nhập Hệ thống Quản trị & Vận hành ReHome (Web)
 * Phase 1 — Auth & Hồ sơ (F-004, F-005)
 * Kết nối hoàn toàn với Backend API thật tại https://rehome-a4gae8cqhvf7cmd8.eastasia-01.azurewebsites.net
 * Không có tài khoản demo, không hardcode credentials, điều hướng chuẩn theo role.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const authRequestPending = useRef(false);

  const { login, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fromLocation = location.state?.from?.pathname;

  // Hiển thị thông báo rõ ràng nếu người dùng vừa bị đăng xuất do hết phiên (401)
  useEffect(() => {
    try {
      if (sessionStorage.getItem('rehome_session_expired') === '1') {
        sessionStorage.removeItem('rehome_session_expired');
        setErrorMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
    } catch {
      // ignore storage errors
    }
  }, []);

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
    if (authRequestPending.current) return;
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

    authRequestPending.current = true;
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
      authRequestPending.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9F4] flex flex-col justify-between items-center px-4 py-8 sm:py-12 select-none">
      {/* Main Login Card */}
      <main className="w-full max-w-[440px] bg-white rounded-2xl border border-[#DDE5D9] shadow-card p-8 sm:p-10 my-auto transition-all duration-300">
        <h1 className="sr-only">Đăng nhập hệ thống ReHome</h1>
        {/* Header Logo theo chuẩn Design tokens */}
        <div className="flex flex-col items-center text-center">
          <picture className="block w-full max-w-[280px]">
            <source srcSet="/rehome-logo.webp" type="image/webp" />
            <img
              src={rehomeLogo}
              alt="ReHome"
              width={280}
              height={61}
              fetchpriority="high"
              decoding="async"
              className="w-full max-w-[280px] h-auto object-contain"
            />
          </picture>
          <p className="mt-2 text-xs font-semibold text-[#5B6776] uppercase">Cổng Vận Hành Nội Bộ</p>
          <p className="text-xs text-[#5B6776] mt-3 max-w-xs leading-relaxed">
            Hệ thống đăng nhập dành cho Quản trị viên (Admin) và Nhân viên kiểm định kho (Moderator).
          </p>
        </div>

        {/* Thông báo lỗi (Unhappy paths) */}
        {errorMessage && (
          <div
            id="login-error-alert"
            role="alert"
            className="mt-6 p-3.5 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/30 text-[#D92D20] text-xs font-medium flex items-start gap-2.5 animate-shake"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4 shrink-0 mt-0.5"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
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
                disabled={isLoading}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="name@example.com"
                className={`w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border transition-all outline-none ${errorMessage
                    ? 'border-[#D92D20] bg-[#FFF5F5] focus:ring-2 focus:ring-[#D92D20]/20'
                    : 'border-[#DDE5D9] bg-white hover:border-[#006B2C]/50 focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15'
                  } text-[#1F2A37]`}
              />
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-[18px] h-[18px] absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6776] pointer-events-none"
              >
                <path d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20zm8-7 8-5V6l-8 5-8-5v2z" />
              </svg>
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
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLoading}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="••••••••"
                className={`w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border transition-all outline-none ${errorMessage
                    ? 'border-[#D92D20] bg-[#FFF5F5] focus:ring-2 focus:ring-[#D92D20]/20'
                    : 'border-[#DDE5D9] bg-white hover:border-[#006B2C]/50 focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15'
                  } text-[#1F2A37]`}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-controls="password-input"
                aria-pressed={showPassword}
                disabled={isLoading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6776] hover:text-[#1F2A37] transition-colors p-0.5 rounded"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? (
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
                    <path d="M11.83 9 15 12.16V12a3 3 0 0 0-3-3h-.17m-4.3.8 1.55 1.55c-.05.21-.08.43-.08.65a3 3 0 0 0 3 3c.22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53a5 5 0 0 1-5-5c0-.79.2-1.53.53-2.2M2 4.27l2.28 2.28.45.45C3.08 8.3 1.78 10 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.43.42L19.73 22 21 20.73 3.27 3M12 7a5 5 0 0 1 5 5c0 .64-.13 1.26-.36 1.82l2.93 2.93c1.5-1.25 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-4 .7l2.17 2.15C10.74 7.13 11.35 7 12 7Z" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
                    <path d="M12 9a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3m0 8a5 5 0 0 1-5-5 5 5 0 0 1 5-5 5 5 0 0 1 5 5 5 5 0 0 1-5 5m0-12.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Nút Đăng nhập chính */}
          <div className="pt-2">
            <Button
              id="submit-login-button"
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              disabled={isLoading}
              className="w-full gap-2"
            >
              {isLoading ? (
                <span>Đang xác thực với máy chủ...</span>
              ) : (
                <>
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
                    <path d="M12 21v-2h7V5h-7V3h7q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm-2-4-1.375-1.45 2.55-2.55H3v-2h8.175l-2.55-2.55L10 7l5 5z" />
                  </svg>
                  <span>Đăng nhập hệ thống</span>
                </>
              )}
            </Button>
          </div>
        </form>

      </main>

      {/* Footer */}
      <footer className="mt-6 text-center text-xs text-[#5B6776] flex items-center justify-center gap-2">
        <span>Cổng Điều Hành & Vận Hành Tập Trung ReHome</span>
        <span>•</span>
        <span>Quản trị viên & Nhân viên Điểm kí gửi</span>
      </footer>
    </div>
  );
}
