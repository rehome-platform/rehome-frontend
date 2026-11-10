import React from "react";

import Button from "../../../../components/common/Button.jsx";
import { consignmentService } from "../../services/warehouseApi.js";

import { validMoney } from "../../models/warehouseModel.js";
import { Field, money } from "../WarehouseUi.jsx";

export function ConsignmentInspectionForm({ price, term, conditionNote, allChecked, resource, formId, proof, setFeedback, setReceiptId, setCondition, errors, setPrice, setTerm, termOptions }) {
  const numericPrice = Number(price) || 0;
  const floorPrice = numericPrice > 0 ? Math.round(numericPrice * 0.5) : 0;

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

      <Field
        label="Ghi chú tình trạng thực tế"
        required
        value={conditionNote}
        onChange={(e) => setCondition(e.target.value)}
        error={errors.conditionNote}
        placeholder="Mô tả độ mới %, phụ kiện đi kèm..."
      />
    
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
            {(termOptions || [30]).map((days) => (
              <option key={days} value={days}>
                {days} ngày / kỳ (tối đa 2 lần gia hạn)
              </option>
            ))}
          </select>
        </Field>
      </div>

      {numericPrice > 0 && (
        <div className="p-3 bg-[#f8faf8] border border-[#8a8a8a] rounded space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-[#e0e0e0] pb-2">
            <span className="text-[#5f5f5f]">Giá sàn tự tính · 50% giá chốt:</span>
            <span className="font-bold text-[#191C19] text-sm">{money(floorPrice)}</span>
          </div>

          <div>
            <div className="font-bold text-[11px] text-[#5f5f5f] uppercase tracking-wider mb-1.5">
              Kỳ ký gửi và hoa hồng (3 kỳ)
            </div>
            <div className="grid grid-cols-4 gap-1 text-[11px] bg-white p-2 rounded border border-[#e0e0e0]">
              <span className="font-semibold text-[#5f5f5f]">Kỳ</span>
              <span className="font-semibold text-[#5f5f5f]">Thời gian</span>
              <span className="font-semibold text-[#5f5f5f]">Hoa hồng</span>
              <span className="font-semibold text-right text-[#5f5f5f]">Member nhận</span>

              <span>Kỳ 1</span>
              <span>Ngày 0 – 30</span>
              <span className="font-bold text-[#006B2C]">10%</span>
              <span className="text-right font-bold">{money(Math.round(numericPrice * 0.9))}</span>

              <span>Kỳ 2</span>
              <span>Ngày 31 – 60</span>
              <span className="font-bold text-[#006B2C]">15%</span>
              <span className="text-right font-bold">{money(Math.round(numericPrice * 0.85))}</span>

              <span>Kỳ 3</span>
              <span>Ngày 61 – 90</span>
              <span className="font-bold text-[#006B2C]">20%</span>
              <span className="text-right font-bold">{money(Math.round(numericPrice * 0.8))}</span>
            </div>
          </div>
          <p className="text-[10px] text-[#717971]">
            Đọc bảng này cho khách nghe trước khi tạo biên nhận. Khi hết kỳ ký gửi cuối, khách chọn nhận lại hàng hoặc ký gửi lại trong thời hạn được thông báo.
          </p>
        </div>
      )}

      <p className="text-[11px] text-[#5B6776]">
        Mặc định mỗi kỳ {Number(term) || termOptions?.[0] || 30} ngày, tối đa 2 lần gia hạn (tổng 3 kỳ · {(Number(term) || termOptions?.[0] || 30) * 3} ngày).
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
