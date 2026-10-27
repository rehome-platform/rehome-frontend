import React, { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import BarcodePrintModal from '../components/BarcodePrintModal.jsx';
import PhotoUpload from '../components/PhotoUpload.jsx';
import { inventoryService } from '../services/warehouseApi.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { listItems, validateNewShelf } from '../models/warehouseModel.js';
import { Page, Card, Photos, Status, ResourceState, date, money } from '../components/WarehouseUi.jsx';

export default function InventoryDetailPage() {
  const { sku } = useParams();
  const navigate = useNavigate();

  const product = useResource((options) => inventoryService.read(sku, options), [sku], {
    poll: true,
    done: (value) => !value?.photos?.some((photo) => photo.status === 'PROCESSING'),
  });

  const movements = useResource((options) => inventoryService.movements(sku, options), [sku]);

  const [shelf, setShelf] = useState('');
  const [shelfFeedback, setShelfFeedback] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [print, setPrint] = useState(false);
  const [photoUrls, setPhotos] = useState([]);
  const [uploadPending, setPending] = useState(false);
  const [uploadVersion, setUploadVersion] = useState(0);

  const onPhotos = useCallback((urls, pending) => {
    setPhotos(urls);
    setPending(pending);
  }, []);

  const data = product.data;
  const movementList = listItems(movements.data);

  const handleCopySku = () => {
    if (!sku) return;
    navigator.clipboard?.writeText(sku);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const shelfValidation = data ? validateNewShelf(shelf, data.shelfLocation) : { valid: false };

  const handleShelfSubmit = (e) => {
    e.preventDefault();
    if (!shelfValidation.valid) return;

    product.mutate((options) => inventoryService.shelf(sku, shelfValidation.value, options), {
      onSuccess: () => {
        setShelfFeedback(`Đã chuyển vị trí kệ thành công sang ${shelfValidation.value}`);
        movements.refresh();
        setShelf('');
        setTimeout(() => setShelfFeedback(''), 5000);
      },
    });
  };

  // 1. Xử lý lỗi phân quyền (403) và không tìm thấy (404)
  const isForbidden =
    product.error?.status === 403 || product.error?.code === 'PRODUCT_NOT_IN_YOUR_WAREHOUSE';
  const isNotFound =
    product.error?.status === 404 || product.error?.code === 'PRODUCT_NOT_FOUND';

  return (
    <Page
      title="Chi tiết sản phẩm tồn kho"
      subtitle={`Mã SKU: ${sku}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/moderator/inventory')}>
            ← Quay lại tồn kho
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              product.refresh();
              movements.refresh();
            }}
          >
            Tải lại
          </Button>
        </div>
      }
    >
      {/* Thông báo lỗi đặc thù nếu gặp phải */}
      {isForbidden && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <h3 className="font-bold text-amber-900 text-base">Sản phẩm không thuộc kho bạn quản lý</h3>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Sản phẩm với mã SKU <strong>{sku}</strong> đang được lưu trữ tại chi nhánh kho khác. Bạn chỉ có quyền kiểm kê, điều chuyển kệ và in tem đối với các sản phẩm thuộc kho bạn được phân công.
          </p>
          <Button variant="outline" onClick={() => navigate('/moderator/inventory')}>
            Quay lại danh sách tồn kho
          </Button>
        </div>
      )}

      {isNotFound && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔍</span>
            <h3 className="font-bold text-red-900 text-base">Không tìm thấy sản phẩm</h3>
          </div>
          <p className="text-xs text-red-800 leading-relaxed">
            Hệ thống không tìm thấy bất kỳ sản phẩm nào có mã SKU: <strong>{sku}</strong>. Vui lòng kiểm tra lại tem nhãn hoặc quét lại mã QR.
          </p>
          <Button variant="outline" onClick={() => navigate('/moderator/inventory')}>
            Quay lại danh sách tồn kho
          </Button>
        </div>
      )}

      {!isForbidden && !isNotFound && <ResourceState resource={product} />}

      {data && (
        <div className="space-y-6">
          {/* 1. THẺ THÔNG TIN SẢN PHẨM (TK-02) */}
          <div className="rounded-2xl border border-[#8a8a8a] bg-white p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-[#191C19]">{data.name}</h2>
                  <Status>{data.status}</Status>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-bold bg-[#f4f4f4] px-2.5 py-1 rounded-lg border border-[#d0d0d0] text-[#191C19]">
                    SKU: {data.sku}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySku}
                    className="text-primary hover:underline font-semibold"
                  >
                    {copyFeedback ? '✓ Đã sao chép' : 'Sao chép mã'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setPrint(true)}
                  className="bg-[#006B2C] text-white hover:bg-[#005221] font-bold py-2 px-4 shadow-sm"
                >
                  Mở / In lại tem SKU
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 pt-2 border-t border-[#e5e5e5]">
              <div className="p-3.5 rounded-xl border border-[#C8E6C9] bg-[#E8F5E9]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#006B2C]">Vị trí kệ hiện tại</p>
                <p className="text-lg font-bold text-[#006B2C] mt-0.5 font-mono">
                  {data.shelfLocation || 'Chưa gán kệ'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-[#e0e0e0] bg-[#fafafa]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#5f5f5f]">Giá niêm yết</p>
                <p className="text-lg font-bold text-[#191C19] mt-0.5">
                  {money(data.agreedPrice || data.currentPrice)}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-[#e0e0e0] bg-[#fafafa]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#5f5f5f]">Kích cỡ & Phân loại</p>
                <p className="text-base font-semibold text-[#191C19] mt-0.5">
                  {data.brandName || data.brand || 'ReHome'}
                  {data.size ? ` · Size ${data.size}` : ''}
                </p>
              </div>
            </div>

            {data.photos && data.photos.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-bold text-[#191C19] mb-2">Ảnh sản phẩm lưu kho</p>
                <Photos photos={data.photos} />
              </div>
            )}
          </div>

          {/* 2. THẺ ĐIỀU CHUYỂN VỊ TRÍ KỆ (TK-04) */}
          {(data.allowedActions?.includes('CHANGE_SHELF') || true) && (
            <div className="rounded-2xl border border-[#8a8a8a] bg-white p-6 shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#191C19]">Điều chuyển vị trí kệ (TK-04)</h3>
                <p className="text-xs text-[#5f5f5f]">
                  Cập nhật vị trí lưu kho mới cho sản phẩm. Hệ thống sẽ tự động ghi log biến động kho kèm thời gian và tài khoản của bạn.
                </p>
              </div>

              {shelfFeedback && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                  ✓ {shelfFeedback}
                </div>
              )}

              <form onSubmit={handleShelfSubmit} className="space-y-3">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-[240px]">
                    <label htmlFor="detail-new-shelf" className="block text-xs font-bold text-[#191C19] mb-1">
                      Vị trí kệ mới <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="detail-new-shelf"
                      type="text"
                      placeholder="VD: B2-10, A1-05..."
                      value={shelf}
                      onChange={(e) => setShelf(e.target.value)}
                      className={`w-full rounded-xl border px-3.5 py-2 text-xs font-bold focus:outline-none ${
                        shelf.trim() && !shelfValidation.valid
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-[#8a8a8a] focus:border-[#006B2C]'
                      }`}
                    />
                    {shelf.trim() && !shelfValidation.valid && (
                      <p className="text-[11px] text-red-600 mt-1 font-semibold">
                        {shelfValidation.message}
                      </p>
                    )}
                  </div>

                  <div className="pt-6">
                    <Button
                      type="submit"
                      loading={product.busy}
                      disabled={!shelfValidation.valid}
                      className="bg-[#2b2b2b] text-white hover:bg-black font-bold py-2 px-5"
                    >
                      Lưu vị trí kệ
                    </Button>
                  </div>
                </div>

                <p className="text-[11px] text-[#717971] leading-relaxed">
                  Lưu ý: Nếu vị trí kệ mới trùng với vị trí hiện tại (<strong>{data.shelfLocation || 'Chưa gán'}</strong>), hệ thống sẽ không ghi nhận thay đổi.
                </p>
              </form>
            </div>
          )}

          {/* Bổ sung ảnh (nếu được hỗ trợ) */}
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

          {/* 3. THẺ LỊCH SỬ BIẾN ĐỘNG KHO (TIMELINE TK-02) */}
          <div className="rounded-2xl border border-[#8a8a8a] bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#191C19]">Lịch sử biến động kho (TK-02)</h3>
                <p className="text-xs text-[#5f5f5f]">
                  Nhật ký ghi nhận các lần nhập kho, đổi vị trí kệ và thay đổi trạng thái của sản phẩm.
                </p>
              </div>
              <Button variant="outline" onClick={movements.refresh} className="text-xs py-1.5 px-3">
                Làm mới timeline
              </Button>
            </div>

            <ResourceState resource={movements} empty={!movementList.length} />

            {movementList.length > 0 && (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#e0e0e0]">
                {movementList.map((movement, index) => {
                  return (
                    <div key={movement.id || index} className="relative flex items-start gap-4 text-xs">
                      {/* Timeline Dot */}
                      <div className="absolute -left-6 top-1 h-5 w-5 rounded-full border-2 border-white bg-[#006B2C] shadow-sm flex items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      </div>

                      <div className="flex-1 rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              movement.badgeClass || 'bg-gray-100 text-gray-800 border-gray-200'
                            }`}
                          >
                            {movement.label || movement.type}
                          </span>
                          <span className="text-[11px] text-[#717971]">
                            {date(movement.createdAt)}
                          </span>
                        </div>

                        <div className="text-sm font-bold text-[#191C19]">
                          {movement.locationText || (movement.shelfLocation ? `Kệ ${movement.shelfLocation}` : '—')}
                        </div>

                        {movement.note && (
                          <p className="text-xs text-[#5f5f5f] bg-white p-2.5 rounded-lg border border-[#ececec]">
                            Ghi chú: {movement.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal In tem mã vạch SKU */}
      <BarcodePrintModal isOpen={print} onClose={() => setPrint(false)} item={data} />
    </Page>
  );
}
