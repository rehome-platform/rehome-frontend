import { ReturnQueueRow } from './ReturnQueueRow.jsx';
import React from "react";
import { Button, Modal } from "../../../../components/common/index.js";
import { formatCurrencyVND } from "../../../../utils/formatters.js";
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
  const [selectedOutcome, setSelectedOutcome] = React.useState('RELIST');
  const [discardReason, setDiscardReason] = React.useState('');

  React.useEffect(() => {
    if (isOutcomeModalOpen) {
      setSelectedOutcome('RELIST');
      setDiscardReason('');
    }
  }, [isOutcomeModalOpen]);

  const price = selectedItem?.consignPrice || selectedItem?.amount || selectedItem?.itemPrice || 420000;
  const commissionRate = 15;
  const currentTerm = selectedItem?.term || 2;
  const daysInTerm = selectedItem?.daysInTerm || 46;
  const totalDaysInTerm = 60;
  const shelfLocation = selectedItem?.shelfLocation || selectedItem?.warehouseLocation || 'B1-22';
  const consignorCode = selectedItem?.consignorCode || selectedItem?.senderCode || selectedItem?.sellerName || 'MB-004821';
  const itemSku = selectedItem?.sku || selectedItem?.productCode || 'RH-C2M08P';
  const itemName = selectedItem?.itemName || selectedItem?.productName || 'Quần jeans ống rộng · Levi\'s · 29';
  const itemPhoto =
    selectedItem?.stockInPhotos?.[0] ||
    selectedItem?.productImage ||
    selectedItem?.photos?.[0] ||
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400';

  const onConfirm = () => {
    if (selectedOutcome === 'DISCARD' && !discardReason.trim()) {
      alert('Vui lòng nhập lý do tiêu huỷ món hàng.');
      return;
    }
    handleConfirmOutcome(selectedOutcome, { discardReason });
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
                onClick={() => {
                  setSelectedOutcome('RELIST');
                  handleConfirmOutcome('RELIST');
                }}
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
                Kỳ và hoa hồng <strong className="font-bold text-[#191C19]">tiếp tục từ chỗ đang dở</strong> (kỳ {currentTerm}, ngày thứ {daysInTerm}), không tính lại từ đầu — nếu tính lại thì người ký gửi được lợi từ một giao dịch hỏng. Giữ nguyên SKU và tem cũ, không in lại.
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
                onClick={() => {
                  setSelectedOutcome('RETURN_TO_SELLER');
                  handleConfirmOutcome('RETURN_TO_SELLER');
                }}
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
                <img
                  src={itemPhoto}
                  alt={itemName}
                  className="w-12 h-14 object-cover rounded-lg border border-neutral shrink-0"
                />
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
                    Kỳ {currentTerm} · ngày {daysInTerm} / {totalDaysInTerm}
                  </span>
                </div>
              </div>
            </div>

            {/* Box 2: Tùy biến theo Phương án được chọn */}
            {selectedOutcome === 'RELIST' && (
              <div className="border-2 border-[#2b2b2b] rounded-xl p-3.5 bg-[#FAFBF9] space-y-2">
                <div className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">
                  NẾU ĐĂNG BÁN LẠI
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Giá bán:</span>
                    <span className="font-bold text-[#191C19]">{formatCurrencyVND(price)} · giữ nguyên</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Hoa hồng:</span>
                    <span className="font-bold text-[#191C19]">{commissionRate}% · kỳ {currentTerm}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Còn lại của kỳ:</span>
                    <span className="font-semibold text-[#191C19]">{totalDaysInTerm - daysInTerm} ngày</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-textSecondary">Vị trí kệ:</span>
                    <span className="font-bold text-primary">{shelfLocation} · chỗ cũ</span>
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
            className="rounded-xl bg-[#2b2b2b] text-white hover:bg-black text-xs font-bold px-5 py-2 shadow-sm"
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
  degradedConditionRate,
  setDegradedConditionRate,
  handleCreateDegradedCase,
  evidenceImageUrls = [],
  uploadEvidence,
  removeEvidence,
  evidenceUploading = false,
  evidenceError = '',
}) {
  const [localPhotos, setLocalPhotos] = React.useState([]);
  const [photoInput, setPhotoInput] = React.useState('');
  const [isEditingCompensation, setIsEditingCompensation] = React.useState(false);
  const [customCompensation, setCustomCompensation] = React.useState('');
  const fileInputRef = React.useRef(null);

  if (!selectedItem) return null;

  // Tính mức đền bù theo kỳ ký gửi hiện tại
  const currentTerm = selectedItem.currentTerm || 2;
  const commissionPercent = currentTerm === 3 ? 20 : currentTerm === 2 ? 15 : 10;
  const commissionRate = commissionPercent / 100;
  const sellingPrice = selectedItem.amount || selectedItem.itemPrice || selectedItem.priceAtOrder || 520000;
  const calculated100 = Math.max(0, Math.round(sellingPrice * (1 - commissionRate)));

  const fullCompensation = customCompensation !== '' && !isNaN(Number(customCompensation))
    ? Number(customCompensation)
    : (selectedItem.compensationAmount || calculated100);
  const halfCompensation = Math.round(fullCompensation * 0.5);

  const stockPhotos = selectedItem.stockInPhotos?.length
    ? selectedItem.stockInPhotos
    : (selectedItem.initialConsignmentPhotoUrls?.length
      ? selectedItem.initialConsignmentPhotoUrls
      : (selectedItem.productPhotos || []));

  const allDamagedPhotos = Array.from(new Set([...evidenceImageUrls, ...localPhotos]));

  const addPhoto = () => {
    if (photoInput.trim() && allDamagedPhotos.length < 5) {
      setLocalPhotos((prev) => [...prev, photoInput.trim()]);
      setPhotoInput('');
    }
  };

  const removePhoto = (idx) => {
    setLocalPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

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
              Kỳ {currentTerm} · Hoa hồng khấu trừ {commissionPercent}%
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
                      onClick={() => removePhoto(i)}
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
                      disabled={evidenceUploading}
                      className="text-[10px] py-1 px-2 border-neutral"
                    >
                      {evidenceUploading ? 'Đang tải…' : '📁 Tải ảnh từ máy'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Hoặc dán URL ảnh…"
                      value={photoInput}
                      onChange={(e) => setPhotoInput(e.target.value)}
                      className="flex-1 p-1 border border-neutral rounded-lg text-[10px] bg-white"
                    />
                    <Button type="button" size="sm" variant="outline" onClick={addPhoto} className="text-[10px] py-1 px-2">
                      +
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
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#6b6b6b]">2. Bảng tính mức đền cho người ký gửi</span>
            <button
              type="button"
              onClick={() => setIsEditingCompensation(!isEditingCompensation)}
              className="text-[11px] text-[#006B2C] font-semibold hover:underline"
            >
              {isEditingCompensation ? 'Đóng chỉnh sửa' : '✏️ Sửa mức đền'}
            </button>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-[#5f5f5f]">
              <span>Giá bán niêm yết:</span>
              <span className="font-semibold text-[#191C19]">{formatCurrencyVND(sellingPrice)}</span>
            </div>
            <div className="flex justify-between text-[#5f5f5f]">
              <span>Hoa hồng kỳ {currentTerm} ({commissionPercent}%):</span>
              <span className="text-red-600">− {formatCurrencyVND(Math.round(sellingPrice * commissionRate))}</span>
            </div>
          </div>

          {isEditingCompensation && (
            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-300 space-y-1">
              <label className="block text-[11px] font-bold text-amber-900">
                Nhập mức đền đề xuất tùy chỉnh (VNĐ):
              </label>
              <input
                type="number"
                value={customCompensation}
                onChange={(e) => setCustomCompensation(e.target.value)}
                placeholder={String(calculated100)}
                className="w-full p-1.5 border border-amber-400 rounded text-xs bg-white font-bold text-[#191C19]"
              />
              <p className="text-[10px] text-amber-800">
                Lưu ý: Chỉ chỉnh sửa mức đền khi có thỏa thuận hoặc trường hợp đặc biệt.
              </p>
            </div>
          )}

          {/* 2 Lựa chọn Member sẽ thấy */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl border border-[#006B2C] bg-[#E8F5E9]/60 space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#006B2C]">Phương án 1 · Đền 100%</span>
              <p className="text-base font-extrabold text-[#006B2C]">{formatCurrencyVND(fullCompensation)}</p>
              <p className="text-[10px] text-[#5f5f5f] leading-tight">
                Không lấy lại đồ. Hàng thành tài sản nền tảng (PLATFORM_OWNED).
              </p>
            </div>
            <div className="p-3 rounded-xl border border-[#D97706] bg-[#FFFBEB] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#D97706]">Phương án 2 · Đền 50% + Nhận lại</span>
              <p className="text-base font-extrabold text-[#D97706]">{formatCurrencyVND(halfCompensation)}</p>
              <p className="text-[10px] text-[#5f5f5f] leading-tight">
                Member nhận 50% tiền đền và có 30 ngày đến quầy tiếp nhận lấy đồ.
              </p>
            </div>
          </div>
          <p className="text-[10px] text-[#717971]">
            Hạn chọn 7 ngày. Quá hạn tự động mặc định chọn nhận tiền đền 100%.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral">
          <Button variant="outline" size="sm" className="rounded-xl border-neutral" onClick={onClose}>
            Hủy
          </Button>
          <Button
            size="sm"
            disabled={!degradedNotes?.trim() || allDamagedPhotos.length < 1}
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

/**
 * TH-07: Màn hình kết luận hàng xuống cấp hiển thị đầy đủ 3 trạng thái của Wireframe:
 * 1. TH-07-ChoKetLuan (CHỜ KẾT LUẬN)
 * 2. TH-07-DaGui (ĐÃ GỬI, CHỜ NGƯỜI KÝ GỬI)
 * 3. TH-07-DaChon (ĐÃ CHỌN PHƯƠNG ÁN)
 */
export function DegradedCaseViewTH07({
  selectedItem,
  degradedCaseState = 'CHO_KET_LUAN',
  onBackToQueue,
  onSendTwoOptions,
  onNavigateToCounter,
}) {
  if (!selectedItem) return null;

  const currentTerm = selectedItem.currentTerm || 2;
  const commissionPercent = currentTerm === 3 ? 20 : currentTerm === 2 ? 15 : 10;
  const commissionRate = commissionPercent / 100;
  const sellingPrice = selectedItem.amount || selectedItem.itemPrice || selectedItem.priceAtOrder || 520000;
  const fullCompensation = selectedItem.compensationAmount || Math.max(0, Math.round(sellingPrice * (1 - commissionRate)));
  const halfCompensation = selectedItem.paidAmount || selectedItem.halfCompensationAmount || Math.round(fullCompensation * 0.5);

  const stockPhotos = selectedItem.stockInPhotos?.length
    ? selectedItem.stockInPhotos
    : (selectedItem.initialConsignmentPhotoUrls?.length
      ? selectedItem.initialConsignmentPhotoUrls
      : (selectedItem.productPhotos || []));

  const damagedPhotos = selectedItem.photos?.length
    ? selectedItem.photos
    : (selectedItem.buyerPhotos || []);

  const decision = selectedItem.decision || selectedItem.degradedDecision || (
    selectedItem.decisionStatus === 'FULL_COMPENSATION' ? 'FULL_COMPENSATION' :
    selectedItem.decisionStatus === 'PARTIAL_WITH_ITEM_BACK' ? 'PARTIAL_WITH_ITEM_BACK' :
    'FULL_COMPENSATION'
  );

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral pb-3 bg-surface p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToQueue}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-neutral text-sm text-text hover:bg-background transition-colors"
            title="Quay lại hàng đợi"
          >
            ←
          </button>
          <div>
            <span className="text-xs text-textSecondary">Yêu cầu trả hàng · </span>
            <span className="text-sm font-bold text-text">
              {selectedItem.code || selectedItem.returnCode || 'YC-00091'} · hàng xuống cấp
            </span>
          </div>
        </div>

        <div>
          {degradedCaseState === 'CHO_KET_LUAN' && (
            <span className="px-3 py-1 border border-neutral rounded-full text-xs font-semibold bg-white text-text">
              CHỜ KẾT LUẬN
            </span>
          )}
          {degradedCaseState === 'DA_GUI' && (
            <span className="px-3 py-1 bg-[#2b2b2b] text-white text-xs font-bold rounded-full">
              ĐÃ GỬI, CHỜ NGƯỜI KÝ GỬI
            </span>
          )}
          {degradedCaseState === 'DA_CHON' && (
            <span className="px-3 py-1 bg-[#006B2C] text-white text-xs font-bold rounded-full">
              ĐÃ CHỌN PHƯƠNG ÁN
            </span>
          )}
        </div>
      </div>

      {/* Main 2-column layout matching Wireframes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột trái (7 cols): Đối chiếu ảnh & Nguyên nhân */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-neutral bg-surface p-5 space-y-4 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#191C19]">
                {selectedItem.itemName || selectedItem.productName} · {selectedItem.sku || selectedItem.productId || 'RH-M4T19B'}
              </h2>
              <p className="text-xs text-[#5f5f5f]">
                {selectedItem.code || 'YC-00091'} · hàng về bị hư hỏng, phát hiện ở bước đối chiếu kiểm tra
              </p>
            </div>

            {/* 2 Cột ảnh: Xuất kho vs Hàng về hư hỏng */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b6b]">
                  Ảnh lúc xuất kho
                </span>
                <div className="flex flex-wrap gap-2">
                  {stockPhotos.length > 0 ? (
                    stockPhotos.map((url, i) => (
                      <div key={i} className="w-24 h-28 rounded-xl border border-neutral overflow-hidden bg-[#fafafa]">
                        <img src={url} alt="Ảnh xuất kho" className="w-full h-full object-cover" />
                      </div>
                    ))
                  ) : (
                    <div className="w-24 h-28 rounded-xl border border-dashed border-neutral flex items-center justify-center text-[10px] text-[#717971] p-2 text-center">
                      Ảnh gốc lúc nhập kho
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                  Ảnh hàng về · hư hỏng
                </span>
                <div className="flex flex-wrap gap-2">
                  {damagedPhotos.length > 0 ? (
                    damagedPhotos.map((url, i) => (
                      <div key={i} className="w-24 h-28 rounded-xl border border-red-300 overflow-hidden bg-red-50/30">
                        <img src={url} alt="Ảnh hư hỏng" className="w-full h-full object-cover" />
                      </div>
                    ))
                  ) : (
                    <div className="w-24 h-28 rounded-xl border border-dashed border-red-300 flex items-center justify-center text-[10px] text-red-600 p-2 text-center">
                      Chưa có ảnh hư hỏng
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Box Nguyên nhân */}
            <div className="border border-neutral rounded-xl p-3.5 bg-background space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b6b]">
                Nguyên nhân
              </span>
              <p className="text-xs text-[#3a3a3a] leading-relaxed">
                {selectedItem.degradedReason || selectedItem.conditionNote || 'Thùng móp nặng trên đường vận chuyển trả về — khoá kéo gãy, vết rách ở thân sau. Lỗi khâu vận chuyển do kho sắp xếp, không phải lỗi người mua hay người ký gửi.'}
              </p>
            </div>
          </div>
        </div>

        {/* Cột phải (5 cols): Nội dung theo từng trạng thái */}
        <div className="lg:col-span-5 space-y-4">
          {/* TRẠNG THÁI 1: CHỜ KẾT LUẬN (TH-07-ChoKetLuan) */}
          {degradedCaseState === 'CHO_KET_LUAN' && (
            <div className="rounded-2xl border border-neutral bg-surface p-5 space-y-4 shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#6b6b6b]">Mô tả hư hỏng</span>
                <div className="p-3 rounded-xl border border-neutral bg-background text-[#3a3a3a] leading-relaxed">
                  {selectedItem.conditionNote || 'Khoá kéo gãy, vết rách khoảng 4cm ở thân sau do va đập trong quá trình vận chuyển trả về kho.'}
                </div>
              </div>

              <div className="border border-neutral rounded-xl p-3.5 space-y-2 bg-[#fafafa]">
                <span className="text-[10px] uppercase font-bold text-[#6b6b6b]">Mức đền</span>
                <div className="flex justify-between text-[#5f5f5f]">
                  <span>Giá bán hiện tại:</span>
                  <span className="font-semibold text-[#191C19]">{formatCurrencyVND(sellingPrice)}</span>
                </div>
                <div className="flex justify-between text-[#5f5f5f]">
                  <span>Hoa hồng kỳ hiện tại (kỳ {currentTerm}):</span>
                  <span>− {commissionPercent}%</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-[#006B2C] pt-2 border-t border-neutral">
                  <span>Nếu nhận tiền đền 100%:</span>
                  <span>{formatCurrencyVND(fullCompensation)}</span>
                </div>
                <div className="flex justify-between font-semibold text-xs text-[#D97706]">
                  <span>Nếu nhận lại hàng + đền 50%:</span>
                  <span>{formatCurrencyVND(halfCompensation)}</span>
                </div>
                <p className="text-[10px] text-[#717971] pt-1">
                  Mức đền = giá bán trừ hoa hồng kỳ hiện tại. Kho chịu khoản này, không trừ vào tiền người ký gửi.
                </p>
              </div>

              <Button
                type="button"
                className="w-full bg-[#2b2b2b] text-white hover:bg-black font-bold py-3 text-xs"
                onClick={onSendTwoOptions}
              >
                Gửi 2 phương án cho người ký gửi
              </Button>
            </div>
          )}

          {/* TRẠNG THÁI 2: ĐÃ GỬI (TH-07-DaGui) */}
          {degradedCaseState === 'DA_GUI' && (
            <div className="rounded-2xl border border-neutral bg-surface p-5 space-y-4 shadow-sm">
              <div className="p-4 rounded-xl border-2 border-[#2b2b2b] bg-[#f4f4f4] space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-[#6b6b6b]">Đã gửi 2 phương án</span>
                <p className="text-xs text-[#3a3a3a] leading-relaxed">
                  Người ký gửi đang xem màn chọn phương án (KG-16) trên app. Hạn chọn <strong className="font-bold">7 ngày</strong>, quá hạn hệ thống tự chọn phương án nhận tiền đền 100%.
                </p>
              </div>

              <div className="border border-neutral rounded-xl p-3.5 space-y-2.5 bg-[#fafafa]">
                <span className="text-[10px] uppercase font-bold text-[#6b6b6b]">Mức đền đã gửi</span>
                <div className="flex justify-between text-xs">
                  <span className="text-[#3a3a3a]">Nhận tiền đền 100%:</span>
                  <span className="font-bold text-[#006B2C]">{formatCurrencyVND(fullCompensation)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#3a3a3a]">Nhận lại hàng + đền 50%:</span>
                  <span className="font-bold text-[#D97706]">{formatCurrencyVND(halfCompensation)}</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-neutral text-xs py-2.5 font-semibold"
                onClick={onBackToQueue}
              >
                Về hàng đợi trả hàng
              </Button>
            </div>
          )}

          {/* TRẠNG THÁI 3: ĐÃ CHỌN (TH-07-DaChon) */}
          {degradedCaseState === 'DA_CHON' && (
            <div className="rounded-2xl border border-neutral bg-surface p-5 space-y-4 shadow-sm">
              <div className="p-4 rounded-xl border-2 border-[#2b2b2b] bg-[#f4f4f4] space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#6b6b6b]">Người ký gửi đã chọn</span>
                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-[#006B2C] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    ✓
                  </span>
                  <div>
                    <p className="font-bold text-xs text-[#191C19]">
                      {decision === 'PARTIAL_WITH_ITEM_BACK'
                        ? `Nhận lại hàng kèm đền 50% — ${formatCurrencyVND(halfCompensation)}`
                        : `Nhận tiền đền 100% — ${formatCurrencyVND(fullCompensation)}`}
                    </p>
                    <p className="text-[10px] text-[#717971] mt-0.5">
                      {selectedItem.decidedAt
                        ? `Chọn lúc ${new Date(selectedItem.decidedAt).toLocaleString('vi-VN')}`
                        : 'Đã hoàn tất lựa chọn trên ứng dụng'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-neutral rounded-xl p-3.5 space-y-2 bg-[#fafafa]">
                <span className="text-[10px] uppercase font-bold text-[#6b6b6b]">Việc cần làm tiếp</span>
                {decision === 'PARTIAL_WITH_ITEM_BACK' ? (
                  <div className="text-xs text-[#3a3a3a] leading-relaxed space-y-2">
                    <p>
                      • Cộng <strong className="font-bold text-[#006B2C]">{formatCurrencyVND(halfCompensation)}</strong> vào ví người ký gửi — <strong>đã xử lý tự động</strong>.
                    </p>
                    <p>
                      • Chuyển món hàng sang khu vực <strong>Quầy tiếp nhận (BG-01)</strong>. Khi Member đến quầy, Moderator tra cứu Member và bấm <strong>Bàn giao</strong> để xuất kho.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-xs font-bold text-[#006B2C] border-[#006B2C] hover:bg-[#E8F5E9] mt-2 py-2"
                      onClick={onNavigateToCounter}
                    >
                      Mở Quầy tiếp nhận (BG-01) →
                    </Button>
                  </div>
                ) : (
                  <div className="text-xs text-[#3a3a3a] leading-relaxed space-y-1.5">
                    <p>
                      • Cộng <strong className="font-bold text-[#006B2C]">{formatCurrencyVND(fullCompensation)}</strong> vào ví người ký gửi — <strong>đã xử lý tự động</strong>.
                    </p>
                    <p>
                      • Món hàng chuyển trạng thái <strong className="font-bold text-purple-900">Tài sản nền tảng (PLATFORM_OWNED)</strong>, không đăng bán lại, không trả cho người ký gửi.
                    </p>
                    <p>
                      • Lần hư hỏng này <strong>không tính vào lịch sử</strong> ký gửi của họ.
                    </p>
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-neutral text-xs py-2.5 font-semibold"
                onClick={onBackToQueue}
              >
                Về hàng đợi trả hàng
              </Button>
            </div>
          )}
        </div>
      </div>
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
            placeholder="Ví dụ: Lỗi người mua tự gây ra, vượt quá thời hạn 3 ngày kể từ khi nhận hàng..."
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
