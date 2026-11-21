import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import heroEditorialUrl from '../assets/hero-editorial.jpg';
import aiTryonUrl from '../assets/ai-tryon-visual.jpg';
import charityVisualUrl from '../assets/charity-community.svg';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { AI_OUTFIT_COMBOS, APK_DOWNLOAD_URL, APP_METADATA } from '../constants/landingConstants.js';
import { isBrokenSeedAssetUrl } from '../services/landingApi.js';
import { updateSpotlightCoords } from '../utils/spotlight.js';
import {
  AndroidIcon,
  CameraIcon,
  CheckCircleIcon,
  DownloadIcon,
  HeartHandshakeIcon,
  MapPinIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SparklesIcon,
} from './LandingIcons.jsx';

const PHONE_TABS = [
  { id: 'live', label: 'Live Try-On' },
  { id: 'stylist', label: 'AI Phối đồ' },
  { id: 'consign', label: 'Ký gửi & Quỹ' },
];

const FALLBACK_PREVIEW_PRODUCTS = [
  {
    id: 'p-1',
    name: 'Áo khoác gió Nike xanh đen',
    brandName: 'Nike',
    currentPrice: 380000,
    condition: 'Như mới 99%',
    size: 'L',
  },
  {
    id: 'p-2',
    name: 'Áo sơ mi Zara trắng tay dài',
    brandName: 'Zara',
    currentPrice: 220000,
    condition: '98%',
    size: 'S',
  },
];

const FALLBACK_PREVIEW_CAMPAIGN = {
  title: 'Áo ấm mùa đông cho trẻ em vùng cao',
  organization: { displayName: 'Quỹ Nụ Cười Xanh' },
  preferredItemTypes: ['Áo khoác', 'Đồ trẻ em', 'Khăn len'],
};

function formatStatNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return new Intl.NumberFormat('vi-VN').format(Math.round(num));
}

function StatCounter({ value, loading }) {
  const numberRef = useRef(null);
  const numericValue = Number(value) || 0;

  useEffect(() => {
    if (loading) return undefined;
    const el = numberRef.current;
    if (!el) return undefined;

    const canAnimate =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: no-preference)').matches &&
      numericValue > 0 &&
      typeof gsap?.to === 'function';

    if (!canAnimate) {
      el.textContent = formatStatNumber(numericValue);
      return undefined;
    }

    const tracker = { val: 0 };
    const tween = gsap.to(tracker, {
      val: numericValue,
      duration: 1.15,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = formatStatNumber(tracker.val);
      },
      onComplete: () => {
        el.textContent = formatStatNumber(numericValue);
      },
    });

    return () => {
      tween.kill();
    };
  }, [loading, numericValue]);

  if (loading) {
    return <div className="h-9 w-20 bg-white/15 rounded-lg animate-pulse" />;
  }

  return (
    <div
      ref={numberRef}
      className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-white"
    >
      {formatStatNumber(numericValue)}
    </div>
  );
}

function HeroThumb({ src, alt }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError || isBrokenSeedAssetUrl(src)) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#EBF1E8] text-[#006B2C]">
        <ShoppingBagIcon className="w-4 h-4" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setHasError(true)}
      className="w-full h-full object-cover"
    />
  );
}

function HeroCampaignThumb({ src, alt }) {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = !src || hasError || isBrokenSeedAssetUrl(src) ? charityVisualUrl : src;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading="lazy"
      onError={() => setHasError(true)}
      className="w-full h-24 object-cover rounded-xl border border-[#DDE5D9]"
    />
  );
}

export default function HeroSection({
  stats,
  loading,
  hasLiveData,
  products = [],
  campaigns = [],
  warehouses = [],
}) {
  const [activeTab, setActiveTab] = useState('live');
  const [selectedLiveIdx, setSelectedLiveIdx] = useState(0);

  const previewProducts = products.length > 0 ? products.slice(0, 2) : FALLBACK_PREVIEW_PRODUCTS;
  const activeLiveProduct = previewProducts[selectedLiveIdx] || previewProducts[0];
  const previewCampaign = campaigns.length > 0 ? campaigns[0] : FALLBACK_PREVIEW_CAMPAIGN;
  const previewWarehouse = warehouses[0];
  const featuredCombo = AI_OUTFIT_COMBOS[0];

  const statItems = [
    { key: 'products', label: 'Món đã kiểm định đang bán', value: stats?.productsTotal ?? 0 },
    { key: 'warehouses', label: 'Điểm ký gửi tiếp nhận', value: stats?.warehousesTotal ?? 0 },
    { key: 'campaigns', label: 'Chiến dịch thiện nguyện', value: stats?.campaignsTotal ?? 0 },
    { key: 'orgs', label: 'Tổ chức đã xác minh', value: stats?.organizationsTotal ?? 0 },
  ];

  return (
    <section className="landing-hero-mesh relative overflow-hidden border-b border-[#DDE5D9]">
      <div
        aria-hidden="true"
        className="landing-editorial-grid absolute inset-0 opacity-70 pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="landing-orb-float absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#006B2C]/12 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="landing-orb-float-slow absolute top-10 right-[12%] w-80 h-80 rounded-full bg-[#FEA619]/18 blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-14 sm:pt-12 sm:pb-16 lg:pt-14 lg:pb-20 space-y-12">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Cột trái: Thông điệp đánh thẳng vào động lực Tải APK */}
          <div className="lg:col-span-6 min-w-0 space-y-6">
            <div className="hero-eyebrow inline-flex flex-wrap items-center gap-2 max-w-full px-4 py-1.5 rounded-full bg-white/95 backdrop-blur-sm border border-[#DDE5D9] shadow-sm text-xs font-bold text-[#006B2C]">
              <span className="landing-pulse-ring w-2 h-2 rounded-full bg-[#006B2C] text-[#006B2C] shrink-0" />
              <AndroidIcon className="w-4 h-4 shrink-0" />
              <span>
                2 chế độ AI Thử đồ • Ký gửi nhận 90% • APK v{APP_METADATA.version}
              </span>
            </div>

            <h1 className="hero-title text-4xl sm:text-5xl lg:text-[3.15rem] font-extrabold text-[#1F2A37] tracking-[-0.025em] leading-[1.12]">
              Ký gửi thời trang tuần hoàn,{' '}
              <span className="bg-gradient-to-r from-[#006B2C] via-[#00883A] to-[#00685F] bg-clip-text text-transparent">
                thử đồ AI tức thì
              </span>{' '}
              &amp; lan tỏa thiện nguyện
            </h1>

            <p className="hero-desc text-base sm:text-lg text-[#5B6776] leading-relaxed max-w-xl">
              Ướm thử trực tiếp qua <strong className="text-[#1F2A37]">Camera Real-time</strong>{' '}
              hoặc để <strong className="text-[#1F2A37]">AI tự phối nguyên set</strong> trước khi
              mua. Có đồ ít mặc? Mang tới điểm ký gửi gần nhất — kho lo kiểm định, chụp ảnh và bán
              hộ từ A–Z.
            </p>

            {/* Cụm nút CTA 1 dòng */}
            <div className="hero-ctas flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-1">
              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="hero-apk-cta"
                className="landing-btn-shine group inline-flex items-center justify-center gap-2.5 px-5 sm:px-6 py-3.5 rounded-2xl bg-[#006B2C] hover:bg-[#005523] text-white font-bold text-sm sm:text-[15px] shadow-[0_14px_30px_-8px_rgba(0,107,44,0.45)] transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#006B2C]/40 whitespace-nowrap shrink-0"
              >
                <DownloadIcon className="w-5 h-5 shrink-0" />
                <span>Tải APK · Thử đồ AI ngay</span>
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </a>
              <a
                href="#ai-studio"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white/95 hover:bg-white text-[#1F2A37] font-semibold text-sm sm:text-[15px] border border-[#DDE5D9] hover:border-[#006B2C]/50 shadow-sm transition-all hover:-translate-y-0.5 whitespace-nowrap shrink-0"
              >
                <SparklesIcon className="w-4 h-4 text-[#006B2C] shrink-0" />
                <span>Xem 2 công nghệ AI</span>
              </a>
            </div>

            <div className="hero-meta flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[#5B6776] pt-1">
              <span className="inline-flex items-center gap-1.5">
                <CameraIcon className="w-4 h-4 text-[#006B2C] shrink-0" />
                Live Try-On qua Camera
              </span>
              <span className="inline-flex items-center gap-1.5">
                <SparklesIcon className="w-4 h-4 text-[#00685F] shrink-0" />
                AI gợi ý phối nguyên set
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheckIcon className="w-4 h-4 text-[#006B2C] shrink-0" />
                100% kiểm định thực tế tại kho
              </span>
            </div>
          </div>

          {/* Cột phải: Phone Mockup cỡ lớn làm tâm điểm trình diễn App */}
          <div className="lg:col-span-6 min-w-0 relative">
            <div className="relative mx-auto w-full max-w-[540px] flex flex-col items-center">
              {/* Nhãn xác thực nằm gọn phía trên, không bao giờ bị điện thoại đè */}
              <div className="w-full flex flex-wrap items-center justify-center lg:justify-between gap-2 mb-3.5 px-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-[#DDE5D9] shadow-sm whitespace-nowrap">
                  <ShieldCheckIcon className="w-4 h-4 text-[#006B2C] shrink-0" />
                  <span className="text-[11px] font-bold text-[#1F2A37]">
                    100% kiểm định thực tế tại kho
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] border border-[#FEA619]/40 text-[11px] font-bold text-[#92400E] whitespace-nowrap">
                  <span>{APP_METADATA.minAndroid} · Miễn phí</span>
                </span>
              </div>

              {/* Khung ảnh phụ nền nhẹ phía sau chỉ hiển thị trên màn hình rộng xl */}
              <div
                aria-hidden="true"
                className="hero-editorial-frame hidden xl:block absolute right-0 top-20 w-52 h-80 rounded-[1.75rem] overflow-hidden border-2 border-white shadow-card-hover bg-[#EBF1E8] rotate-3 opacity-90"
              >
                <img
                  src={heroEditorialUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#062B19]/60 via-transparent to-transparent" />
              </div>

              {/* Khung điện thoại Android cỡ lớn (tâm điểm Hero) */}
              <div className="hero-phone-float relative z-10 w-full max-w-[345px] sm:max-w-[380px] lg:max-w-[388px] xl:max-w-[408px]">
                <div className="rounded-[2.4rem] bg-[#161F1B] p-3 shadow-[0_28px_60px_-14px_rgba(6,43,25,0.48)] border border-[#2C3E35]">
                  <div className="rounded-[1.9rem] bg-[#F6F9F4] overflow-hidden">
                    {/* Header App trong Mockup */}
                    <div className="bg-gradient-to-br from-[#042414] via-[#062B19] to-[#006B2C] text-white px-4 pt-3 pb-4">
                      <div className="flex items-center justify-between text-[11px] opacity-95 mb-2.5">
                        <span className="font-extrabold tracking-wide">ReHome App</span>
                        <span
                          aria-hidden="true"
                          className="w-3 h-3 rounded-full bg-[#09120D] ring-1 ring-white/25"
                        />
                        <span className="px-2.5 py-0.5 rounded-full bg-white/15 font-bold whitespace-nowrap">
                          v{APP_METADATA.version}
                        </span>
                      </div>

                      <p className="text-sm font-bold leading-snug">
                        Thử qua Camera · Phối cả bộ · Ký gửi 90%
                      </p>

                      {/* 3 Tab chuyển tính năng chủ lực */}
                      <div className="mt-3 grid grid-cols-3 gap-1.5 bg-black/25 p-1 rounded-xl">
                        {PHONE_TABS.map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-2 px-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                              activeTab === tab.id
                                ? 'bg-white text-[#006B2C] shadow-sm'
                                : 'text-white/85 hover:text-white'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Thân màn hình ứng dụng */}
                    <div className="p-4 min-h-[340px]">
                      <div key={activeTab} className="landing-tab-panel space-y-3">
                        {activeTab === 'live' && (
                          <>
                            <div className="relative rounded-2xl overflow-hidden border border-[#DDE5D9] bg-[#0B1C14]">
                              <img
                                src={aiTryonUrl}
                                alt="Mô phỏng Live Try-On realtime trên ứng dụng ReHome"
                                className="w-full h-44 object-cover object-top"
                              />
                              <div aria-hidden="true" className="landing-scan-beam" />
                              <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-[10px] font-bold text-white whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                                <span>LIVE TRY-ON · REALTIME</span>
                              </div>
                              <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-[#FEA619] text-[#1F2A37] text-[10px] font-extrabold shadow-sm whitespace-nowrap">
                                Hợp dáng 96%
                              </div>
                              <div className="absolute bottom-2.5 inset-x-2.5 rounded-xl bg-black/70 backdrop-blur-sm px-3 py-2 flex items-center justify-between gap-2 text-white">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate">
                                    {activeLiveProduct.name}
                                  </p>
                                  <p className="text-[10px] text-white/75 truncate">
                                    {activeLiveProduct.condition || 'Đã kiểm định kho'}
                                  </p>
                                </div>
                                <span className="text-xs font-extrabold text-[#FEA619] tabular-nums shrink-0 whitespace-nowrap">
                                  {formatCurrencyVND(activeLiveProduct.currentPrice)}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-[#1F2A37]">
                                  Chạm đổi món đang thử:
                                </span>
                                <span className="font-semibold text-[#006B2C]">
                                  {products.length > 0
                                    ? `${formatStatNumber(stats?.productsTotal)} món sẵn sàng`
                                    : 'Kho tuyển chọn'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {previewProducts.map((item, idx) => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setSelectedLiveIdx(idx)}
                                    className={`text-left rounded-xl p-2 border transition-all flex items-center gap-2 ${
                                      selectedLiveIdx === idx
                                        ? 'bg-[#E8F5E9] border-[#006B2C] shadow-sm'
                                        : 'bg-white border-[#DDE5D9] hover:border-[#006B2C]/50'
                                    }`}
                                  >
                                    <div className="w-9 h-10 rounded-lg bg-[#EBF1E8] overflow-hidden shrink-0">
                                      <HeroThumb src={item.thumbnailUrl} alt={item.name} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[11px] font-bold text-[#1F2A37] truncate">
                                        {item.name}
                                      </p>
                                      <p className="text-[10px] font-extrabold text-[#006B2C] tabular-nums">
                                        {formatCurrencyVND(item.currentPrice)}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {activeTab === 'stylist' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-[#1F2A37]">
                                AI tự gợi ý phối cả bộ
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full bg-[#00685F] text-white text-[10px] font-bold whitespace-nowrap">
                                Mẫu {featuredCombo.modelType} · {featuredCombo.matchScore}
                              </span>
                            </div>

                            <div className="rounded-2xl bg-white border border-[#DDE5D9] p-3 space-y-2 shadow-sm">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-[#00685F]">
                                  1. {featuredCombo.top.tag}
                                </span>
                                <span className="font-extrabold text-[#1F2A37] tabular-nums">
                                  {formatCurrencyVND(featuredCombo.top.price)}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-[#1F2A37] truncate">
                                {featuredCombo.top.name}
                              </p>
                              <div className="border-t border-dashed border-[#DDE5D9] pt-2 flex items-center justify-between text-[11px]">
                                <span className="font-bold text-[#006B2C]">
                                  2. {featuredCombo.bottom.tag}
                                </span>
                                <span className="font-extrabold text-[#1F2A37] tabular-nums">
                                  {formatCurrencyVND(featuredCombo.bottom.price)}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-[#1F2A37] truncate">
                                {featuredCombo.bottom.name}
                              </p>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 text-center">
                              {['Áo (TOP)', 'Quần (BOTTOM)', 'Đầm (DRESS)'].map((slot) => (
                                <div
                                  key={slot}
                                  className="rounded-xl bg-white border border-[#DDE5D9] py-2 px-1"
                                >
                                  <SparklesIcon className="w-3.5 h-3.5 text-[#00685F] mx-auto mb-1" />
                                  <p className="text-[10px] font-bold text-[#1F2A37] leading-tight">
                                    {slot}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className="rounded-xl bg-[#00685F] text-white p-3 text-[11px] leading-relaxed">
                              {featuredCombo.styleNote}
                            </div>
                          </div>
                        )}

                        {activeTab === 'consign' && (
                          <div className="space-y-3">
                            <div className="rounded-2xl bg-[#E8F5E9] border border-[#006B2C]/25 p-3 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#006B2C]">
                                  <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                                  <span>Gợi ý điểm ký gửi gần bạn</span>
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-[#006B2C] text-white text-[10px] font-bold whitespace-nowrap">
                                  Nhận 90%
                                </span>
                              </div>
                              <p className="text-xs font-bold text-[#1F2A37] truncate">
                                {previewWarehouse?.name || 'Điểm ký gửi ReHome gần nhất'}
                              </p>
                              <p className="text-[11px] text-[#5B6776] line-clamp-1">
                                {previewWarehouse?.address ||
                                  'App tự xếp điểm kho gần vị trí bạn lên đầu'}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-white border border-[#DDE5D9] p-3 space-y-2 shadow-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-[#1F2A37]">
                                  Chiến dịch thiện nguyện mở
                                </span>
                                <HeartHandshakeIcon className="w-4 h-4 text-[#006B2C]" />
                              </div>
                              <HeroCampaignThumb
                                src={previewCampaign.coverUrl}
                                alt={previewCampaign.title}
                              />
                              <p className="text-xs font-bold text-[#1F2A37] line-clamp-1">
                                {previewCampaign.title}
                              </p>
                              <p className="text-[11px] text-[#5B6776] truncate">
                                Tổ chức:{' '}
                                <span className="font-bold text-[#006B2C]">
                                  {previewCampaign.organization?.displayName ||
                                    'Đối tác đã xác minh'}
                                </span>
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thanh Số liệu trực tiếp Dark Emerald */}
        <div
          data-testid="landing-live-stats"
          onPointerMove={updateSpotlightCoords}
          className="landing-spotlight-card rounded-3xl bg-[#062B19] text-white p-6 sm:p-8 shadow-elevated landing-dot-grid border border-[#0E482A]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 mb-5 border-b border-white/10">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-white/90">
              <span
                className={`landing-pulse-ring inline-block w-2 h-2 rounded-full ${
                  hasLiveData ? 'bg-[#34D399] text-[#34D399]' : 'bg-[#FEA619] text-[#FEA619]'
                }`}
              />
              <span>
                {loading
                  ? 'Đang đồng bộ số liệu hệ thống ReHome...'
                  : hasLiveData
                  ? 'Dữ liệu trực tiếp từ hệ thống API ReHome'
                  : 'Thông số hệ thống ReHome'}
              </span>
            </div>
            <span className="text-[11px] text-white/65">
              Cập nhật theo thời gian thực qua REST API công khai
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {statItems.map((stat) => (
              <div key={stat.key} className="space-y-1">
                <StatCounter value={stat.value} loading={loading} />
                <div className="text-xs sm:text-sm font-medium text-white/75">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
