import { ConsignmentInspectionForm } from './ConsignmentInspectionForm.jsx';
import React from "react";

import Button from "../../../../components/common/Button.jsx";
import { consignmentService, queueService } from "../../services/warehouseApi.js";

import { Field, money, date } from "../WarehouseUi.jsx";

import { CHECKLIST_ITEMS, SAMPLE_REASONS } from "../../pages/ConsignmentDetailPage.config.js";

export function ConsignmentReturnPanel({ resource, formId, proof, returnReason, returnNote, setFeedback, setReturnReason, returnReasons, setReturnNote, errors, onClose }) {
  return (
    <div className="rounded-2xl border border-[#BA1A1A] bg-white p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#BA1A1A] uppercase tracking-wide">
          Trả đồ tại chỗ cho khách
        </h3>
        {onClose && (
          <button type="button" onClick={onClose} className="text-xs text-[#5f5f5f] hover:underline">
            Đóng
          </button>
        )}
      </div>
      <p className="text-[11px] text-[#5f5f5f] leading-relaxed">
        Hàng được trả lại ngay, <strong>không nhập kho</strong>. Ca kiểm định này đóng, không tính vào lịch sử ký gửi của khách.
      </p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          resource.mutate(
            (opts) =>
              consignmentService.returnOnsite(
                formId,
                { ...proof, reason: returnReason, note: returnNote.trim() },
                opts,
              ),
            {
              onSuccess: () => {
                setFeedback({
                  type: 'success',
                  message: 'Đã xác nhận trả đồ tại chỗ cho Member.',
                });
              },
            },
          );
        }}
      >
        <Field label="Lý do không nhận / trả đồ">
          <select
            required
            className="rounded-xl border-neutral"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
          >
            <option value="">Chọn lý do theo quy định</option>
            {returnReasons.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Ghi chú thêm · tuỳ chọn"
          required
          value={returnNote}
          onChange={(e) => setReturnNote(e.target.value)}
          error={errors.note}
          placeholder="Mô tả vết bẩn, lỗi rách..."
        />
        <div className="flex gap-2 pt-1">
          {onClose && (
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              className="flex-1 text-xs"
            >
              Hủy, quay lại
            </Button>
          )}
          <Button
            variant="danger"
            type="submit"
            disabled={!returnReason || !returnNote.trim()}
            loading={resource.busy}
            className="flex-1 text-xs font-bold py-2.5"
          >
            Xác nhận trả đồ tại chỗ cho Member
          </Button>
        </div>
      </form>
    </div>
  );
}

export function ConsignmentInspectionPanel({ allChecked, checkedCount, checklist, toggleCheck, price, term, conditionNote, resource, formId, proof, setFeedback, setReceiptId, setCondition, errors, setPrice, setTerm, termOptions, consignmentConfig }) {
  return (
    <div className="rounded-2xl border-2 border-[#2b2b2b] bg-white p-5 space-y-5 shadow-sm">
      {/* Checklist 6 tiêu chí (KD-04) */}
      <div className="space-y-3">
        <div className="flex justify-between items-center border-b border-[#e0e0e0] pb-2">
          <h3 className="text-xs font-bold text-[#191C19] uppercase tracking-wide">
            Checklist kiểm định
          </h3>
          <span className={`text-xs font-bold ${allChecked ? 'text-[#006B2C]' : 'text-[#D97706]'}`}>
            {checkedCount} / {CHECKLIST_ITEMS.length} đã tích
          </span>
        </div>

        <div className="space-y-2">
          {CHECKLIST_ITEMS.map((item, idx) => (
            <label key={idx} className="flex items-start gap-2.5 text-xs text-[#191C19] cursor-pointer hover:bg-[#F9FAF9] p-1.5 rounded">
              <input
                type="checkbox"
                checked={!!checklist[idx]}
                onChange={() => toggleCheck(idx)}
                className="mt-0.5 rounded"
              />
              <span className="leading-tight">{item}</span>
            </label>
          ))}
        </div>

        <p className="text-[11px] text-[#5f5f5f] bg-[#f4f5f4] p-2.5 rounded border border-[#d4d4d4]">
          Phải tích đủ {CHECKLIST_ITEMS.length} mục mới chọn được kết luận <strong>Đạt</strong>. Nếu có tiêu chí không đạt, chọn Trả đồ tại chỗ.
        </p>
      </div>

      {/* Kết luận & Chốt giá (KD-05) */}
      <ConsignmentInspectionForm
        price={price}
        term={term}
        conditionNote={conditionNote}
        allChecked={allChecked}
        resource={resource}
        formId={formId}
        proof={proof}
        setFeedback={setFeedback}
        setReceiptId={setReceiptId}
        setCondition={setCondition}
        errors={errors}
        setPrice={setPrice}
        setTerm={setTerm}
        termOptions={termOptions}
        consignmentConfig={consignmentConfig}
      />
    </div>
  );
}

export function ConsignmentStartPanel({ resource, formId, proof, setFeedback, onOpenReturn }) {
  const [quickChecks, setQuickChecks] = React.useState({
    itemMatch: false,
    brandSizeMatch: false,
    conditionMatch: false,
    notProhibited: false,
  });

  const toggle = (k) => setQuickChecks((p) => ({ ...p, [k]: !p[k] }));
  const allQuickChecksPassed = quickChecks.itemMatch && quickChecks.brandSizeMatch && quickChecks.conditionMatch && quickChecks.notProhibited;

  return (
    <div className="rounded-2xl border-2 border-[#2b2b2b] bg-white p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-2">
        <h3 className="text-sm font-bold text-[#191C19]">Hàng thật có khớp không</h3>
        <span className="text-[10px] text-[#5B6776]">Đối chiếu nhanh tại quầy</span>
      </div>

      <p className="text-xs text-[#5B6776]">
        Khách đang đứng ở quầy với món hàng. Lệch nhiều thì trả lại ngay, đỡ mất công kiểm định.
      </p>

      <div className="border border-[#8a8a8a] rounded divide-y divide-[#e0e0e0] text-xs">
        <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#fafafa]">
          <input
            type="checkbox"
            checked={quickChecks.itemMatch}
            onChange={() => toggle('itemMatch')}
            className="rounded text-[#2b2b2b]"
          />
          <span>Đúng món như ảnh trong form</span>
        </label>
        <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#fafafa]">
          <input
            type="checkbox"
            checked={quickChecks.brandSizeMatch}
            onChange={() => toggle('brandSizeMatch')}
            className="rounded text-[#2b2b2b]"
          />
          <span>Đúng thương hiệu và size đã khai</span>
        </label>
        <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#fafafa]">
          <input
            type="checkbox"
            checked={quickChecks.conditionMatch}
            onChange={() => toggle('conditionMatch')}
            className="rounded text-[#2b2b2b]"
          />
          <span>Tình trạng tương đương mức Member tự đánh giá</span>
        </label>
        <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#fafafa]">
          <input
            type="checkbox"
            checked={quickChecks.notProhibited}
            onChange={() => toggle('notProhibited')}
            className="rounded text-[#2b2b2b]"
          />
          <span>Không thuộc nhóm hàng không nhận</span>
        </label>
      </div>

      <div className="p-3 border border-dashed border-[#9a9a9a] rounded text-[11px] text-[#4a4a4a]">
        Màn này <strong>chưa ghi kết luận gì</strong>. Bấm tiếp mới mở biên bản kiểm định, nơi chốt tình trạng thật và giá.
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {allQuickChecksPassed ? (
          <Button
            className="flex-1 py-3 bg-[#006B2C] text-white hover:bg-[#005221] font-bold text-xs shadow-sm transition-all"
            loading={resource.busy}
            onClick={() =>
              resource.mutate(
                (opts) => consignmentService.start(formId, proof, opts),
                {
                  onSuccess: () => {
                    setFeedback({
                      type: 'success',
                      message: 'Đã bắt đầu kiểm định tại quầy. Mời đối chiếu sản phẩm theo checklist.',
                    });
                  },
                },
              )
            }
          >
            Bắt đầu kiểm định tại quầy
          </Button>
        ) : (
          <div className="flex-1 py-2.5 px-3 bg-[#f5f5f5] text-[#717971] text-xs font-semibold rounded-xl text-center border border-dashed border-[#ccc]">
            Tích đủ 4 tiêu chí trên để mở nút kiểm định
          </div>
        )}
        {onOpenReturn && (
          <Button
            variant="outline"
            type="button"
            className="py-3 text-xs"
            onClick={onOpenReturn}
          >
            Trả đồ tại chỗ
          </Button>
        )}
      </div>
    </div>
  );
}

export function ConsignmentReviewPanel({ decision, setDecision, setRejectReason, rejectReason, errors, resource, formId, setFeedback }) {
  return (
    <div className="rounded-2xl border-2 border-[#2b2b2b] bg-white p-5 space-y-4 shadow-sm">
      <h3 className="text-sm font-bold text-[#191C19]">Kết luận duyệt form</h3>

      {/* Radio 1: Duyệt */}
      <label
        className={`block p-3.5 rounded-xl border-2 cursor-pointer transition-colors ${decision === 'APPROVE' ? 'border-[#2b2b2b] bg-[#fafafa]' : 'border-[#d4d4d4]'}`}
        onClick={() => setDecision('APPROVE')}
      >
        <div className="flex items-start gap-2.5">
          <input
            type="radio"
            name="form-decision"
            checked={decision === 'APPROVE'}
            onChange={() => setDecision('APPROVE')}
            className="mt-1"
          />
          <div>
            <p className="font-bold text-xs text-[#191C19]">Duyệt — mời mang đến kho</p>
            <p className="text-[11px] text-[#5B6776] mt-0.5">Member mang sản phẩm đến kho ReHome trong thời hạn được thông báo</p>
          </div>
        </div>
      </label>

      {/* Radio 2: Từ chối */}
      <label
        className={`block p-3.5 rounded-xl border-2 cursor-pointer transition-colors ${decision === 'REJECT' ? 'border-[#2b2b2b] bg-[#fafafa]' : 'border-[#d4d4d4]'}`}
        onClick={() => setDecision('REJECT')}
      >
        <div className="flex items-start gap-2.5">
          <input
            type="radio"
            name="form-decision"
            checked={decision === 'REJECT'}
            onChange={() => setDecision('REJECT')}
            className="mt-1"
          />
          <div>
            <p className="font-bold text-xs text-[#191C19]">Từ chối kèm lý do</p>
            <p className="text-[11px] text-[#5B6776] mt-0.5">Member thấy lý do trong app, có thể sửa và gửi lại</p>
          </div>
        </div>
      </label>

      {/* Lý do mẫu (KD-02) */}
      {decision === 'REJECT' && (
        <div className="space-y-2 pt-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#717971]">Lý do mẫu</p>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_REASONS.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRejectReason(r)}
                className="px-2.5 py-1 text-[11px] rounded border border-[#a8a8a8] bg-white hover:bg-[#F0F5EE] text-[#4a4a4a]"
              >
                {r}
              </button>
            ))}
          </div>
          <Field
            label="Lý do chi tiết"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            error={errors.reason}
            placeholder="Nhập lý do từ chối gửi tới Member..."
          />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {decision === 'APPROVE' ? (
          <Button
            variant="primary"
            className="w-full py-2.5 font-semibold text-sm"
            loading={resource.busy}
            onClick={() =>
              resource.mutate(
                async (opts) => {
                  const approved = await queueService.approve(formId, opts);
                  if (approved?.bringInDeadline || approved?.bringDeadline) return approved;
                  try {
                    return await consignmentService.read(formId, opts);
                  } catch (error) {
                    if (opts.signal?.aborted) throw error;
                    // Approval has succeeded even if the deadline cannot be fetched.
                    return approved;
                  }
                },
                {
                  onSuccess: (approved) => {
                    const deadline = approved?.bringInDeadline || approved?.bringDeadline;
                    setFeedback({
                      type: 'success',
                      message: deadline
                        ? `Đã duyệt form ký gửi thành công! Hạn mang sản phẩm đến kho: ${date(deadline)}.`
                        : 'Đã duyệt form ký gửi thành công!',
                    });
                  },
                },
              )
            }
          >
            Duyệt form — Mời khách mang đến kho
          </Button>
        ) : (
          <Button
            variant="danger"
            className="w-full py-3 font-bold text-xs"
            disabled={!rejectReason.trim()}
            loading={resource.busy}
            onClick={() =>
              resource.mutate(
                (opts) => queueService.reject(formId, rejectReason.trim(), opts),
                {
                  onSuccess: () => {
                    setFeedback({
                      type: 'success',
                      message: 'Đã từ chối form ký gửi và gửi lý do đến khách hàng.',
                    });
                  },
                },
              )
            }
          >
            Từ chối form ký gửi
          </Button>
        )}
      </div>
    </div>
  );
}

export function ConsignmentSummary({ form }) {
  return (
    <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
      <div className="bg-[#f4f4f4] border-b border-[#8a8a8a] px-4 py-2.5 text-xs font-bold text-[#191C19]">
        Thông tin Member khai
      </div>
      <div className="divide-y divide-[#e0e0e0] text-xs">
        <div className="px-4 py-2.5 flex justify-between">
          <span className="text-[#5f5f5f] w-32">Sản phẩm</span>
          <span className="font-bold text-[#191C19] flex-1 text-right">{form.name}</span>
        </div>
        <div className="px-4 py-2.5 flex justify-between">
          <span className="text-[#5f5f5f] w-32">Danh mục</span>
          <span className="font-semibold text-[#191C19] flex-1 text-right">{form.category || 'Áo khoác · slot: Áo'}</span>
        </div>
        <div className="px-4 py-2.5 flex justify-between">
          <span className="text-[#5f5f5f] w-32">Thương hiệu</span>
          <span className="font-semibold text-[#191C19] flex-1 text-right">{form.brand || '—'}</span>
        </div>
        <div className="px-4 py-2.5 flex justify-between">
          <span className="text-[#5f5f5f] w-32">Kích cỡ</span>
          <span className="font-semibold text-[#191C19] flex-1 text-right">{form.size || 'M'}</span>
        </div>
        <div className="px-4 py-2.5 flex justify-between">
          <span className="text-[#5f5f5f] w-32">Tình trạng khai</span>
          <span className="font-semibold text-[#191C19] flex-1 text-right">{form.condition || 'Như mới'}</span>
        </div>
        <div className="px-4 py-2.5 flex justify-between">
          <span className="text-[#5f5f5f] w-32">Giá mong muốn</span>
          <span className="font-bold text-sm text-[#006B2C] flex-1 text-right">{money(form.desiredPrice)}</span>
        </div>
        {form.bringDeadline && (
          <div className="px-4 py-2.5 flex justify-between">
            <span className="text-[#5f5f5f] w-32">Hạn mang đến kho</span>
            <span className="font-medium text-[#191C19] flex-1 text-right">{date(form.bringDeadline)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ConsignmentPhotoViewer({ photos, activePhotoIdx, photoUrl, setActivePhotoIdx }) {
  return (
    <div className="rounded-2xl border border-[#8a8a8a] bg-white p-5 space-y-4 shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-[#191C19]">
          Ảnh Member gửi lên · {photos.length} ảnh
        </h3>
        <span className="text-xs text-[#717971]">
          Ảnh {photos.length ? activePhotoIdx + 1 : 0} / {photos.length}
        </span>
      </div>

      {/* Ảnh to xem trước */}
      <div className="aspect-[4/3] rounded-xl border border-[#c4c4c4] bg-[#f9faf9] flex items-center justify-center overflow-hidden relative">
        {photoUrl ? (
          <img src={photoUrl} alt="Ảnh sản phẩm ký gửi" className="w-full h-full object-contain" />
        ) : (
          <span className="text-xs text-[#717971]">Chưa có ảnh</span>
        )}
        <span className="absolute bottom-3 bg-white/90 border border-[#c4c4c4] px-3 py-1 text-[11px] font-semibold text-[#4a4a4a] rounded shadow-sm">
          {activePhotoIdx === 0 ? 'Mặt trước' : activePhotoIdx === 1 ? 'Mặt sau' : activePhotoIdx === 2 ? 'Nhãn mác' : 'Tem thương hiệu'}
        </span>
      </div>

      {/* Thumbnails 4 góc */}
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2.5">
          {photos.map((p, idx) => {
            const src = typeof p === 'string' ? p : p.url;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePhotoIdx(idx)}
                className={`aspect-square rounded-lg border-2 overflow-hidden transition-all ${activePhotoIdx === idx ? 'border-[#2b2b2b] shadow-sm' : 'border-[#d4d4d4] opacity-70 hover:opacity-100'}`}
              >
                <img src={src} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-[#7a7a7a]">
        Thứ tự ảnh: mặt trước · mặt sau · nhãn mác · tem thương hiệu
      </p>
    </div>
  );
}

export function ConsignmentProgress({ identified, form }) {
  return (
    <div className="rounded-2xl border border-[#8a8a8a] bg-white p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${identified ? 'bg-[#006B2C] text-white' : 'border border-[#006B2C] text-[#006B2C]'}`}>
          {identified ? '✓' : '1'}
        </span>
        <span className={identified ? 'font-semibold' : 'text-[#717971]'}>1. Đối chiếu tại quầy</span>
      </div>
      <span className="w-8 h-px bg-[#d4d4d4] hidden sm:block" />

      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${form.status === 'INSPECTING' ? 'border-2 border-[#006B2C] bg-[#006B2C] text-white' : form.status === 'WAITING_CONFIRMATION' || form.status === 'STOCKED' ? 'bg-[#006B2C] text-white' : 'border border-[#c4c4c4] text-[#9a9a9a]'}`}>
          {form.status === 'WAITING_CONFIRMATION' || form.status === 'STOCKED' ? '✓' : '2'}
        </span>
        <span className={form.status === 'INSPECTING' ? 'font-bold text-[#191C19]' : 'text-[#717971]'}>2. Ghi kết quả kiểm định</span>
      </div>
      <span className="w-8 h-px bg-[#d4d4d4] hidden sm:block" />

      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${form.status === 'WAITING_CONFIRMATION' ? 'border-2 border-[#006B2C] bg-[#006B2C] text-white' : form.status === 'STOCKED' ? 'bg-[#006B2C] text-white' : 'border border-[#c4c4c4] text-[#9a9a9a]'}`}>
          {form.status === 'STOCKED' ? '✓' : '3'}
        </span>
        <span className={form.status === 'WAITING_CONFIRMATION' ? 'font-bold text-[#191C19]' : 'text-[#717971]'}>3. Chốt giá & kỳ</span>
      </div>
      <span className="w-8 h-px bg-[#d4d4d4] hidden sm:block" />

      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${form.status === 'STOCKED' ? 'bg-[#006B2C] text-white' : 'border border-[#c4c4c4] text-[#9a9a9a]'}`}>
          4
        </span>
        <span className={form.status === 'STOCKED' ? 'font-bold text-[#006B2C]' : 'text-[#717971]'}>4. Nhập kho & in tem</span>
      </div>
    </div>
  );
}
