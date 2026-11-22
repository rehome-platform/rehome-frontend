import React, { useEffect, useState } from 'react';
import apkQrUrl from '../assets/apk-qr.svg';
import { APK_DOWNLOAD_URL, APP_METADATA, INSTALL_STEPS } from '../constants/landingConstants.js';
import { updateSpotlightCoords } from '../utils/spotlight.js';
import {
  AndroidIcon,
  CheckCircleIcon,
  CopyIcon,
  DownloadIcon,
  ShieldCheckIcon,
} from './LandingIcons.jsx';

export default function ApkDownloadSection({ onOpenInfoModal }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopyLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(APK_DOWNLOAD_URL);
        setCopied(true);
      }
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="download" className="scroll-mt-20 bg-[#F6F9F4] py-16 sm:py-24">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 space-y-8">
        {/* Thẻ tải APK chính tông Emerald tối chỉn chu */}
        <div
          onPointerMove={updateSpotlightCoords}
          className="landing-spotlight-card editorial-reveal relative overflow-hidden rounded-[28px] bg-[#071D12] text-white p-7 sm:p-10 lg:p-12 border border-[#071D12]"
        >
          <div
            aria-hidden="true"
            className="landing-dot-grid absolute inset-0 pointer-events-none"
          />

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
            <div className="lg:col-span-8 min-w-0 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-white whitespace-nowrap max-w-full">
                <AndroidIcon className="w-4 h-4 text-[#FEA619] shrink-0" />
                <span>
                  {APP_METADATA.platform} · v{APP_METADATA.version} ·{' '}
                  {APP_METADATA.distributionLabel}
                </span>
              </div>

              <h2 className="landing-text-balance text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-[-0.02em] leading-[1.15]">
                Tải ReHome cho Android và bắt đầu ngay
              </h2>

              <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-2xl">
                Cài đặt trực tiếp bản phát hành từ Google Drive chính thức để trải nghiệm thử đồ AI
                qua camera, theo dõi đơn ký gửi và đóng góp thiện nguyện minh bạch.
              </p>

              <div className="flex flex-wrap gap-2 text-xs text-white/90">
                <span className="px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/10 font-medium">
                  {APP_METADATA.packageName}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/10 font-medium">
                  {APP_METADATA.minAndroid}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/10 font-medium">
                  Play Protect an toàn
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-1">
                <a
                  href={APK_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="install-apk-cta"
                  className="landing-btn-shine inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#FEA619] hover:bg-[#E59412] text-[#071D12] font-bold text-sm transition-colors whitespace-nowrap shrink-0"
                >
                  <DownloadIcon className="w-4 h-4 shrink-0" />
                  <span>Tải APK từ Google Drive</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <>
                      <CheckCircleIcon className="w-4 h-4 text-[#FEA619] shrink-0" />
                      <span>Đã sao chép!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-4 h-4 shrink-0" />
                      <span>Sao chép liên kết</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Khung mã QR tinh gọn */}
            <div className="lg:col-span-4 min-w-0 flex justify-center lg:justify-end">
              <div className="w-full max-w-[248px] rounded-2xl bg-white text-[#071D12] p-5 text-center space-y-3 shadow-lg">
                <div className="relative rounded-xl bg-[#F6F9F4] border border-[#071D12]/[0.08] p-3">
                  <span
                    aria-hidden="true"
                    className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-[#006B2C] rounded-tl"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-[#006B2C] rounded-tr"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-[#006B2C] rounded-bl"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-[#006B2C] rounded-br"
                  />
                  <img
                    src={apkQrUrl}
                    alt="Mã QR tải tệp APK ReHome trên Google Drive"
                    className="w-36 h-36 mx-auto block"
                  />
                </div>
                <p className="text-xs font-bold text-[#071D12]">Quét bằng camera Android</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4 bước cài đặt gọn gàng */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INSTALL_STEPS.map((item) => (
            <article
              key={item.step}
              className="rounded-2xl bg-white border border-[#071D12]/10 p-5 space-y-2.5"
            >
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[#EBF1E8] text-[#006B2C] text-xs font-extrabold tabular-nums">
                {item.step}
              </span>
              <h3 className="text-sm font-bold text-[#071D12] leading-snug">{item.title}</h3>
              <p className="text-xs text-[#46564C] leading-relaxed">{item.description}</p>
            </article>
          ))}
        </div>

        {/* Thanh trấn an Play Protect */}
        <div className="rounded-2xl bg-[#EBF1E8] border border-[#071D12]/[0.08] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs sm:text-sm text-[#071D12]">
            <ShieldCheckIcon className="w-5 h-5 text-[#006B2C] shrink-0" />
            <span>
              <strong className="font-bold">Play Protect:</strong> chọn{' '}
              <span className="font-semibold">Vẫn cài đặt (Install anyway)</span> nếu Android hiển
              thị nhắc nguồn ngoài cho bản ReHome v{APP_METADATA.version}.
            </span>
          </div>

          {onOpenInfoModal && (
            <button
              type="button"
              onClick={() => onOpenInfoModal('install')}
              className="px-4 py-2 rounded-xl bg-white hover:bg-[#006B2C] border border-[#071D12]/10 hover:border-[#006B2C] text-xs font-bold text-[#071D12] hover:text-white transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              Xem hướng dẫn chi tiết
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
