import React, { useMemo } from 'react';
import { tokenizeClauseTemplate } from './receiptClausePlaceholders.js';

/**
 * Xem trước toàn bộ biên nhận ký gửi bằng dữ liệu mẫu, mô phỏng lại layout của màn
 * ReceiptScreen bên mobile — dùng để Admin thấy biên nhận trông ra sao khi sửa điều khoản,
 * KHÔNG gọi API, không tạo dữ liệu thật.
 */
const SAMPLE = {
  productName: "Áo khoác jean Levi's — Levi's, size M",
  agreedPrice: '1.000.000 đ',
  floorPrice: '500.000 đ',
  termLengthDays: 30,
  maxRenewals: 2,
  totalDays: 90,
  freeWithdrawalWindowDays: '7',
  rates: ['10%', '15%', '20%'],
};

function renderHighlightedBody(template) {
  const tokens = tokenizeClauseTemplate(template);
  if (tokens.length === 0) return '—';
  return tokens.map((token, idx) => {
    if (token.type !== 'placeholder') {
      return <React.Fragment key={idx}>{token.value}</React.Fragment>;
    }
    if (token.meta) {
      return (
        <span
          key={`${token.key}-${idx}`}
          title={`${token.meta.label} — ${token.meta.desc}`}
          className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#ECFDF3] border border-[#ABEFC6] text-[#006B2C] font-semibold text-xs tabular-nums"
        >
          {token.meta.sample}
        </span>
      );
    }
    return (
      <span
        key={`${token.key}-${idx}`}
        title="Thông số chưa được hệ thống hỗ trợ"
        className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#FFFAEB] border border-[#FEDF89] text-[#B54708] font-semibold text-xs"
      >
        Thông số chưa hỗ trợ
      </span>
    );
  });
}

function numberClauses(activeClauses) {
  const sorted = [...activeClauses].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  let n = 5;
  return sorted.map((c) => ({ ...c, no: n++ }));
}

function ClauseBlock({ no, title, children, highlight }) {
  return (
    <div
      className={`space-y-1.5 transition-colors ${
        highlight
          ? 'rounded-xl bg-[#FFFAEB] border border-[#FEDF89] p-3 -mx-1'
          : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold tracking-wide text-[#1F2A37] uppercase">
          {title || `ĐIỀU ${no}`}
        </p>
        {highlight && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FEF0C7] text-[#B54708] border border-[#FEDF89] text-[10px] font-semibold whitespace-nowrap">
            Đang chỉnh sửa
          </span>
        )}
      </div>
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
    <div className="rounded-2xl border border-[#DDE5D9] bg-white shadow-sm overflow-hidden font-sans">
      {/* Preview Chrome Bar */}
      <div className="px-5 py-2.5 border-b border-[#DDE5D9] bg-[#F6F9F4] flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1F2A37]">
          <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#006B2C]">
            description
          </span>
          <span>Xem trước biên nhận mẫu</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-[#5B6776]">
            {numbered.length + 4} điều khoản
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF3] border border-[#ABEFC6] text-[#067647] text-[11px] font-semibold">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#067647]" />
            Cập nhật trực tiếp
          </span>
        </div>
      </div>

      {/* Document Title Header */}
      <div className="px-5 py-4 border-b border-[#DDE5D9] bg-white text-center">
        <p className="text-[10px] font-bold tracking-[0.14em] text-[#006B2C] uppercase">
          REHOME · BIÊN NHẬN ĐIỆN TỬ
        </p>
        <p className="text-base font-bold text-[#1F2A37] mt-0.5">
          BIÊN NHẬN KÝ GỬI HÀNG HÓA
        </p>
        <p className="text-xs text-[#5B6776] mt-0.5">
          Số KG-2026-000123 · Dữ liệu minh họa
        </p>
      </div>

      {/* Scrollable Receipt Body */}
      <div className="px-5 py-4 space-y-4 text-[13.5px] leading-relaxed text-[#344054] max-h-[calc(100vh-14rem)] overflow-y-auto">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#5B6776]">
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
            lock
          </span>
          <span>Điều khoản cố định (Điều 1 – 4)</span>
        </div>

        <ClauseBlock no={1} title="ĐIỀU 1 — HÀNG HOÁ">
          <p className="text-[#475467]">
            Sản phẩm: <span className="font-medium text-[#1F2A37]">{SAMPLE.productName}</span>
          </p>
        </ClauseBlock>

        <ClauseBlock no={2} title="ĐIỀU 2 — GIÁ BÁN VÀ HOA HỒNG">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]/60 px-3 py-2.5">
              <p className="text-[11px] text-[#5B6776]">Giá bán niêm yết</p>
              <p className="text-sm font-bold text-[#006B2C] tabular-nums mt-0.5">{SAMPLE.agreedPrice}</p>
            </div>
            <div className="rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]/60 px-3 py-2.5">
              <p className="text-[11px] text-[#5B6776]">Giá sàn</p>
              <p className="text-sm font-bold text-[#006B2C] tabular-nums mt-0.5">{SAMPLE.floorPrice}</p>
            </div>
          </div>
          <div className="rounded-xl border border-[#DDE5D9] overflow-hidden mt-1.5">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F6F9F4] text-[#5B6776] border-b border-[#DDE5D9]">
                  <th className="text-left px-3 py-2 font-semibold">Kỳ</th>
                  <th className="text-left px-3 py-2 font-semibold">Thời gian</th>
                  <th className="text-right px-3 py-2 font-semibold">Hoa hồng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EC]">
                {SAMPLE.rates.map((rate, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 font-medium text-[#1F2A37]">Kỳ {i + 1}</td>
                    <td className="px-3 py-1.5 text-[#475467]">
                      Ngày {i * SAMPLE.termLengthDays + (i ? 1 : 0)} – {(i + 1) * SAMPLE.termLengthDays}
                    </td>
                    <td className="px-3 py-1.5 text-right font-semibold text-[#1F2A37] tabular-nums">{rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ClauseBlock>

        <ClauseBlock no={3} title="ĐIỀU 3 — THỜI HẠN">
          <p className="text-[#475467]">
            Một kỳ {SAMPLE.termLengthDays} ngày, tự gia hạn tối đa {SAMPLE.maxRenewals} lần, tổng
            không quá {SAMPLE.totalDays} ngày. Mỗi lần sang kỳ mới bạn có{' '}
            <span className="font-semibold text-[#1F2A37]">{SAMPLE.freeWithdrawalWindowDays}</span>{' '}
            ngày rút hàng không mất phí.
          </p>
        </ClauseBlock>

        <ClauseBlock no={4} title="ĐIỀU 4 — HÀNG VÔ THỪA NHẬN">
          <p className="text-[#475467]">
            Hết {SAMPLE.totalDays} ngày, bạn chọn nhận lại hàng hoặc ký gửi lại{' '}
            <span className="font-semibold text-[#1F2A37]">trước hạn ReHome thông báo</span> trên ứng
            dụng. Quá hạn mà không phản hồi, hàng được xem là vô thừa nhận:{' '}
            <span className="font-semibold text-[#1F2A37]">bạn mất quyền sở hữu</span>.
          </p>
        </ClauseBlock>

        <div className="pt-3 border-t border-dashed border-[#DDE5D9] flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#5B6776]">
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
            edit_note
          </span>
          <span>Điều khoản tùy chỉnh (từ Điều 5)</span>
        </div>

        {numbered.map((c) => (
          <ClauseBlock
            key={c.id || c.no}
            no={c.no}
            title={c.title}
            highlight={c.id === highlightId}
          >
            <p className="text-[#475467] whitespace-pre-wrap leading-relaxed">
              {renderHighlightedBody(c.bodyTemplate)}
            </p>
          </ClauseBlock>
        ))}

        {numbered.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#DDE5D9] bg-[#FAFBF9] px-3.5 py-3 text-xs text-[#5B6776]">
            Chưa có điều khoản tùy chỉnh nào đang áp dụng — biên nhận sẽ chỉ hiển thị Điều 1 đến Điều 4.
          </div>
        )}
      </div>
    </div>
  );
}
