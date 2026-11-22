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

export default function ApkInstallSection({ onOpenInfoModal }) {
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
    <section id="install-guide" className="relative overflow-hidden py-20 sm:py-24 bg-[#F6F9F4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Khối Flagship Dark Emerald + Aurora Orbs + Spotlight + Thẻ QR */}
        <div
          onPointerMove={updateSpotlightCoords}
          className="landing-spotlight-card relative overflow-hidden rounded-[2rem] bg-[#042414] bg-gradient-to-br from-[#042414] via-[#063A1F] to-[#005A26] text-white p-5 sm:p-10 lg:p-12 shadow-elevated reveal-section"
        >
          <div
            aria-hidden="true"
            className="landing-dot-grid absolute inset-0 pointer-events-none"
          />
          {/* Hai quầng sáng aurora nền */}
          <div
            aria-hidden="true"
            className="landing-orb-float absolute -top-20 -left-20 w-72 h-72 rounded-full bg-[#10B981]/15 blur-3xl pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="landing-orb-float-slow absolute -bottom-24 right-[15%] w-80 h-80 rounded-full bg-[#FEA619]/15 blur-3xl pointer-events-none"
          />

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
            <div className="lg:col-span-8 min-w-0 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-white whitespace-nowrap max-w-full">
                <AndroidIcon className="w-4 h-4 text-[#FEA619] shrink-0" />
                <span>
                  {APP_METADATA.platform} • Phiên bản {APP_METADATA.version}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-[1.18]">
                Tải ứng dụng ReHome APK cho Android
              </h2>

              <p className="text-sm sm:text-base text-white/85 leading-relaxed max-w-2xl">
                Cài đặt trực tiếp bản phát hành chính thức từ thư mục Google Drive của đội ngũ phát
                triển ReHome để trải nghiệm ký gửi kiểm định tại kho, thử đồ AI và đóng góp thiện
                nguyện.
              </p>

              <div className="flex flex-wrap gap-2.5 text-xs text-white/90">
                <span className="max-w-full px-3.5 py-1.5 rounded-full bg-black/25 border border-white/10 font-medium sm:whitespace-nowrap">
                  Mã gói: <strong className="text-white">{APP_METADATA.packageName}</strong>
                </span>
                <span className="max-w-full px-3.5 py-1.5 rounded-full bg-black/25 border border-white/10 font-medium sm:whitespace-nowrap">
                  Yêu cầu: <strong className="text-white">{APP_METADATA.minAndroid}</strong>
                </span>
                <span className="max-w-full px-3.5 py-1.5 rounded-full bg-black/25 border border-white/10 font-medium sm:whitespace-nowrap">
                  Nguồn: <strong className="text-white">{APP_METADATA.distributionLabel}</strong>
                </span>
              </div>

              {/* Cụm CTA 1 dòng tuyệt đối không xuống dòng */}
              <div className="space-y-2.5 pt-2">
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
                  <a
                    href={APK_DOWNLOAD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="install-apk-cta"
                    className="landing-btn-shine inline-flex items-center justify-center gap-2.5 px-5 sm:px-6 py-4 rounded-2xl bg-[#FEA619] hover:bg-[#E59412] text-[#1F2A37] font-bold text-sm sm:text-base shadow-elevated transition-all hover:-translate-y-0.5 whitespace-nowrap shrink-0"
                  >
                    <DownloadIcon className="w-5 h-5 shrink-0" />
                    <span>Tải tệp APK từ Google Drive</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm sm:text-base font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    {copied ? (
                      <>
                        <CheckCircleIcon className="w-4 h-4 text-[#FEA619] shrink-0" />
                        <span>Đã sao chép!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="w-4 h-4 shrink-0" />
                        <span>Sao chép liên kết tải</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-white/75">
                  Đang mở trên máy tính? Sao chép link gửi sang điện thoại Android hoặc quét mã QR.
                </p>
              </div>
            </div>

            {/* Thẻ mã QR với 4 góc scanner & tia quét mượt */}
            <div className="lg:col-span-4 min-w-0 flex justify-center lg:justify-end">
              <div className="w-full max-w-[268px] rounded-3xl bg-white text-[#1F2A37] p-5 shadow-2xl border border-white/40 text-center space-y-3">
                <div className="relative overflow-hidden rounded-2xl bg-[#F6F9F4] border border-[#DDE5D9] p-3.5">
                  {/* 4 góc khung quét camera */}
                  <span
                    aria-hidden="true"
                    className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#006B2C] rounded-tl-md"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#006B2C] rounded-tr-md"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#006B2C] rounded-bl-md"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#006B2C] rounded-br-md"
                  />

                  <img
                    src={apkQrUrl}
                    alt="Mã QR tải tệp APK ReHome trên Google Drive"
                    className="w-40 h-40 mx-auto block relative z-10"
                  />
                  <div aria-hidden="true" className="landing-scan-beam z-20" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1F2A37]">Quét bằng camera Android</p>
                  <p className="text-xs text-[#5B6776] mt-0.5 leading-snug">
                    Mở nhanh liên kết Google Drive trên điện thoại để tải APK
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hướng dẫn cài đặt APK ngắn gọn 4 bước dạng Stepper */}
        <div className="space-y-8">
          <div className="space-y-2.5 reveal-section">
            <span className="inline-block px-3.5 py-1 rounded-full bg-white border border-[#DDE5D9] text-[#006B2C] text-xs font-bold uppercase tracking-wider">
              Hướng dẫn nhanh
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-[#1F2A37] leading-snug">
              Hướng dẫn cài đặt tệp APK trên Android{' '}
              <span className="inline-block whitespace-nowrap">(4 bước ngắn gọn)</span>
            </h3>
            <p className="text-sm sm:text-base text-[#5B6776]">
              Vì tệp cài đặt được tải trực tiếp từ Google Drive, thiết bị Android chỉ cần xác nhận
              quyền cài đặt một lần duy nhất:
            </p>
          </div>

          <div className="relative">
            {/* Đường nối ngang trên màn hình lớn */}
            <div
              aria-hidden="true"
              className="hidden lg:block absolute top-11 left-[12%] right-[12%] h-px bg-[#DDE5D9]"
            />

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 relative">
              {INSTALL_STEPS.map((item) => (
                <article
                  key={item.step}
                  className="install-step-card rounded-3xl bg-white border border-[#DDE5D9] p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5 flex flex-col gap-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="relative z-10 inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#006B2C] text-white text-xs font-extrabold shadow-sm">
                      {item.step}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#F6F9F4] border border-[#DDE5D9] text-[11px] font-semibold text-[#5B6776] whitespace-nowrap">
                      Android
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-[#1F2A37] leading-snug">{item.title}</h4>
                  <p className="text-xs sm:text-sm text-[#5B6776] leading-relaxed">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[#EBF1E8] border border-[#DDE5D9] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 reveal-section">
            <div className="flex items-center gap-3 text-xs sm:text-sm text-[#1F2A37]">
              <ShieldCheckIcon className="w-5 h-5 text-[#006B2C] shrink-0" />
              <span>
                <strong className="font-bold">Play Protect:</strong> chọn{' '}
                <span className="font-semibold">Vẫn cài đặt (Install anyway)</span> cho ReHome v
                {APP_METADATA.version}.
              </span>
            </div>
            {onOpenInfoModal && (
              <button
                type="button"
                onClick={() => onOpenInfoModal('install')}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#006B2C] text-[#006B2C] hover:text-white border border-[#DDE5D9] text-xs font-bold transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
              >
                Xem hướng dẫn chi tiết
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
