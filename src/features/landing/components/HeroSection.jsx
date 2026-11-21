import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import heroEditorialUrl from '../assets/hero-editorial.jpg';
import aiTryonUrl from '../assets/ai-tryon-visual.jpg';
import charityVisualUrl from '../assets/charity-community.svg';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { APK_DOWNLOAD_URL, APP_METADATA } from '../constants/landingConstants.js';
import { isBrokenSeedAssetUrl } from '../services/landingApi.js';
import { updateSpotlightCoords } from '../utils/spotlight.js';
import {
  AndroidIcon,
  CheckCircleIcon,
  DownloadIcon,
  HeartHandshakeIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SparklesIcon,
} from './LandingIcons.jsx';

const PHONE_TABS = [
  { id: 'shop', label: 'Mua sắm' },
  { id: 'tryon', label: 'Thử đồ AI' },
  { id: 'charity', label: 'Thiện nguyện' },
];

const FALLBACK_PREVIEW_PRODUCTS = [
  {
    id: 'p-1',
    name: 'Áo sơ mi linen tối giản',
    brandName: 'ReHome Curated',
    currentPrice: 185000,
    condition: '98%',
  },
  {
    id: 'p-2',
    name: 'Đầm midi xanh olive',
    brandName: 'Eco Wardrobe',
    currentPrice: 260000,
    condition: 'Mới 99%',
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
        <ShoppingBagIcon className="w-5 h-5" />
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
      className="w-full h-20 object-cover rounded-xl border border-[#DDE5D9]"
    />
  );
}

export default function HeroSection({ stats, loading, hasLiveData, products = [], campaigns = [] }) {
  const [activeTab, setActiveTab] = useState('shop');

  const previewProducts = products.length > 0 ? products.slice(0, 2) : FALLBACK_PREVIEW_PRODUCTS;
  const previewCampaign = campaigns.length > 0 ? campaigns[0] : FALLBACK_PREVIEW_CAMPAIGN;

  const statItems = [
    { key: 'products', label: 'Sản phẩm đang mở bán', value: stats?.productsTotal ?? 0 },
    { key: 'warehouses', label: 'Điểm ký gửi hoạt động', value: stats?.warehousesTotal ?? 0 },
    { key: 'campaigns', label: 'Chiến dịch thiện nguyện', value: stats?.campaignsTotal ?? 0 },
    { key: 'orgs', label: 'Tổ chức đã xác minh', value: stats?.organizationsTotal ?? 0 },
  ];

  return (
    <section className="landing-hero-mesh relative overflow-hidden border-b border-[#DDE5D9]">
      {/* Lớp lưới kiến trúc & quầng sáng trôi đa tầng */}
      <div aria-hidden="true" className="landing-editorial-grid absolute inset-0 opacity-70 pointer-events-none" />
      <div
        aria-hidden="true"
        className="landing-orb-float absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#006B2C]/12 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="landing-orb-float-slow absolute top-10 right-[12%] w-80 h-80 rounded-full bg-[#FEA619]/18 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="landing-orb-float absolute bottom-16 left-[40%] w-72 h-72 rounded-full bg-[#00685F]/10 blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 sm:pt-14 sm:pb-16 lg:pt-16 lg:pb-20 space-y-12">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Cột trái: Editorial Headline & CTA tải APK */}
          <div className="lg:col-span-6 min-w-0 space-y-6">
            <div className="hero-eyebrow inline-flex flex-wrap items-center gap-2 max-w-full px-4 py-1.5 rounded-full bg-white/95 backdrop-blur-sm border border-[#DDE5D9] shadow-sm text-xs font-bold text-[#006B2C]">
              <span className="landing-pulse-ring w-2 h-2 rounded-full bg-[#006B2C] text-[#006B2C] shrink-0" />
              <AndroidIcon className="w-4 h-4 shrink-0" />
              <span>
                ReHome Android v{APP_METADATA.version} • Tải miễn phí trên Google Drive
              </span>
            </div>

            <h1 className="hero-title text-4xl sm:text-5xl lg:text-[3.2rem] font-extrabold text-[#1F2A37] tracking-[-0.025em] leading-[1.12]">
              Ký gửi thời trang tuần hoàn,{' '}
              <span className="bg-gradient-to-r from-[#006B2C] via-[#00883A] to-[#00685F] bg-clip-text text-transparent">
                thử đồ AI tức thì
              </span>{' '}
              &amp; lan tỏa thiện nguyện
            </h1>

            <p className="hero-desc text-base sm:text-lg text-[#5B6776] leading-relaxed max-w-xl">
              Gửi bán trang phục không còn mặc tại kho kiểm định ReHome, ướm thử bằng AI trước khi
              chốt đơn và chung tay đóng góp cho các chiến dịch nhân ái đã xác minh.
            </p>

            {/* Cụm nút CTA nổi bật — đảm bảo 1 dòng không xuống dòng */}
            <div className="hero-ctas flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-1">
              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="hero-apk-cta"
                className="landing-btn-shine group inline-flex items-center justify-center gap-2.5 px-5 sm:px-6 py-3.5 rounded-2xl bg-[#006B2C] hover:bg-[#005523] text-white font-bold text-sm sm:text-[15px] shadow-[0_14px_30px_-8px_rgba(0,107,44,0.45)] transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#006B2C]/40 whitespace-nowrap shrink-0"
              >
                <DownloadIcon className="w-5 h-5 shrink-0" />
                <span>Tải ReHome APK · Google Drive</span>
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </a>
              <a
                href="#install-guide"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white/95 hover:bg-white text-[#1F2A37] font-semibold text-sm sm:text-[15px] border border-[#DDE5D9] hover:border-[#006B2C]/50 shadow-sm transition-all hover:-translate-y-0.5 whitespace-nowrap shrink-0"
              >
                <span>Hướng dẫn cài APK</span>
              </a>
            </div>

            <div className="hero-meta flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#5B6776] pt-1">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircleIcon className="w-4 h-4 text-[#006B2C] shrink-0" />
                Gói <code className="font-bold text-[#1F2A37]">{APP_METADATA.packageName}</code>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircleIcon className="w-4 h-4 text-[#006B2C] shrink-0" />
                {APP_METADATA.minAndroid}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircleIcon className="w-4 h-4 text-[#006B2C] shrink-0" />
                100% kiểm định thực tế tại kho
              </span>
            </div>
          </div>

          {/* Cột phải: Composition ảnh Editorial + Mockup Android xếp lớp */}
          <div className="lg:col-span-6 min-w-0 relative">
            <div className="relative mx-auto w-full max-w-[540px] flex flex-col sm:block sm:pb-14">
              {/* Khung ảnh Editorial nền phía sau bên phải */}
              <div className="hero-editorial-frame hidden sm:block ml-auto w-[80%] aspect-[4/5] rounded-[2rem] overflow-hidden border border-white shadow-card-hover bg-[#EBF1E8] relative">
                <img
                  src={heroEditorialUrl}
                  alt="Bộ sưu tập thời trang tuần hoàn tuyển chọn tại ReHome"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#062B19]/45 via-transparent to-transparent" />
                <div className="absolute top-4 right-4 z-10 flex justify-end">
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-white shadow-lg whitespace-nowrap">
                    <ShieldCheckIcon className="w-4 h-4 text-[#006B2C] shrink-0" />
                    <span className="text-[11px] font-bold text-[#1F2A37]">
                      100% kiểm định thực tế tại kho
                    </span>
                  </div>
                </div>
              </div>

              {/* Khung điện thoại Android tinh xảo nổi phía trước bên trái */}
              <div className="hero-phone-float relative sm:absolute sm:left-0 sm:bottom-0 z-10 mx-auto w-full max-w-[305px] sm:max-w-[276px] xl:max-w-[298px]">
                <div className="rounded-[2.2rem] bg-[#161F1B] p-2.5 shadow-[0_24px_50px_-12px_rgba(6,43,25,0.42)] border border-[#2C3E35]">
                  <div className="rounded-[1.75rem] bg-[#F6F9F4] overflow-hidden">
                    {/* Header App với camera punch-hole */}
                    <div className="bg-gradient-to-br from-[#062B19] to-[#006B2C] text-white px-4 pt-2.5 pb-3.5">
                      <div className="flex items-center justify-between text-[10px] opacity-90 mb-2">
                        <span className="font-bold tracking-wide">ReHome</span>
                        <span
                          aria-hidden="true"
                          className="w-2.5 h-2.5 rounded-full bg-[#09120D] ring-1 ring-white/25"
                        />
                        <span className="px-2 py-0.5 rounded-full bg-white/15 font-semibold">
                          v{APP_METADATA.version}
                        </span>
                      </div>

                      <p className="text-[13px] font-bold leading-snug">
                        Hôm nay bạn muốn tuần hoàn món nào?
                      </p>

                      {/* Tabs chuyển màn preview */}
                      <div className="mt-2.5 grid grid-cols-3 gap-1 bg-black/20 p-1 rounded-xl">
                        {PHONE_TABS.map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-1.5 px-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
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

                    {/* Nội dung theo tab đang chọn (có animation chuyển tab) */}
                    <div className="p-3.5 min-h-[285px]">
                      <div key={activeTab} className="landing-tab-panel space-y-2.5">
                        {activeTab === 'shop' && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#1F2A37]">
                                Mới kiểm định lên sàn
                              </span>
                              <span className="text-[11px] font-bold text-[#006B2C]">
                                {products.length > 0
                                  ? `${formatStatNumber(stats?.productsTotal)} món`
                                  : 'Tuyển chọn'}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {previewProducts.map((item) => (
                                <div
                                  key={item.id}
                                  className="bg-white rounded-2xl border border-[#DDE5D9] p-2.5 flex items-center gap-2.5 shadow-sm"
                                >
                                  <div className="w-12 h-14 rounded-xl bg-[#EBF1E8] shrink-0 overflow-hidden flex items-center justify-center">
                                    <HeroThumb src={item.thumbnailUrl} alt={item.name} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-[#1F2A37] truncate">
                                      {item.name}
                                    </p>
                                    <p className="text-[10px] text-[#5B6776] truncate mt-0.5">
                                      {item.brandName || 'Thương hiệu'} •{' '}
                                      {item.condition || 'Đã kiểm định'}
                                    </p>
                                    <p className="text-xs font-extrabold text-[#006B2C] mt-1">
                                      {formatCurrencyVND(item.currentPrice)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="rounded-xl bg-[#E8F5E9] border border-[#006B2C]/20 px-3 py-2 text-[11px] text-[#1F2A37]">
                              Thanh toán qua <span className="font-bold">Ví ReHome</span> hoặc{' '}
                              <span className="font-bold">MoMo / VNPay</span>.
                            </div>
                          </>
                        )}

                        {activeTab === 'tryon' && (
                          <div className="space-y-2.5">
                            <div className="relative rounded-2xl overflow-hidden border border-[#DDE5D9] bg-white">
                              <img
                                src={aiTryonUrl}
                                alt="Mô phỏng thử đồ AI trên ReHome"
                                className="w-full h-28 object-cover object-top"
                              />
                              <div aria-hidden="true" className="landing-scan-beam" />
                              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#FEA619] text-[#1F2A37] text-[10px] font-bold shadow-sm">
                                Live Try-On
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 text-center">
                              {['Áo (TOP)', 'Quần (BOTTOM)', 'Đầm (DRESS)'].map((slot) => (
                                <div
                                  key={slot}
                                  className="rounded-xl bg-white border border-[#DDE5D9] py-2 px-1"
                                >
                                  <SparklesIcon className="w-3.5 h-3.5 text-[#00685F] mx-auto mb-1" />
                                  <p className="text-[10px] font-semibold text-[#1F2A37] leading-tight">
                                    {slot}
                                  </p>
                                </div>
                              ))}
                            </div>
                            <div className="rounded-xl bg-[#00685F] text-white p-2.5 text-[11px] leading-relaxed">
                              Ướm thử Áo + Quần hoặc Đầm liền — trả ảnh AI dưới 120 giây hoặc thử
                              trực tiếp bằng camera.
                            </div>
                          </div>
                        )}

                        {activeTab === 'charity' && (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#1F2A37]">
                                Chiến dịch đang mở
                              </span>
                              <HeartHandshakeIcon className="w-4 h-4 text-[#006B2C]" />
                            </div>
                            <div className="rounded-2xl bg-white border border-[#DDE5D9] p-2.5 space-y-2">
                              <HeroCampaignThumb
                                src={previewCampaign.coverUrl}
                                alt={previewCampaign.title}
                              />
                              <p className="text-xs font-bold text-[#1F2A37] line-clamp-2">
                                {previewCampaign.title}
                              </p>
                              <p className="text-[11px] text-[#5B6776]">
                                Tổ chức:{' '}
                                <span className="font-semibold text-[#006B2C]">
                                  {previewCampaign.organization?.displayName || 'Đối tác đã xác minh'}
                                </span>
                              </p>
                              {Array.isArray(previewCampaign.preferredItemTypes) &&
                                previewCampaign.preferredItemTypes.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {previewCampaign.preferredItemTypes.slice(0, 3).map((tag) => (
                                      <span
                                        key={tag}
                                        className="px-2 py-0.5 rounded-full bg-[#F6F9F4] border border-[#DDE5D9] text-[#1F2A37] text-[10px] font-semibold"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
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

        {/* Thanh Số liệu trực tiếp Dark Emerald với Spotlight & Count-Up */}
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
