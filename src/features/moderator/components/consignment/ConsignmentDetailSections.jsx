import { ConsignmentInspectionForm } from './ConsignmentInspectionForm.jsx';
import React from "react";

import Button from "../../../../components/common/Button.jsx";
import { consignmentService, queueService } from "../../services/warehouseApi.js";

import { Field, money, date } from "../WarehouseUi.jsx";

import { CHECKLIST_ITEMS, SAMPLE_REASONS } from "../../pages/ConsignmentDetailPage.config.js";

export function ConsignmentReturnPanel({ resource, formId, proof, returnReason, returnNote, setFeedback, setReturnReason, returnReasons, setReturnNote, errors }) {
  return (
    <div className="rounded-2xl border border-[#BA1A1A] bg-white p-5 space-y-4 shadow-sm">
      <h3 className="text-xs font-bold text-[#BA1A1A] uppercase tracking-wide">
        Không đạt kiểm định — Trả đồ tại chỗ (KD-06)
      </h3>
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
        <Field label="Lý do không nhận">
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
          label="Ghi chú biên bản trả tại chỗ"
          required
          value={returnNote}
          onChange={(e) => setReturnNote(e.target.value)}
          error={errors.note}
          placeholder="Mô tả vết bẩn, lỗi rách..."
        />
        <Button
          variant="danger"
          type="submit"
          disabled={!returnReason || !returnNote.trim()}
          loading={resource.busy}
          className="w-full text-xs font-bold py-2.5"
        >
          Xác nhận trả đồ tại chỗ cho Member
        </Button>
      </form>
    </div>
  );
}

export function ConsignmentInspectionPanel({ allChecked, checkedCount, checklist, toggleCheck, price, term, conditionNote, resource, formId, proof, setFeedback, setReceiptId, setCondition, errors, setPrice, setTerm, termOptions }) {
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
      />
    </div>
  );
}

export function ConsignmentStartPanel({ resource, formId, proof, setFeedback }) {
  return (
    <div className="rounded-2xl border-2 border-[#2b2b2b] bg-white p-5 space-y-3 shadow-sm">
      <h3 className="text-sm font-bold text-[#191C19]">Khách đã có mặt tại quầy</h3>
      <p className="text-xs text-[#5B6776]">
        Đối chiếu món đồ thực tế khách mang tới trước mặt bạn với form đăng ký.
      </p>
      <Button
        className="w-full py-3 bg-[#2b2b2b] text-white hover:bg-black font-bold text-xs"
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
            <p className="text-[11px] text-[#5B6776] mt-0.5">Member có 7 ngày để mang đồ đến kho ReHome</p>
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
            className="w-full py-3 bg-[#2b2b2b] text-white hover:bg-black font-bold text-xs"
            loading={resource.busy}
            onClick={() =>
              resource.mutate(
                (opts) => queueService.approve(formId, opts),
                {
                  onSuccess: () => {
                    setFeedback({
                      type: 'success',
                      message: 'Đã duyệt form ký gửi thành công! Khách hàng có 7 ngày để mang sản phẩm đến kho.',
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
          <span className="font-semibold text-[#191C19] flex-1 text-right">{form.brand || 'Uniqlo'}</span>
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
        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${identified ? 'bg-[#2b2b2b] text-white' : 'border border-[#2b2b2b] text-[#2b2b2b]'}`}>
          {identified ? '✓' : '1'}
        </span>
        <span className={identified ? 'font-semibold' : 'text-[#717971]'}>1. Đối chiếu tại quầy</span>
      </div>
      <span className="w-8 h-px bg-[#d4d4d4] hidden sm:block" />
    
      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${form.status === 'INSPECTING' ? 'border-2 border-[#2b2b2b] bg-[#2b2b2b] text-white' : form.status === 'WAITING_CONFIRMATION' || form.status === 'STOCKED' ? 'bg-[#2b2b2b] text-white' : 'border border-[#c4c4c4] text-[#9a9a9a]'}`}>
          {form.status === 'WAITING_CONFIRMATION' || form.status === 'STOCKED' ? '✓' : '2'}
        </span>
        <span className={form.status === 'INSPECTING' ? 'font-bold text-[#191C19]' : 'text-[#717971]'}>2. Ghi kết quả kiểm định</span>
      </div>
      <span className="w-8 h-px bg-[#d4d4d4] hidden sm:block" />
    
      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${form.status === 'WAITING_CONFIRMATION' ? 'border-2 border-[#2b2b2b] bg-[#2b2b2b] text-white' : form.status === 'STOCKED' ? 'bg-[#2b2b2b] text-white' : 'border border-[#c4c4c4] text-[#9a9a9a]'}`}>
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
