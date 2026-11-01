import React, { useState } from 'react';
import Button from '../../../components/common/Button.jsx';
import { catalogService } from '../services/warehouseApi.js';

export default function BrandQuickAddModal({ isOpen, onClose, existingBrands = [], onCreated }) {
  const [name, setName] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const trimmedName = name.trim();
  const matchedBrand = existingBrands.find(
    (b) => b.name?.toLowerCase().trim() === trimmedName.toLowerCase()
  );
  const isDuplicate = Boolean(trimmedName && matchedBrand);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!trimmedName || isDuplicate) return;

    try {
      setLoading(true);
      setError(null);
      const res = await catalogService.createBrand({
        name: trimmedName,
        originCountry: originCountry.trim() || undefined,
      });
      onCreated?.(res || { id: trimmedName, name: trimmedName });
      onClose();
    } catch (err) {
      setError(err?.message || 'Không thể tạo thương hiệu mới.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white border-2 border-[#2b2b2b] p-6 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#191C19]">Thêm nhanh thương hiệu</h3>
          <p className="text-xs text-[#5f5f5f] mt-1 leading-relaxed">
            Dùng khi thương hiệu của món chưa có trong danh mục. Không chặn luồng nhập kho — lưu xong quay lại form ngay.
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#191C19] mb-1.5">
              Tên thương hiệu
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Uniqlo, Zara, H&M..."
              required
              className={`w-full rounded-xl border-2 px-3 py-2 text-xs font-semibold ${isDuplicate ? 'border-amber-500 bg-amber-50/40' : 'border-[#2b2b2b] bg-white'
                }`}
            />
            {isDuplicate && (
              <p className="mt-2 text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 p-2.5 rounded-lg leading-relaxed">
                Thương hiệu này đã có trong danh mục, chọn &quot;{matchedBrand.name}&quot; ở ô Thương hiệu bên dưới form là được, không cần tạo mới.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#191C19] mb-1.5">
              Nước gốc · tuỳ chọn
            </label>
            <input
              type="text"
              value={originCountry}
              onChange={(e) => setOriginCountry(e.target.value)}
              placeholder="VD: Nhật Bản, Tây Ban Nha..."
              className="w-full rounded-xl border border-[#8a8a8a] px-3 py-2 text-xs text-[#191C19]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 text-xs"
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              disabled={!trimmedName || isDuplicate}
              loading={loading}
              className="flex-1 text-xs font-bold bg-[#2b2b2b] text-white hover:bg-black disabled:bg-[#efefef] disabled:text-[#9a9a9a] disabled:border-[#c4c4c4]"
            >
              Lưu thương hiệu
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

