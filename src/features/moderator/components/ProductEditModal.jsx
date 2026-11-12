import React, { useCallback, useEffect, useState } from 'react';
import Modal from '../../../components/common/Modal.jsx';
import Button from '../../../components/common/Button.jsx';
import PhotoUpload from './PhotoUpload.jsx';
import { inventoryService } from '../services/warehouseApi.js';
import { normalizeError } from '../models/warehouseModel.js';

function photoUrlOf(photo) {
  if (!photo) return '';
  return typeof photo === 'string' ? photo : photo.url || photo.imageUrl || '';
}

const CONDITION_LEVEL_OPTIONS = [
  { value: 'NEW_TAG', label: 'Mới, còn tem (100%)', template: 'Mới 100%, còn nguyên tem mác, chưa qua sử dụng' },
  { value: 'LIKE_NEW', label: 'Như mới (99%)', template: 'Như mới 99%, không vết bẩn, không trầy xước' },
  { value: 'GOOD', label: 'Tốt, có dấu hiệu dùng (90-95%)', template: 'Tốt 95%, có dấu hiệu đã dùng nhẹ, phom dáng đẹp' },
  { value: 'FLAW', label: 'Có lỗi nhỏ (80-85%)', template: 'Có lỗi nhỏ ở viền/khuy, tổng thể 85% còn tốt' },
];

export default function ProductEditModal({ isOpen, onClose, item, onUpdated }) {
  const sku = item?.id || item?.sku || '';

  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [conditionLevel, setConditionLevel] = useState('LIKE_NEW');
  const [conditionNote, setConditionNote] = useState('');
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadVersion, setUploadVersion] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setName(item?.name || '');
    setSize(item?.size || '');
    const currentNote = item?.conditionNote || item?.condition || '';
    setConditionNote(currentNote);
    // Tự động nhận diện mức tình trạng
    if (currentNote.includes('100%') || currentNote.includes('NEW_TAG')) {
      setConditionLevel('NEW_TAG');
    } else if (currentNote.includes('95%') || currentNote.includes('90%') || currentNote.includes('GOOD')) {
      setConditionLevel('GOOD');
    } else if (currentNote.includes('80%') || currentNote.includes('85%') || currentNote.includes('FLAW')) {
      setConditionLevel('FLAW');
    } else {
      setConditionLevel('LIKE_NEW');
    }
    setExistingPhotos((item?.photos || []).map(photoUrlOf).filter(Boolean));
    setUploadedPhotos([]);
    setUploadPending(false);
    setUploadVersion((v) => v + 1);
    setErrorMessage('');
  }, [isOpen, item]);

  const handleLevelChange = (lvl) => {
    setConditionLevel(lvl);
    const opt = CONDITION_LEVEL_OPTIONS.find((o) => o.value === lvl);
    if (opt) {
      const isTemplate = CONDITION_LEVEL_OPTIONS.some((o) => o.template === conditionNote.trim());
      if (!conditionNote.trim() || isTemplate) {
        setConditionNote(opt.template);
      }
    }
  };

  const onUploadedChange = useCallback((urls, pending) => {
    setUploadedPhotos(urls);
    setUploadPending(pending);
  }, []);

  if (!isOpen) return null;

  const combinedPhotos = [...existingPhotos, ...uploadedPhotos];

  const handleRemoveExisting = (index) => {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveExisting = (index, direction) => {
    setExistingPhotos((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || uploadPending) return;

    if (!name.trim()) {
      setErrorMessage('Tên sản phẩm không được để trống.');
      return;
    }
    if (!conditionNote.trim()) {
      setErrorMessage('Ghi chú tình trạng không được để trống.');
      return;
    }
    if (!combinedPhotos.length) {
      setErrorMessage('Sản phẩm phải có ít nhất 1 ảnh.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      const updated = await inventoryService.update(sku, {
        name: name.trim(),
        size: size.trim() || null,
        conditionNote: conditionNote.trim(),
        photoUrls: combinedPhotos,
      });
      await onUpdated?.(updated);
      onClose?.();
    } catch (err) {
      setErrorMessage(normalizeError(err).message || 'Không thể cập nhật sản phẩm.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !submitting && onClose?.()}
      title={`Chỉnh sửa sản phẩm (${sku})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl text-xs">
        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-red-700 font-medium"
          >
            {errorMessage}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="edit-product-name" className="block font-bold text-[#191C19]">
            Tên sản phẩm <span className="text-red-600">*</span>
          </label>
          <input
            id="edit-product-name"
            type="text"
            value={name}
            disabled={submitting}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên sản phẩm..."
            className="w-full rounded-xl border border-[#8a8a8a] px-3 py-2 text-xs text-[#191C19] focus:border-[#006B2C] focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="edit-product-size" className="block font-bold text-[#191C19]">
            Kích cỡ (Size)
          </label>
          <input
            id="edit-product-size"
            type="text"
            value={size}
            disabled={submitting}
            onChange={(e) => setSize(e.target.value)}
            placeholder="VD: S, M, L, 38..."
            className="w-full rounded-xl border border-[#8a8a8a] px-3 py-2 text-xs text-[#191C19] focus:border-[#006B2C] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="edit-product-condition-level" className="block font-bold text-[#191C19]">
              Mức độ tình trạng
            </label>
            <select
              id="edit-product-condition-level"
              value={conditionLevel}
              disabled={submitting}
              onChange={(e) => handleLevelChange(e.target.value)}
              className="w-full rounded-xl border border-[#8a8a8a] px-3 py-2 text-xs text-[#191C19] focus:border-[#006B2C] focus:outline-none"
            >
              {CONDITION_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="edit-product-condition" className="block font-bold text-[#191C19]">
              Ghi chú tình trạng <span className="text-red-600">*</span>
            </label>
            <textarea
              id="edit-product-condition"
              rows={2}
              value={conditionNote}
              disabled={submitting}
              onChange={(e) => setConditionNote(e.target.value)}
              placeholder="VD: Như mới 99%, không lỗi, chất vải dày..."
              className="w-full rounded-xl border border-[#8a8a8a] p-2.5 text-xs text-[#191C19] focus:border-[#006B2C] focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <span className="block font-bold text-[#191C19]">
            Ảnh sản phẩm ({combinedPhotos.length}) <span className="text-red-600">*</span>
          </span>

          {existingPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {existingPhotos.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="relative rounded-xl border border-[#d4d4d4] p-1.5 bg-[#fafafa] space-y-1"
                >
                  <img
                    src={url}
                    alt={`Ảnh ${index + 1}`}
                    className="h-20 w-full object-cover rounded-lg"
                  />
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={submitting || index === 0}
                        onClick={() => handleMoveExisting(index, -1)}
                        className="px-1.5 py-0.5 rounded border border-[#d4d4d4] text-[10px] disabled:opacity-40"
                        title="Đưa lên trước"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={submitting || index === existingPhotos.length - 1}
                        onClick={() => handleMoveExisting(index, 1)}
                        className="px-1.5 py-0.5 rounded border border-[#d4d4d4] text-[10px] disabled:opacity-40"
                        title="Đưa ra sau"
                      >
                        →
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleRemoveExisting(index)}
                      className="px-1.5 py-0.5 rounded text-[10px] text-red-600 hover:bg-red-50 font-semibold"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="text-[11px] text-[#5f5f5f] mb-1">Thêm ảnh mới (tùy chọn):</p>
            <PhotoUpload key={uploadVersion} onChange={onUploadedChange} disabled={submitting} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#e0e0e0]">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onClose?.()}
            className="px-3.5 py-1.5 text-xs"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={submitting || uploadPending}
            className="px-4 py-1.5 text-xs font-bold bg-[#006B2C] hover:bg-[#005221]"
          >
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </Modal>
  );
}

