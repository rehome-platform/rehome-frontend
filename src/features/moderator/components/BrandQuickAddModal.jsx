import React, { useState } from 'react';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import { catalogService } from '../services/warehouseApi.js';

export default function BrandQuickAddModal({ isOpen, onClose, existingBrands = [], onCreated }) {
  const [name, setName] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const saving = React.useRef(false);

  if (!isOpen) return null;

  const trimmedName = name.trim();
  const matchedBrand = existingBrands.find(
    (b) => b.name?.toLowerCase().trim() === trimmedName.toLowerCase()
  );
  const isDuplicate = Boolean(trimmedName && matchedBrand);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!trimmedName || isDuplicate || saving.current) return;
    saving.current = true;

    try {
      setLoading(true);
      setError(null);
      const res = await catalogService.createBrand({
        name: trimmedName,
        originCountry: originCountry.trim() || undefined,
      });
      if (!res?.id) throw new Error('Chưa nhận được mã thương hiệu đã tạo. Vui lòng tải lại danh mục.');
      onCreated?.(res);
      onClose();
    } catch (err) {
      setError(err?.status === 409 ? 'Thương hiệu này đã có trong danh mục. Hãy chọn thương hiệu có sẵn.' : err?.message || 'Không thể tạo thương hiệu mới.');
    } finally {
      setLoading(false);
      saving.current = false;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm nhanh thương hiệu"
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-xs text-[#5f5f5f] leading-relaxed">
          Dùng khi thương hiệu của món chưa có trong danh mục. Không chặn luồng nhập kho — lưu xong quay lại form ngay.
        </p>

        {error && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#191C19] mb-1.5">
              Tên thương hiệu
            </label>
            <input
              aria-label="Tên thương hiệu"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Uniqlo, Zara, H&M..."
              required
              className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold ${isDuplicate ? 'border-amber-500 bg-amber-50/40' : 'border-neutral bg-white focus:border-primary'
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
              className="w-full rounded-xl border border-neutral px-3 py-2 text-xs text-[#191C19] focus:border-primary"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 text-sm py-2"
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!trimmedName || isDuplicate}
              loading={loading}
              className="flex-1 text-sm py-2 font-semibold"
            >
              Lưu thương hiệu
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

