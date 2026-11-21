import React, { useState } from 'react';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { APK_DOWNLOAD_URL } from '../constants/landingConstants.js';
import { updateSpotlightCoords } from '../utils/spotlight.js';
import { AndroidIcon, CheckCircleIcon } from './LandingIcons.jsx';

function formatLimit(value, unit) {
  if (value === null || value === undefined) {
    return 'Không giới hạn';
  }
  return `${new Intl.NumberFormat('vi-VN').format(Number(value))} ${unit}`;
}

function buildPlanBenefitLines(plan) {
  const b = plan?.benefits || {};
  const lines = [];

  if (b.aiTryonPerDay !== undefined || b.aiTryonPerMonth !== undefined) {
    lines.push(
      `Thử đồ AI: ${formatLimit(b.aiTryonPerDay, 'lượt/ngày')} (${formatLimit(
        b.aiTryonPerMonth,
        'lượt/tháng'
      )})`
    );
  }

  if (b.liveTryonPerDay !== undefined || b.liveTryonPerMonth !== undefined) {
    const durationPart =
      b.liveTryonMaxSeconds === null
        ? 'thời lượng không giới hạn'
        : b.liveTryonMaxSeconds !== undefined
        ? `tối đa ${b.liveTryonMaxSeconds} giây/lượt`
        : '';
    lines.push(
      `Live Try-On: ${formatLimit(b.liveTryonPerDay, 'lượt/ngày')}${
        durationPart ? ` • ${durationPart}` : ''
      }`
    );
  }

  if (b.maxPendingConsignmentForms !== undefined) {
    lines.push(`Form ký gửi chờ duyệt: ${formatLimit(b.maxPendingConsignmentForms, 'form')}`);
  }

  if (b.featuredListing) {
    lines.push('Ưu tiên hiển thị nhãn Nổi bật trên sàn');
  }

  if (Array.isArray(plan?.vouchers)) {
    plan.vouchers.forEach((voucher) => {
      if (!voucher?.name) return;
      const qty =
        voucher.quantityPerMonth === null || voucher.quantityPerMonth === undefined
          ? 'Không giới hạn'
          : `${voucher.quantityPerMonth} mã`;
      lines.push(`${qty} ${voucher.name}/tháng`);
    });
  }

  return lines;
}

export default function MembershipPlansSection({ plans = [], loading = false }) {
  const hasYearlyOption = plans.some(
    (p) => p?.pricePerYear !== null && p?.pricePerYear !== undefined
  );
  const [billingCycle, setBillingCycle] = useState('monthly');

  const gridColsClass =
    plans.length === 1
      ? 'grid-cols-1 max-w-md mx-auto'
      : plans.length === 2
      ? 'md:grid-cols-2 max-w-4xl mx-auto'
      : 'md:grid-cols-2 lg:grid-cols-3';

  return (
    <section
      id="membership"
      className="relative overflow-hidden py-20 sm:py-24 bg-white border-b border-[#DDE5D9]"
    >
      {/* Vầng sáng xanh ngọc dịu phía sau thẻ Spotlight */}
      <div
        aria-hidden="true"
        className="landing-orb-float-slow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[360px] rounded-full bg-[#006B2C]/7 blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="inline-block px-3.5 py-1 rounded-full bg-[#E8F5E9] text-[#006B2C] text-xs font-bold uppercase tracking-wider">
            Đặc quyền thành viên
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1F2A37]">
            Gói thành viên VIP ReHome
          </h2>
          <p className="text-sm sm:text-base text-[#5B6776] leading-relaxed">
            Mở rộng lượt thử đồ AI, Live Try-On, tăng hạn mức ký gửi và nhận voucher ưu đãi hàng
            tháng trực tiếp trong ứng dụng ReHome.
          </p>

          {hasYearlyOption && (
            <div className="pt-2 flex justify-center">
              <div
                role="group"
                aria-label="Chọn chu kỳ thanh toán gói VIP"
                className="inline-flex items-center p-1.5 rounded-2xl bg-[#EBF1E8] border border-[#DDE5D9]"
              >
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-[#006B2C] shadow-sm'
                      : 'text-[#5B6776] hover:text-[#1F2A37]'
                  }`}
                >
                  Theo tháng
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    billingCycle === 'yearly'
                      ? 'bg-white text-[#006B2C] shadow-sm'
                      : 'text-[#5B6776] hover:text-[#1F2A37]'
                  }`}
                >
                  Theo năm
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="rounded-3xl border border-[#DDE5D9] bg-[#F6F9F4] p-6 h-80 animate-pulse"
              />
            ))}
          </div>
        ) : plans.length > 0 ? (
          <div className={`grid gap-6 items-stretch ${gridColsClass}`}>
            {plans.map((plan, index) => {
              const showYearly =
                billingCycle === 'yearly' &&
                plan.pricePerYear !== null &&
                plan.pricePerYear !== undefined;
              const price = showYearly ? plan.pricePerYear : plan.pricePerMonth;
              const isSpotlight =
                plans.length >= 3 ? index === 1 : Boolean(plan?.benefits?.featuredListing);
              const benefitLines = buildPlanBenefitLines(plan);

              return (
                <article
                  key={plan.id || plan.tier || plan.name}
                  onPointerMove={isSpotlight ? updateSpotlightCoords : undefined}
                  className={`plan-card rounded-3xl p-7 flex flex-col justify-between transition-all ${
                    isSpotlight
                      ? 'landing-spotlight-card bg-gradient-to-b from-[#062B19] to-[#0A3D24] text-white shadow-2xl border border-[#125B36] lg:-translate-y-2'
                      : 'bg-white text-[#1F2A37] border border-[#DDE5D9] shadow-card hover:shadow-card-hover'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider ${
                            isSpotlight ? 'text-[#A7F3D0]' : 'text-[#00685F]'
                          }`}
                        >
                          {plan.tier || 'VIP'}
                        </span>
                        <h3 className="text-xl font-extrabold mt-0.5">{plan.name}</h3>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {isSpotlight && (
                          <span className="px-2.5 py-1 rounded-full bg-[#FEA619] text-[#1F2A37] text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap">
                            Khuyên dùng
                          </span>
                        )}
                        {showYearly && plan.yearlySavingPercent != null && (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#FEA619]/95 text-[#1F2A37] text-[11px] font-bold whitespace-nowrap">
                            Tiết kiệm {plan.yearlySavingPercent}%
                          </span>
                        )}
                      </div>
                    </div>

                    {plan.description && (
                      <p
                        className={`text-xs leading-relaxed mb-5 ${
                          isSpotlight ? 'text-white/80' : 'text-[#5B6776]'
                        }`}
                      >
                        {plan.description}
                      </p>
                    )}

                    <div
                      className={`pb-5 mb-5 border-b flex items-baseline gap-1.5 ${
                        isSpotlight ? 'border-white/15' : 'border-[#DDE5D9]'
                      }`}
                    >
                      <span
                        className={`text-3xl font-extrabold tabular-nums ${
                          isSpotlight ? 'text-white' : 'text-[#006B2C]'
                        }`}
                      >
                        {Number(price) === 0 ? 'Miễn phí' : formatCurrencyVND(price)}
                      </span>
                      {Number(price) > 0 && (
                        <span
                          className={`text-xs font-medium whitespace-nowrap ${
                            isSpotlight ? 'text-white/75' : 'text-[#5B6776]'
                          }`}
                        >
                          / {showYearly ? 'năm' : 'tháng'}
                        </span>
                      )}
                    </div>

                    <ul className="space-y-3 mb-7">
                      {benefitLines.map((line) => (
                        <li key={line} className="flex items-start gap-2.5 text-xs font-medium">
                          <CheckCircleIcon
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isSpotlight ? 'text-[#FEA619]' : 'text-[#006B2C]'
                            }`}
                          />
                          <span className={isSpotlight ? 'text-white/95' : 'text-[#1F2A37]'}>
                            {line}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a
                    href={APK_DOWNLOAD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
                      isSpotlight
                        ? 'landing-btn-shine bg-[#FEA619] hover:bg-[#E59412] text-[#1F2A37]'
                        : 'bg-[#EBF1E8] hover:bg-[#006B2C] text-[#1F2A37] hover:text-white'
                    }`}
                  >
                    <AndroidIcon className="w-4 h-4 shrink-0" />
                    <span>Đăng ký trên ứng dụng</span>
                  </a>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-[#DDE5D9] bg-[#F6F9F4] p-10 text-center">
            <p className="text-base font-bold text-[#1F2A37]">
              Thông tin các gói thành viên VIP đang được cập nhật.
            </p>
            <p className="text-sm text-[#5B6776] mt-1">
              Bạn vẫn có thể tải ứng dụng ReHome Android để xem bảng giá mới nhất trong mục Tài
              khoản.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
