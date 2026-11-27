import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../../components/common/Modal.jsx';
import Button from '../../../components/common/Button.jsx';
import ImageLightbox from '../../../components/common/ImageLightbox.jsx';
import PhotoUpload from './PhotoUpload.jsx';
import { catalogService, inventoryService } from '../services/warehouseApi.js';
import { STATIC_STALE_TIME_MS, useResource } from '../hooks/warehouseHooks.jsx';
import {
  formatTryOnSlot,
  groupCategoriesBySlot,
  normalizeError,
  normalizeTryOnSlot,
} from '../models/warehouseModel.js';

function photoUrlOf(photo) {
  if (!photo) return '';
  return typeof photo === 'string' ? photo : photo.url || photo.imageUrl || '';
}

function detectConditionLevel(note) {
  if (note.includes('100%') || note.includes('NEW_TAG')) return 'NEW_TAG';
  if (note.includes('95%') || note.includes('90%') || note.includes('GOOD')) return 'GOOD';
  if (note.includes('80%') || note.includes('85%') || note.includes('FLAW')) return 'FLAW';
  return 'LIKE_NEW';
}

function formatPrice(item) {
  const raw = item?.currentPrice ?? item?.price ?? item?.sellingPrice;
  if (raw === null || raw === undefined || raw === '') return '—';
  const num = Number(raw);
  return Number.isFinite(num) ? `${num.toLocaleString('vi-VN')} đ` : String(raw);
}

const CONDITION_LEVEL_OPTIONS = [
  { value: 'NEW_TAG', label: 'Mới, còn tem (100%)' },
  { value: 'LIKE_NEW', label: 'Như mới (99%)' },
  { value: 'GOOD', label: 'Tốt, có dấu hiệu dùng (90-95%)' },
  { value: 'FLAW', label: 'Có lỗi nhỏ (80-85%)' },
];

const READONLY_INPUT_CLASS =
  'w-full rounded-xl border border-[#d4d4d4] bg-[#f3f4f6] px-3 py-2 text-xs text-[#5f5f5f] cursor-not-allowed';

const STATUS_ERROR_FALLBACKS = {
  403: 'Bạn không có quyền chỉnh sửa sản phẩm thuộc điểm kí gửi khác.',
  404: 'Không tìm thấy sản phẩm.',
  409: 'Trạng thái sản phẩm đã thay đổi hoặc đang có đơn hàng, không thể chỉnh sửa.',
};

export default function ProductEditModal({ isOpen, onClose, item, onUpdated }) {
  const sku = item?.id || item?.sku || '';
  const isOnSale = item?.status === 'ON_SALE';

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadVersion, setUploadVersion] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const errorAlertRef = useRef(null);

  const catalog = useResource((options) => catalogService.list(options), [isOpen], {
    enabled: Boolean(isOpen),
    cacheKey: 'catalog:list',
    staleTime: STATIC_STALE_TIME_MS,
  });

  const categories = useMemo(
    () =>
      (catalog.data?.categories || []).filter(
        (cat) => !cat.hidden || (item?.categoryId && cat.id === item.categoryId),
      ),
    [catalog.data?.categories, item?.categoryId],
  );

  const resolvedInitialCategoryId = useMemo(() => {
    if (item?.categoryId && categories.some((cat) => cat.id === item.categoryId)) {
      return item.categoryId;
    }
    if (item?.categoryId) return item.categoryId;
    const targetName = String(item?.categoryName || item?.category?.name || '')
      .trim()
      .toLowerCase();
    if (!targetName) return '';
    return categories.find((cat) => String(cat.name || '').trim().toLowerCase() === targetName)?.id || '';
  }, [item?.categoryId, item?.categoryName, item?.category, categories]);

  const groupedCategories = useMemo(() => groupCategoriesBySlot(categories), [categories]);

  useEffect(() => {
    if (!isOpen) return;
    setName(item?.name || '');
    setCategoryId(item?.categoryId || '');
    setCategoryTouched(false);
    setExistingPhotos((item?.photos || []).map(photoUrlOf).filter(Boolean));
    setUploadedPhotos([]);
    setUploadPending(false);
    setUploadVersion((v) => v + 1);
    setErrorMessage('');
    setLightboxIndex(null);
  }, [isOpen, item]);

  useEffect(() => {
    if (!isOpen || categoryTouched) return;
    if (resolvedInitialCategoryId && categoryId !== resolvedInitialCategoryId) {
      setCategoryId(resolvedInitialCategoryId);
    }
  }, [isOpen, categoryTouched, resolvedInitialCategoryId, categoryId]);

  const onUploadedChange = useCallback((urls, pending) => {
    setUploadedPhotos(urls);
    setUploadPending(pending);
  }, []);

  useEffect(() => {
    if (errorMessage) {
      errorAlertRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }
  }, [errorMessage]);

  if (!isOpen) return null;

  const combinedPhotos = [...existingPhotos, ...uploadedPhotos];
  const conditionNote = item?.conditionNote || item?.condition || '';
  const conditionLevel = detectConditionLevel(conditionNote);
  const categoryName = item?.categoryName || item?.category?.name || item?.category || '—';
  const brandName = item?.brandName || item?.brand?.name || item?.brand || '—';
  const selectedCategory = categories.find((cat) => cat.id === categoryId) || null;
  const activeSlot = normalizeTryOnSlot(selectedCategory) || normalizeTryOnSlot(item);
  const activeSlotInfo = activeSlot ? formatTryOnSlot(activeSlot) : null;
  const canEditCategory = isOnSale && categories.length > 0;
  const isSaveDisabled =
    submitting || uploadPending || !isOnSale || !name.trim() || combinedPhotos.length === 0;

  const handleRemoveExisting = (index) => {
    if (!isOnSale || submitting) return;
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveExisting = (index, direction) => {
    if (!isOnSale || submitting) return;
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
    if (submitting || uploadPending || !isOnSale) return;

    if (!name.trim()) {
      setErrorMessage('Tên sản phẩm không được để trống.');
      return;
    }
    if (!combinedPhotos.length) {
      setErrorMessage('Sản phẩm phải có ít nhất 1 ảnh.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      const categoryChanged =
        Boolean(categoryId) && categoryId !== resolvedInitialCategoryId;
      const updated = await inventoryService.update(sku, {
        name: name.trim(),
        photoUrls: combinedPhotos,
        ...(categoryChanged ? { categoryId } : {}),
      });
      await onUpdated?.(updated);
      onClose?.();
    } catch (err) {
      const normalized = normalizeError(err);
      setErrorMessage(
        normalized.message ||
          STATUS_ERROR_FALLBACKS[normalized.status] ||
          'Không thể cập nhật sản phẩm.',
      );
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
        {!isOnSale && (
          <div
            role="status"
            className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-amber-800 font-medium"
          >
            Chỉ được chỉnh sửa tên và ảnh bán hàng khi sản phẩm đang ở trạng thái Đang bán.
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
            disabled={submitting || !isOnSale}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên sản phẩm..."
            className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
              !isOnSale
                ? 'border-[#d4d4d4] bg-[#f3f4f6] text-[#5f5f5f] cursor-not-allowed'
                : 'border-[#8a8a8a] text-[#191C19] focus:border-[#006B2C]'
            }`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <div className="space-y-1">
            <label htmlFor="edit-product-category" className="block font-bold text-[#191C19]">
              Danh mục {isOnSale && <span className="text-[#5B6776] font-normal">(quyết định slot thử đồ AI)</span>}
            </label>
            {isOnSale ? (
              <select
                id="edit-product-category"
                value={categoryId}
                disabled={submitting || !canEditCategory}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setCategoryTouched(true);
                }}
                className="w-full rounded-xl border border-[#8a8a8a] bg-white px-3 py-2 text-xs text-[#191C19] focus:border-[#006B2C] focus:outline-none disabled:bg-[#f3f4f6] disabled:text-[#5f5f5f]"
              >
                {!canEditCategory ? (
                  <option value={categoryId || ''}>
                    {categoryName !== '—' ? categoryName : 'Đang tải danh mục...'}
                  </option>
                ) : (
                  <>
                    <option value="">Chọn danh mục</option>
                    {groupedCategories.map((group) =>
                      group.label ? (
                        <optgroup key={group.key} label={group.label}>
                          {group.items.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </optgroup>
                      ) : (
                        group.items.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))
                      ),
                    )}
                  </>
                )}
              </select>
            ) : (
              <input
                id="edit-product-category"
                type="text"
                value={categoryName}
                disabled
                readOnly
                className={READONLY_INPUT_CLASS}
              />
            )}
          </div>

          <div className="space-y-1">
            <span className="block font-semibold text-[#5f5f5f]">Slot thử đồ AI</span>
            <div
              data-testid="edit-product-tryon-slot"
              className="rounded-xl border border-[#DDE5D9] bg-[#FAFBF9] px-3 py-1.5 min-h-[34px] flex items-center"
            >
              {activeSlotInfo ? (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${activeSlotInfo.badgeClass}`}>
                  {activeSlotInfo.label}
                </span>
              ) : (
                <span className="text-[#5B6776]">Chưa xác định</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <span className="block font-bold text-[#191C19]">
            Ảnh bán hàng ({combinedPhotos.length}) <span className="text-red-600">*</span>
          </span>

          {existingPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {existingPhotos.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="relative rounded-xl border border-[#d4d4d4] p-1.5 bg-[#fafafa] space-y-1"
                >
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    className="block w-full h-20 rounded-lg overflow-hidden cursor-zoom-in group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006B2C]/40"
                    title={`Phóng to ảnh ${index + 1}`}
                  >
                    <img
                      src={url}
                      alt={`Ảnh ${index + 1}`}
                      className="h-20 w-full object-cover rounded-lg transition-transform duration-200 group-hover:scale-105"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/65 text-white text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Phóng to
                    </span>
                  </button>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={submitting || !isOnSale || index === 0}
                        onClick={() => handleMoveExisting(index, -1)}
                        className="px-1.5 py-0.5 rounded border border-[#d4d4d4] text-[10px] disabled:opacity-40"
                        title="Đưa lên trước"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={submitting || !isOnSale || index === existingPhotos.length - 1}
                        onClick={() => handleMoveExisting(index, 1)}
                        className="px-1.5 py-0.5 rounded border border-[#d4d4d4] text-[10px] disabled:opacity-40"
                        title="Đưa ra sau"
                      >
                        →
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={submitting || !isOnSale}
                      onClick={() => handleRemoveExisting(index)}
                      className="px-1.5 py-0.5 rounded text-[10px] text-red-600 hover:bg-red-50 font-semibold disabled:opacity-40"
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
            <PhotoUpload
              key={uploadVersion}
              onChange={onUploadedChange}
              disabled={submitting || !isOnSale}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-[#e5e7eb] space-y-3">
          <p className="text-[11px] font-semibold text-[#5f5f5f]">
            Thông tin cố định (chỉ đọc)
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label htmlFor="edit-product-sku" className="block font-semibold text-[#5f5f5f]">
                Mã hàng hóa
              </label>
              <input
                id="edit-product-sku"
                type="text"
                value={sku || '—'}
                disabled
                readOnly
                className={READONLY_INPUT_CLASS}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-product-status" className="block font-semibold text-[#5f5f5f]">
                Trạng thái
              </label>
              <input
                id="edit-product-status"
                type="text"
                value={item?.status || '—'}
                disabled
                readOnly
                className={READONLY_INPUT_CLASS}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-product-price" className="block font-semibold text-[#5f5f5f]">
                Giá bán
              </label>
              <input
                id="edit-product-price"
                type="text"
                value={formatPrice(item)}
                disabled
                readOnly
                className={READONLY_INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="edit-product-brand" className="block font-semibold text-[#5f5f5f]">
                Thương hiệu
              </label>
              <input
                id="edit-product-brand"
                type="text"
                value={brandName}
                disabled
                readOnly
                className={READONLY_INPUT_CLASS}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-product-size" className="block font-semibold text-[#5f5f5f]">
                Kích cỡ (Size)
              </label>
              <input
                id="edit-product-size"
                type="text"
                value={item?.size || '—'}
                disabled
                readOnly
                className={READONLY_INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="edit-product-condition-level"
                className="block font-semibold text-[#5f5f5f]"
              >
                Mức độ tình trạng
              </label>
              <select
                id="edit-product-condition-level"
                value={conditionLevel}
                disabled
                className={READONLY_INPUT_CLASS}
              >
                {CONDITION_LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="edit-product-condition"
                className="block font-semibold text-[#5f5f5f]"
              >
                Ghi chú tình trạng
              </label>
              <textarea
                id="edit-product-condition"
                rows={2}
                value={conditionNote || '—'}
                disabled
                readOnly
                className={`${READONLY_INPUT_CLASS} p-2.5`}
              />
            </div>
          </div>
        </div>

        {errorMessage && (
          <div
            ref={errorAlertRef}
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-red-700 font-medium"
          >
            {errorMessage}
          </div>
        )}

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
            disabled={isSaveDisabled}
            className="px-4 py-1.5 text-xs font-bold"
          >
            Lưu thay đổi
          </Button>
        </div>
      </form>
      {lightboxIndex !== null && existingPhotos.length > 0 && (
        <ImageLightbox
          isOpen={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
          images={existingPhotos}
          initialIndex={lightboxIndex ?? 0}
          categoryLabel="Ảnh bán hàng"
        />
      )}
    </Modal>
  );
}
