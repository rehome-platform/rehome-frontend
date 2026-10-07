import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../../layouts/AuthLayout.jsx';
import { Input, Button } from '../../../components/common/index.js';
import { authService } from '../services/auth.service.js';
import { validateEmail, validatePassword, validatePhone, validateFullName } from '../../../utils/validators.js';
import { formatApiError } from '../../../utils/api.js';

export default function RegisterShop() {
  const [formData, setFormData] = useState({
    shopName: '',
    email: '',
    phone: '',
    taxId: '',
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
      shopName: validateFullName(formData.shopName),
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
      await authService.registerShop(formData);
      navigate('/login?registered=shop');
    } catch (err) {
      setServerError(formatApiError(err, 'đăng ký cửa hàng'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Đăng ký Cửa hàng Ký gửi"
      subtitle="Tham gia mạng lưới tiếp nhận và phân phối thời trang tuần hoàn ReHome"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {serverError && (
          <div className="p-3 text-sm text-error bg-error-container/20 border border-error/30 rounded-lg">
            {serverError}
          </div>
        )}

        <Input
          label="Tên cửa hàng"
          required
          value={formData.shopName}
          error={errors.shopName}
          onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
        />

        <Input
          label="Mã số thuế / Giấy phép ĐKKD"
          value={formData.taxId}
          placeholder="Mã số thuế (nếu có)"
          onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
        />

        <Input
          label="Email liên hệ"
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
          label="Địa chỉ quầy / kho tiếp nhận"
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
          Gửi hồ sơ đăng ký
        </Button>

        <div className="text-center text-xs text-outline pt-2">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
