import React, { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import BarcodePrintModal from '../components/BarcodePrintModal.jsx';
import PhotoUpload from '../components/PhotoUpload.jsx';
import { inventoryService } from '../services/warehouseApi.js';
import returnService from '../services/returnApi.js';
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

  // Modal lập biên bản hàng xuống cấp (TK-02)
  const [degradedModalOpen, setDegradedModalOpen] = useState(false);
  const [degradedNotes, setDegradedNotes] = useState('');
  const [degradedPhotos, setDegradedPhotos] = useState([]);
  const [degradedUploadPending, setDegradedUploadPending] = useState(false);
  const [isSubmittingDegraded, setIsSubmittingDegraded] = useState(false);
  const [degradedSubmitted, setDegradedSubmitted] = useState(false);

  const onPhotos = useCallback((urls, pending) => {
    setPhotos(urls);
    setPending(pending);
  }, []);

  const onDegradedPhotos = useCallback((urls, pending) => {
    setDegradedPhotos(urls);
    setDegradedUploadPending(pending);
  }, []);

  const data = product.data;
  const movementList = listItems(movements.data);

  const handleCopySku = () => {
    if (!sku) return;
    navigator.clipboard?.writeText(sku);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Bảng tính mức đền bù theo kỳ ký gửi hiện tại (TK-02)
  const currentTerm = data?.currentTerm || 1;
  const commissionRate = currentTerm === 3 ? 0.20 : currentTerm === 2 ? 0.15 : 0.10;
  const sellingPrice = data?.agreedPrice || data?.currentPrice || 0;
  const compensation100 = Math.max(0, Math.round(sellingPrice * (1 - commissionRate)));
  const compensation50 = Math.round(compensation100 * 0.5);

  const handleSendDegradedProposal = async () => {
    if (!degradedNotes.trim()) {
      alert('Vui lòng nhập mô tả chi tiết hư hỏng hoặc nguyên nhân xuống cấp.');
      return;
    }
    if (!degradedPhotos.length) {
      alert('Vui lòng tải lên ít nhất 1 ảnh hiện trạng hư hỏng.');
      return;
    }
    setIsSubmittingDegraded(true);
    try {
      await returnService.createDegradedCase({
        productId: data?.id || data?.sku || sku,
        notes: degradedNotes.trim(),
        photos: degradedPhotos,
      });
      setDegradedModalOpen(false);
      setDegradedSubmitted(true);
      product.refresh();
    } catch (err) {
      alert(err.message || 'Lỗi khi gửi đề xuất hàng xuống cấp.');
    } finally {
      setIsSubmittingDegraded(false);
    }
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
                  onClick={() => setDegradedModalOpen(true)}
                  variant="outline"
                  className="border-red-600 text-red-600 hover:bg-red-50 font-bold py-2 px-4 shadow-sm"
                >
                  Hàng xuống cấp
                </Button>
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
                  <strong className="font-mono">{data.member?.memberCode || data.memberCode || data.memberId || '—'}</strong> · {data.member?.fullName || data.memberName || 'Chưa có thông tin'}
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

          {/* BANNER HÀNG XUỐNG CẤP (TK-02) */}
          {(degradedSubmitted || data.status === 'PLATFORM_OWNED' || data.degradedCaseStatus) && (
            <div className={`rounded-2xl border p-5 shadow-sm flex flex-wrap items-center justify-between gap-4 ${
              data.status === 'PLATFORM_OWNED' ? 'border-purple-300 bg-purple-50' : 'border-amber-300 bg-amber-50'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 text-white rounded ${
                    data.status === 'PLATFORM_OWNED' ? 'bg-purple-800' : 'bg-amber-800'
                  }`}>
                    {data.status === 'PLATFORM_OWNED' ? 'TÀI SẢN NỀN TẢNG (PLATFORM_OWNED)' : 'ĐÃ GỬI ĐỀ XUẤT HÀNG XUỐNG CẤP'}
                  </span>
                  <h3 className={`text-sm font-bold ${
                    data.status === 'PLATFORM_OWNED' ? 'text-purple-900' : 'text-amber-900'
                  }`}>
                    {data.status === 'PLATFORM_OWNED'
                      ? 'Món hàng đã thuộc quyền sở hữu của ReHome (Đã đền 100%)'
                      : 'Đã gửi, chờ người ký gửi chọn'}
                  </h3>
                </div>
                <p className={`text-xs ${
                  data.status === 'PLATFORM_OWNED' ? 'text-purple-800' : 'text-amber-800'
                }`}>
                  {data.status === 'PLATFORM_OWNED'
                    ? 'Member đã nhận 100% tiền bồi thường. Sản phẩm đang chờ Moderator quyết định thanh lý hoặc tiêu hủy.'
                    : 'Biên bản đã được gửi cho Member. Member có 7 ngày để lựa chọn phương án trên app (quá hạn tự động chọn nhận đền bù 100%).'}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate('/moderator/inventory?status=DEGRADED')}
                className={`text-xs font-bold ${
                  data.status === 'PLATFORM_OWNED'
                    ? 'border-purple-800 text-purple-900'
                    : 'border-amber-800 text-amber-900'
                }`}
              >
                Xem tại tab Hàng xuống cấp →
              </Button>
            </div>
          )}

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

      {/* Modal Lập biên bản hàng xuống cấp tại kho (TK-02) */}
      {degradedModalOpen && (
        <Modal
          isOpen={degradedModalOpen}
          onClose={() => !isSubmittingDegraded && setDegradedModalOpen(false)}
          title="Lập biên bản hàng xuống cấp (TK-02)"
        >
          <div className="space-y-4 max-w-lg text-xs">
            <div className="p-3 bg-[#fafafa] rounded-xl border border-[#e0e0e0] space-y-1">
              <div className="flex justify-between">
                <span className="text-[#5f5f5f]">Mã SKU:</span>
                <span className="font-mono font-bold text-[#191C19]">{sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5f5f5f]">Tên sản phẩm:</span>
                <span className="font-bold text-[#191C19]">{data?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5f5f5f]">Giá bán niêm yết:</span>
                <span className="font-bold text-[#006B2C]">{money(sellingPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5f5f5f]">Kỳ ký gửi hiện tại:</span>
                <span className="font-semibold text-[#191C19]">
                  Kỳ {currentTerm} (Khấu trừ hoa hồng {commissionRate * 100}%)
                </span>
              </div>
            </div>

            {/* Bảng tính tự động mức đền bù */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-[#006B2C] bg-[#E8F5E9]/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#006B2C]">
                  Phương án 1 · Đền 100%
                </span>
                <p className="text-base font-extrabold text-[#006B2C]">
                  {money(compensation100)}
                </p>
                <p className="text-[10px] text-[#5f5f5f] leading-tight">
                  = Giá bán − {commissionRate * 100}% hoa hồng kỳ {currentTerm}. Hàng chuyển thành tài sản nền tảng.
                </p>
              </div>
              <div className="p-3 rounded-xl border border-[#D97706] bg-[#FFFBEB] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#D97706]">
                  Phương án 2 · Đền 50% + Nhận lại
                </span>
                <p className="text-base font-extrabold text-[#D97706]">
                  {money(compensation50)}
                </p>
                <p className="text-[10px] text-[#5f5f5f] leading-tight">
                  = 50% mức đền đề xuất. Member nhận tiền và đến quầy nhận lại hàng.
                </p>
              </div>
            </div>

            {/* Mô tả hư hỏng */}
            <div className="space-y-1">
              <label className="block font-bold text-[#191C19]">
                Mô tả hiện trạng hư hỏng / nguyên nhân xuống cấp <span className="text-red-600">*</span>
              </label>
              <textarea
                rows={3}
                value={degradedNotes}
                onChange={(e) => setDegradedNotes(e.target.value)}
                placeholder="VD: Sản phẩm bị ẩm mốc góc dưới, xước mặt kính hoặc sờn rách trong quá trình lưu kho..."
                className="w-full rounded-xl border border-[#8a8a8a] p-2.5 text-xs text-[#191C19] focus:border-[#006B2C] focus:outline-none"
              />
            </div>

            {/* Upload ảnh hư hỏng thực tế */}
            <div className="space-y-1">
              <label className="block font-bold text-[#191C19]">
                Ảnh chụp hiện trạng hư hỏng thực tế <span className="text-red-600">*</span>
              </label>
              <PhotoUpload onChange={onDegradedPhotos} disabled={isSubmittingDegraded} />
              {degradedPhotos.length > 0 && (
                <p className="text-[11px] text-[#006B2C] font-semibold">
                  ✓ Đã tải lên {degradedPhotos.length} ảnh bằng chứng
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#e0e0e0]">
              <Button
                variant="outline"
                disabled={isSubmittingDegraded}
                onClick={() => setDegradedModalOpen(false)}
                className="px-3.5 py-1.5 text-xs"
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                loading={isSubmittingDegraded}
                disabled={isSubmittingDegraded || degradedUploadPending || !degradedNotes.trim() || !degradedPhotos.length}
                onClick={handleSendDegradedProposal}
                className="px-4 py-1.5 text-xs font-bold bg-[#006B2C] hover:bg-[#005221]"
              >
                Gửi đề xuất cho người ký gửi
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Page >
  );
}
