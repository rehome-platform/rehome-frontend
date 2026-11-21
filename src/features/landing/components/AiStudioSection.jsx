import React, { useState } from 'react';
import aiTryonUrl from '../assets/ai-tryon-visual.jpg';
import heroEditorialUrl from '../assets/hero-editorial.jpg';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { AI_OUTFIT_COMBOS, APK_DOWNLOAD_URL } from '../constants/landingConstants.js';
import { updateSpotlightCoords } from '../utils/spotlight.js';
import {
  AndroidIcon,
  CameraIcon,
  CheckCircleIcon,
  SparklesIcon,
} from './LandingIcons.jsx';

const FALLBACK_LIVE_ITEMS = [
  { id: 'live-1', name: 'Áo khoác gió Nike xanh đen', currentPrice: 380000, size: 'L' },
  { id: 'live-2', name: 'Áo T1 Facker', currentPrice: 520000, size: 'M' },
  { id: 'live-3', name: 'Áo sơ mi Zara trắng tay dài', currentPrice: 220000, size: 'S' },
];

export default function AiStudioSection({
  products = [],
  categories = [],
  brands = [],
  loading = false,
}) {
  const [liveItemIndex, setLiveItemIndex] = useState(0);
  const [selectedComboId, setSelectedComboId] = useState(AI_OUTFIT_COMBOS[0].id);
  const [selectedModel, setSelectedModel] = useState('Nữ');

  const liveChoices = products.length >= 2 ? products.slice(0, 3) : FALLBACK_LIVE_ITEMS;
  const activeLiveItem = liveChoices[liveItemIndex] || liveChoices[0];
  const activeCombo =
    AI_OUTFIT_COMBOS.find((combo) => combo.id === selectedComboId) || AI_OUTFIT_COMBOS[0];
  const aiCategories = categories.filter((c) => Boolean(c.tryonSlot));

  return (
    <section
      id="ai-studio"
      className="relative overflow-hidden py-20 sm:py-24 bg-[#041E12] text-white border-b border-[#0E3F27]"
    >
      <div
        aria-hidden="true"
        className="landing-ai-grid absolute inset-0 opacity-75 pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="landing-orb-float absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#10B981]/15 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="landing-orb-float-slow absolute bottom-10 -right-20 w-96 h-96 rounded-full bg-[#FEA619]/15 blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Tiêu đề thu hút người mua */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="max-w-3xl space-y-3.5">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FEA619] text-[#1F2A37] text-xs font-extrabold uppercase tracking-wider whitespace-nowrap">
              <SparklesIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Lý do #1 người dùng tải ReHome APK</span>
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold tracking-tight leading-[1.15]">
              Hết nỗi lo mua đồ cũ không hợp dáng với{' '}
              <span className="text-[#FEA619]">2 công nghệ AI độc quyền</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base text-white/75 max-w-md leading-relaxed">
            Ướm thử trực tiếp qua camera thời gian thực hoặc để trợ lý AI tự phối nguyên set chuẩn
            gu — thấy đẹp mới chốt đơn ngay trên điện thoại.
          </p>
        </div>

        {/* 2 Thẻ công nghệ AI cốt lõi */}
        <div className="grid lg:grid-cols-12 gap-6 items-stretch">
          {/* AI #1: Live Try-On Realtime */}
          <article
            onPointerMove={updateSpotlightCoords}
            className="ai-card landing-spotlight-card lg:col-span-6 min-w-0 rounded-3xl bg-gradient-to-br from-[#072F1C] via-[#093A23] to-[#0D4E2F] border border-white/15 p-6 sm:p-7 shadow-elevated flex flex-col justify-between gap-6"
          >
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold text-[#6EE7B7] whitespace-nowrap">
                  <CameraIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>01 · LIVE TRY-ON REALTIME</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Camera trực tiếp
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-extrabold leading-snug">
                  Thử đồ trực tiếp qua Camera (Real-time)
                </h3>
                <p className="text-sm text-white/75 mt-2 leading-relaxed">
                  Mở camera là món đồ áp ngay lên dáng người theo chuyển động thật. Xoay góc, kiểm
                  tra độ rủ và màu sắc trước khi bỏ vào giỏ hàng.
                </p>
              </div>

              {/* Khung mô phỏng Camera Live Try-On tương tác */}
              <div className="grid sm:grid-cols-12 gap-4 items-center rounded-2xl bg-black/25 border border-white/10 p-4">
                <div className="sm:col-span-5 relative aspect-[3/4] rounded-xl overflow-hidden border border-white/20 bg-[#062415]">
                  <img
                    src={aiTryonUrl}
                    alt="Thử đồ trực tiếp qua camera Live Try-On trên ReHome"
                    loading="lazy"
                    className="w-full h-full object-cover object-top"
                  />
                  <div aria-hidden="true" className="landing-scan-beam" />
                  <div className="absolute top-2 left-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-sm text-[10px] font-bold text-white whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                    <span>LIVE</span>
                  </div>
                  <div className="absolute bottom-2 inset-x-2 rounded-lg bg-black/65 backdrop-blur-sm px-2.5 py-1.5 text-[10px]">
                    <p className="font-bold text-white truncate">{activeLiveItem.name}</p>
                    <p className="text-[#FEA619] font-extrabold tabular-nums">
                      {formatCurrencyVND(activeLiveItem.currentPrice)}
                    </p>
                  </div>
                </div>

                <div className="sm:col-span-7 space-y-3 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/65">
                    Chạm để thử đổi món trên camera:
                  </p>
                  <div className="space-y-1.5">
                    {liveChoices.map((item, idx) => {
                      const active = idx === liveItemIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setLiveItemIndex(idx)}
                          className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-all flex items-center justify-between gap-2 ${
                            active
                              ? 'bg-[#FEA619] text-[#1F2A37] border-[#FEA619] font-bold shadow-sm'
                              : 'bg-white/5 hover:bg-white/10 text-white/90 border-white/10 font-medium'
                          }`}
                        >
                          <span className="truncate">{item.name}</span>
                          <span className="shrink-0 tabular-nums whitespace-nowrap">
                            {formatCurrencyVND(item.currentPrice)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-[#A7F3D0] leading-relaxed">
                    Minh bạch: Chỉ trừ lượt khi khung hình AI lên hình thành công — hỗ trợ đổi điểm
                    tích lũy lấy thêm lượt miễn phí.
                  </p>
                </div>
              </div>

              <ul className="space-y-2">
                {[
                  'Xem ngay phom áo/đầm theo chuyển động thật qua camera điện thoại',
                  'Kiểm tra độ hợp màu da & dáng người trước khi chốt đơn',
                  'Chụp lưu khoảnh khắc thử trực tiếp để hỏi ý kiến bạn bè',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-xs sm:text-sm text-white/90">
                    <CheckCircleIcon className="w-4 h-4 text-[#FEA619] shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2">
              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-btn-shine inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#FEA619] hover:bg-[#E59412] text-[#1F2A37] text-sm font-bold shadow-sm transition-colors whitespace-nowrap shrink-0"
              >
                <AndroidIcon className="w-4 h-4 shrink-0" />
                <span>Tải APK để thử qua Camera</span>
              </a>
            </div>
          </article>

          {/* AI #2: Trợ lý AI Phối đồ (Smart Outfit Stylist) */}
          <article
            onPointerMove={updateSpotlightCoords}
            className="ai-card landing-spotlight-card lg:col-span-6 min-w-0 rounded-3xl bg-gradient-to-br from-[#072B27] via-[#083B35] to-[#0A4D43] border border-white/15 p-6 sm:p-7 shadow-elevated flex flex-col justify-between gap-6"
          >
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold text-[#99F6E4] whitespace-nowrap">
                  <SparklesIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>02 · TRỢ LÝ AI PHỐI ĐỒ</span>
                </span>
                <span className="text-xs font-bold text-[#FEA619] whitespace-nowrap">
                  Độ hợp gu: {activeCombo.matchScore}
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-extrabold leading-snug">
                  AI tự gợi ý món ghép &amp; lên ảnh cả bộ
                </h3>
                <p className="text-sm text-white/75 mt-2 leading-relaxed">
                  Chỉ cần chọn 1 chiếc áo bạn thích, AI tự động tìm chiếc quần hoặc chân váy hợp
                  phong cách nhất trên sàn và mặc lên người mẫu Nữ / Nam cho bạn xem trước.
                </p>
              </div>

              {/* Bộ mô phỏng AI Phối đồ tương tác */}
              <div className="rounded-2xl bg-black/25 border border-white/10 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chọn phong cách phối đồ AI">
                    {AI_OUTFIT_COMBOS.map((combo) => (
                      <button
                        key={combo.id}
                        type="button"
                        onClick={() => {
                          setSelectedComboId(combo.id);
                          setSelectedModel(combo.modelType);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                          selectedComboId === combo.id
                            ? 'bg-white text-[#041E12] shadow-sm'
                            : 'bg-white/10 text-white/85 hover:bg-white/20'
                        }`}
                      >
                        {combo.label}
                      </button>
                    ))}
                  </div>

                  <div className="inline-flex items-center p-1 rounded-full bg-white/10 border border-white/10">
                    {['Nữ', 'Nam'].map((gender) => (
                      <button
                        key={gender}
                        type="button"
                        onClick={() => setSelectedModel(gender)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap shrink-0 ${
                          selectedModel === gender
                            ? 'bg-[#FEA619] text-[#1F2A37]'
                            : 'text-white/75 hover:text-white'
                        }`}
                      >
                        Mẫu {gender}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2 Slot phối đồ + Kết quả */}
                <div className="grid sm:grid-cols-12 gap-3 items-stretch">
                  <div className="sm:col-span-7 space-y-2 min-w-0">
                    <div className="rounded-xl bg-white/10 border border-white/15 p-3">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-[#99F6E4] uppercase">
                        <span>{activeCombo.top.tag}</span>
                        <span className="tabular-nums text-white">
                          {formatCurrencyVND(activeCombo.top.price)}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white mt-1 truncate">
                        {activeCombo.top.name}
                      </p>
                    </div>

                    <div className="flex items-center justify-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FEA619]/20 border border-[#FEA619]/40 text-[10px] font-bold text-[#FEA619] whitespace-nowrap">
                        + AI tự gợi ý ghép bộ ({activeCombo.matchScore})
                      </span>
                    </div>

                    <div className="rounded-xl bg-white text-[#1F2A37] p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-[#00685F] uppercase">
                        <span>{activeCombo.bottom.tag}</span>
                        <span className="tabular-nums text-[#006B2C]">
                          {formatCurrencyVND(activeCombo.bottom.price)}
                        </span>
                      </div>
                      <p className="text-xs font-bold mt-1 truncate">{activeCombo.bottom.name}</p>
                    </div>
                  </div>

                  <div className="sm:col-span-5 rounded-xl overflow-hidden border border-white/15 relative min-h-[148px]">
                    <img
                      src={heroEditorialUrl}
                      alt="Kết quả phối đồ AI"
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                    <div className="absolute bottom-2 inset-x-2 text-[10px] text-white">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-[#00685F] font-bold mb-1 whitespace-nowrap">
                        Dáng mẫu {selectedModel}
                      </span>
                      <p className="font-semibold leading-snug line-clamp-2">
                        {activeCombo.styleNote}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <ul className="space-y-2">
                {[
                  'Tự điền sẵn món phối hợp nhất từ các sản phẩm đang bán trên sàn',
                  'Tùy chọn ghép Áo + Quần/Váy hoặc Đầm liền theo dáng Nữ / Nam',
                  'Chạy nền thông minh — làm xong tự lưu vào Bộ sưu tập & báo thông báo',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-xs sm:text-sm text-white/90">
                    <CheckCircleIcon className="w-4 h-4 text-[#99F6E4] shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2">
              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-btn-shine inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-[#E8F5E9] text-[#041E12] text-sm font-bold shadow-sm transition-colors whitespace-nowrap shrink-0"
              >
                <SparklesIcon className="w-4 h-4 shrink-0 text-[#00685F]" />
                <span>Tải APK để AI phối đồ cho bạn</span>
              </a>
            </div>
          </article>
        </div>

        {/* Dải danh mục AI & Thương hiệu được săn đón (Brand Marquee chống tràn ngang) */}
        <div className="min-w-0 overflow-hidden rounded-3xl border border-white/15 bg-white/5 backdrop-blur-sm py-5 px-4 sm:px-6 space-y-4 reveal-section">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white/85">
                Danh mục hỗ trợ thử AI:
              </span>
              {aiCategories.length > 0 ? (
                aiCategories.slice(0, 6).map((cat) => (
                  <span
                    key={cat.id}
                    className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-white whitespace-nowrap"
                  >
                    {cat.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-white/70">Áo · Quần / Váy · Đầm liền</span>
              )}
            </div>
            <span className="text-xs font-bold text-[#FEA619] whitespace-nowrap">
              {brands.length > 0 ? `${brands.length} thương hiệu đang có hàng` : 'Đa dạng thương hiệu'}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-8 w-24 rounded-full bg-white/10 animate-pulse" />
              ))}
            </div>
          ) : brands.length > 0 ? (
            <div className="landing-marquee-viewport">
              <div className="landing-marquee-track gap-3">
                <div className="flex items-center gap-3 shrink-0">
                  {brands.map((brand) => (
                    <span
                      key={brand.id}
                      className="px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-white whitespace-nowrap"
                    >
                      {brand.name}
                    </span>
                  ))}
                </div>
                <div
                  aria-hidden="true"
                  className="landing-marquee-duplicate flex items-center gap-3 shrink-0"
                >
                  {brands.map((brand) => (
                    <span
                      key={`dup-${brand.id}`}
                      className="px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-white whitespace-nowrap"
                    >
                      {brand.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
