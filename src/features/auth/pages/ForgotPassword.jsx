import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../../layouts/AuthLayout.jsx';
import { Input, Button } from '../../../components/common/index.js';
import { authService } from '../services/auth.service.js';
import { validateEmail } from '../../../utils/validators.js';
import { formatApiError } from '../../../utils/api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setLoading(true);

    try {
      await authService.forgotPassword(email);
      setSuccess(true);
    } catch (apiErr) {
      setError(formatApiError(apiErr, 'yêu cầu khôi phục mật khẩu'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Khôi phục mật khẩu"
      subtitle="Nhập email tài khoản để nhận đường dẫn đặt lại mật khẩu"
    >
      {success ? (
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto text-2xl">
            ✓
          </div>
          <p className="text-sm text-on-surface">
            Hướng dẫn đặt lại mật khẩu đã được gửi đến <strong>{email}</strong>. Vui lòng kiểm tra hộp thư của bạn.
          </p>
          <Link to="/login" className="inline-block text-sm text-primary font-medium hover:underline pt-2">
            Quay lại Đăng nhập
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-error bg-error-container/20 border border-error/30 rounded-lg">
              {error}
            </div>
          )}

          <Input
            label="Email tài khoản"
            required
            type="email"
            value={email}
            error={error}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Button type="submit" loading={loading} className="w-full">
            Gửi yêu cầu
          </Button>

          <div className="text-center text-xs text-outline pt-2">
            <Link to="/login" className="text-primary font-medium hover:underline">
              ← Quay lại Đăng nhập
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
