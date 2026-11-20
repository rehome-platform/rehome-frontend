import React, { useMemo } from 'react';

/**
 * Xem trước toàn bộ biên nhận ký gửi bằng dữ liệu mẫu, mô phỏng lại layout của màn
 * ReceiptScreen bên mobile — dùng để Admin thấy biên nhận trông ra sao khi sửa điều khoản,
 * KHÔNG gọi API, không tạo dữ liệu thật.
 *
 * Điều 1, 2, 3 (Hàng hoá / Giá & hoa hồng / Thời hạn) và Điều 4 (Vô thừa nhận) cố định trong
 * code. Các điều Admin quản lý ở `clauses` luôn nối tiếp từ Điều 5, theo đúng `displayOrder` —
 * thêm điều mới chỉ nối thêm vào cuối, không chèn giữa các điều cố định.
 */

const SAMPLE = {
  productName: 'Áo khoác jean Levi\'s — Levi\'s, size M',
  agreedPrice: '1.000.000 đ',
  floorPrice: '500.000 đ',
  withdrawalFee: '50.000 đ',
  freeWithdrawalWindowDays: '7',
  degradedCompensationRate: '50%',
  termLengthDays: 30,
  maxRenewals: 2,
  totalDays: 90,
  rates: ['10%', '15%', '20%'],
};

function renderBody(template) {
  return (template || '').replace(/\{\{(\w+)\}\}/g, (match, key) =>
    key in SAMPLE ? SAMPLE[key] : match,
  );
}

// Điều 1–4 cố định; từ đây các điều Admin quản lý luôn nối tiếp, thêm bao nhiêu thì số tăng
// dần theo, không chèn giữa các điều cố định nữa
function numberClauses(activeClauses) {
  const sorted = [...activeClauses].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  let n = 5;
  return sorted.map((c) => ({ ...c, no: n++ }));
}

function ClauseBlock({ no, title, children, highlight }) {
  return (
    <div
      className={`space-y-1.5 rounded-lg p-2 -mx-2 transition-colors ${
        highlight ? 'bg-[#FFF8E1] ring-1 ring-[#F2C94C]/60' : ''
      }`}
    >
      <p className="text-xs font-semibold tracking-wide text-[#5B6776] uppercase">
        {title || `ĐIỀU ${no}`}
      </p>
      {children}
    </div>
  );
}

export default function ReceiptPreviewPanel({ clauses, highlightId }) {
  const numbered = useMemo(
    () => numberClauses(clauses.filter((c) => c.active !== false)),
    [clauses],
  );

  return (
    <div className="rounded-xl border border-[#DDE5D9] bg-white">
      <div className="px-4 py-3 border-b border-[#DDE5D9] bg-[#FAFBF9] rounded-t-xl">
        <p className="text-center font-bold text-[#1F2A37]">BIÊN NHẬN KÝ GỬI HÀNG HOÁ</p>
        <p className="text-center text-xs text-[#5B6776] mt-0.5">Số KG-2026-000123 · Dữ liệu mẫu</p>
      </div>

      <div className="p-4 space-y-4 text-sm text-[#1F2A37] max-h-[70vh] overflow-y-auto">
        <ClauseBlock no={1} title="ĐIỀU 1 — HÀNG HOÁ">
          <p className="text-[#5B6776]">
            Sản phẩm: <span className="text-[#1F2A37]">{SAMPLE.productName}</span>
          </p>
        </ClauseBlock>

        <ClauseBlock no={2} title="ĐIỀU 2 — GIÁ BÁN VÀ HOA HỒNG">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-[#DDE5D9] p-2">
              <p className="text-xs text-[#5B6776]">Giá bán niêm yết</p>
              <p className="font-semibold text-[#006B2C]">{SAMPLE.agreedPrice}</p>
            </div>
            <div className="rounded-lg border border-[#DDE5D9] p-2">
              <p className="text-xs text-[#5B6776]">Giá sàn</p>
              <p className="font-semibold text-[#006B2C]">{SAMPLE.floorPrice}</p>
            </div>
          </div>
          <table className="w-full text-xs mt-1">
            <thead>
              <tr className="text-[#5B6776] border-b border-[#DDE5D9]">
                <th className="text-left py-1">Kỳ</th>
                <th className="text-left py-1">Thời gian</th>
                <th className="text-right py-1">Hoa hồng</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE.rates.map((rate, i) => (
                <tr key={i} className="border-b border-[#F0F2EF]">
                  <td className="py-1">Kỳ {i + 1}</td>
                  <td className="py-1">
                    Ngày {i * SAMPLE.termLengthDays + (i ? 1 : 0)} – {(i + 1) * SAMPLE.termLengthDays}
                  </td>
                  <td className="py-1 text-right font-medium">{rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ClauseBlock>

        <ClauseBlock no={3} title="ĐIỀU 3 — THỜI HẠN">
          <p className="text-[#5B6776]">
            Một kỳ {SAMPLE.termLengthDays} ngày, tự gia hạn tối đa {SAMPLE.maxRenewals} lần, tổng
            không quá {SAMPLE.totalDays} ngày. Mỗi lần sang kỳ mới bạn có{' '}
            {SAMPLE.freeWithdrawalWindowDays} ngày rút hàng không mất phí.
          </p>
        </ClauseBlock>

        <ClauseBlock no={4} title="ĐIỀU 4 — HÀNG VÔ THỪA NHẬN">
          <p className="text-[#5B6776]">
            Hết {SAMPLE.totalDays} ngày, bạn chọn nhận lại hàng hoặc ký gửi lại{' '}
            <span className="font-semibold text-[#1F2A37]">trước hạn ReHome thông báo</span> trên ứng
            dụng. Quá hạn mà không phản hồi, hàng được xem là vô thừa nhận:{' '}
            <span className="font-semibold text-[#1F2A37]">bạn mất quyền sở hữu</span>.
          </p>
        </ClauseBlock>

        {numbered.map((c) => (
          <ClauseBlock key={c.id || c.no} no={c.no} title={c.title} highlight={c.id === highlightId}>
            <p className="text-[#5B6776] whitespace-pre-wrap">{renderBody(c.bodyTemplate)}</p>
          </ClauseBlock>
        ))}

        {numbered.length === 0 && (
          <p className="text-xs text-[#5B6776] italic">
            Chưa có điều khoản nào đang áp dụng — chỉ Điều 1, 2, 3, 4 sẽ hiện trên biên nhận.
          </p>
        )}
      </div>
    </div>
  );
}
