import { ReturnQueueRow } from './ReturnQueueRow.jsx';
import React from "react";
import { Button, Modal } from "../../../../components/common/index.js";
import { formatCurrencyVND } from "../../../../utils/formatters.js";

export function ReturnCompareDialog({ isCompareModalOpen, setIsCompareModalOpen, selectedItem }) {
  return (
    <Modal
      isOpen={isCompareModalOpen}
      onClose={() => setIsCompareModalOpen(false)}
      title="So sánh ảnh nhập kho vs ảnh người mua gửi"
    >
      {selectedItem && (
        <div className="space-y-4 font-sans text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="font-bold text-text mb-2">Ảnh lưu trữ khi nhập kho</div>
              <img
                src={selectedItem.stockInPhotos?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'}
                alt="Điểm kí gửi"
                className="w-full h-64 object-contain rounded-xl border border-neutral bg-background"
              />
            </div>
            <div>
              <div className="font-bold text-text mb-2">Ảnh người mua chụp gửi</div>
              <img
                src={selectedItem.buyerPhotos?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'}
                alt="Khách"
                className="w-full h-64 object-contain rounded-xl border border-neutral bg-background"
              />
            </div>
          </div>
          <div className="text-right">
            <Button size="sm" variant="outline" className="rounded-xl border-neutral" onClick={() => setIsCompareModalOpen(false)}>
              Đóng
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function ReturnOutcomeDialog({ isOutcomeModalOpen, setIsOutcomeModalOpen, handleConfirmOutcome }) {
  return (
    <Modal
      isOpen={isOutcomeModalOpen}
      onClose={() => setIsOutcomeModalOpen(false)}
      title="Chọn phương án xử lý món hàng (TH-04)"
    >
      <div className="space-y-4 text-xs font-sans">
        <p className="text-textSecondary">
          Đã xác nhận trả hàng hợp lệ. Vui lòng chọn hướng xử lý tiếp theo cho món đồ này tại kho:
        </p>
        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={() => handleConfirmOutcome('RELIST')}
            className="p-3.5 border-2 border-primary rounded-xl text-left bg-surface hover:bg-success-light/30 transition-colors shadow-sm"
          >
            <div className="font-bold text-primary text-sm">Đăng bán lại (Relist)</div>
            <div className="text-[11px] text-textSecondary mt-1">
              Món hàng vẫn đạt tiêu chuẩn chất lượng. Hệ thống sẽ giữ nguyên SKU và mở bán lại trên ứng dụng.
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleConfirmOutcome('RETURN_TO_SELLER')}
            className="p-3.5 border border-neutral rounded-xl text-left bg-surface hover:bg-background transition-colors"
          >
            <div className="font-bold text-text text-sm">Hoàn trả cho người ký gửi</div>
            <div className="text-[11px] text-textSecondary mt-1">
              Món hàng bị lỗi hoặc không còn phù hợp để bán lại. Chuyển vào hàng đợi hoàn trả người ký gửi.
            </div>
          </button>
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
}) {
  if (!selectedItem) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lập biên bản hàng xuống cấp (TH-04 / KG-16)"
    >
      <div className="space-y-4 text-xs font-sans">
        <div className="p-3 bg-[#FFFDF5] border border-secondary rounded-xl text-text leading-relaxed">
          <strong className="text-secondary font-bold">Lưu ý:</strong> Khi hàng trả về bị xuống cấp đáng kể so với ảnh nhập kho, hệ thống lập biên bản để người ký gửi chọn nhận lại món hàng cùng bồi thường một phần hoặc nhận bồi thường toàn bộ (KG-16).
        </div>

        <div className="rounded-xl border border-neutral bg-background p-3 space-y-1">
          <p><strong className="text-text">Yêu cầu trả:</strong> {selectedItem.code}</p>
          <p><strong className="text-text">Món hàng:</strong> {selectedItem.itemName} ({selectedItem.sku})</p>
          <p><strong className="text-text">Giá bán ban đầu:</strong> {formatCurrencyVND(selectedItem.amount || 0)}</p>
        </div>

        <div className="space-y-2">
          <label className="block font-bold text-text">
            Tỷ lệ chất lượng còn lại hiện tại (%):
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="20"
              max="80"
              step="5"
              value={degradedConditionRate}
              onChange={(e) => setDegradedConditionRate(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="font-bold font-mono text-sm px-3 py-1 rounded-xl border border-neutral bg-surface text-text shadow-sm">
              {degradedConditionRate}%
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block font-bold text-text">
            Ghi chú chi tiết về tình trạng xuống cấp:
          </label>
          <textarea
            rows={3}
            value={degradedNotes}
            onChange={(e) => setDegradedNotes(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-neutral text-xs text-text bg-surface focus:outline-none focus:border-primary"
            placeholder="Mô tả cụ thể vết bẩn, rách vải, phai màu, đứt khuy..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral">
          <Button variant="outline" size="sm" className="rounded-xl border-neutral" onClick={onClose}>
            Hủy
          </Button>
          <Button
            size="sm"
            className="bg-primary text-white hover:bg-primary-hover font-bold rounded-xl px-4"
            onClick={handleCreateDegradedCase}
          >
            Lập hồ sơ & Thông báo Seller
          </Button>
        </div>
      </div>
    </Modal>
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
            onClick={() => alert('Đã chuyển ca kiểm tra cho Moderator khác trong ca trực.')}
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
              ⚠️ Báo nghi hàng giả (2 Moderator)
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
            checked={checklist?.skuCorrect}
            onChange={(e) => setChecklist({ ...checklist, skuCorrect: e.target.checked })}
            className="mt-0.5 rounded border-neutral text-primary focus:ring-primary"
          />
          <div>
            <span className="font-semibold text-text">Đúng món theo mã SKU</span>
            <span className="block text-[10px] text-textSecondary">{selectedItem?.sku || 'SKU'} khớp với món đã gửi đi</span>
          </div>
        </label>
        <label className="p-3.5 flex items-start gap-3 cursor-pointer hover:bg-background transition-colors">
          <input
            type="checkbox"
            checked={checklist?.labelIntact}
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

export function ReturnInspectionProduct({ selectedItem, scannedSku, setScannedSku, setSkuMatched, skuMatched, checklist, setChecklist }) {
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
    
      {/* Bước 1: Nhập SKU */}
      <div className="border-2 border-neutral rounded-2xl p-4 bg-surface flex justify-between items-center gap-4 shadow-sm">
        <div>
          <div className="text-[10px] uppercase font-bold text-textSecondary tracking-wider mb-1">
            Bước 1 · Nhập mã SKU trên tem
          </div>
          <div className="text-xs text-textSecondary">
            Xác nhận đúng món đã gửi đi. Khác món là ca gian lận, xử lý theo nhánh riêng.
          </div>
        </div>
        <div className="text-right shrink-0">
          <input
            type="text"
            value={scannedSku}
            placeholder="Nhập SKU..."
            onChange={(e) => {
              const val = e.target.value;
              setScannedSku(val);
              setSkuMatched(Boolean(val.trim() && selectedItem?.sku && val.trim().toUpperCase() === selectedItem.sku.toUpperCase()));
            }}
            className="border-2 border-neutral focus:border-primary rounded-xl px-3 py-1.5 font-mono font-bold text-sm text-center uppercase w-36 outline-none transition-colors"
          />
          <div className={`text-[10px] font-bold mt-1 ${skuMatched ? 'text-primary' : 'text-error'}`}>
            {skuMatched ? '✓ Khớp · đúng món' : '✗ Không khớp SKU'}
          </div>
        </div>
      </div>
    
      {/* So sánh ảnh */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] uppercase font-bold text-textSecondary mb-1.5">
            Ảnh nhập kho · {selectedItem?.stockInDate || 'Kho'}
          </div>
          <div className="flex gap-2">
            {stockPhotos.map((src, i) => (
              <img key={i} src={src} alt="Điểm kí gửi" className="w-20 h-24 object-cover rounded-xl border border-neutral bg-background" />
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-textSecondary mb-1.5">
            Ảnh người mua gửi
          </div>
          <div className="flex gap-2">
            {buyerPhotos.map((src, i) => (
              <img key={i} src={src} alt="Khách" className="w-20 h-24 object-cover rounded-xl border border-neutral bg-background" />
            ))}
          </div>
        </div>
      </div>
    
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
          Đơn #{selectedItem?.orderId} · Người mua: {selectedItem?.buyerName}
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

export function ReturnQueueTable({ loading, filteredRequests, activeTab, handleOpenReview, handleOpenInspect, handleMarkLost }) {
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
