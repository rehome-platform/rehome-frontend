import React from "react";

import Button from "../../../../components/common/Button.jsx";
import { consignmentService } from "../../services/warehouseApi.js";

import { validMoney } from "../../models/warehouseModel.js";
import { Field } from "../WarehouseUi.jsx";

export function ConsignmentInspectionForm({ price, term, conditionNote, allChecked, resource, formId, proof, setFeedback, setReceiptId, setCondition, errors, setPrice, setTerm, termOptions }) {
  return (
    <form
      className="space-y-4 border-t border-[#e0e0e0] pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!validMoney(price) || !term || !conditionNote.trim() || !allChecked) return;
        resource.mutate(
          (opts) =>
            consignmentService.complete(
              formId,
              {
                ...proof,
                conditionNote: conditionNote.trim(),
                agreedPrice: Number(price),
                termLengthDays: Number(term),
              },
              opts,
            ),
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
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
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
            <option value="">Chọn kỳ</option>
            {termOptions.map((days) => (
              <option key={days} value={days}>
                Kỳ {days === 30 ? '1' : days === 60 ? '2' : '3'} ({days} ngày)
              </option>
            ))}
          </select>
        </Field>
      </div>
    
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
