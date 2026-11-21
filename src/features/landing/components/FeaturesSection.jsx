import React from 'react';
import aiTryonUrl from '../assets/ai-tryon-visual.jpg';
import { TRYON_SLOT_LABELS } from '../constants/landingConstants.js';
import { updateSpotlightCoords } from '../utils/spotlight.js';
import {
  CheckCircleIcon,
  HeartHandshakeIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SparklesIcon,
} from './LandingIcons.jsx';

const CONSIGN_STEPS = [
  { num: '01', text: 'Gửi form ký gửi & ảnh chụp ngay trên điện thoại' },
  { num: '02', text: 'Mang đồ đến điểm ký gửi ReHome trong 7 ngày' },
  { num: '03', text: 'Kiểm định chất lượng, định giá & dán tem SKU' },
  { num: '04', text: 'Bán hàng tự động & nhận doanh thu vào Ví ReHome' },
];

export default function FeaturesSection({ categories = [], brands = [], loading }) {
  const aiCategories = categories.filter((c) => Boolean(c.tryonSlot));

  return (
    <section
      id="features"
      className="relative overflow-hidden py-20 sm:py-24 bg-white border-b border-[#DDE5D9]"
    >
      <div
        aria-hidden="true"
        className="landing-editorial-grid absolute inset-0 opacity-45 pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="landing-orb-float-slow absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#006B2C]/6 blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl space-y-3">
            <span className="inline-block px-3.5 py-1 rounded-full bg-[#E8F5E9] text-[#006B2C] text-xs font-bold uppercase tracking-wider">
              Hệ sinh thái ReHome
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1F2A37]">
              Một ứng dụng cho trọn vòng đời trang phục
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#5B6776] max-w-md leading-relaxed">
            Chuẩn hóa từ khâu tiếp nhận kiểm định tại kho, thử đồ bằng AI cho tới quyên góp thiện
            nguyện minh bạch.
          </p>
        </div>

        {/* Bento Grid 12 cột bất đối xứng */}
        <div className="grid lg:grid-cols-12 gap-5">
          {/* Ô 1: Thử đồ AI & Live Try-On (Dark Emerald Spotlight + AI Scan Beam) */}
          <article
            onPointerMove={updateSpotlightCoords}
            className="bento-card landing-spotlight-card lg:col-span-7 min-w-0 rounded-3xl bg-gradient-to-br from-[#062B19] via-[#083A22] to-[#0A542C] text-white p-6 sm:p-8 shadow-elevated grid sm:grid-cols-12 gap-6 items-center"
          >
            <div className="sm:col-span-7 min-w-0 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEA619] text-[#1F2A37] text-[11px] font-bold whitespace-nowrap">
                <SparklesIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Công nghệ AI</span>
              </span>
              <h3 className="text-2xl font-bold leading-snug">Thử đồ AI &amp; Live Try-On</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Ướm thử trực tiếp Áo, Quần/Váy hoặc Đầm liền theo ảnh cá nhân hay Live Try-On thời
                gian thực qua camera trước khi quyết định mua.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {Object.entries(TRYON_SLOT_LABELS).map(([slotKey, label]) => (
                  <span
                    key={slotKey}
                    className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-white/95 whitespace-nowrap"
                  >
                    {label}
                  </span>
                ))}
              </div>
              {aiCategories.length > 0 && (
                <p className="text-xs text-[#A7F3D0] font-medium">
                  Hỗ trợ trên {aiCategories.length} danh mục trang phục hiện hành
                </p>
              )}
            </div>

            <div className="sm:col-span-5 min-w-0">
              <div className="relative aspect-[4/3] sm:aspect-[3/4] rounded-2xl overflow-hidden border border-white/15 shadow-lg">
                <img
                  src={aiTryonUrl}
                  alt="Tính năng thử đồ AI trên ứng dụng ReHome"
                  loading="lazy"
                  className="w-full h-full object-cover object-top"
                />
                <div aria-hidden="true" className="landing-scan-beam" />
              </div>
            </div>
          </article>

          {/* Ô 2: Ký gửi kiểm định tại kho (Timeline 4 bước) */}
          <article className="bento-card lg:col-span-5 min-w-0 rounded-3xl bg-[#FBF9F4] border border-[#DDE5D9] p-6 sm:p-8 hover:shadow-card-hover transition-shadow flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5E9] text-[#006B2C] text-[11px] font-bold whitespace-nowrap">
                  <ShieldCheckIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Quy trình 4 bước</span>
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#1F2A37]">
                Ký gửi kiểm định tại kho
              </h3>
              <p className="text-sm text-[#5B6776] leading-relaxed">
                Biên nhận điện tử rõ ràng, hoa hồng minh bạch theo từng kỳ ký gửi 30 ngày.
              </p>
            </div>

            <ol className="space-y-3 pt-2 border-t border-[#DDE5D9]">
              {CONSIGN_STEPS.map((step) => (
                <li key={step.num} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-[#006B2C] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    {step.num}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-[#1F2A37]">{step.text}</span>
                </li>
              ))}
            </ol>
          </article>

          {/* Ô 3: Sàn thời trang tuần hoàn tuyển chọn */}
          <article className="bento-card lg:col-span-5 min-w-0 rounded-3xl bg-white border border-[#DDE5D9] p-6 sm:p-8 shadow-card hover:shadow-card-hover transition-shadow flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-[#E8F5E9] text-[#006B2C] flex items-center justify-center">
                <ShoppingBagIcon className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-[#1F2A37]">
                Sàn thời trang tuần hoàn tuyển chọn
              </h3>
              <p className="text-sm text-[#5B6776] leading-relaxed">
                Mọi món hàng trên sàn đều được nhân viên kho kiểm định ngoại quan, gắn mã SKU riêng
                và niêm yết giá so sánh rõ ràng.
              </p>
            </div>

            <ul className="space-y-2 pt-3 border-t border-[#DDE5D9]">
              {[
                '100% kiểm định thực tế tại kho ReHome',
                'Thanh toán an toàn qua Ví ReHome, MoMo & VNPay',
                'Chính sách hoàn trả minh bạch trong 3 ngày',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2 text-xs font-semibold text-[#1F2A37]">
                  <CheckCircleIcon className="w-4 h-4 text-[#006B2C] shrink-0 mt-0.5" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </article>

          {/* Ô 4: Quyên góp thiện nguyện & Danh mục tiếp nhận */}
          <article
            className="bento-card lg:col-span-7 min-w-0 rounded-3xl border border-[#DDE5D9] p-6 sm:p-8 hover:shadow-card-hover transition-shadow flex flex-col justify-between gap-6"
            style={{
              background:
                'linear-gradient(135deg, #F6F9F4 0%, #EBF4EC 60%, rgba(254,166,25,0.12) 100%)',
            }}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] text-[11px] font-bold whitespace-nowrap">
                  <HeartHandshakeIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Lan tỏa cộng đồng</span>
                </span>
                <span className="text-xs font-bold text-[#006B2C] whitespace-nowrap">
                  {categories.length} danh mục đang tiếp nhận
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#1F2A37]">
                Quyên góp thiện nguyện minh bạch
              </h3>
              <p className="text-sm text-[#5B6776] leading-relaxed max-w-xl">
                Đóng góp đồ trực tiếp hoặc chuyển đổi sản phẩm ký gửi cuối kỳ sang các chiến dịch
                của tổ chức thiện nguyện đã được thẩm định pháp lý.
              </p>
            </div>

            {loading ? (
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="h-8 w-24 rounded-full bg-white/80 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#DDE5D9]/80">
                {categories.slice(0, 12).map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#DDE5D9] text-xs font-semibold text-[#1F2A37] shadow-sm whitespace-nowrap"
                  >
                    <span>{cat.name}</span>
                    {cat.tryonSlot && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#E6F4F2] text-[#00685F] text-[10px] font-bold">
                        AI
                      </span>
                    )}
                  </span>
                ))}
                {categories.length > 12 && (
                  <span className="px-3 py-1.5 rounded-full bg-white/75 border border-[#DDE5D9] text-xs font-semibold text-[#5B6776] whitespace-nowrap">
                    +{categories.length - 12} danh mục khác
                  </span>
                )}
              </div>
            )}
          </article>
        </div>

        {/* Dải Brand Marquee từ API /brands */}
        <div className="min-w-0 overflow-hidden rounded-3xl border border-[#DDE5D9] bg-[#F6F9F4] py-6 px-4 sm:px-6 space-y-4 reveal-section">
          <div className="flex items-center justify-between gap-2 px-2">
            <h3 className="text-sm font-bold text-[#1F2A37] uppercase tracking-wider">
              Thương hiệu được đón nhận trên ReHome
            </h3>
            <span className="text-xs font-bold text-[#00685F] whitespace-nowrap">
              {brands.length > 0 ? `${brands.length} thương hiệu` : 'Đa dạng thương hiệu'}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-wrap gap-2.5 px-2">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-9 w-28 rounded-full bg-[#DDE5D9]/70 animate-pulse" />
              ))}
            </div>
          ) : brands.length > 0 ? (
            <div className="landing-marquee-viewport">
              <div className="landing-marquee-track gap-3">
                <div className="flex items-center gap-3 shrink-0">
                  {brands.map((brand) => (
                    <span
                      key={brand.id}
                      className="px-4 py-2 rounded-full bg-white border border-[#DDE5D9] text-xs sm:text-sm font-semibold text-[#1F2A37] whitespace-nowrap shadow-sm"
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
                      className="px-4 py-2 rounded-full bg-white border border-[#DDE5D9] text-xs sm:text-sm font-semibold text-[#1F2A37] whitespace-nowrap shadow-sm"
                    >
                      {brand.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#5B6776] px-2">
              Hỗ trợ nhiều thương hiệu thời trang phổ biến và local brand Việt Nam.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
