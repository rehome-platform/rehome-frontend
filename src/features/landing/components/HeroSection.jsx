import React, { useEffect, useState } from 'react';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import aiTryonUrl from '../assets/ai-tryon-visual.jpg';
import apkQrUrl from '../assets/apk-qr.svg';
import heroEditorialUrl from '../assets/hero-editorial.jpg';
import {
  APK_DOWNLOAD_URL,
  APP_METADATA,
  HERO_COPY,
  HERO_STORY_SLIDES,
} from '../constants/landingConstants.js';
import { isBrokenSeedAssetUrl } from '../services/landingApi.js';
import {
  AndroidIcon,
  ArrowRightIcon,
  CameraIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from './LandingIcons.jsx';

export default function HeroSection({ products = [], stats = {}, onOpenInfoModal }) {
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
    }, 4500);

    return () => clearInterval(timer);
  }, [paused]);

  const currentStory = HERO_STORY_SLIDES[activeSlide] || HERO_STORY_SLIDES[0];
  const verifiedThumbSrc =
    !featuredProduct?.thumbnailUrl ||
    verifiedImgFailed ||
    isBrokenSeedAssetUrl(featuredProduct.thumbnailUrl)
      ? heroEditorialUrl
      : featuredProduct.thumbnailUrl;

  const hasWarehousesCount = Number(stats?.warehousesTotal) > 0;

  return (
    <section className="landing-editorial-hero-bg relative overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 pt-8 sm:pt-12 lg:pt-14 pb-16 sm:pb-20">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Cột trái: Định vị giá trị, CTA rõ cho cả Desktop & Mobile, và chỉ số tin cậy */}
          <div className="lg:col-span-6 text-left space-y-6">
            <div className="hero-stagger inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white border border-[#071D12]/10 shadow-sm text-xs font-bold text-[#071D12]">
              <span className="landing-pulse-ring w-2 h-2 rounded-full bg-[#006B2C] text-[#006B2C]" />
              <span>{HERO_COPY.eyebrow}</span>
            </div>

            <h1 className="hero-stagger landing-text-balance text-[2.15rem] sm:text-[2.85rem] xl:text-[3.35rem] font-extrabold tracking-[-0.03em] leading-[1.08] text-[#071D12]">
              {HERO_COPY.headlineLead}
              <span className="text-[#006B2C]"> {HERO_COPY.headlineAccent}</span>
            </h1>

            <p className="hero-stagger text-[15px] sm:text-base text-[#46564C] leading-[1.65] max-w-xl">
              {HERO_COPY.subtitle}
            </p>

            {/* Cụm CTA chính hiển thị đồng bộ trên mọi thiết bị */}
            <div className="hero-stagger flex flex-wrap items-center gap-3 pt-1">
              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="hero-apk-cta"
                className="landing-btn-shine inline-flex items-center justify-center gap-2.5 h-12 px-6 rounded-xl bg-[#006B2C] hover:bg-[#005523] text-white text-sm font-bold shadow-[0_14px_30px_-10px_rgba(0,107,44,0.48)] transition-colors whitespace-nowrap"
              >
                <AndroidIcon className="w-4 h-4 shrink-0" />
                <span>Tải ReHome APK</span>
              </a>

              <button
                type="button"
                onClick={() => onOpenInfoModal?.('inspection')}
                className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-white hover:bg-[#EBF1E8]/60 border border-[#071D12]/15 hover:border-[#006B2C] text-[#071D12] hover:text-[#006B2C] text-sm font-bold transition-colors whitespace-nowrap"
              >
                <ShieldCheckIcon className="w-4 h-4 text-[#006B2C] shrink-0" />
                <span>Quy chuẩn kiểm định 6 bước</span>
              </button>
            </div>

            <div className="hero-stagger flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-[#46564C]">
              <span>
                {APP_METADATA.minAndroid} · v{APP_METADATA.version}
              </span>
              <span aria-hidden="true">·</span>
              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="hero-desktop-apk-link"
                className="font-semibold text-[#006B2C] hover:text-[#005523] underline-offset-4 hover:underline"
              >
                {APP_METADATA.distributionLabel}
              </a>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => onOpenInfoModal?.('install')}
                className="font-semibold text-[#071D12] hover:text-[#006B2C] underline-offset-4 hover:underline"
              >
                Cách cài 30 giây
              </button>
            </div>

            {/* Dải số liệu chứng thực */}
            <div className="hero-stagger pt-6 border-t border-[#071D12]/10 grid grid-cols-3 gap-4 sm:gap-6">
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-[#071D12] tabular-nums tracking-tight">
                  90%
                </p>
                <p className="text-xs font-medium text-[#46564C] mt-0.5">Doanh thu về ví</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-[#071D12] tabular-nums tracking-tight">
                  6 bước
                </p>
                <p className="text-xs font-medium text-[#46564C] mt-0.5">Kiểm định tem Mã hàng hóa</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-[#071D12] tabular-nums tracking-tight">
                  {hasWarehousesCount ? `${stats.warehousesTotal} điểm kí gửi` : '3 ngày'}
                </p>
                <p className="text-xs font-medium text-[#46564C] mt-0.5">
                  {hasWarehousesCount ? 'Tiếp nhận trực tiếp' : 'Bảo vệ đổi trả'}
                </p>
              </div>
            </div>
          </div>

          {/* Cột phải: Khung trình diễn ảnh Editorial + Live Try-On + QR tích hợp gọn */}
          <div
            className="hero-stage lg:col-span-6"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
          >
            <div className="rounded-[28px] bg-white border border-[#071D12]/10 p-3 sm:p-3.5 shadow-[0_28px_70px_-28px_rgba(7,29,18,0.22)]">
              {/* Thanh chuyển 3 trải nghiệm ứng dụng */}
              <div
                role="group"
                aria-label="Chọn trải nghiệm minh họa trên ứng dụng"
                className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[#F6F9F4] border border-[#071D12]/[0.06]"
              >
                {HERO_STORY_SLIDES.map((slide, idx) => {
                  const isActive = activeSlide === idx;
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveSlide(idx)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap truncate ${
                        isActive
                          ? 'bg-white text-[#071D12] shadow-sm border border-[#071D12]/[0.06]'
                          : 'text-[#46564C] hover:text-[#071D12]'
                      }`}
                    >
                      {slide.label}
                    </button>
                  );
                })}
              </div>

              {/* Khung hình ảnh/trải nghiệm chính */}
              <div className="mt-2.5 aspect-[4/4.2] sm:aspect-[4/3.65] rounded-[20px] overflow-hidden relative bg-[#071D12]">
                {currentStory.id === 'tryon' && (
                  <div key="tryon" className="landing-story-enter w-full h-full relative text-left">
                    <img
                      src={aiTryonUrl}
                      alt="Mô phỏng thử đồ AI qua camera trên ReHome"
                      className="w-full h-full object-cover object-top"
                    />
                    <div aria-hidden="true" className="landing-scan-beam" />
                    <div className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#071D12]/75 backdrop-blur-md text-[11px] font-bold text-white border border-white/15">
                      <CameraIcon className="w-3.5 h-3.5 text-[#34D399]" />
                      <span>{currentStory.badge}</span>
                    </div>
                    <div className="absolute top-3.5 right-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 text-[#006B2C] text-[11px] font-extrabold shadow-sm tabular-nums">
                      <SparklesIcon className="w-3.5 h-3.5 text-[#FEA619]" />
                      <span>{currentStory.metric}</span>
                    </div>
                    <div className="absolute bottom-3.5 inset-x-3.5 rounded-2xl bg-[#071D12]/80 backdrop-blur-md border border-white/15 px-4 py-3 text-white">
                      <p className="text-xs font-bold truncate">Áo sơ mi linen olive dáng suông</p>
                      <p className="text-[11px] text-white/80 mt-0.5">{currentStory.caption}</p>
                    </div>
                  </div>
                )}

                {currentStory.id === 'verified' && (
                  <div
                    key="verified"
                    className="landing-story-enter w-full h-full relative text-left bg-[#EBF1E8]"
                  >
                    <img
                      src={verifiedThumbSrc}
                      alt={featuredProduct.name}
                      onError={() => setVerifiedImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-[#071D12]/65 via-transparent to-transparent"
                    />
                    <div className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#006B2C] text-white text-[11px] font-bold shadow-sm">
                      <ShieldCheckIcon className="w-3.5 h-3.5 text-[#A7F3D0]" />
                      <span>{currentStory.badge}</span>
                    </div>
                    <div className="absolute bottom-3.5 inset-x-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#071D12]/10 px-4 py-3 shadow-sm">
                      <p className="text-xs font-bold text-[#071D12] truncate">
                        {featuredProduct.name}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-sm font-extrabold text-[#006B2C] tabular-nums">
                          {formatCurrencyVND(featuredProduct.currentPrice)}
                        </span>
                        <span className="text-[11px] font-semibold text-[#46564C]">
                          Như mới 99% · 6/6 tiêu chí
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {currentStory.id === 'payout' && (
                  <div
                    key="payout"
                    className="landing-story-enter w-full h-full bg-[#071D12] text-white p-5 sm:p-6 flex flex-col justify-between text-left relative overflow-hidden"
                  >
                    <div
                      aria-hidden="true"
                      className="landing-dot-grid absolute inset-0 pointer-events-none"
                    />

                    <div className="relative z-10 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold text-[#A7F3D0]">
                        <span>{currentStory.badge}</span>
                      </span>
                      <span className="text-xs font-bold text-[#FEA619] tabular-nums">
                        Chu kỳ 30 ngày
                      </span>
                    </div>

                    <div className="relative z-10 grid grid-cols-12 gap-3.5 items-center my-auto py-3">
                      <div className="col-span-7 space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/65">
                          Biên nhận ký gửi thành công
                        </p>
                        <p className="text-2xl sm:text-3xl font-extrabold text-[#FEA619] tabular-nums tracking-tight">
                          +{formatCurrencyVND(450000)}
                        </p>
                        <p className="text-xs text-white/85 leading-relaxed">
                          {currentStory.caption}
                        </p>
                      </div>
                      <div className="col-span-5 aspect-[3/4] rounded-2xl overflow-hidden border border-white/15">
                        <img
                          src={heroEditorialUrl}
                          alt="Trang phục ký gửi đã kiểm định tại điểm kí gửi ReHome"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="relative z-10 rounded-2xl bg-white/[0.07] border border-white/10 p-3.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-white/75">
                        <span>Giá bán thống nhất tại quầy</span>
                        <span className="font-bold text-white tabular-nums">
                          {formatCurrencyVND(500000)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-white/75">
                        <span>Phí kiểm định &amp; bán hộ trọn gói (10%)</span>
                        <span className="font-bold text-white tabular-nums">
                          -{formatCurrencyVND(50000)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Thanh QR tải nhanh tích hợp gọn gàng dưới khung trình diễn */}
              <div className="mt-3 px-3.5 py-2.5 rounded-2xl bg-[#F6F9F4] border border-[#071D12]/[0.06] flex items-center justify-between gap-3">
                <a
                  href={APK_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="hero-qr-link"
                  title="Quét bằng Android để tải ReHome APK"
                  className="flex items-center gap-3 min-w-0 group"
                >
                  <span className="w-11 h-11 rounded-xl bg-white p-1 border border-[#071D12]/10 shrink-0 shadow-sm group-hover:border-[#006B2C] transition-colors">
                    <img
                      src={apkQrUrl}
                      alt="Mã QR tải ReHome APK"
                      className="w-full h-full object-contain block"
                    />
                  </span>
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-bold text-[#071D12] group-hover:text-[#006B2C] transition-colors truncate">
                      Quét QR tải ReHome APK
                    </p>
                    <p className="text-[11px] font-medium text-[#46564C] truncate">
                      Bản {APP_METADATA.platform} v{APP_METADATA.version} miễn phí
                    </p>
                  </div>
                </a>

                <button
                  type="button"
                  onClick={() => onOpenInfoModal?.('install')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-[#006B2C] border border-[#071D12]/10 hover:border-[#006B2C] text-xs font-bold text-[#071D12] hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Cài đặt</span>
                  <ArrowRightIcon className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
