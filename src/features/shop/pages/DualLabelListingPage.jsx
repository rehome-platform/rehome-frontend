import React, { useState } from 'react';
import ShopLayout from '../../../layouts/ShopLayout.jsx';
import { Input, Button, Badge } from '../../../components/common/index.js';
import { validateConsignmentPrice } from '../../../utils/validators.js';

export default function DualLabelListingPage() {
  const [labelType, setLabelType] = useState('MEMBER_CONSIGNMENT'); // 'MEMBER_CONSIGNMENT' | 'SHOP_INVENTORY'
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('M');
  const [price, setPrice] = useState('180000');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validateConsignmentPrice(price);
    if (err) {
      alert(err);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setMessage('Sản phẩm đã được niêm yết lên sàn ReHome thành công với nhãn đã chọn!');
      setTitle('');
    }, 600);
  };

  return (
    <ShopLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-on-surface">Đăng Bán Hàng Với 2 Nhãn Phân Loại</h1>
          <p className="text-sm text-outline">
            Minh bạch nguồn gốc sản phẩm giữa <strong>Ký gửi từ thành viên</strong> và <strong>Đồ cũ của cửa hàng</strong>
          </p>
        </div>

        {message && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm flex items-center justify-between">
            <span>✓ {message}</span>
            <button onClick={() => setMessage('')} className="text-green-600 hover:text-green-900 font-bold">✕</button>
          </div>
        )}

        {/* Dual Label Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => setLabelType('MEMBER_CONSIGNMENT')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              labelType === 'MEMBER_CONSIGNMENT'
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-outline-variant hover:border-outline'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-on-surface text-sm">Nhãn 1: Ký gửi từ thành viên</span>
              <Badge variant="success">Member</Badge>
            </div>
            <p className="text-xs text-outline">
              Sản phẩm có mã biên nhận, chia doanh thu 80/20 với người ký gửi. Tự động kiểm tra trần giá 2.000.000 đ.
            </p>
          </div>

          <div
            onClick={() => setLabelType('SHOP_INVENTORY')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              labelType === 'SHOP_INVENTORY'
                ? 'border-secondary bg-secondary/5 shadow-sm'
                : 'border-outline-variant hover:border-outline'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-on-surface text-sm">Nhãn 2: Đồ cũ của cửa hàng</span>
              <Badge variant="warning">Shop Own</Badge>
            </div>
            <p className="text-xs text-outline">
              Kho hàng đồ si / 2nd-hand do chính shop tự nhập. Doanh thu 100% thuộc về cửa hàng (trừ phí sàn nếu có).
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
          <Input
            label="Tiêu đề sản phẩm"
            required
            placeholder="Ví dụ: Áo len cổ lọ Uniqlo màu kem size M"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Thương hiệu"
              placeholder="Zara, H&M, Uniqlo, Routine..."
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Kích cỡ (Size)</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="FreeSize">Freesize</option>
              </select>
            </div>
          </div>

          <Input
            label="Giá niêm yết bán (VNĐ - Trần 2.000.000 đ)"
            required
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Mô tả chi tiết & lỗi nhỏ (nếu có)</label>
            <textarea
              rows={3}
              className="w-full p-3 text-sm bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Mô tả chất liệu, tình trạng cúc áo, form dáng..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={loading}>
              Đăng bán sản phẩm
            </Button>
          </div>
        </form>
      </div>
    </ShopLayout>
  );
}
