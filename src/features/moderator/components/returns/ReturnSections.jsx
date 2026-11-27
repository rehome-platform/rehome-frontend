import DegradedCaseDetails from '../DegradedCaseDetails.jsx';
import { DEGRADED_DECISION_POLICY } from '../../models/degradedCaseModel.js';
import { ReturnQueueRow } from './ReturnQueueRow.jsx';
import { needsItemAction } from '../../services/returnApi.js';
import React from "react";
import { Button, Modal, ImageLightbox, ZoomableImage } from "../../../../components/common/index.js";
import { formatCurrencyVND } from "../../../../utils/formatters.js";
import { formatDeadlineWithCountdown } from "../WarehouseUi.jsx";
import { ReturnEvidence, ReturnPhotoComparison } from './ReturnEvidence.jsx';
import { useToast } from "../../../../context/ToastContext.jsx";
import { TABLE_COLUMN_LABELS } from "../../../../constants/tableColumns.js";

export function ReturnCompareDialog({ isCompareModalOpen, setIsCompareModalOpen, selectedItem }) {
  if (!selectedItem) return null;
  const packingPhotos = selectedItem.packingPhotoUrls || [];
  const stockPhotos = selectedItem.stockInPhotos || [];
  const buyerPhotos = selectedItem.buyerPhotos || [];

  return (
    <Modal
      isOpen={isCompareModalOpen}
      onClose={() => setIsCompareModalOpen(false)}
      title="So sánh ảnh đóng gói vs ảnh người mua trả về"
      size="xl"
    >
      <div className="space-y-4 font-sans text-xs">
        <ReturnPhotoComparison
          packingPhotos={packingPhotos}
          stockPhotos={stockPhotos}
          buyerPhotos={buyerPhotos}
          stockInDate={selectedItem.stockInDate}
        />
        <div className="text-right pt-2 border-t border-neutral">
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
  submitting = false,
}) {
  const [selectedOutcome, setSelectedOutcome] = React.useState(null);

  React.useEffect(() => {
    if (isOutcomeModalOpen) {
      setSelectedOutcome(null);
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
  const itemPhotos = React.useMemo(() => {
    const candidates = [
      ...(Array.isArray(selectedItem?.stockInPhotos) ? selectedItem.stockInPhotos : []),
      selectedItem?.productImage,
      ...(Array.isArray(selectedItem?.photos) ? selectedItem.photos : []),
    ]
      .map((p) => (typeof p === 'string' ? p : p?.url || p?.imageUrl))
      .filter(Boolean);
    return Array.from(new Set(candidates));
  }, [selectedItem]);

  const alreadyProcessed = Boolean(selectedItem?.rawStatus === 'VALID' && !needsItemAction(selectedItem));

  const onConfirm = () => {
    if (!selectedOutcome || submitting || alreadyProcessed) return;
    handleConfirmOutcome(selectedOutcome);
  };

  return (
    <Modal
      isOpen={isOutcomeModalOpen}
      onClose={() => { if (!submitting) setIsOutcomeModalOpen(false); }}
      title="Chọn phương án xử lý món hàng"
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
              Người mua đã được hoàn tiền. Xác nhận phương án xử lý món hàng bên dưới.
            </p>
          </div>
          <span className="text-[10px] font-extrabold px-3 py-1 bg-[#E8F5E9] text-[#006B2C] border border-[#A5D6A7] rounded-full tracking-wide uppercase self-start sm:self-auto">
            ĐÃ HOÀN TIỀN NGƯỜI MUA
          </span>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Cột trái (7 cols): Phương án duy nhất hiện được hỗ trợ */}
          <div className="lg:col-span-7 space-y-3">
            <div className="font-bold text-sm text-[#191C19] flex items-center justify-between">
              <span>Món hàng này xử lý thế nào</span>
              <span className="text-[11px] font-semibold text-textSecondary">Bước 2 / 2</span>
            </div>

            {/* Option 1: RELIST */}
            <div
              className={`p-3.5 rounded-xl border-2 transition-all ${
                selectedOutcome === 'RELIST'
                  ? 'border-[#006B2C] bg-[#F6F9F4] shadow-sm'
                  : 'border-neutral bg-surface hover:bg-background'
              }`}
            >
              <button
                type="button"
                disabled={submitting || alreadyProcessed}
                onClick={() => setSelectedOutcome('RELIST')}
                className="w-full text-left disabled:opacity-60"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedOutcome === 'RELIST' ? 'border-[#006B2C]' : 'border-[#8a8a8a]'
                    }`}
                  >
                    {selectedOutcome === 'RELIST' && (
                      <span className="w-2 h-2 rounded-full bg-[#006B2C]" />
                    )}
                  </span>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-primary">Đăng bán lại (Đăng bán liền)</div>
                    <p className="text-[11px] text-textSecondary mt-0.5 leading-relaxed">
                      Món còn tốt, đủ điều kiện lên sàn. Đưa sản phẩm quay lại trạng thái đang bán ngay trên sàn.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Cột phải (5 cols): Tóm tắt món đồ & Hệ quả */}
          <div className="lg:col-span-5 space-y-3.5">
            {/* Box 1: Thông tin món */}
            <div className="border border-neutral rounded-xl overflow-hidden bg-surface shadow-sm">
              <div className="p-3 flex items-center gap-3 border-b border-neutral">
                {itemPhoto ? (
                  <ZoomableImage
                    src={itemPhoto}
                    alt={itemName}
                    className="w-12 h-14 rounded-lg border border-neutral overflow-hidden shrink-0"
                    imgClassName="w-full h-full object-cover"
                    images={itemPhotos}
                    categoryLabel={itemName}
                    showHoverBadge={false}
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

            {!selectedOutcome && (
              <div className="border border-dashed border-neutral rounded-xl p-3.5 bg-[#FAFBF9] text-[11px] text-textSecondary">
                Chọn phương án bên trái, sau đó bấm <strong>Xác nhận xử lý</strong>.
              </div>
            )}

            {selectedOutcome === 'RELIST' && (
              <div className="border-2 border-[#006B2C] rounded-xl p-3.5 bg-[#F6F9F4] space-y-2">
                <div className="text-[10px] uppercase font-bold text-[#006B2C] tracking-wider">
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

            <div className="p-3 border border-dashed border-[#9a9a9a] rounded-xl text-[11px] leading-relaxed text-[#4a4a4a] bg-surface">
              Member nhận thông báo món đã trở lại sàn. Họ thấy món bị trả một lần trong lịch sử, nhưng <strong className="font-bold text-[#191C19]">người mua khác không thấy</strong> — món bị trả vì tranh chấp mô tả không phải lỗi của món.
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-3 border-t border-neutral flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            className="rounded-xl border-neutral text-xs px-4 py-2"
            onClick={() => setIsOutcomeModalOpen(false)}
          >
            Để sau
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={submitting}
            disabled={!selectedOutcome || submitting || alreadyProcessed}
            className="text-xs font-bold px-5 py-2 shadow-sm"
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
  const [lightboxState, setLightboxState] = React.useState(null);
  if (!selectedItem) return null;
  const fullCompensation = selectedItem.compensationAmount;
  const halfCompensation = selectedItem.halfCompensationAmount ?? (
    fullCompensation != null && selectedItem.degradedCompensationRate != null
      ? Number(fullCompensation) * Number(selectedItem.degradedCompensationRate) : null);
  const showAmount = value => value == null ? 'Backend sẽ xác định khi mở ca' : formatCurrencyVND(value);

  const stockPhotos = selectedItem.packingPhotoUrls?.length
    ? selectedItem.packingPhotoUrls
    : (selectedItem.stockInPhotos?.length
      ? selectedItem.stockInPhotos
      : (selectedItem.initialConsignmentPhotoUrls?.length
        ? selectedItem.initialConsignmentPhotoUrls
        : (selectedItem.productPhotos || [])));

  const allDamagedPhotos = evidenceImageUrls;
  const removePhoto = idx => removeEvidence?.(idx);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length && uploadEvidence) {
      uploadEvidence(files);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hàng xuống cấp, đề xuất đền cho người ký gửi"
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
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setLightboxState({
                          images: stockPhotos,
                          index: i,
                          categoryLabel: 'Ảnh lúc xuất kho / ban đầu',
                        })
                      }
                      className="w-16 h-16 rounded-lg overflow-hidden border border-neutral cursor-zoom-in group hover:ring-2 hover:ring-[#006B2C]/40"
                      title={`Phóng to ảnh xuất kho ${i + 1}`}
                    >
                      <img
                        src={url}
                        alt="Ảnh xuất kho"
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[#717971] italic">Chưa có ảnh xuất kho lưu trữ</p>
              )}
            </div>

            <div className="p-2.5 rounded-xl border border-red-200 bg-red-50/40 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-red-700">Ảnh hiện trạng hư hỏng (tối thiểu 2, tối đa 5) *</span>
                <span className="text-[10px] font-bold text-red-700">{allDamagedPhotos.length} / 5</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allDamagedPhotos.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-red-300 group">
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxState({
                          images: allDamagedPhotos,
                          index: i,
                          categoryLabel: 'Ảnh hiện trạng hư hỏng',
                        })
                      }
                      className="w-full h-full block cursor-zoom-in"
                      title={`Phóng to ảnh hư hỏng ${i + 1}`}
                    >
                      <img src={url} alt={`Ảnh hư hỏng ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Xóa ảnh hiện trạng ${i + 1}`}
                      title="Xóa ảnh"
                      disabled={degradedSubmitting || evidenceUploading}
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(i);
                      }}
                      className="absolute top-0.5 right-0.5 bg-black/75 hover:bg-[#D92D20] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {allDamagedPhotos.length === 1 && (
                <p className="text-[10px] text-red-700 font-medium">
                  Cần tải thêm ít nhất 1 ảnh nữa (tối thiểu 2 ảnh).
                </p>
              )}

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
                      {evidenceUploading ? 'Đang tải…' : 'Tải ảnh từ máy'}
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
                Không lấy lại đồ. Hàng thành tài sản nền tảng.
              </p>
            </div>
            <div className="p-3 rounded-xl border border-[#B54708] bg-[#FFFAEB] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#B54708]">Phương án 2 · Đền một phần + Nhận lại</span>
              <p className="text-base font-extrabold text-[#B54708]">{showAmount(halfCompensation)}</p>
              <p className="text-[10px] text-[#5B6776] leading-tight">
                Member nhận tiền đền theo tỷ lệ trên biên nhận và đến quầy tiếp nhận lấy đồ.
              </p>
            </div>
          </div>
          <p className="text-[10px] text-[#5B6776]">
            {DEGRADED_DECISION_POLICY}
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral">
          <Button variant="outline" size="sm" className="rounded-xl border-neutral" disabled={degradedSubmitting} onClick={onClose}>
            Hủy
          </Button>
          <Button
            size="sm"
            variant="primary"
            loading={degradedSubmitting}
            disabled={degradedSubmitting || evidenceUploading || Boolean(evidenceError) || !degradedNotes?.trim() || allDamagedPhotos.length < 2 || allDamagedPhotos.length > 5}
            className="font-bold rounded-xl px-4 py-2"
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
      {lightboxState && (
        <ImageLightbox
          isOpen={Boolean(lightboxState)}
          onClose={() => setLightboxState(null)}
          images={lightboxState?.images || []}
          initialIndex={lightboxState?.index ?? 0}
          categoryLabel={lightboxState?.categoryLabel || ''}
        />
      )}
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

export function ReturnRejectDialog({ isRejectModalOpen, setIsRejectModalOpen, rejectReason, setRejectReason, handleConfirmRejectRequest, rejectingReturn = false }) {
  const handleClose = () => {
    if (!rejectingReturn) setIsRejectModalOpen(false);
  };
  return (
    <Modal
      isOpen={isRejectModalOpen}
      onClose={handleClose}
      title="Từ chối yêu cầu trả hàng"
    >
      <div className="space-y-4 text-xs font-sans">
        <p className="text-textSecondary">
          Người mua sẽ nhận được thông báo giải thích lý do yêu cầu không hợp lệ theo chính sách của ReHome.
        </p>
        <div>
          <label htmlFor="return-reject-reason" className="block font-bold text-text mb-1">Lý do từ chối *</label>
          <textarea
            id="return-reject-reason"
            rows="3"
            value={rejectReason}
            disabled={rejectingReturn}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ví dụ: Lỗi người mua tự gây ra, gửi yêu cầu sau khi đã quá thời hạn trả hàng cho phép..."
            className="w-full p-2.5 border border-neutral rounded-xl text-text bg-surface focus:outline-none focus:border-error"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-neutral">
          <Button size="sm" variant="outline" disabled={rejectingReturn} className="rounded-xl border-neutral" onClick={handleClose}>
            Hủy
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={rejectingReturn}
            disabled={rejectingReturn || !rejectReason.trim()}
            className="font-bold rounded-xl px-4"
            onClick={handleConfirmRejectRequest}
          >
            Xác nhận từ chối
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ReturnMarkLostDialog({ markLostTarget, onClose, onConfirm, submitting = false }) {
  return (
    <Modal
      isOpen={Boolean(markLostTarget)}
      onClose={() => { if (!submitting) onClose(); }}
      title="Xác nhận bưu kiện thất lạc"
    >
      <div className="space-y-4 text-xs font-sans">
        <p className="text-text leading-relaxed">
          Xác nhận bưu kiện trả hàng <strong>{markLostTarget?.code}</strong> đã thất lạc bởi bên vận chuyển?
        </p>
        <p className="text-textSecondary leading-relaxed">
          Hệ thống sẽ hoàn tiền cho người mua và tạo khiếu nại bảo hiểm với đơn vị giao vận.
        </p>
        <div className="flex justify-end gap-2 pt-2 border-t border-neutral">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl border-neutral"
            disabled={submitting}
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={submitting}
            disabled={submitting}
            className="font-bold px-4"
            onClick={onConfirm}
          >
            Xác nhận thất lạc
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
        Chọn Không hợp lệ thì bắt buộc nhập lý do và tải lên từ 2 đến 5 ảnh kho chụp để đối chất.
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
  handleReleaseReturn,
  releasingReturn = false,
  savingInspection = false,
}) {
  return (
    <div className="lg:col-span-6 space-y-4 font-sans">
      {/* Cảnh báo kiểm định viên */}
      {selectedItem?.isInspectorSelf && (
        <div className="border border-neutral bg-surface p-4 rounded-2xl flex justify-between items-center gap-3 shadow-sm">
          <div className="text-xs">
            <div className="font-bold text-text mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span>Món này do CHÍNH BẠN kiểm định lúc nhập kho {selectedItem.stockInDate}</span>
            </div>
            <div className="text-[11px] text-textSecondary leading-relaxed">
              Người mua đang nói tình trạng tệ hơn kết luận bạn viết. Bạn vẫn kết luận được, nhưng nên để người khác xem cho khách quan.
            </div>
          </div>
          <button
            type="button"
            disabled={releasingReturn || !selectedItem?.id}
            onClick={() => handleReleaseReturn?.()}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 border border-neutral rounded-xl bg-background hover:bg-neutral/20 text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {releasingReturn ? 'Đang chuyển...' : <>Chuyển cho<br />người khác</>}
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
              Báo nghi hàng giả
            </button>
          )}
          {handleOpenDegradedCase && (
            <button
              type="button"
              onClick={handleOpenDegradedCase}
              className="px-3.5 py-2 rounded-xl border border-secondary bg-[#FFFDF5] text-[#B45309] text-xs font-bold hover:bg-amber-100 transition-colors"
            >
              Báo hàng xuống cấp
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
        {selectedItem?.discountAmount != null && Number(selectedItem.discountAmount) > 0 && (
          <div className="flex justify-between">
            <span className="text-textSecondary">Giảm giá / Voucher</span>
            <span className="text-error font-medium">-{formatCurrencyVND(selectedItem.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-textSecondary">Phí trả hàng</span>
          <span className="text-primary font-bold">kho chịu</span>
        </div>
        <div className="flex justify-between text-sm font-bold pt-2 border-t border-neutral text-text">
          <span>Hoàn vào ví người mua</span>
          <span className="text-primary">
            {selectedItem?.refundAmount != null
              ? formatCurrencyVND(selectedItem.refundAmount)
              : (selectedItem?.amount != null ? formatCurrencyVND(selectedItem.amount) : '—')}
          </span>
        </div>
        <p className="text-[10px] text-textSecondary pt-1">
          Vào ví ReHome, không hoàn về thẻ/VNPay. Tiền của người ký gửi đang giữ nên không phải đòi lại.
        </p>
      </div>
    
      {/* Nút lưu kết luận */}
      <div className="pt-2 flex items-center gap-3">
        <Button
          type="button"
          variant="primary"
          size="sm"
          loading={savingInspection}
          disabled={!inspectionVerdict || savingInspection}
          onClick={handleSaveInspection}
          className="py-2.5 px-6 text-xs font-bold"
        >
          Lưu kết luận
        </Button>
        {!inspectionVerdict && (
          <span className="text-xs text-textSecondary">Chọn kết luận mới lưu được</span>
        )}
      </div>
    </div>
  );
}

export function ReturnInspectionChecklist() {
  const items = [
    'Còn nguyên tem Mã hàng hóa trên sản phẩm',
    'Không có hư hỏng mới so với ảnh nhập kho',
    'Không có dấu vết đã qua sử dụng thêm',
    'Đủ phụ kiện đi kèm nếu có',
  ];

  return (
    <div className="border border-neutral rounded-2xl overflow-hidden bg-surface text-xs font-sans shadow-sm">
      <div className="p-3 bg-background border-b border-neutral text-[10px] uppercase font-bold text-textSecondary">
        Bước 2 · Đối chiếu từng mục
      </div>
      <ul className="divide-y divide-neutral">
        {items.map((label) => (
          <li key={label} className="p-3.5 flex items-start gap-2.5">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-textSecondary/70 shrink-0" aria-hidden="true" />
            <span className="font-semibold text-text">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReturnInspectionProduct({
  selectedItem,
  checklist,
  setChecklist,
  setIsCompareModalOpen,
  evidenceImageUrls = [],
  evidenceUploading = false,
  evidenceError = '',
  uploadEvidence,
  retryEvidence,
  removeEvidence,
}) {
  const packingPhotos = selectedItem?.packingPhotoUrls || [];
  const stockPhotos = selectedItem?.stockInPhotos || [];
  const buyerPhotos = selectedItem?.buyerPhotos || [];
  const hasPackingPhotos = packingPhotos.length > 0;

  return (
    <div className="lg:col-span-6 space-y-4 border-r border-neutral pr-0 lg:pr-6 font-sans">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-text">
            {hasPackingPhotos
              ? 'Đối chiếu hàng về với ảnh đóng gói lúc xuất kho'
              : 'Đối chiếu hàng về với ảnh nhập kho'}
          </h2>
          <p className="text-xs text-textSecondary">
            {hasPackingPhotos
              ? 'Mốc chuẩn là ảnh đóng gói lúc xuất kho, đối chiếu trực tiếp với ảnh người mua trả về.'
              : 'Chưa có ảnh đóng gói cho đơn này — đối chiếu bằng ảnh nhập kho ban đầu.'}
          </p>
        </div>
        {setIsCompareModalOpen && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsCompareModalOpen(true)}
            className="border-[#006B2C] text-[#006B2C] hover:bg-[#ECFDF3] shrink-0 whitespace-nowrap"
          >
            So sánh lớn
          </Button>
        )}
      </div>

      <ReturnPhotoComparison
        packingPhotos={packingPhotos}
        stockPhotos={stockPhotos}
        buyerPhotos={buyerPhotos}
        stockInDate={selectedItem?.stockInDate}
        compact
      />

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

export function ReturnReviewDecision({ selectedItem, handleApproveAndCreateWaybill, setIsRejectModalOpen, handleOpenOutcomeModal, approvingReturn = false }) {
  const thumbUrl = selectedItem?.packingPhotoUrls?.[0] || selectedItem?.stockInPhotos?.[0] || null;
  const decisionPhotos = selectedItem?.packingPhotoUrls?.length
    ? selectedItem.packingPhotoUrls
    : selectedItem?.stockInPhotos?.length
      ? selectedItem.stockInPhotos
      : thumbUrl
        ? [thumbUrl]
        : [];
  const buyerLine = [selectedItem?.buyerName, selectedItem?.buyerPhone].filter(Boolean).join(' · ') || '—';
  return (
    <div className="lg:col-span-5 space-y-4 font-sans">
      <div>
        <h2 className="text-base font-bold text-text">Đơn và món liên quan</h2>
        <p className="text-xs text-textSecondary">
          Đơn #{selectedItem?.orderNo || selectedItem?.orderId || '—'} · Người mua: {selectedItem?.buyerName || '—'}
        </p>
      </div>
    
      {/* Box món đồ */}
      <div className="border border-neutral rounded-2xl overflow-hidden bg-surface shadow-sm">
        <div className="p-3.5 flex items-center gap-3 border-b border-neutral">
          {thumbUrl ? (
            <ZoomableImage
              src={thumbUrl}
              alt={selectedItem?.itemName || 'Sản phẩm'}
              className="w-12 h-14 rounded-xl border border-neutral overflow-hidden shrink-0"
              imgClassName="w-full h-full object-cover"
              images={decisionPhotos}
              categoryLabel={selectedItem?.itemName || 'Sản phẩm'}
              showHoverBadge={false}
            />
          ) : (
            <div className="w-12 h-14 rounded-xl border border-dashed border-neutral bg-background flex items-center justify-center text-[10px] text-textSecondary shrink-0">
              Ảnh
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-text">{selectedItem?.sku}</div>
            <div className="text-xs text-textSecondary">{selectedItem?.itemName}</div>
            {selectedItem?.itemDetails &&
              selectedItem.itemDetails.trim().toLowerCase() !==
                (selectedItem?.itemName || '').trim().toLowerCase() && (
                <div className="text-[10px] text-textSecondary">{selectedItem.itemDetails}</div>
              )}
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
      </div>
    
      {/* Box vận đơn trả */}
      <div className="border-2 border-neutral rounded-2xl p-4 bg-surface space-y-2 text-xs shadow-sm">
        <div className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">
          Vận đơn trả hàng sẽ tạo khi bấm duyệt
        </div>
        <div className="text-xs text-text leading-relaxed">
          Lấy tại <strong className="font-semibold">{buyerLine}</strong>
          <br />
          {selectedItem?.buyerAddress || '—'}
        </div>
        {selectedItem?.ghnReturnTrackingCode && (
          <div className="pt-2 border-t border-neutral space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-textSecondary">Mã thu hồi:</span>
              <span className="font-mono font-bold text-text">{selectedItem.ghnReturnTrackingCode}</span>
            </div>
            {selectedItem?.ghnFallbackUsed && (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[10px] font-semibold">
                Mã thu hồi nội bộ (GHN fallback) — GHN Sandbox tạm lỗi khi tạo vận đơn, yêu cầu vẫn đã được duyệt.
              </div>
            )}
          </div>
        )}
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
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="primary"
            loading={approvingReturn}
            disabled={approvingReturn}
            onClick={handleApproveAndCreateWaybill}
            className="flex-1 py-2.5 px-4 text-xs font-bold"
          >
            Duyệt & tạo vận đơn trả
          </Button>
          <Button
            type="button"
            variant="danger-outline"
            disabled={approvingReturn}
            onClick={() => setIsRejectModalOpen(true)}
            className="py-2.5 px-4 text-xs font-bold"
          >
            Từ chối yêu cầu
          </Button>
        </div>
      )}
      {needsItemAction(selectedItem) && handleOpenOutcomeModal && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => handleOpenOutcomeModal(selectedItem)}
            className="w-full py-2.5 px-4 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm transition-colors"
          >
            Chọn phương án xử lý món hàng
          </button>
        </div>
      )}
    </div>
  );
}

export function ReturnRequestDetails({ selectedItem, setIsCompareModalOpen }) {
  const buyerPhotos = selectedItem?.buyerPhotos || [];
  const packingPhotos = selectedItem?.packingPhotoUrls || [];
  const stockPhotos = selectedItem?.stockInPhotos || [];
  const hasPackingPhotos = packingPhotos.length > 0;

  const trimmedReason = (selectedItem?.reason || '').trim();
  const trimmedBuyerNote = (selectedItem?.buyerNote || '').trim();
  const showBuyerNote =
    Boolean(trimmedBuyerNote) &&
    trimmedBuyerNote.toLowerCase() !== trimmedReason.toLowerCase();

  return (
    <div className="lg:col-span-7 space-y-4 border-r border-neutral pr-0 lg:pr-6 font-sans">
      <div>
        <h2 className="text-base font-bold text-text">Người mua nói gì</h2>
      </div>
    
      <div className="border border-neutral rounded-2xl p-4 bg-surface space-y-2 shadow-sm">
        <div className="flex justify-between items-baseline text-[10px] text-textSecondary uppercase tracking-wider font-semibold">
          <span>Lý do đã chọn</span>
          <span>Gửi lúc {selectedItem?.submittedAt}</span>
        </div>
        <div className="text-sm font-bold text-text">{selectedItem?.reason}</div>
        {showBuyerNote && (
          <div className="text-xs text-text leading-relaxed bg-background p-3 rounded-xl border border-neutral">
            "{trimmedBuyerNote}"
          </div>
        )}
      </div>

      <div className="border border-neutral rounded-2xl p-4 bg-surface space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-text">Đối chiếu hình ảnh</div>
            <p className="text-[11px] text-textSecondary">
              {hasPackingPhotos
                ? 'Ảnh đóng gói do kho chụp trước khi bàn giao GHN — dùng làm mốc chuẩn đối chiếu với ảnh người mua gửi.'
                : 'Đơn hàng cũ chưa có ảnh đóng gói, dùng ảnh kho tự chụp lúc nhập làm mốc chuẩn đối chiếu.'}
            </p>
          </div>
          {setIsCompareModalOpen && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsCompareModalOpen(true)}
              className="border-[#006B2C] text-[#006B2C] hover:bg-[#ECFDF3] shrink-0 whitespace-nowrap"
            >
              Mở so sánh cạnh nhau
            </Button>
          )}
        </div>

        <ReturnPhotoComparison
          packingPhotos={packingPhotos}
          stockPhotos={stockPhotos}
          buyerPhotos={buyerPhotos}
          stockInDate={selectedItem?.stockInDate}
          compact
        />
      </div>
    </div>
  );
}

export function ReturnQuickDetailModal({ item, onClose, onOpenFullReview }) {
  if (!item) return null;
  const statusMap = {
    PENDING_APPROVAL: 'Chờ duyệt',
    WAITING_BUYER_DISPATCH: 'Chờ người mua gửi',
    RETURNING: 'Đang về kho',
    RECEIVED_INSPECT: 'Hàng đã về, chờ kiểm',
    RESOLVED: needsItemAction(item) ? 'Đã hoàn tiền · Chờ xử lý món' : 'Đã xong',
  };
  return (
    <Modal
      isOpen={Boolean(item)}
      onClose={onClose}
      title="Chi tiết yêu cầu trả hàng"
      size="md"
    >
      <div className="space-y-4 text-xs text-textSecondary font-sans">
        <div className="rounded-xl border border-neutral bg-[#F6F9F4] p-3.5 space-y-2">
          <div className="flex justify-between gap-4">
            <span className="font-semibold shrink-0">Mã yêu cầu:</span>
            <span className="font-mono font-bold text-text text-right">{item.code || item.id}</span>
          </div>
          {(item.orderNo || item.orderId) && (
            <div className="flex justify-between gap-4">
              <span className="font-semibold shrink-0">Mã đơn hàng:</span>
              <span className="font-mono font-bold text-text text-right">{item.orderNo || item.orderId}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="font-semibold shrink-0">Người mua:</span>
            <span className="font-bold text-text text-right">{item.buyerName || '—'}</span>
          </div>
          {item.buyerPhone && (
            <div className="flex justify-between gap-4">
              <span className="font-semibold shrink-0">Số điện thoại:</span>
              <span className="text-text text-right">{item.buyerPhone}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="font-semibold shrink-0">Sản phẩm:</span>
            <span className="font-semibold text-text text-right">{item.itemName || '—'}</span>
          </div>
          {item.sku && (
            <div className="flex justify-between gap-4">
              <span className="font-semibold shrink-0">Mã hàng hóa:</span>
              <span className="font-mono font-bold text-text text-right">{item.sku}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="font-semibold shrink-0">Số món:</span>
            <span className="text-text text-right">{item.itemCount ?? 1} món</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="font-semibold shrink-0">Số tiền:</span>
            <span className="font-bold text-primary text-right">{formatCurrencyVND(item.refundAmount ?? item.amount ?? 0)}</span>
          </div>
          {(item.sellerName || item.consignorCode) && (
            <div className="flex justify-between gap-4">
              <span className="font-semibold shrink-0">Người ký gửi:</span>
              <span className="text-text text-right">{item.sellerName || item.consignorCode}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="font-semibold shrink-0">Gửi lúc:</span>
            <span className="text-text text-right">{item.submittedAt || '—'}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="font-semibold shrink-0">Đã chờ:</span>
            <span className="text-text text-right">{item.waitTime || '—'}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="font-semibold shrink-0">Trạng thái:</span>
            <span className="font-bold text-text text-right">{statusMap[item.status] || item.carrierStatus || item.status}</span>
          </div>
          <div className="pt-2 border-t border-neutral">
            <span className="font-semibold block mb-1">Lý do trả hàng:</span>
            <p className="text-text font-medium leading-relaxed">{item.reason || '—'}</p>
            {item.buyerNote && item.buyerNote.trim() !== (item.reason || '').trim() && (
              <p className="mt-1 text-textSecondary italic">"{item.buyerNote}"</p>
            )}
          </div>
          {item.rejectReason && (
            <div className="pt-2 border-t border-neutral">
              <span className="font-semibold text-error block mb-1">Lý do từ chối:</span>
              <p className="text-text">{item.rejectReason}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="whitespace-nowrap">
            Đóng
          </Button>
          {onOpenFullReview && (
            <Button
              variant="primary"
              size="sm"
              className="whitespace-nowrap"
              onClick={() => {
                onClose();
                onOpenFullReview(item);
              }}
            >
              Mở hồ sơ đầy đủ
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function ReturnQueueTable({
  loading,
  filteredRequests,
  activeTab,
  handleOpenReview,
  handleOpenInspect,
  handleMarkLost,
  handleOpenDegradedCaseView,
  handleOpenOutcomeModal,
  handleOpenQuickDetail,
  emptyText = 'Không có yêu cầu trả hàng nào trong mục này.',
}) {
  return (
    <div className="bg-surface border border-neutral rounded-2xl overflow-hidden shadow-sm font-sans">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-background border-b border-neutral text-[10px] uppercase font-bold text-textSecondary tracking-wider whitespace-nowrap">
              <th className="py-3 px-3.5">Tên người mua</th>
              <th className="py-3 px-3.5">Số món</th>
              <th className="py-3 px-3.5">Gửi lúc</th>
              <th className="py-3 px-3.5">{TABLE_COLUMN_LABELS.WAITED}</th>
              <th className="py-3 px-3.5">{TABLE_COLUMN_LABELS.STATUS}</th>
              <th className="py-3 px-3.5 text-right">{TABLE_COLUMN_LABELS.ACTIONS}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral">
            {loading && (
              <tr>
                <td colSpan="6" className="py-8 text-center text-textSecondary">
                  Đang tải danh sách yêu cầu trả hàng...
                </td>
              </tr>
            )}
            {!loading && filteredRequests.length === 0 && (
              <tr>
                <td colSpan="6" className="py-8 text-center text-textSecondary">
                  {emptyText}
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
                    handleOpenOutcomeModal={handleOpenOutcomeModal}
                    handleOpenQuickDetail={handleOpenQuickDetail}
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
        onClick={() => setActiveTab('PENDING_DISPOSITION')}
        className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
          activeTab === 'PENDING_DISPOSITION'
            ? 'bg-primary text-white shadow-sm'
            : (tabCounts.PENDING_DISPOSITION ?? 0) > 0
              ? 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89] hover:bg-[#FEF0C7]'
              : 'bg-surface text-textSecondary border border-neutral hover:bg-background'
        }`}
      >
        Chờ xử lý món · {tabCounts.PENDING_DISPOSITION ?? 0}
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
