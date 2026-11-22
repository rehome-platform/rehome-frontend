import React, { useState } from 'react';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import aiTryonUrl from '../assets/ai-tryon-visual.jpg';
import {
  AI_OUTFIT_COMBOS,
  APK_DOWNLOAD_URL,
  CONSIGN_EARNING_PRESETS,
  HOW_IT_WORKS_STEPS,
  INSPECTION_CHECKLIST,
  INSPECTION_GRADES,
} from '../constants/landingConstants.js';
import { updateSpotlightCoords } from '../utils/spotlight.js';
import {
  AndroidIcon,
  ArrowRightIcon,
  CameraIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from './LandingIcons.jsx';

export default function ValueBentoSection({ onOpenInfoModal }) {
  const [selectedComboId, setSelectedComboId] = useState(AI_OUTFIT_COMBOS[0].id);
  const [selectedPrice, setSelectedPrice] = useState(CONSIGN_EARNING_PRESETS[1]);

  const activeCombo =
    AI_OUTFIT_COMBOS.find((combo) => combo.id === selectedComboId) || AI_OUTFIT_COMBOS[0];

  const commissionFee = Math.round(selectedPrice * 0.1);
  const sellerEarnings = selectedPrice - commissionFee;

  return (
    <section className="bg-white border-y border-[#071D12]/[0.08] py-16 sm:py-24">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 space-y-12">
        <div className="editorial-reveal max-w-3xl space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#006B2C]">
            Hệ sinh thái hai chiều
          </p>
          <h2 className="landing-text-balance text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-[-0.02em] text-[#071D12] leading-tight">
            Mua an tâm nhờ AI. Bán nhẹ nhàng nhờ kho kiểm định.
          </h2>
          <p className="text-sm sm:text-base text-[#46564C] leading-relaxed">
            Mỗi món đồ đều đi qua kiểm định vật lý trước khi lên kệ thử đồ AI và mở ký gửi minh
            bạch.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 items-stretch">
          {/* Bento 1: AI Try-On & Outfit Stylist tương tác */}
          <article
            id="experience"
            onPointerMove={updateSpotlightCoords}
            className="bento-card landing-spotlight-card lg:col-span-7 scroll-mt-24 rounded-3xl bg-[#071D12] text-white p-6 sm:p-8 flex flex-col justify-between gap-6 border border-[#071D12]"
          >
            <div
              aria-hidden="true"
              className="landing-dot-grid absolute inset-0 pointer-events-none"
            />

            <div className="relative z-10 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold text-[#A7F3D0] whitespace-nowrap">
                  <CameraIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>LIVE TRY-ON &amp; AI PHỐI ĐỒ</span>
                </span>

                <div
                  role="group"
                  aria-label="Chọn phong cách phối đồ AI"
                  className="inline-flex items-center gap-1 p-1 rounded-full bg-white/10 border border-white/10"
                >
                  {AI_OUTFIT_COMBOS.map((combo) => {
                    const isSelected = combo.id === selectedComboId;
                    return (
                      <button
                        key={combo.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedComboId(combo.id)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                          isSelected
                            ? 'bg-white text-[#071D12]'
                            : 'text-white/75 hover:text-white'
                        }`}
                      >
                        {combo.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  Ướm thử qua camera hoặc ghép nguyên set chuẩn dáng
                </h3>
                <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                  Chọn phong cách để xem AI tự ghép món phù hợp trên sàn theo dáng mẫu{' '}
                  <strong className="text-white">{activeCombo.modelType}</strong>.
                </p>
              </div>

              <div className="grid sm:grid-cols-12 gap-4 items-stretch">
                <div className="sm:col-span-7 flex flex-col justify-between gap-3">
                  <div className="space-y-2.5">
                    <div className="rounded-2xl bg-white/[0.08] border border-white/10 p-3.5 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-[#A7F3D0]">
                        <span>{activeCombo.top.tag}</span>
                        <span className="tabular-nums text-white">
                          {formatCurrencyVND(activeCombo.top.price)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-white truncate">
                        {activeCombo.top.name}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white text-[#071D12] p-3.5 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-[#00685F]">
                        <span>{activeCombo.bottom.tag}</span>
                        <span className="tabular-nums text-[#006B2C]">
                          {formatCurrencyVND(activeCombo.bottom.price)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-[#071D12] truncate">
                        {activeCombo.bottom.name}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-3.5">
                    <p className="text-xs text-white/80 leading-relaxed">{activeCombo.styleNote}</p>
                  </div>
                </div>

                <div className="sm:col-span-5 aspect-[3/4] sm:aspect-auto min-h-[210px] rounded-2xl overflow-hidden border border-white/15 relative bg-[#0B2618]">
                  <img
                    src={aiTryonUrl}
                    alt="Minh họa thử đồ AI trên ReHome"
                    loading="lazy"
                    className="w-full h-full object-cover object-top"
                  />
                  <div aria-hidden="true" className="landing-scan-beam" />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#071D12]/80 via-transparent to-transparent"
                  />
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-[#071D12]/75 backdrop-blur-md text-[10px] font-bold text-white border border-white/15 whitespace-nowrap">
                    Dáng mẫu {activeCombo.modelType}
                  </div>
                  <div className="absolute bottom-2.5 inset-x-2.5 rounded-xl bg-[#071D12]/80 backdrop-blur-md border border-white/15 px-3 py-2 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white">
                      <SparklesIcon className="w-3.5 h-3.5 text-[#FEA619] shrink-0" />
                      <span>Độ hợp gu</span>
                    </span>
                    <span className="text-xs font-extrabold text-[#FEA619] tabular-nums">
                      {activeCombo.matchScore}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Bento 2: Kiểm định 6 bước & Tem SKU */}
          <article className="bento-card lg:col-span-5 rounded-3xl bg-[#F6F9F4] border border-[#071D12]/10 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#071D12]/10 text-[11px] font-bold text-[#006B2C] whitespace-nowrap">
                  <ShieldCheckIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>KIỂM ĐỊNH 6 BƯỚC</span>
                </span>
                <span className="text-xs font-bold text-[#46564C] tabular-nums">
                  4 cấp độ mới
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#071D12]">
                  Kiểm tra thực tế tại kho &amp; dán tem SKU
                </h3>
                <p className="text-xs sm:text-sm text-[#46564C] leading-relaxed">
                  Minh bạch từng vết sờn, khóa kéo và phân hạng trước khi mở bán.
                </p>
              </div>

              <ol className="space-y-2">
                {INSPECTION_CHECKLIST.map((item, idx) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 rounded-xl bg-white border border-[#071D12]/[0.07] px-3.5 py-2 text-xs font-semibold text-[#071D12]"
                  >
                    <span className="text-[11px] font-extrabold text-[#006B2C] tabular-nums shrink-0">
                      0{idx + 1}
                    </span>
                    <span className="truncate">{item}</span>
                  </li>
                ))}
              </ol>

              <div className="flex flex-wrap gap-1.5">
                {INSPECTION_GRADES.map((grade) => (
                  <span
                    key={grade.label}
                    className="px-2.5 py-1 rounded-full bg-[#EBF1E8] text-[11px] font-bold text-[#071D12] whitespace-nowrap"
                  >
                    {grade.label}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenInfoModal?.('inspection')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#006B2C] hover:text-[#005523] transition-colors self-start"
            >
              <span>Xem quy chuẩn kiểm định</span>
              <ArrowRightIcon className="w-4 h-4 shrink-0" />
            </button>
          </article>

          {/* Bento 3: Ký gửi trọn gói 4 bước */}
          <article
            id="consignment"
            className="bento-card lg:col-span-7 scroll-mt-24 rounded-3xl bg-[#F6F9F4] border border-[#071D12]/10 p-6 sm:p-8 flex flex-col justify-between gap-6"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#071D12]/10 text-[11px] font-bold text-[#00685F] whitespace-nowrap">
                  <span>QUY TRÌNH KÝ GỬI TRỌN GÓI</span>
                </span>
                <span className="text-xs font-bold text-[#46564C] tabular-nums">
                  Chu kỳ 30 ngày
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#071D12]">
                  Không tự chụp ảnh, không mặc cả mất thời gian
                </h3>
                <p className="text-xs sm:text-sm text-[#46564C] leading-relaxed">
                  Kho ReHome đảm nhận từ kiểm định, chụp studio, gắn slot AI đến giao hàng toàn
                  quốc.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3.5">
                {HOW_IT_WORKS_STEPS.map((item) => (
                  <div
                    key={item.step}
                    className="rounded-2xl bg-white border border-[#071D12]/[0.07] p-4 space-y-2"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[#EBF1E8] text-[#006B2C] text-xs font-extrabold tabular-nums">
                      {item.step}
                    </span>
                    <h4 className="text-sm font-bold text-[#071D12] leading-snug">{item.title}</h4>
                    <p className="text-xs text-[#46564C] leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenInfoModal?.('consignment')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#006B2C] hover:text-[#005523] transition-colors self-start"
            >
              <span>Xem quy chế ký gửi 30 ngày</span>
              <ArrowRightIcon className="w-4 h-4 shrink-0" />
            </button>
          </article>

          {/* Bento 4: Bộ tính nhanh tiền ký gửi nhận 90% */}
          <article
            onPointerMove={updateSpotlightCoords}
            className="bento-card landing-spotlight-card lg:col-span-5 rounded-3xl bg-gradient-to-br from-[#005A25] to-[#072B19] text-white p-6 sm:p-8 flex flex-col justify-between gap-6 border border-[#006B2C]"
          >
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full bg-[#FEA619] text-[#071D12] text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap">
                  Ước tính nhận 90%
                </span>
                <span className="text-xs font-bold text-[#A7F3D0] tabular-nums">
                  Phí dịch vụ 10%
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-extrabold tracking-tight">
                  Chọn mức giá bán dự kiến
                </h3>
                <div
                  role="group"
                  aria-label="Chọn mức giá bán dự kiến"
                  className="grid grid-cols-2 gap-2 pt-1"
                >
                  {CONSIGN_EARNING_PRESETS.map((price) => {
                    const isSelected = selectedPrice === price;
                    return (
                      <button
                        key={price}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedPrice(price)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold tabular-nums transition-colors whitespace-nowrap ${
                          isSelected
                            ? 'bg-white text-[#071D12] shadow-sm'
                            : 'bg-white/10 text-white hover:bg-white/20 border border-white/15'
                        }`}
                      >
                        {formatCurrencyVND(price)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-black/25 border border-white/15 p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-white/80">
                  <span>Giá bán tại quầy</span>
                  <span className="font-bold text-white tabular-nums">
                    {formatCurrencyVND(selectedPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-white/80">
                  <span>Phí kiểm định &amp; bán hộ (10%)</span>
                  <span className="font-bold text-white tabular-nums">
                    -{formatCurrencyVND(commissionFee)}
                  </span>
                </div>
                <div className="pt-2.5 border-t border-white/15 flex items-baseline justify-between gap-2">
                  <span className="font-bold text-[#A7F3D0]">Bạn thực nhận (90%)</span>
                  <span
                    data-testid="consign-payout-amount"
                    className="text-2xl font-extrabold text-[#FEA619] tabular-nums"
                  >
                    {formatCurrencyVND(sellerEarnings)}
                  </span>
                </div>
              </div>

              <ul className="space-y-1.5 text-xs text-white/85">
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-[#A7F3D0] shrink-0" />
                  <span>Hết chu kỳ 30 ngày: gia hạn tối đa 2 lần hoặc nhận lại miễn phí.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-[#A7F3D0] shrink-0" />
                  <span>Hoặc chuyển thành quà tặng thiện nguyện chỉ với 1 chạm.</span>
                </li>
              </ul>
            </div>

            <a
              href={APK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-btn-shine inline-flex items-center justify-center gap-2 w-full py-3.5 px-5 rounded-xl bg-[#FEA619] hover:bg-[#E59412] text-[#071D12] text-sm font-bold transition-colors whitespace-nowrap"
            >
              <AndroidIcon className="w-4 h-4 shrink-0" />
              <span>Tải APK để ký gửi</span>
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}
