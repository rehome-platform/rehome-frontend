import DegradedCaseDetails from '../DegradedCaseDetails.jsx';
import { DEGRADED_DECISION_POLICY } from '../../models/degradedCaseModel.js';
import { ReturnQueueRow } from './ReturnQueueRow.jsx';
import React from "react";
import { Button, Modal } from "../../../../components/common/index.js";
import { formatCurrencyVND } from "../../../../utils/formatters.js";
import { formatDeadlineWithCountdown } from "../WarehouseUi.jsx";
import { ReturnEvidence } from './ReturnEvidence.jsx';
import { useToast } from "../../../../context/ToastContext.jsx";

export function ReturnCompareDialog({ isCompareModalOpen, setIsCompareModalOpen, selectedItem }) {
  if (!selectedItem) return null;
  const stockPhotos = selectedItem.stockInPhotos || [];
  const buyerPhotos = selectedItem.buyerPhotos || [];

  return (
    <Modal
      isOpen={isCompareModalOpen}
      onClose={() => setIsCompareModalOpen(false)}
      title="So sánh ảnh nhập kho vs ảnh người mua gửi"
    >
      <div className="space-y-4 font-sans text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-bold text-text mb-2">Ảnh lưu trữ khi nhập kho</div>
            {stockPhotos.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {stockPhotos.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Ảnh nhập kho ${i + 1}`}
                    className="w-full h-64 object-contain rounded-xl border border-neutral bg-background"
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#717971]">Chưa có ảnh nhập kho</p>
            )}
          </div>
          <div>
            <div className="font-bold text-text mb-2">Ảnh người mua chụp gửi</div>
            {buyerPhotos.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {buyerPhotos.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Ảnh người mua ${i + 1}`}
                    className="w-full h-64 object-contain rounded-xl border border-neutral bg-background"
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#717971]">Chưa có ảnh người mua</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <Button size="sm" variant="outline" className="rounded-xl border-neutral" onClick={() => setIsCompareModalOpen(false)}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ReturnOutcomeDialog({
  isOutcomeModalOpen,
  setIsOutcomeModalOpen,
  handleConfirmOutcome,
  selectedItem,
}) {
  const [selectedOutcome, setSelectedOutcome] = React.useState(null);
  const [discardReason, setDiscardReason] = React.useState('');

  React.useEffect(() => {
    if (isOutcomeModalOpen) {
      setSelectedOutcome(null);
      setDiscardReason('');
    }
  }, [isOutcomeModalOpen]);

  const price = selectedItem?.consignPrice ?? selectedItem?.amount ?? selectedItem?.itemPrice ?? null;
  const rawCommission = selectedItem?.commissionRate;
  const commissionRate = rawCommission != null
    ? (Number(rawCommission) <= 1 ? Number((Number(rawCommission) * 100).toPrecision(15)) : Number(rawCommission))
    : null;
  const currentTerm = selectedItem?.currentTerm ?? selectedItem?.term ?? null;
  const daysInTerm = selectedItem?.daysIntoTerm ?? selectedItem?.daysInTerm ?? null;
  const totalDaysInTerm = selectedItem?.termLengthDays ?? null;
  const consignorCode = selectedItem?.sellerCode || selectedItem?.consignorCode || selectedItem?.senderCode || selectedItem?.sellerName || '—';
  const itemSku = selectedItem?.sku || selectedItem?.productId || selectedItem?.productCode || '—';
  const itemName = selectedItem?.itemName || selectedItem?.productName || 'Sản phẩm ký gửi';
  const itemPhoto =
    selectedItem?.stockInPhotos?.[0] ||
    selectedItem?.productImage ||
    selectedItem?.photos?.[0] ||
    null;

  const onConfirm = () => {
    if (!selectedOutcome) return;
    if (selectedOutcome === 'DISCARD' && !discardReason.trim()) {
      alert('Vui lòng nhập lý do tiêu huỷ món hàng.');
      return;
    }
    handleConfirmOutcome(selectedOutcome, selectedOutcome === 'DISCARD' ? { discardReason: discardReason.trim() } : undefined);
  };

  return (
    <Modal
      isOpen={isOutcomeModalOpen}
      onClose={() => setIsOutcomeModalOpen(false)}
      title="Chọn phương án xử lý món hàng (TH-04)"
      size="xl"
    >
      <div className="space-y-5 text-xs font-sans">
        {/* Top Header Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral pb-3">
          <div>
            <div className="text-sm font-bold text-[#191C19]">
              {selectedItem?.code || 'YC-00084'} · Quyết định xử lý món hàng
            </div>
            <p className="text-[11px] text-textSecondary mt-0.5">
              Quyết định riêng với việc hoàn tiền. Đã hoàn tiền không có nghĩa là phải bỏ món.
            </p>
          </div>
          <span className="text-[10px] font-extrabold px-3 py-1 bg-[#2b2b2b] text-white rounded tracking-wide uppercase self-start sm:self-auto">
            ĐÃ HOÀN TIỀN NGƯỜI MUA
          </span>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Cột trái (7 cols): 3 Lựa chọn phương án */}
          <div className="lg:col-span-7 space-y-3">
            <div className="font-bold text-sm text-[#191C19] flex items-center justify-between">
              <span>Món hàng này xử lý thế nào</span>
              <span className="text-[11px] font-semibold text-textSecondary">Bước 1 / 2</span>
            </div>

            {/* Option 1: RELIST */}
            <div
              className={`p-3.5 rounded-xl border-2 transition-all ${
                selectedOutcome === 'RELIST'
                  ? 'border-[#2b2b2b] bg-[#fafafa] shadow-sm'
                  : 'border-neutral bg-surface hover:bg-background'
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedOutcome('RELIST')}
                className="w-full text-left"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedOutcome === 'RELIST' ? 'border-[#2b2b2b]' : 'border-[#8a8a8a]'
                    }`}
                  >
                    {selectedOutcome === 'RELIST' && (
                      <span className="w-2 h-2 rounded-full bg-[#2b2b2b]" />
                    )}
                  </span>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-primary">Đăng bán lại (Relist)</div>
                    <p className="text-[11px] text-textSecondary mt-0.5 leading-relaxed">
                      Món còn tốt, đủ điều kiện lên sàn. Quay về trạng thái ký gửi của chủ cũ.
                    </p>
                  </div>
                </div>
              </button>
              <div className="mt-2.5 ml-6 p-2.5 bg-surface rounded-lg border border-neutral text-[11px] leading-relaxed text-[#4a4a4a]">
                Kỳ và hoa hồng <strong className="font-bold text-[#191C19]">tiếp tục từ chỗ đang dở</strong>
                {currentTerm != null ? ` (kỳ ${currentTerm}${daysInTerm != null ? `, ngày thứ ${daysInTerm}` : ''})` : ''}, không tính lại từ đầu — nếu tính lại thì người ký gửi được lợi từ một giao dịch hỏng. Giữ nguyên SKU và tem cũ, không in lại.
              </div>
            </div>

            {/* Option 2: RETURN_TO_SELLER */}
            <div
              className={`p-3.5 rounded-xl border-2 transition-all ${
                selectedOutcome === 'RETURN_TO_SELLER'
                  ? 'border-[#2b2b2b] bg-[#fafafa] shadow-sm'
                  : 'border-neutral bg-surface hover:bg-background'
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedOutcome('RETURN_TO_SELLER')}
                className="w-full text-left"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedOutcome === 'RETURN_TO_SELLER' ? 'border-[#2b2b2b]' : 'border-[#8a8a8a]'
                    }`}
                  >
                    {selectedOutcome === 'RETURN_TO_SELLER' && (
                      <span className="w-2 h-2 rounded-full bg-[#2b2b2b]" />
                    )}
                  </span>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-[#191C19]">Hoàn trả cho người ký gửi</div>
                    <p className="text-[11px] text-textSecondary mt-0.5 leading-relaxed">
                      Món không còn bán được nhưng vẫn là tài sản của họ.
                    </p>
                  </div>
                </div>
              </button>
              <div className="mt-2.5 ml-6 p-2.5 bg-surface rounded-lg border border-neutral text-[11px] leading-relaxed text-[#4a4a4a]">
                Member nhận thông báo và có <strong className="font-bold text-[#191C19]">30 ngày</strong> tới kho lấy, như hàng cuối kỳ. Quá hạn thì thành hàng vô chủ theo quy định mục 11.
              </div>
            </div>

            {/* Option 3: DISCARD */}
            <div
              className={`p-3.5 rounded-xl border-2 transition-all ${
                selectedOutcome === 'DISCARD'
                  ? 'border-[#2b2b2b] bg-[#fafafa] shadow-sm'
                  : 'border-neutral bg-surface hover:bg-background'
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedOutcome('DISCARD')}
                className="w-full text-left"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedOutcome === 'DISCARD' ? 'border-[#2b2b2b]' : 'border-[#8a8a8a]'
                    }`}
                  >
                    {selectedOutcome === 'DISCARD' && (
                      <span className="w-2 h-2 rounded-full bg-[#2b2b2b]" />
                    )}
                  </span>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-error">Tiêu huỷ</div>
                    <p className="text-[11px] text-textSecondary mt-0.5 leading-relaxed">
                      Hàng hỏng nặng, mất vệ sinh, hoặc xác định là hàng giả.
                    </p>
                  </div>
                </div>
              </button>
              <div className="mt-2.5 ml-6 p-2.5 bg-surface rounded-lg border border-neutral text-[11px] leading-relaxed text-[#4a4a4a]">
                Phải có <strong className="font-bold text-[#191C19]">lý do và ảnh</strong>, và Member được báo kèm ảnh đó. Ca hàng giả bắt buộc hai Moderator cùng kết luận trước khi tới bước này.
              </div>
              {selectedOutcome === 'DISCARD' && (
                <div className="mt-3 ml-6 space-y-1.5 pt-2 border-t border-neutral">
                  <label className="block text-[11px] font-bold text-error">
                    Lý do tiêu huỷ (bắt buộc):
                  </label>
                  <textarea
                    rows={2}
                    value={discardReason}
                    onChange={(e) => setDiscardReason(e.target.value)}
                    placeholder="Ghi rõ tình trạng hỏng hóc hoặc lý do bắt buộc tiêu huỷ..."
                    className="w-full p-2 text-xs border border-neutral rounded-lg focus:outline-none focus:border-error bg-surface"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Cột phải (5 cols): Tóm tắt món đồ & Hệ quả theo Wireframe TH-04 */}
          <div className="lg:col-span-5 space-y-3.5">
            {/* Box 1: Thông tin món */}
            <div className="border border-neutral rounded-xl overflow-hidden bg-surface shadow-sm">
              <div className="p-3 flex items-center gap-3 border-b border-neutral">
                {itemPhoto ? (
                  <img
                    src={itemPhoto}
                    alt={itemName}
                    className="w-12 h-14 object-cover rounded-lg border border-neutral shrink-0"
                  />
                ) : (
                  <div className="w-12 h-14 rounded-lg border border-dashed border-neutral bg-background flex items-center justify-center text-[9px] text-textSecondary shrink-0">
                    Ảnh
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#191C19]">{itemSku}</div>
                  <div className="text-[11px] text-textSecondary truncate">{itemName}</div>
                </div>
              </div>
              <div className="p-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-textSecondary">Kết luận kiểm tra:</span>
                  <span className="font-bold text-primary">Hợp lệ, còn tốt</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Người ký gửi:</span>
                  <span className="font-semibold text-[#191C19]">{consignorCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Kỳ đang dở:</span>
                  <span className="font-bold text-[#191C19]">
                    {currentTerm != null
                      ? `Kỳ ${currentTerm}${daysInTerm != null ? ` · ngày ${daysInTerm}${totalDaysInTerm != null ? ` / ${totalDaysInTerm}` : ''}` : ''}`
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Box 2: Tùy biến theo Phương án được chọn */}
            {!selectedOutcome && (
              <div className="border border-dashed border-neutral rounded-xl p-3.5 bg-[#FAFBF9] text-[11px] text-textSecondary">
                Vui lòng chọn 1 trong 3 phương án xử lý bên trái, sau đó bấm <strong>Xác nhận xử lý</strong>.
              </div>
            )}

            {selectedOutcome === 'RELIST' && (
              <div className="border-2 border-[#2b2b2b] rounded-xl p-3.5 bg-[#FAFBF9] space-y-2">
                <div className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">
                  NẾU ĐĂNG BÁN LẠI
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Giá bán:</span>
                    <span className="font-bold text-[#191C19]">{price != null ? `${formatCurrencyVND(price)} · giữ nguyên` : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Hoa hồng:</span>
                    <span className="font-bold text-[#191C19]">
                      {commissionRate != null ? `${commissionRate}%` : '—'}{currentTerm != null ? ` · kỳ ${currentTerm}` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Còn lại của kỳ:</span>
                    <span className="font-semibold text-[#191C19]">
                      {totalDaysInTerm != null && daysInTerm != null ? `${Math.max(0, totalDaysInTerm - daysInTerm)} ngày` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {selectedOutcome === 'RETURN_TO_SELLER' && (
              <div className="border-2 border-[#2b2b2b] rounded-xl p-3.5 bg-[#FAFBF9] space-y-2">
                <div className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">
                  NẾU HOÀN TRẢ NGƯỜI KÝ GỬI
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Thời hạn lấy:</span>
                    <span className="font-bold text-[#191C19]">30 ngày tại quầy BG-01</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Phí lưu kho:</span>
                    <span className="font-semibold text-primary">Miễn phí 30 ngày đầu</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Trạng thái:</span>
                    <span className="font-bold text-[#191C19]">Chờ khách đến lấy</span>
                  </div>
                </div>
              </div>
            )}

            {selectedOutcome === 'DISCARD' && (
              <div className="border-2 border-error rounded-xl p-3.5 bg-error-light/20 space-y-2">
                <div className="text-[10px] uppercase font-bold text-error tracking-wider">
                  NẾU TIÊU HUỶ
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Phân loại:</span>
                    <span className="font-bold text-error">Hàng hỏng nặng / giả</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Hồ sơ:</span>
                    <span className="font-semibold text-[#191C19]">Lưu lý do vào ca</span>
                  </div>
                </div>
              </div>
            )}

            {/* Box 3: Ghi chú dashed */}
            <div className="p-3 border border-dashed border-[#9a9a9a] rounded-xl text-[11px] leading-relaxed text-[#4a4a4a] bg-surface">
              Member nhận thông báo món đã trở lại sàn kèm lý do. Họ thấy món bị trả một lần trong lịch sử, nhưng <strong className="font-bold text-[#191C19]">người mua khác không thấy</strong> — món bị trả vì tranh chấp mô tả không phải lỗi của món.
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-3 border-t border-neutral flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-neutral text-xs px-4 py-2"
            onClick={() => setIsOutcomeModalOpen(false)}
          >
            Để sau
          </Button>
          <Button
            type="button"
            disabled={!selectedOutcome || (selectedOutcome === 'DISCARD' && !discardReason.trim())}
            className="rounded-xl bg-[#2b2b2b] text-white hover:bg-black text-xs font-bold px-5 py-2 shadow-sm disabled:opacity-50"
            onClick={onConfirm}
          >
            Xác nhận xử lý
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function DegradedCaseModal({
  isOpen,
  onClose,
  selectedItem,
  degradedNotes,
  setDegradedNotes,
  degradedSubmitting = false,
  handleCreateDegradedCase,
  evidenceImageUrls = [],
  uploadEvidence,
  removeEvidence,
  evidenceUploading = false,
  evidenceError = '',
}) {
  const fileInputRef = React.useRef(null);
  if (!selectedItem) return null;
  const fullCompensation = selectedItem.compensationAmount;
  const halfCompensation = selectedItem.halfCompensationAmount ?? (
    fullCompensation != null && selectedItem.degradedCompensationRate != null
      ? Number(fullCompensation) * Number(selectedItem.degradedCompensationRate) : null);
  const showAmount = value => value == null ? 'Backend sẽ xác định khi mở ca' : formatCurrencyVND(value);

  const stockPhotos = selectedItem.stockInPhotos?.length
    ? selectedItem.stockInPhotos
    : (selectedItem.initialConsignmentPhotoUrls?.length
      ? selectedItem.initialConsignmentPhotoUrls
      : (selectedItem.productPhotos || []));

  const allDamagedPhotos = evidenceImageUrls;
  const removePhoto = idx => removeEvidence?.(idx);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length && uploadEvidence) {
      uploadEvidence(files);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="TH-04 · Hàng xuống cấp, đề xuất đền cho người ký gửi"
    >
      <div className="space-y-4 text-xs font-sans max-h-[82vh] overflow-y-auto pr-1">
        {/* Banner lưu ý trách nhiệm */}
        <div className="p-3 bg-[#f4f4f4] border-2 border-[#2b2b2b] rounded-xl text-text leading-relaxed">
          <div className="text-[10px] uppercase font-bold text-[#6b6b6b] mb-1">
            Không phạt người ký gửi
          </div>
          <p className="text-xs text-[#3a3a3a]">
            Không phải lỗi người mua, cũng không phải lỗi người ký gửi. Kho sắp xếp vận chuyển nên kho đền. Món hàng bị hư hỏng trong quá trình vận chuyển trả về.
          </p>
        </div>

        {/* Thông tin món hàng */}
        <div className="rounded-xl border border-neutral bg-background p-3 space-y-1">
          <div className="flex justify-between">
            <span className="text-[#5f5f5f]">Yêu cầu trả:</span>
            <span className="font-bold text-[#191C19]">{selectedItem.code || selectedItem.returnCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5f5f5f]">Món hàng:</span>
            <span className="font-bold text-[#191C19]">
              {selectedItem.sku || selectedItem.productId} · {selectedItem.itemName || selectedItem.productName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5f5f5f]">Kỳ ký gửi đang dở:</span>
            <span className="font-semibold text-[#191C19]">
              {selectedItem.currentTerm ? `Kỳ ${selectedItem.currentTerm}` : 'Theo biên nhận và đơn hàng'}
            </span>
          </div>
        </div>

        {/* Đối chiếu ảnh xuất kho vs ảnh hư hỏng */}
        <div className="space-y-2">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[#5f5f5f]">
            1. Đối chiếu ảnh lúc xuất kho vs ảnh hàng về hư hỏng
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-xl border border-neutral bg-[#fafafa] space-y-1.5">
              <span className="text-[10px] font-bold text-[#5f5f5f]">Ảnh lúc xuất kho / ban đầu</span>
              {stockPhotos.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {stockPhotos.slice(0, 3).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt="Ảnh xuất kho"
                      className="w-16 h-16 object-cover rounded-lg border border-neutral"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[#717971] italic">Chưa có ảnh xuất kho lưu trữ</p>
              )}
            </div>

            <div className="p-2.5 rounded-xl border border-red-200 bg-red-50/40 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-red-700">Ảnh hiện trạng hư hỏng *</span>
                <span className="text-[10px] font-bold text-red-700">{allDamagedPhotos.length} / 5</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allDamagedPhotos.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-red-300">
                    <img src={url} alt="Ảnh hư hỏng" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      disabled={degradedSubmitting || evidenceUploading} onClick={() => removePhoto(i)}
                      className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {allDamagedPhotos.length < 5 && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={evidenceUploading || degradedSubmitting}
                      className="text-[10px] py-1 px-2 border-neutral"
                    >
                      {evidenceUploading ? 'Đang tải…' : '📁 Tải ảnh từ máy'}
                    </Button>
                  </div>

                </div>
              )}
            </div>
          </div>
          {evidenceError && <p className="text-[10px] text-red-600">{evidenceError}</p>}
        </div>

        {/* Mô tả hư hỏng */}
        <div className="space-y-1">
          <label className="block font-bold text-[#191C19]">
            Mô tả lý do / hiện trạng hư hỏng <span className="text-red-600">*</span>
          </label>
          <textarea
            rows={3}
            value={degradedNotes}
            onChange={(e) => setDegradedNotes(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-neutral text-xs text-[#191C19] bg-white focus:outline-none focus:border-[#006B2C]"
            placeholder="Thùng móp nặng, khoá kéo gãy và có vết rách ở thân sau. Hỏng phát sinh trong khâu vận chuyển..."
          />
        </div>

        {/* Bảng tính mức đền */}
        <div className="border border-neutral rounded-xl p-3.5 space-y-2.5 bg-[#fafafa]">
          <span className="text-[10px] uppercase font-bold text-[#6b6b6b]">2. Mức đền cho người ký gửi</span>
          <p>Mức đền được backend tính từ giá và hoa hồng của đơn hàng, lưu tại thời điểm mở ca.</p>

          {/* 2 Lựa chọn Member sẽ thấy */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl border border-[#006B2C] bg-[#E8F5E9]/60 space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#006B2C]">Phương án 1 · Đền 100%</span>
              <p className="text-base font-extrabold text-[#006B2C]">{showAmount(fullCompensation)}</p>
              <p className="text-[10px] text-[#5f5f5f] leading-tight">
                Không lấy lại đồ. Hàng thành tài sản nền tảng (PLATFORM_OWNED).
              </p>
            </div>
            <div className="p-3 rounded-xl border border-[#D97706] bg-[#FFFBEB] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#D97706]">Phương án 2 · Đền một phần + Nhận lại</span>
              <p className="text-base font-extrabold text-[#D97706]">{showAmount(halfCompensation)}</p>
              <p className="text-[10px] text-[#5f5f5f] leading-tight">
                Member nhận tiền đền theo tỷ lệ trên biên nhận và đến quầy tiếp nhận lấy đồ.
              </p>
            </div>
          </div>
          <p className="text-[10px] text-[#717971]">
            {DEGRADED_DECISION_POLICY}
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral">
          <Button variant="outline" size="sm" className="rounded-xl border-neutral" disabled={degradedSubmitting} onClick={onClose}>
            Hủy
          </Button>
          <Button
            size="sm"
            disabled={degradedSubmitting || evidenceUploading || Boolean(evidenceError) || !degradedNotes?.trim() || allDamagedPhotos.length < 2 || allDamagedPhotos.length > 5}
            className="bg-[#2b2b2b] text-white hover:bg-black font-bold rounded-xl px-4 py-2"
            onClick={() => handleCreateDegradedCase({
              notes: degradedNotes,
              photos: allDamagedPhotos,
              fullCompensation,
              halfCompensation,
            })}
          >
            Lập hồ sơ & Gửi đề xuất đền cho Member
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** TH-07 reads the actual pending, decided or unclaimed case after return resolution. */
export function DegradedCaseViewTH07({ selectedItem, onBackToQueue, onNavigateToCounter }) {
  if (!selectedItem) return null;
  return (
    <div className="space-y-4 rounded-2xl border border-neutral bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">Biên bản hàng xuống cấp · {selectedItem.code || selectedItem.id}</h2>
        <Button variant="outline" onClick={onBackToQueue}>Về hàng đợi trả hàng</Button>
      </div>
      <DegradedCaseDetails
        returnId={selectedItem.id}
        productId={selectedItem.productId}
        resolvedAt={selectedItem.resolvedAt}
        stockPhotos={selectedItem.stockInPhotos || selectedItem.initialConsignmentPhotoUrls || []}
        onNavigateToCounter={onNavigateToCounter}
      />
    </div>
  );
}

export function ReturnRejectDialog({ isRejectModalOpen, setIsRejectModalOpen, rejectReason, setRejectReason, handleConfirmRejectRequest }) {
  return (
    <Modal
      isOpen={isRejectModalOpen}
      onClose={() => setIsRejectModalOpen(false)}
      title="Từ chối yêu cầu trả hàng (TH-02)"
    >
      <div className="space-y-4 text-xs font-sans">
        <p className="text-textSecondary">
          Người mua sẽ nhận được thông báo giải thích lý do yêu cầu không hợp lệ theo chính sách của ReHome.
        </p>
        <div>
          <label className="block font-bold text-text mb-1">Lý do từ chối *</label>
          <textarea
            rows="3"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ví dụ: Lỗi người mua tự gây ra, gửi yêu cầu sau khi đã quá thời hạn trả hàng cho phép..."
            className="w-full p-2.5 border border-neutral rounded-xl text-text bg-surface focus:outline-none focus:border-error"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-neutral">
          <Button size="sm" variant="outline" className="rounded-xl border-neutral" onClick={() => setIsRejectModalOpen(false)}>
            Hủy
          </Button>
          <Button size="sm" className="bg-error hover:bg-red-700 text-white font-bold rounded-xl px-4" onClick={handleConfirmRejectRequest}>
            Xác nhận từ chối
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ReturnVerdictForm({ inspectionVerdict, setInspectionVerdict, invalidReason, setInvalidReason }) {
  return (
    <div className="border border-neutral rounded-2xl p-4 bg-surface space-y-3 text-xs font-sans shadow-sm">
      <div className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">
        Bước 3 · Kết luận
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer font-semibold text-text">
          <input
            type="radio"
            name="verdict"
            value="VALID"
            checked={inspectionVerdict === 'VALID'}
            onChange={() => setInspectionVerdict('VALID')}
            className="text-primary focus:ring-primary"
          />
          <span>Hợp lệ — hoàn tiền cho người mua</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer font-semibold text-text">
          <input
            type="radio"
            name="verdict"
            value="INVALID"
            checked={inspectionVerdict === 'INVALID'}
            onChange={() => setInspectionVerdict('INVALID')}
            className="text-primary focus:ring-primary"
          />
          <span>Không hợp lệ — không hoàn tiền</span>
        </label>
      </div>
      {inspectionVerdict === 'INVALID' && (
        <div className="pt-2 space-y-2">
          <label className="block text-[11px] font-semibold text-error">
            Lý do không hợp lệ & ghi chú chụp ảnh kho (Bắt buộc):
          </label>
          <textarea
            rows="3"
            value={invalidReason}
            onChange={(e) => setInvalidReason(e.target.value)}
            placeholder="Ví dụ: Rách tem mác, xuất hiện vết cào xước mới không có trong ảnh lưu trữ..."
            className="w-full text-xs p-2.5 border border-error bg-error-light/10 rounded-xl text-text focus:outline-none focus:ring-1 focus:ring-error"
          />
        </div>
      )}
      <p className="text-[10px] text-textSecondary">
        Chọn Không hợp lệ thì bắt buộc nhập lý do và ít nhất một ảnh kho chụp để đối chất.
      </p>
    </div>
  );
}

export function ReturnInspectionVerdict({
  selectedItem,
  inspectionVerdict,
  setInspectionVerdict,
  invalidReason,
  setInvalidReason,
  handleSaveInspection,
  handleFlagCounterfeit,
  handleOpenDegradedCase,
}) {
  const toast = useToast();
  return (
    <div className="lg:col-span-6 space-y-4 font-sans">
      {/* Cảnh báo kiểm định viên */}
      {selectedItem?.isInspectorSelf && (
        <div className="border border-secondary bg-[#FFFDF5] p-3.5 rounded-2xl flex justify-between items-center gap-3 shadow-sm">
          <div className="text-xs">
            <div className="font-bold text-text mb-1">
              Món này do CHÍNH BẠN kiểm định lúc nhập kho {selectedItem.stockInDate}
            </div>
            <div className="text-[11px] text-textSecondary leading-relaxed">
              Người mua đang nói tình trạng tệ hơn kết luận bạn viết. Bạn vẫn kết luận được, nhưng nên để người khác xem cho khách quan.
            </div>
          </div>
          <button
            type="button"
            onClick={() => toast.info('Đã chuyển ca kiểm tra cho Moderator khác trong ca trực.')}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 border border-neutral rounded-xl bg-surface hover:bg-background text-text transition-colors"
          >
            Chuyển cho<br />người khác
          </button>
        </div>
      )}

      {/* Các trường hợp đặc biệt: Nghi hàng giả (F-134) & Hàng xuống cấp (KG-16) */}
      <div className="rounded-2xl border border-neutral bg-background p-3.5 space-y-2">
        <div className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">
          Quy trình phát hiện bất thường
        </div>
        <div className="flex flex-wrap gap-2">
          {handleFlagCounterfeit && (
            <button
              type="button"
              onClick={handleFlagCounterfeit}
              className="px-3.5 py-2 rounded-xl border border-error bg-error-light text-error text-xs font-bold hover:bg-red-100 transition-colors"
            >
              ⚠️ Báo nghi hàng giả
            </button>
          )}
          {handleOpenDegradedCase && (
            <button
              type="button"
              onClick={handleOpenDegradedCase}
              className="px-3.5 py-2 rounded-xl border border-secondary bg-[#FFFDF5] text-[#B45309] text-xs font-bold hover:bg-amber-100 transition-colors"
            >
              📉 Báo hàng xuống cấp (TH-04 / KG-16)
            </button>
          )}
        </div>
      </div>
    
      {/* Bước 3: Kết luận */}
      <ReturnVerdictForm
        inspectionVerdict={inspectionVerdict}
        setInspectionVerdict={setInspectionVerdict}
        invalidReason={invalidReason}
        setInvalidReason={setInvalidReason}
      />
    
      {/* Box tính tiền hoàn */}
      <div className="border border-neutral rounded-2xl p-4 bg-surface space-y-2 text-xs shadow-sm">
        <div className="text-[10px] uppercase font-bold text-textSecondary tracking-wider mb-1">
          Nếu kết luận hợp lệ, hoàn cho người mua
        </div>
        <div className="flex justify-between">
          <span className="text-textSecondary">Tiền hàng</span>
          <span className="font-semibold text-text">{formatCurrencyVND(selectedItem?.amount || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-textSecondary">Phí vận chuyển đơn gốc</span>
          <span className="text-text">{formatCurrencyVND(selectedItem?.shippingFee || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-textSecondary">Phí trả hàng</span>
          <span className="text-primary font-bold">kho chịu</span>
        </div>
        <div className="flex justify-between text-sm font-bold pt-2 border-t border-neutral text-text">
          <span>Hoàn vào ví người mua</span>
          <span className="text-primary">{formatCurrencyVND((selectedItem?.amount || 0) + (selectedItem?.shippingFee || 0))}</span>
        </div>
        <p className="text-[10px] text-textSecondary pt-1">
          Vào ví ReHome, không hoàn về thẻ/MoMo. Tiền của người ký gửi đang giữ nên không phải đòi lại.
        </p>
      </div>
    
      {/* Nút lưu kết luận */}
      <div className="pt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={!inspectionVerdict}
          onClick={handleSaveInspection}
          className={`py-2.5 px-6 rounded-xl text-xs font-bold transition-all ${
            inspectionVerdict
              ? 'bg-primary text-white hover:bg-primary-hover shadow-sm cursor-pointer'
              : 'bg-neutral text-textSecondary cursor-not-allowed'
          }`}
        >
          Lưu kết luận
        </button>
        {!inspectionVerdict && (
          <span className="text-xs text-textSecondary">Chọn kết luận mới lưu được</span>
        )}
      </div>
    </div>
  );
}

export function ReturnInspectionChecklist({ checklist, setChecklist, selectedItem }) {
  return (
    <div className="border border-neutral rounded-2xl overflow-hidden bg-surface text-xs font-sans shadow-sm">
      <div className="p-3 bg-background border-b border-neutral text-[10px] uppercase font-bold text-textSecondary">
        Bước 2 · Đối chiếu từng mục
      </div>
      <div className="divide-y divide-neutral">
        <label className="p-3.5 flex items-start gap-3 cursor-pointer hover:bg-background transition-colors">
          <input
            type="checkbox"
            checked={Boolean(checklist?.labelIntact)}
            onChange={(e) => setChecklist({ ...checklist, labelIntact: e.target.checked })}
            className="mt-0.5 rounded border-neutral text-primary focus:ring-primary"
          />
          <div>
            <span className="font-semibold text-text">Còn nguyên tem SKU trên sản phẩm</span>
          </div>
        </label>
        <label className="p-3.5 flex items-start gap-3 cursor-pointer hover:bg-background transition-colors">
          <input
            type="checkbox"
            checked={checklist?.noNewDamage}
            onChange={(e) => setChecklist({ ...checklist, noNewDamage: e.target.checked })}
            className="mt-0.5 rounded border-neutral text-primary focus:ring-primary"
          />
          <div>
            <span className="font-semibold text-text">Không có hư hỏng mới so với ảnh nhập kho</span>
          </div>
        </label>
        <label className="p-3.5 flex items-start gap-3 cursor-pointer hover:bg-background transition-colors">
          <input
            type="checkbox"
            checked={checklist?.noUsageSign}
            onChange={(e) => setChecklist({ ...checklist, noUsageSign: e.target.checked })}
            className="mt-0.5 rounded border-neutral text-primary focus:ring-primary"
          />
          <div>
            <span className="font-semibold text-text">Không có dấu vết đã qua sử dụng thêm</span>
          </div>
        </label>
        <label className="p-3.5 flex items-start gap-3 cursor-pointer hover:bg-background transition-colors">
          <input
            type="checkbox"
            checked={checklist?.accessoriesComplete}
            onChange={(e) => setChecklist({ ...checklist, accessoriesComplete: e.target.checked })}
            className="mt-0.5 rounded border-neutral text-primary focus:ring-primary"
          />
          <div>
            <span className="font-semibold text-text">Đủ phụ kiện đi kèm nếu có</span>
          </div>
        </label>
      </div>
    </div>
  );
}

export function ReturnInspectionProduct({
  selectedItem,
  checklist,
  setChecklist,
  evidenceImageUrls = [],
  evidenceUploading = false,
  evidenceError = '',
  uploadEvidence,
  retryEvidence,
  removeEvidence,
}) {
  const stockPhotos = selectedItem?.stockInPhotos || [];
  const buyerPhotos = selectedItem?.buyerPhotos || [];

  return (
    <div className="lg:col-span-6 space-y-4 border-r border-neutral pr-0 lg:pr-6 font-sans">
      <div>
        <h2 className="text-base font-bold text-text">
          Đối chiếu hàng về với ảnh nhập kho
        </h2>
        <p className="text-xs text-textSecondary">
          Mốc chuẩn là ảnh kho tự chụp ngày {selectedItem?.stockInDate || 'trước đó'}, không phải ảnh người mua gửi.
        </p>
      </div>
    
      {/* So sánh ảnh */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] uppercase font-bold text-textSecondary mb-1.5">
            Ảnh nhập kho · {selectedItem?.stockInDate || 'Kho'}
          </div>
          {stockPhotos.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stockPhotos.map((src, i) => (
                <img key={i} src={src} alt="Điểm kí gửi" className="w-20 h-24 object-cover rounded-xl border border-neutral bg-background" />
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#717971]">Chưa có ảnh nhập kho</p>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-textSecondary mb-1.5">
            Ảnh người mua gửi
          </div>
          {buyerPhotos.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {buyerPhotos.map((src, i) => (
                <img key={i} src={src} alt="Khách" className="w-20 h-24 object-cover rounded-xl border border-neutral bg-background" />
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#717971]">Chưa có ảnh người mua</p>
          )}
        </div>
      </div>

      {uploadEvidence && (
        <ReturnEvidence
          evidenceImageUrls={evidenceImageUrls}
          evidenceUploading={evidenceUploading}
          evidenceError={evidenceError}
          uploadEvidence={uploadEvidence}
          retryEvidence={retryEvidence}
          removeEvidence={removeEvidence}
        />
      )}
    
      {/* Bước 2: Checklist */}
      <ReturnInspectionChecklist checklist={checklist} setChecklist={setChecklist} selectedItem={selectedItem} />
    </div>
  );
}

export function ReturnReviewDecision({ selectedItem, handleApproveAndCreateWaybill, setIsRejectModalOpen }) {
  return (
    <div className="lg:col-span-5 space-y-4 font-sans">
      <div>
        <h2 className="text-base font-bold text-text">Đơn và món liên quan</h2>
        <p className="text-xs text-textSecondary">
          Đơn #{selectedItem?.orderNo || selectedItem?.orderId} · Người mua: {selectedItem?.buyerName}
        </p>
      </div>
    
      {/* Box món đồ */}
      <div className="border border-neutral rounded-2xl overflow-hidden bg-surface shadow-sm">
        <div className="p-3.5 flex items-center gap-3 border-b border-neutral">
          <img
            src={selectedItem?.stockInPhotos?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'}
            alt={selectedItem?.itemName}
            className="w-12 h-14 object-cover rounded-xl border border-neutral"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-text">{selectedItem?.sku}</div>
            <div className="text-xs text-textSecondary">{selectedItem?.itemName}</div>
            <div className="text-[10px] text-textSecondary">{selectedItem?.itemDetails}</div>
          </div>
          <div className="text-xs font-bold text-primary">
            {formatCurrencyVND(selectedItem?.amount || 0)}
          </div>
        </div>
        <div className="p-3 bg-background text-[11px] text-textSecondary">
          Món còn lại trong đơn (nếu có) <strong className="font-semibold text-text">không bị trả</strong>
        </div>
      </div>
    
      {/* Box người ký gửi */}
      <div className="border border-neutral rounded-2xl p-4 bg-surface space-y-2 text-xs shadow-sm">
        <div className="text-[10px] uppercase font-bold text-textSecondary tracking-wider mb-1">
          Người ký gửi món này
        </div>
        <div className="flex justify-between">
          <span className="text-textSecondary">Mã Member</span>
          <span className="font-bold text-text">{selectedItem?.senderCode}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-textSecondary">Lượt bị trả trước đây</span>
          <span className="text-text">{selectedItem?.prevReturns}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-textSecondary">Tiền đã chia</span>
          <span className="font-semibold text-primary">{selectedItem?.payoutStatus}</span>
        </div>
        <p className="text-[10px] text-textSecondary pt-1">
          Tiền người ký gửi chỉ chia sau khi hết cửa sổ trả hàng. Nhờ vậy không phải đòi lại tiền đã trả.
        </p>
      </div>
    
      {/* Box vận đơn trả */}
      <div className="border-2 border-neutral rounded-2xl p-4 bg-surface space-y-2 text-xs shadow-sm">
        <div className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">
          Vận đơn trả hàng sẽ tạo khi bấm duyệt
        </div>
        <div className="text-xs text-text leading-relaxed">
          Lấy tại <strong className="font-semibold">{selectedItem?.buyerName} · {selectedItem?.buyerPhone}</strong>
          <br />
          {selectedItem?.buyerAddress}
        </div>
        <div className="p-2.5 bg-background rounded-xl text-[10px] text-textSecondary">
          Địa chỉ do người mua nhập. Bấm duyệt là GHN nhận thông tin này và <strong className="font-semibold text-text">hai bên đều không sửa được nữa</strong> — đọc lại trước khi bấm.
        </div>
        {(selectedItem?.returnDeadline || selectedItem?.handoverDeadline || selectedItem?.pickupDeadline) && (
          <div className="pt-2 border-t border-neutral space-y-1 text-[11px]">
            {selectedItem?.returnDeadline && (
              <div className="flex justify-between gap-2">
                <span className="text-textSecondary">Hạn gửi yêu cầu trả hàng:</span>
                <span className="font-semibold text-text">{formatDeadlineWithCountdown(selectedItem.returnDeadline)}</span>
              </div>
            )}
            {selectedItem?.handoverDeadline && (
              <div className="flex justify-between gap-2">
                <span className="text-textSecondary">Hạn bàn giao cho GHN:</span>
                <span className="font-semibold text-text">{formatDeadlineWithCountdown(selectedItem.handoverDeadline)}</span>
              </div>
            )}
            {selectedItem?.pickupDeadline && (
              <div className="flex justify-between gap-2">
                <span className="text-textSecondary">Hạn nhận lại tại kho:</span>
                <span className="font-semibold text-text">{formatDeadlineWithCountdown(selectedItem.pickupDeadline)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    
      {/* Footer Buttons */}
      {selectedItem?.status === 'PENDING_APPROVAL' && (
        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleApproveAndCreateWaybill}
            className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm transition-colors"
          >
            Duyệt & tạo vận đơn trả
          </button>
          <button
            type="button"
            onClick={() => setIsRejectModalOpen(true)}
            className="py-2.5 px-4 rounded-xl border border-error text-error text-xs font-bold hover:bg-error-light transition-colors"
          >
            Từ chối yêu cầu
          </button>
        </div>
      )}
    </div>
  );
}

export function ReturnRequestDetails({ selectedItem, setIsCompareModalOpen }) {
  const buyerPhotos = selectedItem?.buyerPhotos || [];
  const stockPhotos = selectedItem?.stockInPhotos || [];

  return (
    <div className="lg:col-span-7 space-y-4 border-r border-neutral pr-0 lg:pr-6 font-sans">
      <div>
        <h2 className="text-base font-bold text-text">Người mua nói gì</h2>
        <p className="text-xs text-textSecondary">
          Bạn chưa thấy hàng thật. Duyệt ở đây nghĩa là <strong className="font-semibold text-text">đáng nhận hàng về xem</strong>, không phải đồng ý hoàn tiền.
        </p>
      </div>
    
      <div className="border border-neutral rounded-2xl p-4 bg-surface space-y-2 shadow-sm">
        <div className="flex justify-between items-baseline text-[10px] text-textSecondary uppercase tracking-wider font-semibold">
          <span>Lý do đã chọn</span>
          <span>Gửi lúc {selectedItem?.submittedAt}</span>
        </div>
        <div className="text-sm font-bold text-text">{selectedItem?.reason}</div>
        <div className="text-xs text-text leading-relaxed bg-background p-3 rounded-xl border border-neutral">
          "{selectedItem?.buyerNote}"
        </div>
      </div>
    
      <div className="space-y-2">
        <div className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">
          Ảnh người mua gửi · {buyerPhotos.length} ảnh
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {buyerPhotos.map((src, i) => (
            <img
              key={i}
              src={src}
              alt="Ảnh người mua"
              className="w-36 h-36 object-cover rounded-xl border border-neutral"
            />
          ))}
        </div>
      </div>
    
      <div className="border border-neutral rounded-2xl p-4 bg-surface space-y-3 shadow-sm">
        <div className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">
          So với ảnh kiểm định lúc nhập kho · {selectedItem?.stockInDate}
        </div>
        <div className="flex items-center gap-3">
          {stockPhotos.map((src, i) => (
            <img
              key={i}
              src={src}
              alt="Ảnh nhập kho"
              className="w-20 h-20 object-cover rounded-xl border border-neutral"
            />
          ))}
          <button
            type="button"
            onClick={() => setIsCompareModalOpen(true)}
            className="text-xs font-semibold px-3.5 py-2 border border-accent text-accent rounded-xl hover:bg-background transition-colors"
          >
            Mở so sánh<br />cạnh nhau
          </button>
        </div>
        <p className="text-[10px] text-textSecondary leading-relaxed">
          Ảnh kho tự chụp lúc nhập, là mốc chuẩn để đối chiếu — không phải ảnh người bán cung cấp.
        </p>
      </div>
    </div>
  );
}

export function ReturnQueueTable({ loading, filteredRequests, activeTab, handleOpenReview, handleOpenInspect, handleMarkLost, handleOpenDegradedCaseView }) {
  return (
    <div className="bg-surface border border-neutral rounded-2xl overflow-hidden shadow-sm font-sans">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-background border-b border-neutral text-[10px] uppercase font-bold text-textSecondary tracking-wider">
              <th className="py-3 px-3.5">Mã yêu cầu</th>
              <th className="py-3 px-3.5">Người mua</th>
              <th className="py-3 px-3.5">Số món</th>
              <th className="py-3 px-3.5">Lý do</th>
              <th className="py-3 px-3.5">Gửi lúc</th>
              <th className="py-3 px-3.5">Đã chờ</th>
              <th className="py-3 px-3.5">Trạng thái</th>
              <th className="py-3 px-3.5 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral">
            {loading && (
              <tr>
                <td colSpan="8" className="py-8 text-center text-textSecondary">
                  Đang tải danh sách yêu cầu trả hàng...
                </td>
              </tr>
            )}
            {!loading && filteredRequests.length === 0 && (
              <tr>
                <td colSpan="8" className="py-8 text-center text-textSecondary">
                  Không có yêu cầu trả hàng nào trong mục này.
                </td>
              </tr>
            )}
            {!loading &&
              filteredRequests.map((r) => {
                const isOverdueItem = r.isOverdue && activeTab === 'PENDING_APPROVAL';
                return (
                  <ReturnQueueRow
                    key={r.id}
                    r={r}
                    isOverdueItem={isOverdueItem}
                    handleOpenReview={handleOpenReview}
                    handleOpenInspect={handleOpenInspect}
                    handleMarkLost={handleMarkLost}
                    handleOpenDegradedCaseView={handleOpenDegradedCaseView}
                  />
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReturnQueueTabs({ setActiveTab, activeTab, tabCounts }) {
  return (
    <div className="flex flex-wrap gap-2 font-sans">
      <button
        onClick={() => setActiveTab('PENDING_APPROVAL')}
        className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
          activeTab === 'PENDING_APPROVAL'
            ? 'bg-primary text-white shadow-sm'
            : 'bg-surface text-textSecondary border border-neutral hover:bg-background'
        }`}
      >
        Chờ duyệt · {tabCounts.PENDING_APPROVAL}
      </button>
      <button
        onClick={() => setActiveTab('WAITING_BUYER_DISPATCH')}
        className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
          activeTab === 'WAITING_BUYER_DISPATCH'
            ? 'bg-primary text-white shadow-sm'
            : 'bg-surface text-textSecondary border border-neutral hover:bg-background'
        }`}
      >
        Chờ người mua gửi · {tabCounts.WAITING_BUYER_DISPATCH}
      </button>
      <button
        onClick={() => setActiveTab('RETURNING')}
        className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
          activeTab === 'RETURNING'
            ? 'bg-primary text-white shadow-sm'
            : 'bg-surface text-textSecondary border border-neutral hover:bg-background'
        }`}
      >
        Đang về kho · {tabCounts.RETURNING}
      </button>
      <button
        onClick={() => setActiveTab('RECEIVED_INSPECT')}
        className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
          activeTab === 'RECEIVED_INSPECT'
            ? 'bg-primary text-white shadow-sm'
            : 'bg-surface text-textSecondary border border-neutral hover:bg-background'
        }`}
      >
        Hàng đã về, chờ kiểm · {tabCounts.RECEIVED_INSPECT}
      </button>
      <button
        onClick={() => setActiveTab('RESOLVED')}
        className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
          activeTab === 'RESOLVED'
            ? 'bg-primary text-white shadow-sm'
            : 'bg-surface text-textSecondary border border-neutral hover:bg-background'
        }`}
      >
        Đã xong tuần này · {tabCounts.RESOLVED}
      </button>
    </div>
  );
}
