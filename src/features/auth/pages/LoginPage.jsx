import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';

/**
 * Trang Đăng nhập Quản trị hệ thống ReHome
 * Thiết kế chính xác theo Google Stitch (Figma) Prototype
 * Phông chữ: Be Vietnam Pro | Màu chủ đạo: #006B2C | Nền: #F6F9F4
 */
export default function LoginPage() {
  const [email, setEmail] = useState('admin@rehome.vn');
  const [password, setPassword] = useState('hs123456');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('default'); // 'default' | 'error' | 'loading'

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    // Mô phỏng kiểm tra nếu thử nghiệm lỗi
    if (email === 'error@rehome.vn' || (email !== 'admin@rehome.vn' && email !== 'ha.pham@rehome.vn' && password !== 'hs123456')) {
      setErrorMessage('Email hoặc mật khẩu không đúng');
      return;
    }

    setIsLoading(true);

    try {
      // Gọi qua auth context
      await login({ email, password });
      setTimeout(() => {
        setIsLoading(false);
        navigate('/admin');
      }, 700);
    } catch {
      // Fallback cho UI/UX mode
      setTimeout(() => {
        setIsLoading(false);
        navigate('/admin');
      }, 700);
    }
  };

  const handlePresetError = () => {
    setActiveTab('error');
    setEmail('admin@rehome.vn');
    setPassword('wrongpassword');
    setErrorMessage('Email hoặc mật khẩu không đúng');
    setIsLoading(false);
  };

  const handlePresetDefault = () => {
    setActiveTab('default');
    setEmail('admin@rehome.vn');
    setPassword('hs123456');
    setErrorMessage('');
    setIsLoading(false);
  };

  const handlePresetLoading = () => {
    setActiveTab('loading');
    setEmail('admin@rehome.vn');
    setPassword('hs123456');
    setErrorMessage('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/admin');
    }, 1500);
  };

  const isFormDisabled = isLoading;

  return (
    <div className="min-h-screen bg-[#F6F9F4] flex flex-col justify-between items-center px-4 py-8 sm:py-12 select-none">
      {/* Thanh công cụ tương tác duyệt các trạng thái thiết kế Stitch */}
      <div className="w-full max-w-md mb-4 bg-white/80 backdrop-blur-sm border border-[#DDE5D9] rounded-2xl p-2.5 flex items-center justify-between text-xs shadow-sm">
        <div className="flex items-center gap-1.5 text-[#414942] font-medium">
          <span className="material-symbols-outlined text-base text-[#006B2C]">palette</span>
          <span>Xem trạng thái Stitch:</span>
        </div>
        <div className="flex items-center gap-1 bg-[#F6F9F4] p-1 rounded-xl border border-[#DDE5D9]">
          <button
            type="button"
            onClick={handlePresetDefault}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              activeTab === 'default' && !errorMessage && !isLoading
                ? 'bg-[#006B2C] text-white shadow-xs'
                : 'text-[#414942] hover:text-[#006B2C]'
            }`}
          >
            Mặc định
          </button>
          <button
            type="button"
            onClick={handlePresetError}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              errorMessage
                ? 'bg-[#DC2626] text-white shadow-xs'
                : 'text-[#414942] hover:text-[#DC2626]'
            }`}
          >
            Báo lỗi
          </button>
          <button
            type="button"
            onClick={handlePresetLoading}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-[#00685F] text-white shadow-xs'
                : 'text-[#414942] hover:text-[#00685F]'
            }`}
          >
            Đang tải
          </button>
        </div>
      </div>

      {/* Main Login Card - Pixel Perfect theo Stitch */}
      <div className="w-full max-w-[440px] bg-white rounded-2xl border border-[#DDE5D9] shadow-[0_8px_30px_rgba(0,107,44,0.04)] p-8 sm:p-10 my-auto transition-all duration-300">
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F5E9] flex items-center justify-center text-[#006B2C] mb-3 shadow-inner">
            <span className="material-symbols-outlined text-3xl font-light">eco</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-extrabold tracking-tight text-[#006B2C] font-heading">
              ReHome
            </span>
          </div>
          <p className="text-[11px] font-semibold text-[#5A635B] tracking-[0.16em] uppercase mt-1">
            QUẢN TRỊ HỆ THỐNG
          </p>

          <h1 className="text-2xl font-bold text-[#191C19] mt-6 font-heading">
            Đăng nhập
          </h1>
        </div>

        {/* Thông báo lỗi khi thông tin sai */}
        {errorMessage && (
          <div
            id="login-error-alert"
            className="mt-5 p-3.5 bg-[#FEE2E2] border border-[#FCA5A5] text-[#B91C1C] rounded-xl flex items-center gap-2.5 text-xs font-medium animate-fadeIn"
          >
            <span className="material-symbols-outlined text-base shrink-0 text-[#DC2626]">
              error
            </span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Đăng nhập */}
        <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
          {/* Email Field */}
          <div>
            <label
              htmlFor="email-input"
              className="block text-xs font-semibold text-[#191C19] mb-1.5"
            >
              Email
            </label>
            <div className="relative">
              <input
                id="email-input"
                type="email"
                required
                disabled={isFormDisabled}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="admin@rehome.vn"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border transition-all outline-none ${
                  errorMessage
                    ? 'border-[#DC2626] bg-[#FFF5F5] focus:ring-2 focus:ring-[#DC2626]/20'
                    : 'border-[#DDE5D9] bg-white hover:border-[#006B2C]/50 focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15'
                } ${
                  isFormDisabled ? 'bg-[#F0F4EC] text-[#717971] cursor-not-allowed border-[#DDE5D9]' : 'text-[#191C19]'
                }`}
              />
            </div>
          </div>

          {/* Mật khẩu Field */}
          <div>
            <label
              htmlFor="password-input"
              className="block text-xs font-semibold text-[#191C19] mb-1.5"
            >
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isFormDisabled}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border transition-all outline-none ${
                  errorMessage
                    ? 'border-[#DC2626] bg-[#FFF5F5] focus:ring-2 focus:ring-[#DC2626]/20'
                    : 'border-[#DDE5D9] bg-white hover:border-[#006B2C]/50 focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15'
                } ${
                  isFormDisabled ? 'bg-[#F0F4EC] text-[#717971] cursor-not-allowed border-[#DDE5D9]' : 'text-[#191C19]'
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                disabled={isFormDisabled}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717971] hover:text-[#191C19] transition-colors p-0.5 rounded"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Nút Đăng nhập */}
          <div className="pt-2">
            <button
              id="submit-login-button"
              type="submit"
              disabled={isFormDisabled}
              className={`w-full py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
                isFormDisabled
                  ? 'bg-[#006B2C]/80 cursor-wait'
                  : 'bg-[#006B2C] hover:bg-[#005523] active:scale-[0.99] hover:shadow-md'
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
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </div>
        </form>

        {/* Chú thích bản quyền / hệ thống theo Stitch */}
        <p className="text-center text-xs text-[#717971] mt-6">
          Chỉ dành cho quản trị viên ReHome.
        </p>
      </div>

      {/* Footer Navigation */}
      <div className="mt-6 text-center text-xs text-[#717971] flex items-center gap-4">
        <span>Phiên bản v2.4.0</span>
        <span>•</span>
        <Link to="/" className="text-[#006B2C] hover:underline font-medium">
          Cổng thông tin ReHome
        </Link>
        <span>•</span>
        <button
          onClick={() => navigate('/admin')}
          className="text-[#006B2C] hover:underline font-medium"
        >
          Trang quản trị (Admin) →
        </button>
      </div>
    </div>
  );
}
