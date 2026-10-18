import React, { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Logo from '../../../components/common/Logo.jsx';
import { authService } from '../services/auth.service.js';
import { validateEmail, validatePassword, validateConfirmPassword } from '../../../utils/validators.js';

// Both pages use the existing email-link contract, never OTP verification.
export default function PasswordRecovery({ reset = false }) {
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const linkEmail = params.get('email') || '';
  const resetToken = params.get('token') || '';
  const validLink = !validateEmail(linkEmail) && !!resetToken.trim();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const pending = useRef(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending.current || success || (reset && !validLink)) return;
    const validationError = reset
      ? validatePassword(newPassword)
        || (newPassword.length > 72 ? 'Mật khẩu mới phải có từ 6 đến 72 ký tự.' : null)
        || validateConfirmPassword(confirmPassword, newPassword)
      : validateEmail(email);
    setError(validationError || '');
    if (validationError) return;
    pending.current = true;
    setLoading(true);
    try {
      if (reset) {
        await authService.resetPassword({ email: linkEmail, resetToken, newPassword, confirmPassword });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        await authService.forgotPassword(email.trim());
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message || (reset
        ? 'Không thể đặt lại mật khẩu. Liên kết có thể không hợp lệ, đã hết hạn hoặc đã được sử dụng.'
        : 'Không thể gửi yêu cầu. Vui lòng thử lại.'));
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  const title = reset ? 'Đặt lại mật khẩu' : 'Quên mật khẩu';
  const inputClass = 'w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#DDE5D9] focus:border-[#006B2C] focus:ring-[#006B2C]';
  return (
    <main className="min-h-screen bg-[#F6F9F4] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[460px] bg-white rounded-2xl border border-[#DDE5D9] shadow-card p-8 sm:p-10">
        <Logo size="lg" to={null} subtitle="Khôi Phục Mật Khẩu" />
        <h1 className="mt-6 text-lg font-bold text-[#1F2A37]">{title}</h1>
        {success ? (
          <p role="status" className="mt-4 text-sm text-[#006B2C] leading-relaxed">
            {reset ? 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.'
              : 'Nếu email này được đăng ký và đủ điều kiện, bạn sẽ nhận được liên kết đặt lại mật khẩu. Vui lòng kiểm tra email và nhấn vào liên kết được gửi để đặt lại mật khẩu.'}
          </p>
        ) : reset && !validLink ? (
          <p role="alert" className="mt-4 text-sm text-[#D92D20]">Liên kết đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu liên kết mới.</p>
        ) : (
          <form onSubmit={handleSubmit} aria-busy={loading} className="mt-4 space-y-4">
            {error && <p id="recovery-error" role="alert" className="text-sm text-[#D92D20]">{error}</p>}
            {reset ? (
              <>
                <p id="password-policy" className="text-sm text-[#5B6776]">Mật khẩu mới phải có từ 6 đến 72 ký tự.</p>
                <label htmlFor="new-password" className="block text-sm font-semibold">Mật khẩu mới</label>
                <input id="new-password" type="password" autoComplete="new-password" required minLength={6} maxLength={72}
                  disabled={loading} value={newPassword} onChange={(event) => setNewPassword(event.target.value)}
                  aria-describedby="password-policy" className={inputClass} />
                <label htmlFor="confirm-password" className="block text-sm font-semibold">Xác nhận mật khẩu mới</label>
                <input id="confirm-password" type="password" autoComplete="new-password" required minLength={6} maxLength={72}
                  disabled={loading} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} />
              </>
            ) : (
              <>
                <p className="text-sm text-[#5B6776]">Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.</p>
                <label htmlFor="recovery-email" className="block text-sm font-semibold">Email</label>
                <input id="recovery-email" type="email" autoComplete="email" required disabled={loading}
                  value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }} className={inputClass} />
              </>
            )}
            <button type="submit" disabled={loading} className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#006B2C] hover:bg-[#005523] disabled:opacity-50">
              {loading ? 'Đang xử lý...' : reset ? 'Đặt lại mật khẩu' : 'Gửi liên kết đặt lại mật khẩu'}
            </button>
          </form>
        )}
        {reset && !success && <Link to="/forgot-password" className="block mt-6 text-sm font-semibold text-[#006B2C] hover:underline">Yêu cầu liên kết mới</Link>}
        <Link to="/login" className="inline-block mt-6 text-sm font-semibold text-[#006B2C] hover:underline">Quay lại đăng nhập</Link>
      </div>
    </main>
  );
}
