import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import { catalogService, inventoryService } from '../services/warehouseApi.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { canStockIn, extractReceiptId } from '../models/warehouseModel.js';
import { Card, Field, ResourceState } from './WarehouseUi.jsx';
import PhotoUpload from './PhotoUpload.jsx';
import CatalogEditor from './CatalogEditor.jsx';
import BarcodePrintModal from './BarcodePrintModal.jsx';

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

  return (
    <Card title="Nhập kho từ biên nhận đã xác nhận">
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
          <Button variant="outline" size="sm" onClick={() => setQuickAdd(true)}>
            Thêm nhanh thương hiệu
          </Button>

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

          <Button type="submit" disabled={!valid} loading={recovery.busy} className="w-full sm:w-auto font-bold">
            Nhập kho · tạo SKU
          </Button>
        </form>
      )}

      {quickAdd && (
        <CatalogEditor
          kind="brand"
          onClose={() => setQuickAdd(false)}
          onSaved={(item) => {
            catalog.refresh();
            setBrand(item.id);
          }}
        />
      )}
    </Card>
  );
}
