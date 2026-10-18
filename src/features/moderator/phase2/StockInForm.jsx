import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import { catalogService, inventoryService } from './api.js';
import { useResource } from './hooks.jsx';
import { canStockIn } from './model.js';
import { Card, Field, ResourceState } from './ui.jsx';
import PhotoUpload from './PhotoUpload.jsx';
import CatalogEditor from './CatalogEditor.jsx';

function stockInChoices(data) {
  return {
    categories: data?.categories?.filter((item) => !item.hidden) || [],
    brands: data?.brands?.filter((item) => !item.hidden) || [],
  };
}

function readyForStockIn(receipt, recovery, uncertain) {
  return (
    canStockIn(receipt) && recovery.data?.checked && !recovery.data.product &&
    !recovery.error && !uncertain
  );
}

function validStockFields(values, choices) {
  return (
    values.name.trim() && values.size.trim() && values.shelf.trim() &&
    choices.categories.some((item) => item.id === values.categoryId) &&
    choices.brands.some((item) => item.id === values.brandId)
  );
}

function StockInFields({ values, setField, choices, error }) {
  const { name, size, shelf, categoryId, brandId } = values;
  const { categories, brands } = choices;
  const errors = error?.fields || {};
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Tên sản phẩm"
        required
        value={name}
        onChange={(event) => setField('name', event.target.value)}
        error={errors.name}
      />
      <Field
        label="Size"
        required
        value={size}
        onChange={(event) => setField('size', event.target.value)}
        error={errors.size}
      />
      <Field
        label="Vị trí kệ"
        required
        value={shelf}
        onChange={(event) => setField('shelf', event.target.value)}
        error={errors.shelfLocation}
      />
      <Field label="Danh mục">
        <select
          className="w-full rounded-xl border-neutral"
          required
          value={categoryId}
          onChange={(event) => setField('categoryId', event.target.value)}
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
          required
          value={brandId}
          onChange={(event) => setField('brandId', event.target.value)}
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
  );
}

export default function StockInForm({ receipt, onSuccess }) {
  const catalog = useResource((options) => catalogService.list(options), []);
  const recovery = useResource(
    async (options) => ({
      checked: true,
      product: await inventoryService.byReceipt(receipt.receiptId, options),
    }),
    [receipt.receiptId],
  );
  const [values, setValues] = useState({
    name: '', size: '', shelf: '', categoryId: '', brandId: '',
  });
  const { name, size, shelf, categoryId, brandId } = values;
  const setField = (key, value) => setValues((previous) => ({ ...previous, [key]: value }));
  const [quickAdd, setQuickAdd] = useState(false);
  const [photos, setPhotos] = useState([]),
    [photosPending, setPhotosPending] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const onPhotos = useCallback((urls, pending) => {
    setPhotos(urls);
    setPhotosPending(pending);
  }, []);
  const choices = stockInChoices(catalog.data);
  const valid =
    readyForStockIn(receipt, recovery, uncertain) &&
    validStockFields(values, choices) && photos.length && !photosPending;
  return (
    <Card title="Nhập kho từ biên nhận đã xác nhận">
      <ResourceState resource={catalog} />
      <ResourceState resource={recovery} />
      {recovery.data?.product ? (
        <Link
          className="text-primary underline"
          to={`/moderator/inventory/${encodeURIComponent(recovery.data.product.sku)}`}
        >
          Sản phẩm đã tồn tại · {recovery.data.product.sku}
        </Link>
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
                    receiptId: receipt.receiptId,
                    name: name.trim(),
                    size: size.trim(),
                    shelfLocation: shelf.trim(),
                    categoryId,
                    brandId,
                    photoUrls: photos,
                  },
                  options,
                ),
              { onSuccess, onUncertain: () => setUncertain(true) },
            );
          }}
        >
          <StockInFields
            values={values}
            setField={setField}
            choices={choices}
            error={recovery.error}
          />
          <Button variant="outline" onClick={() => setQuickAdd(true)}>
            Thêm nhanh thương hiệu
          </Button>
          <PhotoUpload disabled={recovery.busy} onChange={onPhotos} />
          {uncertain && (
            <div role="alert" className="space-y-2">
              <p>
                Chưa xác định được kết quả nhập kho. Hãy kiểm tra sản phẩm đã tạo trước khi gửi
                tiếp.
              </p>
              <Button
                variant="outline"
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
          <Button type="submit" disabled={!valid} loading={recovery.busy}>
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
            setField('brandId', item.id);
          }}
        />
      )}
    </Card>
  );
}
