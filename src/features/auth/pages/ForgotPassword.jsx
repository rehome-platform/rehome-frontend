import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../../../components/common/Logo.jsx';
import { authService } from '../services/auth.service.js';
import { validateEmail, validatePassword, validateConfirmPassword } from '../../../utils/validators.js';

/**
 * Trang Quên Mật Khẩu & Đặt Lại Mật Khẩu (F-007, Luồng L-01)
 * Dùng chung cho Quản trị viên (Admin) và Nhân viên Kho (Moderator)
 * Luồng 3 bước hoàn chỉnh:
 * 1. Nhập email nhân sự -> Nhận mã xác thực OTP 6 số
 * 2. Nhập mã OTP + Mật khẩu mới + Xác nhận mật khẩu
 * 3. Hoàn tất & Chuyển hướng đăng nhập
 */
export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password, 3: Success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [demoOtpHint, setDemoOtpHint] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const navigate = useNavigate();

  // Đếm ngược gửi lại OTP
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Bước 1: Gửi yêu cầu qua Email
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    setLoading(true);
    try {
      const res = await authService.forgotPassword(email);
      setStep(2);
      setCountdown(60);
      if (res?.demoOtp) {
        setDemoOtpHint(res.demoOtp);
      }
    } catch (err) {
      setError(err.message || 'Không thể gửi mã xác thực. Vui lòng kiểm tra lại email.');
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await authService.forgotPassword(email);
      setCountdown(60);
      if (res?.demoOtp) {
        setDemoOtpHint(res.demoOtp);
      }
    } catch (err) {
      setError(err.message || 'Gửi lại mã thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Xác nhận OTP và đặt mật khẩu mới
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.trim().length < 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số mã OTP xác thực.');
      return;
    }

    const passErr = validatePassword(newPassword);
    if (passErr) {
      setError(passErr);
      return;
    }

    const confirmErr = validateConfirmPassword(confirmPassword, newPassword);
    if (confirmErr) {
      setError(confirmErr);
      return;
    }

    setLoading(true);
    try {
      await authService.verifyResetOtp(email, otp.trim());
      await authService.resetPassword(email, otp.trim(), newPassword);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9F4] flex flex-col justify-between items-center px-4 py-8 sm:py-12 select-none">
      {/* Main Card */}
      <div className="w-full max-w-[460px] bg-white rounded-2xl border border-[#DDE5D9] shadow-card p-8 sm:p-10 my-auto transition-all duration-300">
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" showText={true} to={null} subtitle="Khôi Phục Mật Khẩu" />
          <p className="text-xs text-[#5B6776] mt-3 max-w-xs leading-relaxed">
            {step === 1 && 'Nhập email tài khoản nhân sự ReHome để nhận mã xác thực đặt lại mật khẩu.'}
            {step === 2 && `Mã xác thực OTP đã được gửi đến hộp thư ${email}.`}
            {step === 3 && 'Mật khẩu của bạn đã được cập nhật an toàn!'}
          </p>
        </div>

        {/* Thanh tiến trình 3 bước */}
        <div className="flex items-center justify-between my-6 px-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= 1 ? 'bg-[#006B2C] text-white' : 'bg-[#DDE5D9] text-[#5B6776]'
              }`}
            >
              1
            </span>
            <span className="text-[11px] font-semibold text-[#1F2A37]">Email</span>
          </div>
          <div className={`flex-1 h-0.5 mx-2 ${step >= 2 ? 'bg-[#006B2C]' : 'bg-[#DDE5D9]'}`} />
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= 2 ? 'bg-[#006B2C] text-white' : 'bg-[#DDE5D9] text-[#5B6776]'
              }`}
            >
              2
            </span>
            <span className="text-[11px] font-semibold text-[#1F2A37]">Xác thực</span>
          </div>
          <div className={`flex-1 h-0.5 mx-2 ${step === 3 ? 'bg-[#006B2C]' : 'bg-[#DDE5D9]'}`} />
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 3 ? 'bg-[#006B2C] text-white' : 'bg-[#DDE5D9] text-[#5B6776]'
              }`}
            >
              3
            </span>
            <span className="text-[11px] font-semibold text-[#1F2A37]">Hoàn tất</span>
          </div>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div
            id="forgot-error-alert"
            className="mb-5 p-3.5 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/30 text-[#D92D20] text-xs font-medium flex items-start gap-2.5 animate-shake"
          >
            <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {/* BƯỚC 1: NHẬP EMAIL */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
                Email nhân sự đã đăng ký <span className="text-[#D92D20]">*</span>
              </label>
              <div className="relative">
                <input
                  id="reset-email"
                  type="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="admin@rehome.vn hoặc ha.pham@rehome.vn"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-[#DDE5D9] bg-white hover:border-[#006B2C]/50 focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15 outline-none text-[#1F2A37] transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-lg text-[#5B6776]">
                  mail
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                id="btn-send-otp"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#006B2C] hover:bg-[#005523] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Gửi mã xác thực OTP</span>
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* BƯỚC 2: NHẬP MÃ OTP & MẬT KHẨU MỚI */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Gợi ý OTP demo cho người dùng test */}
            {demoOtpHint && (
              <div className="p-3 bg-[#E8F5E9] border border-[#006B2C]/20 rounded-xl text-xs text-[#006B2C] flex items-center justify-between">
                <span>
                  🔑 Mã OTP Demo: <strong>{demoOtpHint}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setOtp(demoOtpHint)}
                  className="text-[11px] underline font-bold"
                >
                  Tự động điền
                </button>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="otp-input" className="text-xs font-semibold text-[#1F2A37]">
                  Mã OTP (6 chữ số) <span className="text-[#D92D20]">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || loading}
                  className="text-[11px] font-semibold text-[#006B2C] hover:underline disabled:opacity-50"
                >
                  {countdown > 0 ? `Gửi lại sau (${countdown}s)` : 'Gửi lại mã'}
                </button>
              </div>
              <input
                id="otp-input"
                type="text"
                maxLength={6}
                required
                disabled={loading}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ''));
                  if (error) setError('');
                }}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 text-center text-lg font-mono font-bold tracking-[0.3em] rounded-xl border border-[#DDE5D9] bg-white focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15 outline-none text-[#1F2A37]"
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
                Mật khẩu mới <span className="text-[#D92D20]">*</span>
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={loading}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-[#DDE5D9] bg-white focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15 outline-none text-[#1F2A37]"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6776] hover:text-[#1F2A37]"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
                Xác nhận mật khẩu mới <span className="text-[#D92D20]">*</span>
              </label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#DDE5D9] bg-white focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15 outline-none text-[#1F2A37]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                id="btn-submit-reset"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#006B2C] hover:bg-[#005523] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    <span>Xác nhận đặt lại mật khẩu</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* BƯỚC 3: THÀNH CÔNG */}
        {step === 3 && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-[#E8F5E9] text-[#006B2C] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <span className="material-symbols-outlined text-3xl font-bold">verified</span>
            </div>
            <h3 className="text-base font-bold text-[#1F2A37]">Cập nhật mật khẩu thành công!</h3>
            <p className="text-xs text-[#5B6776] leading-relaxed">
              Mật khẩu mới của bạn đã được ghi nhận trên toàn hệ thống ReHome. Hãy đăng nhập lại để tiếp tục làm việc.
            </p>
            <div className="pt-2">
              <button
                type="button"
                id="btn-goto-login"
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#006B2C] hover:bg-[#005523] transition-all shadow-sm"
              >
                Đăng nhập ngay
              </button>
            </div>
          </div>
        )}

        {/* Quay lại đăng nhập */}
        <div className="text-center text-xs text-[#5B6776] mt-6 pt-4 border-t border-[#DDE5D9]">
          <Link to="/login" className="text-[#006B2C] hover:underline font-bold flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Quay lại trang Đăng nhập</span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-[#5B6776]">
        ReHome Operations Web • Bảo mật & An toàn thông tin
      </div>
    </div>
  );
}
