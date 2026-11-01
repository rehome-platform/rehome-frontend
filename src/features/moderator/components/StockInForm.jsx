import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import { catalogService, inventoryService } from '../services/warehouseApi.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { canStockIn, extractReceiptId } from '../models/warehouseModel.js';
import { Card, Field, ResourceState, money } from './WarehouseUi.jsx';
import PhotoUpload from './PhotoUpload.jsx';
import BarcodePrintModal from './BarcodePrintModal.jsx';
import BrandQuickAddModal from './BrandQuickAddModal.jsx';

export default function StockInForm({ receipt, onSuccess }) {
  const receiptId = extractReceiptId(receipt);
  const catalog = useResource((options) => catalogService.list(options), []);
  const recovery = useResource(
    async (options) => {
      try {
        const product = await inventoryService.byReceipt(receiptId, options);
        return { checked: true, product };
      } catch (err) {
        if (err?.code === 'OPERATION_UNSUPPORTED' || err?.status === 501) {
          return { checked: true, product: null };
        }
        throw err;
      }
    },
    [receiptId],
  );

  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [shelf, setShelf] = useState('');
  const [categoryId, setCategory] = useState('');
  const [brandId, setBrand] = useState('');
  const [quickAdd, setQuickAdd] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photosPending, setPhotosPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [createdProduct, setCreatedProduct] = useState(null);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);

  const onPhotos = useCallback((urls, pending) => {
    setPhotos(urls);
    setPhotosPending(pending);
  }, []);

  const categories = catalog.data?.categories?.filter((item) => !item.hidden) || [];
  const brands = catalog.data?.brands?.filter((item) => !item.hidden) || [];

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedCatName = selectedCategory?.name || '';
  const isClothing =
    /áo|quần|váy|đầm|khoác|jacket|shirt|pant|dress/i.test(selectedCatName);

  const valid =
    canStockIn(receipt) &&
    recovery.data?.checked &&
    !recovery.data.product &&
    !recovery.error &&
    !uncertain &&
    name.trim() &&
    size.trim() &&
    shelf.trim() &&
    (categories.length === 0 || categories.some((item) => item.id === categoryId)) &&
    (brands.length === 0 || brands.some((item) => item.id === brandId)) &&
    photos.length > 0 &&
    !photosPending;

  const errors = recovery.error?.fields || {};

  const getFriendlyErrorMessage = (err) => {
    if (!err) return null;
    if (err.code === 'RECEIPT_NOT_CONFIRMED' || err.message?.includes('chưa được Member xác nhận')) {
      return 'Khách hàng chưa bấm xác nhận biên nhận trên ứng dụng. Vui lòng nhắc khách kiểm tra app trước khi nhập kho.';
    }
    if (err.code === 'RECEIPT_ALREADY_HAS_PRODUCT' || err.message?.includes('đã được nhập kho')) {
      return 'Biên nhận này đã được nhập kho trước đó. Vui lòng kiểm tra danh sách tồn kho.';
    }
    if (err.code === 'RECEIPT_NOT_FOUND' || err.status === 404) {
      return 'Không tìm thấy thông tin biên nhận trên hệ thống.';
    }
    return err.message || 'Lỗi khi nhập kho sản phẩm.';
  };

  const agreedPrice = receipt?.agreedPrice ?? receipt?.snapshot?.agreedPrice;

  return (
    <Card title="Nhập thông tin sản phẩm và nhập kho">
      <ResourceState resource={catalog} />
      <ResourceState resource={recovery} />

      {recovery.error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
          {getFriendlyErrorMessage(recovery.error)}
        </div>
      )}

      {createdProduct ? (
        <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-emerald-900">
              Nhập kho thành công · SKU: <span className="font-mono text-base font-extrabold">{createdProduct.sku}</span>
            </span>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-600 text-white">
              {createdProduct.status || 'ON_SALE'}
            </span>
          </div>

          <p className="text-xs text-emerald-800 leading-relaxed">
            Sản phẩm <strong>{createdProduct.name}</strong> đã được thêm vào kho thành công. Vui lòng in tem mã vạch dán lên sản phẩm trước khi cất lên kệ.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              onClick={() => setIsBarcodeOpen(true)}
              className="text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              In tem mã vạch SKU
            </Button>
            <Link to={`/moderator/inventory/${encodeURIComponent(createdProduct.sku)}`}>
              <Button variant="outline" className="text-xs font-bold border-emerald-700 text-emerald-800">
                Xem sản phẩm trong tồn kho
              </Button>
            </Link>
          </div>

          {isBarcodeOpen && (
            <BarcodePrintModal
              isOpen={isBarcodeOpen}
              onClose={() => setIsBarcodeOpen(false)}
              item={createdProduct}
            />
          )}
        </div>
      ) : recovery.data?.product ? (
        <div className="space-y-3">
          <Link
            className="text-primary underline font-bold"
            to={`/moderator/inventory/${encodeURIComponent(recovery.data.product.sku)}`}
          >
            Sản phẩm đã tồn tại · {recovery.data.product.sku}
          </Link>
          <div>
            <Button variant="outline" size="sm" onClick={() => setIsBarcodeOpen(true)}>
              In tem SKU
            </Button>
          </div>
          {isBarcodeOpen && (
            <BarcodePrintModal
              isOpen={isBarcodeOpen}
              onClose={() => setIsBarcodeOpen(false)}
              item={recovery.data.product}
            />
          )}
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid) return;
            recovery.mutate(
              (options) =>
                inventoryService.create(
                  {
                    receiptId,
                    name: name.trim(),
                    size: size.trim(),
                    shelfLocation: shelf.trim(),
                    categoryId,
                    brandId,
                    photoUrls: photos,
                  },
                  options,
                ),
              {
                onSuccess: (res) => {
                  const prod = {
                    sku: res?.sku || res?.id,
                    id: res?.sku || res?.id,
                    name: res?.name || name.trim(),
                    status: res?.status || 'ON_SALE',
                  };
                  setCreatedProduct(prod);
                  setIsBarcodeOpen(true);
                  onSuccess?.(prod);
                },
                onUncertain: () => setUncertain(true),
              },
            );
          }}
        >
          {/* Header tóm tắt giá đã chốt & SKU dự kiến */}
          <div className="grid gap-3 sm:grid-cols-2 p-3 bg-[#f8faf8] border border-[#8a8a8a] rounded-xl text-xs">
            <div>
              <span className="text-[#5f5f5f] block text-[10px] uppercase font-bold tracking-wider">
                Giá đã chốt với khách
              </span>
              <span className="text-base font-bold text-[#191C19]">
                {agreedPrice ? money(agreedPrice) : 'Theo biên nhận'}
              </span>
            </div>
            <div>
              <span className="text-[#5f5f5f] block text-[10px] uppercase font-bold tracking-wider">
                Mã SKU hệ thống cấp
              </span>
              <span className="text-base font-bold font-mono text-[#006B2C]">
                Tự sinh khi lưu
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Tên sản phẩm"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={errors.name}
              placeholder="VD: Áo thun oversize cotton"
            />
            <Field
              label="Size"
              required
              value={size}
              onChange={(event) => setSize(event.target.value)}
              error={errors.size}
              placeholder="VD: M, L, XL, 32..."
            />
            <Field
              label="Vị trí kệ"
              required
              value={shelf}
              onChange={(event) => setShelf(event.target.value)}
              error={errors.shelfLocation}
              placeholder="VD: A1-02, B2-15..."
            />
            <Field label="Danh mục">
              <select
                className="w-full rounded-xl border-neutral"
                required={categories.length > 0}
                value={categoryId}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">Chọn danh mục</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Thương hiệu">
              <select
                className="w-full rounded-xl border-neutral"
                required={brands.length > 0}
                value={brandId}
                onChange={(event) => setBrand(event.target.value)}
              >
                <option value="">Chọn thương hiệu</option>
                {brands.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex justify-start">
            <Button variant="outline" size="sm" type="button" onClick={() => setQuickAdd(true)}>
              + Thêm nhanh thương hiệu
            </Button>
          </div>

          {/* Slot thử đồ AI / Không cần tách nền (KD-08 & KD-08-KhongThuDo) */}
          {selectedCatName && (
            isClothing ? (
              <div className="border-2 border-[#2b2b2b] p-3.5 rounded-xl space-y-2 text-xs bg-white">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#191C19]">Ảnh dùng cho thử đồ AI</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 border border-[#2b2b2b] rounded bg-white">
                    DANH MỤC {selectedCatName.toUpperCase()} · SLOT {/quần|pant/i.test(selectedCatName) ? 'QUẦN' : 'ÁO'}
                  </span>
                </div>
                <p className="text-[11px] text-[#5f5f5f] leading-relaxed">
                  Chụp phẳng, nền trơn, thẳng góc — tách nền ra kết quả tốt hơn ảnh có bối cảnh.
                </p>
                <div className="flex h-1.5 border border-[#8a8a8a] rounded-full overflow-hidden bg-white">
                  <div className="bg-[#2b2b2b] w-2/5" />
                </div>
                <p className="text-[10px] text-[#717971]">
                  Đang tách nền, chạy nền không phải chờ. Tách lỗi hay bỏ qua thì sản phẩm vẫn lên sàn.
                </p>
              </div>
            ) : (
              <div className="border border-dashed border-[#9a9a9a] bg-[#fafafa] p-3.5 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#4a4a4a]">Không cần tách nền</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 border border-[#a8a8a8] text-[#5f5f5f] rounded">
                    DANH MỤC {selectedCatName.toUpperCase()} · KHÔNG CÓ SLOT
                  </span>
                </div>
                <p className="text-[11px] text-[#5f5f5f] leading-relaxed">
                  Phòng thử đồ chỉ có hai slot Áo và Quần. Danh mục này không mặc lên người mẫu được nên hệ thống bỏ qua bước tách nền, tiết kiệm thời gian xử lý.
                </p>
              </div>
            )
          )}

          <PhotoUpload disabled={recovery.busy} onChange={onPhotos} />

          {uncertain && (
            <div role="alert" className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-900 font-medium">
                Chưa xác định được kết quả nhập kho do lỗi mạng. Hãy kiểm tra sản phẩm đã tạo trước khi gửi tiếp để tránh tạo trùng SKU.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  recovery.clearActionError();
                  recovery.refresh();
                  setUncertain(false);
                }}
              >
                Kiểm tra kết quả theo biên nhận
              </Button>
            </div>
          )}

          <Button type="submit" disabled={!valid} loading={recovery.busy} className="w-full sm:w-auto font-bold bg-[#2b2b2b] text-white hover:bg-black">
            Nhập kho · tạo SKU
          </Button>
        </form>
      )}

      {quickAdd && (
        <BrandQuickAddModal
          isOpen={quickAdd}
          existingBrands={brands}
          onClose={() => setQuickAdd(false)}
          onCreated={(item) => {
            catalog.refresh();
            if (item?.id) setBrand(item.id);
          }}
        />
      )}
    </Card>
  );
}
