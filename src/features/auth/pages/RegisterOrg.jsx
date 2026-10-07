import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../../layouts/AuthLayout.jsx';
import { Input, Button } from '../../../components/common/index.js';
import { authService } from '../services/auth.service.js';
import { validateEmail, validatePassword, validatePhone, validateFullName } from '../../../utils/validators.js';
import { formatApiError } from '../../../utils/api.js';

export default function RegisterOrg() {
  const [formData, setFormData] = useState({
    orgName: '',
    email: '',
    phone: '',
    representativeName: '',
    licenseUrl: '',
    address: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const newErrors = {
      orgName: validateFullName(formData.orgName),
      email: validateEmail(formData.email),
      phone: validatePhone(formData.phone),
      password: validatePassword(formData.password),
    };

    if (Object.values(newErrors).some(Boolean)) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await authService.registerOrg(formData);
      navigate('/login?pending_approval=true');
    } catch (err) {
      setServerError(formatApiError(err, 'đăng ký tổ chức'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Đăng ký Tổ chức Từ thiện"
      subtitle="Tạo chiến dịch tiếp nhận quần áo và phân phối cộng đồng qua ReHome"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {serverError && (
          <div className="p-3 text-sm text-error bg-error-container/20 border border-error/30 rounded-lg">
            {serverError}
          </div>
        )}

        <Input
          label="Tên tổ chức / Quỹ từ thiện"
          required
          value={formData.orgName}
          error={errors.orgName}
          onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
        />

        <Input
          label="Người đại diện pháp luật"
          required
          value={formData.representativeName}
          onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
        />

        <Input
          label="Email tổ chức"
          required
          type="email"
          value={formData.email}
          error={errors.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />

        <Input
          label="Số điện thoại"
          required
          value={formData.phone}
          error={errors.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />

        <Input
          label="Trụ sở tiếp nhận"
          required
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />

        <Input
          label="Mật khẩu"
          required
          type="password"
          value={formData.password}
          error={errors.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />

        <Button type="submit" loading={loading} className="w-full mt-4">
          Nộp hồ sơ xét duyệt
        </Button>

        <div className="text-center text-xs text-outline pt-2">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Đăng nhập
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
