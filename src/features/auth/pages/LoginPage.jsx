import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../../layouts/AuthLayout.jsx';
import { Input, Button } from '../../../components/common/index.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { validateEmail, validatePassword } from '../../../utils/validators.js';
import { formatApiError } from '../../../utils/api.js';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const emailErr = validateEmail(formData.email);
    const passErr = validatePassword(formData.password);

    if (emailErr || passErr) {
      setErrors({ email: emailErr, password: passErr });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await login(formData);
      const role = res?.user?.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'staff') navigate('/moderator');
      else if (role === 'shop') navigate('/shop');
      else if (role === 'organization') navigate('/organizer');
      else navigate('/');
    } catch (err) {
      setServerError(formatApiError(err, 'đăng nhập'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Đăng nhập tài khoản"
      subtitle="Quản lý ký gửi, kiểm duyệt và điều hành ReHome"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="p-3 text-sm text-error bg-error-container/20 border border-error/30 rounded-lg">
            {serverError}
          </div>
        )}

        <Input
          label="Email hoặc Tên đăng nhập"
          required
          type="text"
          value={formData.email}
          error={errors.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />

        <Input
          label="Mật khẩu"
          required
          type="password"
          value={formData.password}
          error={errors.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />

        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-primary hover:underline">
            Quên mật khẩu?
          </Link>
        </div>

        <Button type="submit" loading={loading} className="w-full">
          Đăng nhập
        </Button>

        <div className="text-center text-xs text-outline pt-2">
          Chưa có tài khoản?{' '}
          <Link to="/register-shop" className="text-primary font-medium hover:underline">
            Đăng ký Cửa hàng
          </Link>{' '}
          hoặc{' '}
          <Link to="/register-org" className="text-primary font-medium hover:underline">
            Tổ chức từ thiện
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
