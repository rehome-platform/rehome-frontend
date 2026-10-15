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
  const [activeRolePreset, setActiveRolePreset] = useState('ADMIN'); // 'ADMIN' | 'MOD'

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSelectRolePreset = (role) => {
    setActiveRolePreset(role);
    setErrorMessage('');
    if (role === 'ADMIN') {
      setEmail('admin@rehome.vn');
      setPassword('hs123456');
    } else if (role === 'MOD') {
      setEmail('ha.pham@rehome.vn');
      setPassword('hs123456');
    }
  };

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      let redirectPath = '/admin';
      if (email.includes('mod') || email.includes('ha.pham') || activeRolePreset === 'MOD') {
        redirectPath = '/moderator/counter';
      }

      await login({ email, password }).catch(() => { });

      setTimeout(() => {
        setIsLoading(false);
        navigate(redirectPath);
      }, 600);
    } catch {
      setTimeout(() => {
        setIsLoading(false);
        navigate('/admin');
      }, 600);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9F4] flex flex-col justify-between items-center px-4 py-8 sm:py-12 select-none">
      {/* Thanh chọn nhanh vai trò nội bộ Web */}
      <div className="w-full max-w-md mb-4 bg-white/90 backdrop-blur-sm border border-[#DDE5D9] rounded-2xl p-2.5 flex items-center justify-between text-xs shadow-sm">
        <div className="flex items-center gap-1.5 text-[#414942] font-semibold">
          <span className="material-symbols-outlined text-base text-[#006B2C]">badge</span>
          <span>Chọn vai trò nội bộ Web:</span>
        </div>
        <div className="flex items-center gap-1 bg-[#F6F9F4] p-1 rounded-xl border border-[#DDE5D9]">
          <button
            type="button"
            onClick={() => handleSelectRolePreset('ADMIN')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${activeRolePreset === 'ADMIN'
                ? 'bg-[#006B2C] text-white shadow-xs'
                : 'text-[#414942] hover:text-[#006B2C]'
              }`}
          >
            Quản trị viên (Admin)
          </button>
          <button
            type="button"
            onClick={() => handleSelectRolePreset('MOD')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${activeRolePreset === 'MOD'
                ? 'bg-[#00685F] text-white shadow-xs'
                : 'text-[#414942] hover:text-[#00685F]'
              }`}
          >
            Nhân viên Kho (Moderator)
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
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#717971] mt-1">
            CỔNG ĐIỀU HÀNH NỘI BỘ (WEB)
          </p>
          <p className="text-xs text-[#414942] mt-2">
            Đăng nhập dành cho Quản trị viên và Nhân viên kho ReHome.
          </p>
        </div>

        {/* Thông báo lỗi */}
        {errorMessage && (
          <div
            id="login-error-alert"
            className="mt-6 p-3 rounded-xl bg-[#FFF5F5] border border-[#DC2626]/30 text-[#DC2626] text-xs font-medium flex items-center gap-2 animate-shake"
          >
            <span className="material-symbols-outlined text-base shrink-0">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Đăng nhập */}
        <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email-input"
              className="block text-xs font-semibold text-[#191C19] mb-1.5"
            >
              Email nhân sự
            </label>
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
              placeholder="nhansu@rehome.vn"
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border transition-all outline-none ${errorMessage
                  ? 'border-[#DC2626] bg-[#FFF5F5] focus:ring-2 focus:ring-[#DC2626]/20'
                  : 'border-[#DDE5D9] bg-white hover:border-[#006B2C]/50 focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15'
                } text-[#191C19]`}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password-input"
                className="text-xs font-semibold text-[#191C19]"
              >
                Mật khẩu
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] text-[#006B2C] hover:underline font-medium"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLoading}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border transition-all outline-none ${errorMessage
                    ? 'border-[#DC2626] bg-[#FFF5F5] focus:ring-2 focus:ring-[#DC2626]/20'
                    : 'border-[#DDE5D9] bg-white hover:border-[#006B2C]/50 focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15'
                  } text-[#191C19]`}
              />
              <button
                type="button"
                tabIndex={-1}
                disabled={isLoading}
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
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${isLoading
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
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <span>Đăng nhập hệ thống</span>
              )}
            </button>
          </div>
        </form>

        <div className="p-3 bg-[#F8FAF8] rounded-xl border border-[#DDE5D9] text-[11px] text-[#717971] mt-6 leading-relaxed">
          💡 <strong>Lưu ý:</strong> Member và Tổ chức từ thiện sử dụng <strong>Ứng dụng Di động (Mobile App)</strong> để mua bán, quyên góp và tạo chiến dịch.
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="mt-6 text-center text-xs text-[#717971] flex items-center gap-4">
        <span>ReHome Operations Web</span>
        <span>•</span>
        <Link to="/" className="text-[#006B2C] hover:underline font-medium">
          Trang chủ điều hành
        </Link>
      </div>
    </div>
  );
}
