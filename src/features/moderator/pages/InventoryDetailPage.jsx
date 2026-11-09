import React, { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import BarcodePrintModal from '../components/BarcodePrintModal.jsx';
import PhotoUpload from '../components/PhotoUpload.jsx';
import { inventoryService } from '../services/warehouseApi.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { listItems } from '../models/warehouseModel.js';
import { Page, Card, Photos, Status, ResourceState, date, money } from '../components/WarehouseUi.jsx';

export default function InventoryDetailPage() {
  const { sku } = useParams();
  const navigate = useNavigate();

  const product = useResource((options) => inventoryService.read(sku, options), [sku], {
    poll: true,
    done: (value) => !value?.photos?.some((photo) => photo.status === 'PROCESSING'),
  });

  const movements = useResource((options) => inventoryService.movements(sku, options), [sku]);

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
            Sản phẩm với mã SKU <strong>{sku}</strong> đang được lưu trữ tại chi nhánh kho khác. Bạn chỉ có quyền kiểm kê và in tem đối với các sản phẩm thuộc kho bạn được phân công.
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
          {/* 1. THẺ THÔNG TIN SẢN PHẨM */}
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

            {/* Bảng thuộc tính chi tiết chuẩn TK-02 */}
            <div className="border border-[#c4c4c4] rounded-xl overflow-hidden divide-y divide-[#e0e0e0] text-xs">
              <div className="flex items-center p-3 gap-3 bg-[#fafafa]">
                <span className="w-28 text-[#5f5f5f] flex-shrink-0">Người ký gửi:</span>
                <span className="text-[#191C19]">
                  <strong className="font-mono">{data.member?.memberCode || data.memberId || 'MB-004821'}</strong> · {data.member?.fullName || 'Ngô Hải F'}
                </span>
              </div>
              <div className="flex items-center p-3 gap-3">
                <span className="w-28 text-[#5f5f5f] flex-shrink-0">Giá bán hiện tại:</span>
                <span className="font-bold text-sm text-[#006B2C]">{money(data.agreedPrice || data.currentPrice)}</span>
              </div>
              <div className="flex items-center p-3 gap-3">
                <span className="w-28 text-[#5f5f5f] flex-shrink-0">Giá sàn:</span>
                <span className="text-[#191C19]">{money(data.floorPrice || Math.round((data.agreedPrice || data.currentPrice || 420000) * 0.5))}</span>
              </div>
              <div className="flex items-center p-3 gap-3 bg-[#fafafa]">
                <span className="w-28 text-[#5f5f5f] flex-shrink-0">Kỳ ký gửi:</span>
                <span className="text-[#191C19] font-medium">
                  Kỳ {data.currentTerm || 1} · ngày {data.daysIntoTerm || 1} / {data.termLengthDays || 30} · hoa hồng {data.currentTerm === 3 ? '20%' : data.currentTerm === 2 ? '15%' : '10%'}
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-[#e5e5e5]">
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

          {/* BANNER XỬ LÝ CUỐI KỲ (L-02 · TK-02) */}
          {(data.decision === 'RE_CONSIGN' || data.allowedActions?.includes('RE_CONSIGN') || data.reConsignStatus === 'PROPOSAL_SENT' || data.status === 'WAITING_END_OF_TERM') && (
            <div className="rounded-2xl border border-neutral bg-[#F8FAF8] p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 bg-[#006B2C] text-white rounded">
                    {data.reConsignStatus === 'PROPOSAL_SENT' ? 'ĐÃ GỬI ĐỀ XUẤT' : 'ĐƯỢC YÊU CẦU KÝ GỬI LẠI'}
                  </span>
                  <h3 className="text-sm font-bold text-[#191C19]">Ký gửi lại cuối kỳ (Hết kỳ 3: 90 ngày)</h3>
                </div>
                <p className="text-xs text-[#5f5f5f]">
                  Member đã chọn ký gửi lại với giá mới. Moderator cần đàm phán giá và tạo biên nhận mới tại quầy.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => navigate(`/moderator/inventory/${encodeURIComponent(sku)}/re-consign`)}
                className="text-xs py-2 px-3.5 font-semibold"
              >
                Đàm phán giá →
              </Button>
            </div>
          )}

          {data.decision === 'TAKE_BACK' && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 bg-amber-800 text-white rounded">
                    ĐƯỢC YÊU CẦU NHẬN LẠI HÀNG
                  </span>
                  <h3 className="text-sm font-bold text-amber-900">Khách đã chọn nhận lại cuối kỳ (miễn phí)</h3>
                </div>
                <p className="text-xs text-amber-800">
                  Khách đã chọn nhận lại hàng{data.takeBackDate ? ` ${date(data.takeBackDate)}` : ''} — còn {data.daysToTakeBack ?? 5} ngày đến quầy lấy. Quá 30 ngày không lấy sẽ thành hàng vô thừa nhận.
                </p>
              </div>
              <Link
                to={
                  (data.member?.memberCode || data.memberCode)
                    ? `/moderator/counter?memberCode=${encodeURIComponent(data.member?.memberCode || data.memberCode)}&refId=${encodeURIComponent(data.id || data.sku || sku || '')}`
                    : '/moderator/counter'
                }
              >
                <Button variant="outline" className="text-xs border-amber-800 text-amber-900 font-bold">
                  Quầy tiếp nhận →
                </Button>
              </Link>
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

                    <div className="flex-1 rounded-xl border border-neutral bg-background p-4 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${movement.badgeClass || 'bg-background text-text border-neutral'
                            }`}
                        >
                          {movement.label || movement.type}
                        </span>
                        <span className="text-[11px] text-textSecondary">
                          {date(movement.createdAt)}
                        </span>
                      </div>

                      <div className="text-sm font-bold text-text">
                        {movement.locationText || '—'}
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
      )
      }

      {/* Modal In tem mã vạch SKU */}
      <BarcodePrintModal isOpen={print} onClose={() => setPrint(false)} item={data} />
    </Page >
  );
}
