import React from 'react';
import { COMPARISON_ROWS, HOW_IT_WORKS_STEPS } from '../constants/landingConstants.js';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  XCircleIcon,
} from './LandingIcons.jsx';

function ComparisonCellPill({ cell }) {
  if (cell.type === 'positive') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#006B2C]/25 text-[#041E12] text-xs font-bold shadow-sm whitespace-nowrap">
        <CheckCircleIcon className="w-4 h-4 text-[#006B2C] shrink-0" />
        <span>{cell.text}</span>
      </span>
    );
  }

  if (cell.type === 'negative') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs font-semibold whitespace-nowrap">
        <XCircleIcon className="w-3.5 h-3.5 shrink-0" />
        <span>{cell.text}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-xs font-semibold whitespace-nowrap">
      <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />
      <span>{cell.text}</span>
    </span>
  );
}

export default function AboutRehomeSection({ onOpenInfoModal }) {
  return (
    <section
      id="about"
      className="relative overflow-hidden py-16 sm:py-20 bg-[#F6F9F4] border-b border-[#DDE5D9]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Khối 1: Cách Thức Giao Dịch Tại ReHome (Khung trắng 4 bước gọn) */}
        <div className="rounded-3xl bg-white border border-[#DDE5D9] shadow-card p-6 sm:p-10 space-y-8 reveal-section">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#006B2C]">
              QUY TRÌNH CHUẨN HÓA
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1F2A37]">
              Cách Thức Giao Dịch Tại ReHome
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW_IT_WORKS_STEPS.map((item) => (
              <article
                key={item.step}
                className="step-flow-card rounded-2xl bg-[#F6F9F4] border border-[#DDE5D9]/80 p-5 space-y-2.5"
              >
                <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#006B2C] to-[#10B981] text-white text-sm font-extrabold inline-flex items-center justify-center shadow-sm">
                  {item.step}
                </span>
                <h3 className="text-sm font-extrabold text-[#1F2A37] leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-[#5B6776] leading-relaxed">{item.description}</p>
              </article>
            ))}
          </div>

          {onOpenInfoModal && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => onOpenInfoModal('inspection')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E8F5E9] hover:bg-[#006B2C] text-[#006B2C] hover:text-white border border-[#006B2C]/20 text-xs font-bold transition-colors whitespace-nowrap"
              >
                <ShieldCheckIcon className="w-4 h-4 shrink-0" />
                <span>Xem chi tiết 6 bước kiểm định</span>
              </button>
            </div>
          )}
        </div>

        {/* Khối 2: Tại Sao Nên Chọn ReHome? (Bảng so sánh Pill trực quan) */}
        <div id="compare" className="space-y-6 reveal-section">
          <div className="text-center max-w-xl mx-auto space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1F2A37]">
              Tại Sao Nên Chọn ReHome?
            </h2>
            <p className="text-sm text-[#5B6776]">So sánh trải nghiệm thực tế</p>
          </div>

          <div className="rounded-2xl bg-white border border-[#DDE5D9] shadow-card overflow-hidden">
            <div
              aria-hidden="true"
              className="h-[3px] w-full bg-gradient-to-r from-[#006B2C] via-[#10B981] to-[#FEA619]"
            />

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left border-collapse">
                <thead>
                  <tr className="bg-[#E8F5E9]/75 border-b border-[#DDE5D9] text-xs sm:text-sm font-extrabold text-[#1F2A37]">
                    <th scope="col" className="py-4 px-5">
                      Tiêu chí so sánh
                    </th>
                    <th scope="col" className="py-4 px-5 text-center bg-[#E8F5E9]">
                      <span className="inline-flex items-center gap-1.5 text-[#006B2C]">
                        <SparklesIcon className="w-4 h-4 text-[#FEA619] shrink-0" />
                        <span>ReHome Verified</span>
                      </span>
                    </th>
                    <th scope="col" className="py-4 px-5 text-center">
                      Hội nhóm Facebook / Chợ cũ
                    </th>
                    <th scope="col" className="py-4 px-5 text-center">
                      Sàn thanh lý tự do
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDE5D9]/80 text-xs sm:text-sm">
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.criterion} className="hover:bg-[#F6F9F4]/60 transition-colors">
                      <th
                        scope="row"
                        className="py-4 px-5 font-bold text-[#1F2A37] whitespace-nowrap"
                      >
                        {row.criterion}
                      </th>
                      <td className="py-4 px-4 text-center bg-[#E8F5E9]/35">
                        <ComparisonCellPill cell={row.rehome} />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <ComparisonCellPill cell={row.facebook} />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <ComparisonCellPill cell={row.classifieds} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
