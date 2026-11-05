import React, { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import { catalogService, consignmentService, inventoryService } from '../services/warehouseApi.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { canStockIn, extractReceiptId } from '../models/warehouseModel.js';
import { Card, Field, ResourceState, money } from './WarehouseUi.jsx';
import PhotoUpload from './PhotoUpload.jsx';
import BrandQuickAddModal from './BrandQuickAddModal.jsx';

export const COMMON_COLORS = [
  'Đen',
  'Trắng',
  'Xám',
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
  const navigate = useNavigate();
  const receiptId = extractReceiptId(receipt);
  const formId = form?.formId || form?.id || receipt?.formId;
  const catalog = useResource(options => catalogService.list(options), []);
  const verification = useResource(async options => {
    const [currentReceipt, currentForm] = await Promise.all([
      consignmentService.receipt(receiptId, options),
      formId ? consignmentService.read(formId, options) : Promise.resolve(null),
    ]);
    if (!currentReceipt) throw new Error('Không kiểm tra được trạng thái biên nhận.');
    return { productSku: currentReceipt.productSku || currentReceipt.sku || currentForm?.productSku || null };
  }, [receiptId, formId]);
  const operation = useResource(async () => null, [], { enabled: false });
  const [name, setName] = useState(receipt?.productName || form?.productName || form?.name || '');
  const [size, setSize] = useState(receipt?.size || form?.size || '');
  const [shelf, setShelf] = useState('');
  const [categoryId, setCategory] = useState(receipt?.categoryId || form?.categoryId || '');
  const [brandId, setBrand] = useState(receipt?.brandId || form?.brandId || '');

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
  const categories = catalog.data?.categories?.filter(item => !item.hidden) || [];
  const brands = [...(catalog.data?.brands || []), ...(addedBrand ? [addedBrand] : [])]
    .filter((item, i, all) => !item.hidden && all.findIndex(other => other.id === item.id) === i);
  const category = categories.find(item => item.id === categoryId);
  const slot = category?.tryonSlot || category?.slot;
  const supportsTryOn = ['TOP', 'BOTTOM', 'DRESS'].includes(slot);
  const valid = canStockIn(receipt) && verification.data && !verification.data.productSku && !verification.error &&
    !verification.loading && !uncertain && !catalog.error && !catalog.loading && name.trim() && shelf.trim() &&
    categories.some(item => item.id === categoryId) && brands.some(item => item.id === brandId) && photos.length > 0 && !photosPending;
  const errors = operation.error?.fields || {};
  const printUrl = sku => `/moderator/consignments/print-queue?sku=${encodeURIComponent(sku)}`;

  return (
    <Card title="Nhập thông tin sản phẩm và nhập kho">
      <ResourceState resource={catalog} />
      <ResourceState resource={verification} />
      <ResourceState resource={{ ...operation, error: operation.error?.code === 'RECEIPT_NOT_CONFIRMED'
        ? { ...operation.error, message: 'Khách hàng chưa bấm xác nhận biên nhận trên ứng dụng. Vui lòng kiểm tra lại trước khi nhập kho.' }
        : operation.error }} />
      {verification.data?.productSku ? (
        <div className="space-y-3">
          <p>Sản phẩm đã tồn tại · {verification.data.productSku}</p>
          <Link className="text-primary underline" to={printUrl(verification.data.productSku)}>Đến hàng đợi in tem</Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={event => {
          event.preventDefault();
          if (!valid) return;
          operation.mutate(options => inventoryService.create({ receiptId, name: name.trim(), size: size.trim(),
            shelfLocation: shelf.trim(), categoryId, brandId, color: effectiveColor.trim(), description: description.trim(), photoUrls: photos }, options), {
            onSuccess: result => {
              const sku = result?.sku || result?.id;
              if (!sku) {
                setUncertain(true);
                return;
              }
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
            <Field label="Vị trí kệ" required value={shelf} onChange={e => setShelf(e.target.value)} error={errors.shelfLocation} />
            <Field label="Danh mục" error={errors.categoryId}><select required value={categoryId} onChange={e => setCategory(e.target.value)}>
              <option value="">Chọn danh mục</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></Field>
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
          <Button type="button" variant="outline" onClick={() => setQuickAdd(true)}>+ Thêm nhanh thương hiệu</Button>
          <Field label="Mô tả bán hàng" error={errors.description}><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} /></Field>
          <p className="text-sm">Ghi chú kiểm định: {receipt.conditionNote || '—'}</p>
          {category && <div className="rounded-xl border border-neutral p-4 text-xs">
            <p className="font-semibold">{supportsTryOn ? `Ảnh dùng cho thử đồ AI · SLOT ${{ TOP: 'ÁO', BOTTOM: 'QUẦN', DRESS: 'ĐẦM' }[slot]}` : slot === 'NONE' ? 'Không cần tách nền · KHÔNG CÓ SLOT' : 'Chưa có thông tin slot thử đồ'}</p>
            <p className="mt-2">{supportsTryOn ? 'Ảnh tải lên là ảnh gốc, chưa tách nền. Bạn vẫn có thể nhập kho và đăng bán.' : 'Ảnh bán hàng vẫn được sử dụng để đăng sản phẩm.'}</p>
          </div>}
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
