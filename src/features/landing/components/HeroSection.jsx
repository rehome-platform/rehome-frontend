import React, { useEffect, useState } from 'react';
import Logo from '../../../components/common/Logo.jsx';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import aiTryonUrl from '../assets/ai-tryon-visual.jpg';
import apkQrUrl from '../assets/apk-qr.svg';
import heroEditorialUrl from '../assets/hero-editorial.jpg';
import {
  APK_DOWNLOAD_URL,
  HERO_COPY,
  HERO_STORY_SLIDES,
} from '../constants/landingConstants.js';
import { isBrokenSeedAssetUrl } from '../services/landingApi.js';
import {
  AndroidIcon,
  CameraIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from './LandingIcons.jsx';

const PHONE_DOCK_TILES = [
  'bg-[#DCF1DF]',
  'bg-[#FFE8B6]',
  'bg-[#D8ECE9]',
  'bg-[#EAE5F5]',
  'bg-[#FDE5DA]',
  'bg-[#DCEBF7]',
  'bg-[#E6EFE2]',
  'bg-[#F7EED7]',
];

function FloatingPhotoCard({ src, caption, className = '' }) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = !src || failed || isBrokenSeedAssetUrl(src) ? heroEditorialUrl : src;

  return (
    <div
      className={`rounded-[22px] overflow-hidden border-[3px] border-white shadow-[0_14px_32px_rgba(13,36,25,0.12)] bg-[#E7EFE4] ${className}`}
    >
      <img
        src={resolvedSrc}
        alt=""
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
      {caption && (
        <span className="absolute bottom-1.5 inset-x-1 rounded-full bg-white/95 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-bold text-[#0D2419] text-center truncate shadow-sm">
          {caption}
        </span>
      )}
    </div>
  );
}

export default function HeroSection({ products = [], onOpenInfoModal }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [verifiedImgFailed, setVerifiedImgFailed] = useState(false);

  const featuredProduct = products[0] || {
    name: 'Áo khoác denim cổ điển',
    currentPrice: 240000,
    thumbnailUrl: '',
  };

  useEffect(() => {
    setVerifiedImgFailed(false);
  }, [featuredProduct?.thumbnailUrl]);

  useEffect(() => {
    if (paused) return undefined;
    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return undefined;

    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_STORY_SLIDES.length);
    }, 3800);

    return () => clearInterval(timer);
  }, [paused]);

  const currentStory = HERO_STORY_SLIDES[activeSlide] || HERO_STORY_SLIDES[0];
  const verifiedThumbSrc =
    !featuredProduct?.thumbnailUrl ||
    verifiedImgFailed ||
    isBrokenSeedAssetUrl(featuredProduct.thumbnailUrl)
      ? heroEditorialUrl
      : featuredProduct.thumbnailUrl;

  return (
    <section className="relative min-h-[calc(100svh-72px)] flex flex-col items-center justify-center px-5 sm:px-8 pt-1 pb-5 sm:py-3 text-center overflow-hidden">
      {/* Ảnh vệ tinh & sticker die-cut rải thoáng quanh điện thoại trên desktop */}
      <div
        aria-hidden="true"
        className="hidden lg:block pointer-events-none absolute inset-0 max-w-[1360px] mx-auto"
      >
        <span className="landing-sticker absolute left-[13%] xl:left-[17%] top-[9%] -rotate-6 px-3.5 py-1.5 rounded-full bg-white text-[#006B2C] text-xs font-extrabold inline-flex items-center gap-1.5">
          <SparklesIcon className="w-3.5 h-3.5 text-[#FEA619]" />
          <span>Thử AI ✨</span>
        </span>
        <FloatingPhotoCard
          src={products[0]?.thumbnailUrl}
          caption="96% hợp dáng"
          className="absolute left-[5%] xl:left-[8%] top-[24%] w-28 h-28 -rotate-6"
        />
        <span className="landing-sticker absolute left-[17%] xl:left-[21%] top-[53%] rotate-3 px-3.5 py-1.5 rounded-full bg-[#0D2419] text-white text-xs font-extrabold">
          SKU 6 bước
        </span>
        <FloatingPhotoCard
          src={products[1]?.thumbnailUrl}
          caption="Như mới 99%"
          className="absolute left-[9%] xl:left-[12%] top-[63%] w-28 h-28 rotate-6"
        />

        <span className="landing-sticker absolute right-[15%] xl:right-[19%] top-[9%] rotate-6 px-3.5 py-1.5 rounded-full bg-[#FEA619] text-[#0D2419] text-xs font-extrabold">
          Nhận 90%
        </span>
        <FloatingPhotoCard
          src={products[2]?.thumbnailUrl}
          caption="+450k về ví"
          className="absolute right-[6%] xl:right-[9%] top-[24%] w-28 h-28 rotate-6"
        />
        <span className="landing-sticker absolute right-[12%] xl:right-[16%] top-[60%] -rotate-3 px-3.5 py-1.5 rounded-full bg-[#E8F5E9] text-[#006B2C] text-[11px] font-black tracking-wide">
          WEAR AGAIN
        </span>
      </div>

      {/* Sân khấu trung tâm: Điện thoại pastel mờ tan chân + QR nghiêng trên desktop */}
      <div
        className="relative flex flex-col items-center z-10"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="relative">
          <div className="hero-phone-float landing-phone-dissolve w-[272px] sm:w-[292px] xl:w-[308px] rounded-[2.6rem] bg-gradient-to-b from-[#E3ECE1] via-[#ECF2EA] to-[#F6F9F2] p-3 border border-white/85 shadow-[0_24px_60px_-24px_rgba(13,36,25,0.2)] sm:-rotate-2">
            {/* Thanh trạng thái điện thoại tối giản */}
            <div className="flex items-center justify-between px-4 pt-1 pb-2 text-[11px] font-bold text-[#0D2419]/75">
              <span>9:41</span>
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="inline-flex items-end gap-[2px] h-2.5">
                  <span className="w-[2.5px] h-1 bg-[#0D2419]/65 rounded-full" />
                  <span className="w-[2.5px] h-1.5 bg-[#0D2419]/65 rounded-full" />
                  <span className="w-[2.5px] h-2 bg-[#0D2419]/65 rounded-full" />
                  <span className="w-[2.5px] h-2.5 bg-[#0D2419]/65 rounded-full" />
                </span>
                <span className="w-5 h-2.5 rounded-[4px] border border-[#0D2419]/55 p-[1.5px] flex items-center">
                  <span className="w-full h-full bg-[#0D2419]/75 rounded-[1.5px]" />
                </span>
              </div>
            </div>

            {/* 3 khoảnh khắc tự diễn bên trong màn hình */}
            {currentStory.id === 'tryon' && (
              <div
                key="tryon"
                className="landing-story-enter h-[220px] sm:h-[214px] xl:h-[236px] rounded-[24px] overflow-hidden relative bg-[#0B1C14] text-left"
              >
                <img
                  src={aiTryonUrl}
                  alt="Mô phỏng thử đồ AI qua camera trên ReHome"
                  className="w-full h-full object-cover object-top"
                />
                <div aria-hidden="true" className="landing-scan-beam" />
                <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white">
                  <CameraIcon className="w-3 h-3 text-[#34D399]" />
                  <span>{currentStory.badge}</span>
                </div>
                <div className="landing-emoji-pop absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-white/95 text-[#006B2C] text-[10px] font-extrabold shadow-sm">
                  ✨ 96%
                </div>
                <div className="absolute bottom-2.5 inset-x-2.5 rounded-2xl bg-black/65 backdrop-blur-md px-3 py-2 text-white">
                  <p className="text-[11px] font-bold truncate">Áo sơ mi olive dáng suông</p>
                  <p className="text-[10px] text-white/85">Ướm trực tiếp qua camera</p>
                </div>
              </div>
            )}

            {currentStory.id === 'verified' && (
              <div
                key="verified"
                className="landing-story-enter h-[220px] sm:h-[214px] xl:h-[236px] rounded-[24px] overflow-hidden relative bg-[#E7EFE4] text-left"
              >
                <img
                  src={verifiedThumbSrc}
                  alt={featuredProduct.name}
                  onError={() => setVerifiedImgFailed(true)}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#006B2C]/90 text-white text-[10px] font-bold shadow-sm">
                  <ShieldCheckIcon className="w-3 h-3 text-[#A7F3D0]" />
                  <span>{currentStory.badge}</span>
                </div>
                <div className="absolute bottom-2.5 inset-x-2.5 rounded-2xl bg-white/95 backdrop-blur-md px-3 py-2 shadow-sm">
                  <p className="text-[11px] font-bold text-[#0D2419] truncate">
                    {featuredProduct.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] font-extrabold text-[#006B2C] tabular-nums">
                      {formatCurrencyVND(featuredProduct.currentPrice)}
                    </span>
                    <span aria-hidden="true" className="text-[#0D2419]/30">
                      ·
                    </span>
                    <span className="text-[10px] font-bold text-[#0D2419]/70">Như mới 99%</span>
                  </div>
                </div>
              </div>
            )}

            {currentStory.id === 'payout' && (
              <div
                key="payout"
                className="landing-story-enter h-[220px] sm:h-[214px] xl:h-[236px] rounded-[24px] bg-gradient-to-br from-[#EEF8F0] via-white to-[#FFF7E2] p-3.5 sm:p-4 flex flex-col justify-between text-left border border-[#006B2C]/10"
              >
                <div className="rounded-2xl bg-white p-3.5 shadow-sm border border-[#006B2C]/10 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#006B2C]">
                    <span>Ví ReHome · Vừa xong</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#E8F5E9]">90%</span>
                  </div>
                  <p className="text-2xl font-extrabold text-[#0D2419] tabular-nums tracking-tight">
                    +450.000₫
                  </p>
                  <p className="text-[11px] font-semibold text-[#0D2419]/75 leading-snug">
                    Tiền ký gửi 90% vừa về ví
                  </p>
                </div>

                <div className="rounded-2xl bg-[#006B2C]/[0.07] px-3 py-2 flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[#006B2C] text-white flex items-center justify-center shrink-0">
                    <SparklesIcon className="w-3.5 h-3.5" />
                  </span>
                  <p className="text-[11px] font-semibold text-[#0D2419]/75 leading-snug">
                    Kho ReHome chụp ảnh, kiểm định &amp; bán hộ A–Z
                  </p>
                </div>
              </div>
            )}

            {/* Hàng icon ứng dụng pastel mờ dần tạo cảm giác màn hình chính */}
            <div aria-hidden="true" className="grid grid-cols-4 gap-2 px-2 pt-2.5 pb-1.5">
              {PHONE_DOCK_TILES.map((bgClass, index) => (
                <span key={index} className={`h-9 sm:h-8 xl:h-9 rounded-[12px] ${bgClass} opacity-85`} />
              ))}
            </div>
          </div>

          {/* Thẻ QR trắng nghiêng đè góc dưới phải trên desktop/tablet — wrapper đứng thẳng cho tooltip */}
          <div className="hidden sm:block absolute -right-[72px] xl:-right-20 -bottom-2 z-20 group">
            <a
              href={APK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="hero-qr-link"
              title="Quét bằng Android để tải ReHome APK"
              className="flex flex-col items-center justify-center w-[116px] h-[116px] xl:w-[124px] xl:h-[124px] rounded-[24px] bg-white p-2.5 shadow-[0_18px_46px_rgba(13,36,25,0.18)] rotate-6 group-hover:rotate-2 transition-transform duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006B2C] focus-visible:ring-offset-2"
            >
              <div className="relative w-full h-full">
                <img
                  src={apkQrUrl}
                  alt="Mã QR tải ReHome APK"
                  className="w-full h-full object-contain rounded-xl block"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <span className="w-7 h-7 rounded-lg bg-[#0D2419] text-white flex items-center justify-center border-2 border-white shadow-sm">
                    <CameraIcon className="w-3.5 h-3.5" />
                  </span>
                </span>
              </div>
            </a>

            <span
              aria-hidden="true"
              className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3.5 py-2 rounded-2xl bg-white text-[#0D2419] text-xs font-bold shadow-[0_14px_34px_rgba(13,36,25,0.16)] whitespace-nowrap"
            >
              Quét bằng Android để tải ReHome APK
            </span>
          </div>
        </div>

        {/* Bộ chọn 3 khoảnh khắc nhỏ gọn dưới điện thoại */}
        <div
          role="group"
          aria-label="Chọn khoảnh khắc minh họa trên ứng dụng"
          className="-mt-2 relative z-10 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#0D2419]/[0.05]"
        >
          {HERO_STORY_SLIDES.map((slide, idx) => {
            const isActive = activeSlide === idx;
            return (
              <button
                key={slide.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveSlide(idx)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-[#006B2C] shadow-sm'
                    : 'text-[#0D2419]/65 hover:text-[#0D2419]'
                }`}
              >
                {slide.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Khối chữ tối giản kiểu Locket */}
      <div className="mt-4 sm:mt-4 max-w-2xl mx-auto space-y-2 relative z-10">
        <div className="hero-brand inline-flex items-center justify-center gap-3">
          <Logo size="md" to={null} showText={false} className="xl:scale-110" />
          <span className="text-4xl sm:text-[42px] xl:text-[50px] font-bold tracking-[-0.03em] text-[#0D2419] leading-none">
            ReHome
          </span>
        </div>

        <h1 className="hero-title landing-text-balance text-lg sm:text-[19px] xl:text-[21px] font-semibold text-[#0D2419]/70 leading-snug">
          {HERO_COPY.tagline}
        </h1>

        <div className="hero-actions pt-1.5">
          {/* Mobile CTA */}
          <div className="sm:hidden flex flex-col items-center gap-2.5">
            <a
              href={APK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="hero-apk-cta"
              className="landing-btn-shine inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-[#006B2C] hover:bg-[#005523] text-white font-bold text-base shadow-[0_14px_30px_-8px_rgba(0,107,44,0.4)] transition-all whitespace-nowrap"
            >
              <AndroidIcon className="w-5 h-5 shrink-0" />
              <span>Tải ReHome APK</span>
            </a>

            {onOpenInfoModal && (
              <button
                type="button"
                onClick={() => onOpenInfoModal('install')}
                className="text-xs font-semibold text-[#0D2419]/70 hover:text-[#006B2C] underline-offset-4 hover:underline"
              >
                Hướng dẫn cài 4 bước
              </button>
            )}
          </div>

          {/* Desktop quiet secondary links */}
          <div className="hidden sm:inline-flex items-center justify-center gap-3">
            <a
              href={APK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="hero-desktop-apk-link"
              className="text-xs font-semibold text-[#0D2419]/70 hover:text-[#006B2C] underline-offset-4 hover:underline"
            >
              Tải APK từ Google Drive
            </a>
            <span aria-hidden="true" className="text-[#0D2419]/30">
              ·
            </span>
            <button
              type="button"
              onClick={() => onOpenInfoModal?.('install')}
              className="text-xs font-semibold text-[#0D2419]/70 hover:text-[#006B2C] underline-offset-4 hover:underline"
            >
              Cách cài APK (30 giây)
            </button>
          </div>
        </div>
      </div>

      {/* Mũi tên cuộn nhẹ cuối màn hình đầu */}
      <a
        href="#drops"
        aria-label="Cuộn xuống xem đồ mới về"
        className="mt-2.5 sm:mt-3 inline-flex items-center justify-center w-9 h-9 rounded-full text-[#0D2419]/50 hover:text-[#0D2419] transition-colors relative z-10"
      >
        <ChevronDownIcon className="w-6 h-6" />
      </a>
    </section>
  );
}
