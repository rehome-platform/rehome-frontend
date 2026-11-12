import React from "react";

import Button from "../../../../components/common/Button.jsx";
import { consignmentService } from "../../services/warehouseApi.js";

import { validMoney } from "../../models/warehouseModel.js";
import { Field, money } from "../WarehouseUi.jsx";

export const CONDITION_PRESETS = [
  { value: 'NEW_TAG', label: 'Mới, còn tem (100%)', noteTemplate: 'Mới 100%, còn nguyên tem mác, chưa qua sử dụng' },
  { value: 'LIKE_NEW', label: 'Như mới (99%)', noteTemplate: 'Như mới 99%, không vết bẩn, không trầy xước' },
  { value: 'GOOD', label: 'Tốt, có dấu hiệu dùng (90-95%)', noteTemplate: 'Tốt 95%, có dấu hiệu đã dùng nhẹ, phom dáng đẹp' },
  { value: 'FLAW', label: 'Có lỗi nhỏ (80-85%)', noteTemplate: 'Có lỗi nhỏ ở viền/khuy, tổng thể 85% còn tốt' },
];

export function ConsignmentInspectionForm({ price, term, conditionNote, allChecked, resource, formId, proof, setFeedback, setReceiptId, setCondition, errors, setPrice, setTerm, termOptions, consignmentConfig }) {
  const [selectedConditionLevel, setSelectedConditionLevel] = React.useState('LIKE_NEW');

  const handleSelectConditionLevel = (lvl) => {
    setSelectedConditionLevel(lvl);
    const preset = CONDITION_PRESETS.find((p) => p.value === lvl);
    if (preset) {
      // Nếu ghi chú đang trống hoặc đang là template của mức khác thì tự điền gợi ý tương ứng
      const isTemplate = CONDITION_PRESETS.some((p) => p.noteTemplate === conditionNote?.trim());
      if (!conditionNote?.trim() || isTemplate) {
        setCondition(preset.noteTemplate);
      }
    }
  };
  const numericPrice = Number(price) || 0;
  const floorPricePercent =
    consignmentConfig?.floorPricePercent != null ? Number(consignmentConfig.floorPricePercent) : 50;
  const floorPrice = numericPrice > 0 ? Math.round(numericPrice * (floorPricePercent / 100)) : 0;
  const effectiveTermDays =
    Number(term) || Number(consignmentConfig?.termLengthDays) || Number(termOptions?.[0]) || 30;
  const maxRenewals =
    consignmentConfig?.maxRenewals != null && Number.isFinite(Number(consignmentConfig.maxRenewals))
      ? Number(consignmentConfig.maxRenewals)
      : 2;
  const totalTerms = Math.max(1, maxRenewals + 1);
  const commissionTerm1 =
    consignmentConfig?.commissionTerm1 != null ? Number(consignmentConfig.commissionTerm1) : 10;
  const commissionTerm2 =
    consignmentConfig?.commissionTerm2 != null ? Number(consignmentConfig.commissionTerm2) : 15;
  const commissionTerm3 =
    consignmentConfig?.commissionTerm3 != null ? Number(consignmentConfig.commissionTerm3) : 20;
  const termRows = Array.from({ length: totalTerms }, (_, idx) => {
    const termNo = idx + 1;
    const startDay = idx === 0 ? 0 : idx * effectiveTermDays + 1;
    const endDay = (idx + 1) * effectiveTermDays;
    const ratePercent =
      termNo === 1 ? commissionTerm1 : termNo === 2 ? commissionTerm2 : commissionTerm3;
    const memberAmount = Math.round(numericPrice * (1 - ratePercent / 100));
    return { termNo, startDay, endDay, ratePercent, memberAmount };
  });

  return (
    <form
      className="space-y-4 border-t border-[#e0e0e0] pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!validMoney(price) || !term || !conditionNote.trim() || !allChecked) return;
        resource.mutate(
          async (opts) => {
            try {
              const result = await consignmentService.complete(
              formId,
              {
                ...proof,
                conditionNote: conditionNote.trim(),
                agreedPrice: Number(price),
                termLengthDays: Number(term),
              },
              opts,
              );
              if (result?.receiptId) return result;
              const latest = await consignmentService.read(formId, opts);
              if (!latest?.receiptId) throw new Error('Không tìm thấy biên nhận đã tạo. Vui lòng tải lại trạng thái.');
              return { receiptId: latest.receiptId };
            } catch (error) {
              if (error.status === 409 && ['CONSIGNMENT_RECEIPT_ALREADY_EXISTS', 'RECEIPT_ALREADY_EXISTS'].includes(error.code)) {
                const latest = await consignmentService.read(formId, opts);
                if (latest?.receiptId) return { receiptId: latest.receiptId };
              }
              throw error;
            }
          },
          {
            onSuccess: (res) => {
              setFeedback({
                type: 'success',
                message: 'Đã lập biên nhận ký gửi thành công! Hướng dẫn khách mở app để xác nhận biên nhận.',
              });
              setReceiptId(res?.receiptId);
            },
          },
        );
      }}
    >
      <div className="bg-[#f4f4f4] border border-[#8a8a8a] p-3 rounded text-[11px] text-[#4a4a4a] leading-relaxed">
        <strong>Đây là bước thương lượng, không phải áp giá.</strong> Trao đổi miệng với khách rồi nhập mức hai bên thống nhất. Khách không đồng ý thì trả đồ, không ép.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Tình trạng phân loại">
          <select
            value={selectedConditionLevel}
            onChange={(e) => handleSelectConditionLevel(e.target.value)}
            className="w-full rounded-xl border-neutral text-xs text-[#191C19]"
          >
            {CONDITION_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Ghi chú chi tiết tình trạng thực tế"
          required
          value={conditionNote}
          onChange={(e) => setCondition(e.target.value)}
          error={errors.conditionNote}
          placeholder="Mô tả độ mới 99%, chi tiết vải hoặc phụ kiện..."
        />
      </div>
    
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Giá chốt thỏa thuận (VND)"
          required
          type="number"
          min="1000"
          step="1000"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => {
            if (['e', 'E', '+', '-', '.'].includes(e.key)) {
              e.preventDefault();
            }
          }}
          error={errors.agreedPrice || (price && !validMoney(price) ? 'Số nguyên dương hợp lệ.' : null)}
          placeholder="VD: 850000"
        />
        <Field label="Độ dài kỳ ký gửi">
          <select
            required
            className="rounded-xl border-neutral"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          >
            <option value="">Chọn độ dài mỗi kỳ</option>
            {(termOptions || [effectiveTermDays]).map((days) => (
              <option key={days} value={days}>
                {days} ngày / kỳ (tối đa {maxRenewals} lần gia hạn)
              </option>
            ))}
          </select>
        </Field>
      </div>

      {numericPrice > 0 && (
        <div className="p-3 bg-[#f8faf8] border border-[#8a8a8a] rounded space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-[#e0e0e0] pb-2">
            <span className="text-[#5f5f5f]">Giá sàn tự tính · {floorPricePercent}% giá chốt:</span>
            <span className="font-bold text-[#191C19] text-sm">{money(floorPrice)}</span>
          </div>

          <div>
            <div className="font-bold text-[11px] text-[#5f5f5f] uppercase tracking-wider mb-1.5">
              Kỳ ký gửi và hoa hồng ({totalTerms} kỳ)
            </div>
            <div className="grid grid-cols-4 gap-1 text-[11px] bg-white p-2 rounded border border-[#e0e0e0]">
              <span className="font-semibold text-[#5f5f5f]">Kỳ</span>
              <span className="font-semibold text-[#5f5f5f]">Thời gian</span>
              <span className="font-semibold text-[#5f5f5f]">Hoa hồng</span>
              <span className="font-semibold text-right text-[#5f5f5f]">Member nhận</span>

              {termRows.map((row) => (
                <React.Fragment key={row.termNo}>
                  <span>Kỳ {row.termNo}</span>
                  <span>Ngày {row.startDay} – {row.endDay}</span>
                  <span className="font-bold text-[#006B2C]">{row.ratePercent}%</span>
                  <span className="text-right font-bold">{money(row.memberAmount)}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-[#717971]">
            Đọc bảng này cho khách nghe trước khi tạo biên nhận. Khi hết kỳ ký gửi cuối, khách chọn nhận lại hàng hoặc ký gửi lại trong thời hạn được thông báo.
          </p>
        </div>
      )}

      <p className="text-[11px] text-[#5B6776]">
        Mặc định mỗi kỳ {effectiveTermDays} ngày, tối đa {maxRenewals} lần gia hạn (tổng {totalTerms} kỳ · {effectiveTermDays * totalTerms} ngày).
      </p>
    
      <Button
        type="submit"
        disabled={!allChecked || !conditionNote.trim() || !validMoney(price) || !term}
        loading={resource.busy}
        className="w-full py-3 font-bold text-xs bg-[#006B2C] text-white hover:bg-[#005221]"
      >
        Đạt kiểm định — Tạo biên nhận ký gửi
      </Button>
    </form>
  );
}
