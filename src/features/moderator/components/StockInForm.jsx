import React, { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import { catalogService, consignmentService, inventoryService } from '../services/warehouseApi.js';
import { STATIC_STALE_TIME_MS, useResource } from '../hooks/warehouseHooks.jsx';
import {
  SUPPORTED_TRYON_SLOTS,
  TRYON_SLOT_CONFIG,
  canStockIn,
  extractReceiptId,
  formatTryOnSlot,
  groupCategoriesBySlot,
  inferTryOnSlotFromName,
  normalizeTryOnSlot,
} from '../models/warehouseModel.js';
import { Card, Field, ResourceState, money } from './WarehouseUi.jsx';
import PhotoUpload from './PhotoUpload.jsx';
import BrandQuickAddModal from './BrandQuickAddModal.jsx';
import { useToast } from '../../../context/ToastContext.jsx';

export const COMMON_COLORS = [
  'Đen',
  'Trắng',
  'Xám',
  'Be',
  'Be / Kem',
  'Nâu',
  'Xanh dương',
  'Xanh lá',
  'Đỏ',
  'Hồng',
  'Vàng',
  'Cam',
  'Tím',
  'Nhiều màu',
];

export default function StockInForm({ receipt, form, onSuccess }) {
  const toast = useToast();
  const navigate = useNavigate();
  const receiptId = extractReceiptId(receipt);
  const formId = form?.formId || form?.id || receipt?.formId;
  const catalog = useResource(options => catalogService.list(options), [], {
    cacheKey: 'catalog:list',
    staleTime: STATIC_STALE_TIME_MS,
  });
  const verification = useResource(async options => {
    const [currentReceipt, currentForm] = await Promise.all([
      consignmentService.receipt(receiptId, options),
      formId ? consignmentService.read(formId, options) : Promise.resolve(null),
    ]);
    if (!currentReceipt) throw new Error('Không kiểm tra được trạng thái biên nhận.');
    const productSku =
      currentReceipt.productSku ||
      currentReceipt.sku ||
      currentForm?.productSku ||
      receipt?.productSku ||
      receipt?.sku ||
      null;
    const productId =
      currentReceipt.productId ||
      currentForm?.productId ||
      receipt?.productId ||
      form?.productId ||
      null;
    const alreadyStockedIn = Boolean(
      productSku ||
      productId ||
      currentReceipt.stockedIn ||
      currentForm?.stockedIn ||
      receipt?.stockedIn ||
      form?.stockedIn
    );
    return { productSku, productId, alreadyStockedIn };
  }, [receiptId, formId]);
  const operation = useResource(async () => null, [], {
    enabled: false,
    invalidatePrefixes: ['consignments:', 'queue:', 'inventory:', 'print-queue:', 'history:'],
  });
  const [name, setName] = useState(receipt?.productName || form?.productName || form?.name || '');
  const [size, setSize] = useState(receipt?.size || form?.size || '');
  const initialCategoryId = receipt?.categoryId || form?.categoryId || '';
  const initialBrandId = receipt?.brandId || form?.brandId || '';
  const [categoryId, setCategory] = useState(initialCategoryId);
  const [slotFilter, setSlotFilter] = useState('ALL');
  const [brandId, setBrand] = useState(initialBrandId);

  const initialColor = (receipt?.color || form?.color || '').trim();
  const isPresetColor = COMMON_COLORS.includes(initialColor);
  const [colorSelect, setColorSelect] = useState(
    isPresetColor ? initialColor : initialColor ? 'Khác' : ''
  );
  const [customColor, setCustomColor] = useState(isPresetColor ? '' : initialColor);
  const effectiveColor = colorSelect === 'Khác' ? customColor : colorSelect;
  const [description, setDescription] = useState(form?.description || '');
  const [quickAdd, setQuickAdd] = useState(false);
  const [addedBrand, setAddedBrand] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [photosPending, setPhotosPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const onPhotos = useCallback((urls, pending) => { setPhotos(urls); setPhotosPending(pending); }, []);
  const categories = (catalog.data?.categories || []).filter(
    (item) => !item.hidden || (Boolean(initialCategoryId) && item.id === initialCategoryId)
  );
  const hasSlotMetadata = categories.some((item) => Boolean(normalizeTryOnSlot(item)));
  const visibleCategories =
    slotFilter !== 'ALL' && hasSlotMetadata
      ? categories.filter((item) => normalizeTryOnSlot(item) === slotFilter)
      : categories;
  const groupedCategories =
    slotFilter === 'ALL'
      ? groupCategoriesBySlot(visibleCategories)
      : [{ key: slotFilter, label: null, items: visibleCategories }];
  const selectedCategory = categories.find((item) => item.id === categoryId) || null;
  const effectiveSlot = normalizeTryOnSlot(selectedCategory);
  const effectiveSlotConfig = effectiveSlot ? formatTryOnSlot(effectiveSlot) : null;
  const inferredNameSlot = inferTryOnSlotFromName(name);
  const hasSlotMismatch =
    Boolean(effectiveSlot) && Boolean(inferredNameSlot) && inferredNameSlot !== effectiveSlot;
  const brands = [...(catalog.data?.brands || []), ...(addedBrand ? [addedBrand] : [])]
    .filter((item, i, all) => !item.hidden && all.findIndex(other => other.id === item.id) === i);
  const valid = canStockIn(receipt) && verification.data && !verification.data.alreadyStockedIn && !verification.error &&
    !verification.loading && !uncertain && !catalog.error && !catalog.loading && name.trim() &&
    categories.some(item => item.id === categoryId) && brands.some(item => item.id === brandId) && photos.length > 0 && !photosPending;
  const errors = operation.error?.fields || {};
  const printUrl = sku => `/moderator/consignments/print-queue?sku=${encodeURIComponent(sku)}`;

  const handleSlotFilterChange = (nextSlot) => {
    setSlotFilter(nextSlot);
    if (nextSlot !== 'ALL' && hasSlotMetadata && selectedCategory && normalizeTryOnSlot(selectedCategory) !== nextSlot) {
      setCategory('');
    }
  };

  const handleCategoryChange = (nextCategoryId) => {
    setCategory(nextCategoryId);
    const chosen = categories.find((item) => item.id === nextCategoryId);
    const chosenSlot = normalizeTryOnSlot(chosen);
    if (slotFilter !== 'ALL' && chosenSlot && chosenSlot !== slotFilter) {
      setSlotFilter(chosenSlot);
    }
  };

  return (
    <Card title="Nhập thông tin sản phẩm và nhập kho">
      <ResourceState resource={catalog} />
      <ResourceState resource={verification} />
      <ResourceState resource={{ ...operation, error: operation.error?.code === 'RECEIPT_NOT_CONFIRMED'
        ? { ...operation.error, message: 'Khách hàng chưa bấm xác nhận biên nhận trên ứng dụng. Vui lòng kiểm tra lại trước khi nhập kho.' }
        : operation.error }} />
      {verification.data?.alreadyStockedIn ? (
        <div className="space-y-3">
          <p>Sản phẩm đã tồn tại · {verification.data.productSku || verification.data.productId || 'Đã nhập kho'}</p>
          {verification.data.productSku && (
            <Link className="text-primary underline" to={printUrl(verification.data.productSku)}>Đến hàng đợi in tem</Link>
          )}
        </div>
      ) : (
        <form className="space-y-4" onSubmit={event => {
          event.preventDefault();
          if (!valid || operation.busy) return;
          operation.mutate(options => inventoryService.create({ receiptId, name: name.trim(), size: size.trim(),
            categoryId, brandId, color: effectiveColor.trim(), description: description.trim(), photoUrls: photos }, options), {
            onSuccess: result => {
              const sku = result?.sku || result?.id;
              if (!sku) {
                setUncertain(true);
                return;
              }
              toast.success(`Đã nhập kho sản phẩm ${sku} thành công! Chuyển tới hàng đợi in tem.`);
              onSuccess?.(result);
              navigate(printUrl(sku));
            },
            onUncertain: () => setUncertain(true),
          }).then(success => {
            if (!success) verification.refresh();
          });
        }}>
          <div className="rounded-xl border border-neutral bg-green-50 p-4 text-sm">
            Giá đã chốt với khách: <strong>{money(receipt.agreedPrice ?? receipt.snapshot?.agreedPrice)}</strong>
            <p className="mt-1 text-xs">Giá, giá sàn và điều khoản giữ theo biên nhận đã xác nhận. SKU tự sinh khi lưu.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên sản phẩm" required value={name} onChange={e => setName(e.target.value)} error={errors.name} />
            <Field label="Size" value={size} onChange={e => setSize(e.target.value)} error={errors.size} />
            <Field label="Lọc theo Slot thử đồ AI">
              <select value={slotFilter} onChange={e => handleSlotFilterChange(e.target.value)}>
                <option value="ALL">Tất cả slot (tự theo danh mục)</option>
                {SUPPORTED_TRYON_SLOTS.map(slot => (
                  <option key={slot} value={slot}>
                    {TRYON_SLOT_CONFIG[slot]?.label || slot}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Danh mục" error={errors.categoryId}>
              <select required value={categoryId} onChange={e => handleCategoryChange(e.target.value)}>
                <option value="">Chọn danh mục</option>
                {groupedCategories.map(group =>
                  group.label ? (
                    <optgroup key={group.key} label={group.label}>
                      {group.items.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </optgroup>
                  ) : (
                    group.items.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))
                  )
                )}
              </select>
            </Field>
            <Field label="Thương hiệu" error={errors.brandId}><select required value={brandId} onChange={e => setBrand(e.target.value)}>
              <option value="">Chọn thương hiệu</option>{brands.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></Field>
            <Field label="Màu sắc" error={errors.color}>
              <select
                value={colorSelect}
                onChange={e => {
                  const val = e.target.value;
                  setColorSelect(val);
                  if (val !== 'Khác') {
                    setCustomColor('');
                  }
                }}
              >
                <option value="">Chọn màu sắc</option>
                {COMMON_COLORS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="Khác">Khác (nhập tay)</option>
              </select>
            </Field>
            {colorSelect === 'Khác' && (
              <Field
                label="Nhập màu sắc khác"
                value={customColor}
                onChange={e => setCustomColor(e.target.value)}
                placeholder="Ví dụ: Xanh rêu, Xanh pastel, Bạc ánh kim..."
                error={errors.color}
              />
            )}
          </div>
          {effectiveSlotConfig && (
            <div
              data-testid="stockin-tryon-slot-badge"
              className="flex flex-wrap items-center gap-2 rounded-xl border border-[#DDE5D9] bg-[#FAFBF9] px-3.5 py-2 text-xs text-[#3F493E]"
            >
              <span className="font-semibold">Slot thử đồ AI áp dụng:</span>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-bold ${effectiveSlotConfig.badgeClass}`}>
                {effectiveSlotConfig.label}
              </span>
              {selectedCategory?.name && (
                <span className="text-[#5B6776]">theo danh mục {selectedCategory.name}</span>
              )}
            </div>
          )}
          {hasSlotMismatch && (
            <div
              data-testid="stockin-slot-mismatch-warning"
              role="status"
              className="rounded-xl border border-[#FEDF89] bg-[#FFFAEB] px-3.5 py-2.5 text-xs font-medium text-[#B54708]"
            >
              Tên sản phẩm có vẻ thuộc <strong>{formatTryOnSlot(inferredNameSlot).label}</strong>, nhưng danh mục{' '}
              <strong>"{selectedCategory?.name}"</strong> đang gắn <strong>{effectiveSlotConfig?.label}</strong>. Vui lòng kiểm tra lại danh mục để tránh nhầm slot thử đồ AI của Member.
            </div>
          )}
          <Button type="button" variant="outline" onClick={() => setQuickAdd(true)}>+ Thêm nhanh thương hiệu</Button>
          <Field label="Mô tả bán hàng" error={errors.description}><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} /></Field>
          <p className="text-sm">Ghi chú kiểm định: {receipt.conditionNote || '—'}</p>
          <PhotoUpload disabled={operation.busy} onChange={onPhotos} />
          {uncertain && <div role="alert" className="space-y-2 rounded-xl border bg-amber-50 p-4 text-sm">
            <p>Chưa xác định được kết quả nhập kho. Kiểm tra biên nhận và form trước khi gửi lại để tránh tạo trùng SKU.</p>
            <Button type="button" variant="outline" onClick={() => { operation.clearActionError(); setUncertain(false); verification.refresh(); }}>Kiểm tra kết quả theo biên nhận</Button>
          </div>}
          <Button type="submit" disabled={!valid || operation.busy} loading={operation.busy}>Nhập kho · tạo SKU</Button>
        </form>
      )}
      {quickAdd && <BrandQuickAddModal isOpen existingBrands={brands} onClose={() => setQuickAdd(false)} onCreated={item => {
        setAddedBrand(item); setBrand(item.id); catalog.refresh();
      }} />}
    </Card>
  );
}
