import React, { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import BarcodePrintModal from '../components/BarcodePrintModal.jsx';
import PhotoUpload from '../components/PhotoUpload.jsx';
import { inventoryService } from '../services/warehouseApi.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { listItems } from '../models/warehouseModel.js';
import { Page, Card, Field, Photos, Status, ResourceState, date, money } from '../components/WarehouseUi.jsx';

export default function InventoryDetailPage() {
  const { sku } = useParams();
  const product = useResource((options) => inventoryService.read(sku, options), [sku], {
    poll: true,
    done: (value) => !value?.photos?.some((photo) => photo.status === 'PROCESSING'),
  });
  const movements = useResource((options) => inventoryService.movements(sku, options), [sku]);
  const [shelf, setShelf] = useState(''),
    [print, setPrint] = useState(false),
    [photoUrls, setPhotos] = useState([]),
    [uploadPending, setPending] = useState(false),
    [uploadVersion, setUploadVersion] = useState(0);
  const onPhotos = useCallback((urls, pending) => {
    setPhotos(urls);
    setPending(pending);
  }, []);
  const data = product.data;
  return (
    <Page
      title="Chi tiết sản phẩm"
      subtitle={sku}
      actions={
        <Button
          variant="outline"
          onClick={() => {
            product.refresh();
            movements.refresh();
          }}
        >
          Tải lại
        </Button>
      }
    >
      <ResourceState resource={product} />
      {data && (
        <>
          <Card title={data.name}>
            <Status>{data.status}</Status>
            <p>SKU: {data.sku}</p>
            <p>
              Giá: {money(data.agreedPrice)} · Size: {data.size} · Kệ: {data.shelfLocation}
            </p>
            <Photos photos={data.photos} />
            <Button onClick={() => setPrint(true)}>Mở / in lại tem</Button>
          </Card>
          {data.allowedActions?.includes('CHANGE_SHELF') && (
            <Card title="Chuyển kệ">
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  product.mutate((options) => inventoryService.shelf(sku, shelf.trim(), options), {
                    onSuccess: () => {
                      movements.refresh();
                      setShelf('');
                    },
                  });
                }}
              >
                <Field
                  label="Kệ mới"
                  value={shelf}
                  required
                  onChange={(event) => setShelf(event.target.value)}
                  error={product.error?.fields?.shelfLocation}
                />
                <Button type="submit" loading={product.busy} disabled={!shelf.trim()}>
                  Lưu vị trí kệ
                </Button>
              </form>
            </Card>
          )}
          {data.allowedActions?.includes('ADD_PHOTOS') && (
            <Card title="Bổ sung ảnh">
              <PhotoUpload key={uploadVersion} disabled={product.busy} onChange={onPhotos} />
              <Button
                disabled={!photoUrls.length || uploadPending}
                loading={product.busy}
                onClick={() =>
                  product.mutate((options) => inventoryService.addPhotos(sku, photoUrls, options), {
                    onSuccess: () => {
                      setPhotos([]);
                      setUploadVersion((version) => version + 1);
                    },
                  })
                }
              >
                Lưu ảnh bổ sung
              </Button>
              <p className="text-sm text-textSecondary">
                Ảnh tách nền được cập nhật theo kết quả xử lý của máy chủ.
              </p>
            </Card>
          )}
          <Card title="Lịch sử biến động kho">
            <ResourceState resource={movements} empty={!listItems(movements.data).length} />
            {listItems(movements.data).map((movement, index) => (
              <div
                className="border-b border-neutral py-2 text-sm"
                key={movement.movementId || index}
              >
                <p>
                  {movement.type} · {movement.shelfLocation || movement.partnerName}
                </p>
                <p className="text-textSecondary">{date(movement.createdAt)}</p>
              </div>
            ))}
          </Card>
        </>
      )}
      <BarcodePrintModal isOpen={print} onClose={() => setPrint(false)} item={data} />
    </Page>
  );
}
