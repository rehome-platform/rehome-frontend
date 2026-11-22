import React, { useEffect, useState } from 'react';
import Logo from '../../../components/common/Logo.jsx';
import apkQrUrl from '../assets/apk-qr.svg';
import { APK_DOWNLOAD_URL, LANDING_NAV_ITEMS } from '../constants/landingConstants.js';
import { AndroidIcon, CameraIcon, CloseIcon } from './LandingIcons.jsx';

export default function LandingNavbar({ onOpenInfoModal }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 16);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleModalNavClick = (modalTab) => {
    setMobileOpen(false);
    onOpenInfoModal?.(modalTab);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          mobileOpen
            ? 'bg-[#F6F9F2]/95 backdrop-blur-lg'
            : scrolled
              ? 'bg-[#F6F9F2]/80 backdrop-blur-md'
              : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1220px] mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between gap-4">
          <Logo size="sm" to="/landing" className="shrink-0 [&_span]:whitespace-nowrap" />

          <nav aria-label="Điều hướng trang giới thiệu" className="hidden md:flex items-center gap-1">
            {LANDING_NAV_ITEMS.map((item) =>
              item.type === 'anchor' ? (
                <a
                  key={item.id}
                  href={item.href}
                  className="px-3.5 py-1.5 rounded-full text-[15px] font-bold text-[#0D2419]/70 hover:text-[#0D2419] transition-colors whitespace-nowrap"
                >
                  {item.label}
                </a>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenInfoModal?.(item.modalTab)}
                  className="px-3.5 py-1.5 rounded-full text-[15px] font-bold text-[#0D2419]/70 hover:text-[#0D2419] transition-colors whitespace-nowrap"
                >
                  {item.label}
                </button>
              )
            )}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {/* Pill "Tải App" rê chuột tự bung thẻ QR ngay tại chỗ kiểu Locket */}
            <div className="hidden sm:block relative group">
              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="navbar-download-trigger"
                className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-[#0D2419]/[0.08] hover:bg-[#0D2419]/[0.14] text-[#0D2419] text-sm font-bold transition-colors whitespace-nowrap"
              >
                Tải App
              </a>

              <div
                data-testid="navbar-qr-popover"
                className="invisible opacity-0 scale-95 group-hover:visible group-hover:opacity-100 group-hover:scale-100 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:scale-100 origin-top-right transition-all duration-200 absolute right-0 top-full pt-2.5 z-50"
              >
                <div className="w-56 rounded-[28px] bg-white p-4 shadow-[0_20px_50px_rgba(13,36,25,0.16)] text-center space-y-2.5">
                  <a
                    href={APK_DOWNLOAD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative rounded-2xl overflow-hidden bg-[#F6F9F2] p-2"
                  >
                    <img
                      src={apkQrUrl}
                      alt="Mã QR tải ứng dụng ReHome APK"
                      className="w-40 h-40 mx-auto rounded-xl block"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <span className="w-8 h-8 rounded-lg bg-[#0D2419] text-white flex items-center justify-center shadow-sm border-2 border-white">
                        <CameraIcon className="w-4 h-4" />
                      </span>
                    </span>
                  </a>

                  <p className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#0D2419]">
                    <CameraIcon className="w-3.5 h-3.5 text-[#006B2C] shrink-0" />
                    <span>Quét tải ReHome APK</span>
                  </p>

                  <div>
                    <button
                      type="button"
                      onClick={() => onOpenInfoModal?.('install')}
                      className="text-[11px] font-semibold text-[#0D2419]/70 hover:text-[#006B2C] underline-offset-4 hover:underline"
                    >
                      Cách cài APK (4 bước)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full text-[#0D2419] hover:bg-[#0D2419]/[0.06] transition-colors shrink-0"
            >
              {mobileOpen ? (
                <CloseIcon className="w-5 h-5" />
              ) : (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" d="M5 9.5h14M5 14.5h14" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div
          data-testid="mobile-nav-overlay"
          className="md:hidden fixed inset-x-0 top-[72px] bottom-0 z-40 bg-[#F6F9F2]/95 backdrop-blur-lg px-6 py-8 flex flex-col justify-between"
        >
          <nav aria-label="Điều hướng di động" className="flex flex-col items-center gap-3 pt-4">
            {LANDING_NAV_ITEMS.map((item) =>
              item.type === 'anchor' ? (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="w-full max-w-xs py-3 rounded-2xl text-center text-lg font-bold text-[#0D2419]/80 hover:text-[#006B2C] hover:bg-[#006B2C]/[0.06] transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleModalNavClick(item.modalTab)}
                  className="w-full max-w-xs py-3 rounded-2xl text-center text-lg font-bold text-[#0D2419]/80 hover:text-[#006B2C] hover:bg-[#006B2C]/[0.06] transition-colors"
                >
                  {item.label}
                </button>
              )
            )}
          </nav>

          <div className="max-w-xs w-full mx-auto pb-4">
            <a
              href={APK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="landing-btn-shine w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-[#006B2C] hover:bg-[#005523] text-white text-base font-bold shadow-[0_14px_30px_-8px_rgba(0,107,44,0.4)] transition-colors"
            >
              <AndroidIcon className="w-5 h-5 shrink-0" />
              <span>Tải ReHome APK</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
}
