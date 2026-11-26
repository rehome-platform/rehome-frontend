import React, { useEffect, useState } from 'react';
import Logo from '../../../components/common/Logo.jsx';
import apkQrUrl from '../assets/apk-qr.svg';
import {
  APK_DOWNLOAD_URL,
  APP_METADATA,
  LANDING_NAV_ITEMS,
} from '../constants/landingConstants.js';
import { AndroidIcon, CameraIcon, CloseIcon, MenuIcon } from './LandingIcons.jsx';

export default function LandingNavbar({ onOpenInfoModal, hasProducts = true }) {
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

  const visibleNavItems = hasProducts
    ? LANDING_NAV_ITEMS
    : LANDING_NAV_ITEMS.filter((item) => item.id !== 'drops');

  const handleOpenModalFromDrawer = (tab) => {
    setMobileOpen(false);
    onOpenInfoModal?.(tab);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          mobileOpen
            ? 'bg-[#F6F9F4]/95 backdrop-blur-lg border-b border-[#071D12]/[0.08]'
            : scrolled
              ? 'bg-[#F6F9F4]/92 backdrop-blur-md border-b border-[#071D12]/[0.08]'
              : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between gap-4">
          <Logo size="sm" to="/landing" className="shrink-0 [&_span]:whitespace-nowrap" />

          <nav aria-label="Điều hướng trang giới thiệu" className="hidden md:flex items-center gap-1">
            {visibleNavItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className="px-3.5 py-1.5 rounded-full text-sm font-semibold text-[#46564C] hover:text-[#071D12] hover:bg-[#071D12]/[0.04] transition-colors whitespace-nowrap"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenInfoModal?.('inspection')}
              className="hidden lg:inline-flex items-center justify-center px-3.5 py-2 rounded-full text-sm font-semibold text-[#46564C] hover:text-[#071D12] hover:bg-[#071D12]/[0.05] transition-colors whitespace-nowrap"
            >
              Quy chuẩn
            </button>

            <div className="hidden sm:block relative group">
              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="navbar-download-trigger"
                className="landing-btn-shine inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-[#006B2C] hover:bg-[#005523] text-white text-sm font-bold shadow-[0_8px_20px_-8px_rgba(0,107,44,0.55)] transition-colors whitespace-nowrap"
              >
                <AndroidIcon className="w-4 h-4 shrink-0" />
                <span>Tải APK</span>
              </a>

              <div
                data-testid="navbar-qr-popover"
                className="invisible opacity-0 scale-95 group-hover:visible group-hover:opacity-100 group-hover:scale-100 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:scale-100 origin-top-right transition-all duration-200 absolute right-0 top-full pt-2.5 z-50"
              >
                <div className="w-60 rounded-2xl bg-white border border-[#071D12]/10 p-4 shadow-[0_24px_48px_-12px_rgba(7,29,18,0.18)] text-center space-y-2.5">
                  <a
                    href={APK_DOWNLOAD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative rounded-xl overflow-hidden bg-[#F6F9F4] border border-[#071D12]/[0.06] p-2.5"
                  >
                    <img
                      src={apkQrUrl}
                      alt="Mã QR tải ứng dụng ReHome APK"
                      className="w-36 h-36 mx-auto rounded-lg block"
                    />
                  </a>

                  <div className="space-y-0.5">
                    <p className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#071D12]">
                      <CameraIcon className="w-3.5 h-3.5 text-[#006B2C] shrink-0" />
                      <span>Quét tải ReHome APK</span>
                    </p>
                    <p className="text-[11px] font-medium text-[#46564C]">
                      {APP_METADATA.platform} · v{APP_METADATA.version}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenInfoModal?.('install')}
                    className="text-[11px] font-semibold text-[#006B2C] hover:text-[#005523] underline-offset-4 hover:underline"
                  >
                    Hướng dẫn cài 4 bước
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full text-[#071D12] hover:bg-[#071D12]/[0.06] transition-colors shrink-0"
            >
              {mobileOpen ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div
          data-testid="mobile-nav-overlay"
          className="md:hidden fixed inset-x-0 top-[72px] bottom-0 z-40 bg-[#F6F9F4]/98 backdrop-blur-lg px-6 py-8 flex flex-col justify-between border-t border-[#071D12]/[0.08]"
        >
          <nav aria-label="Điều hướng di động" className="flex flex-col gap-2">
            {visibleNavItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="w-full px-4 py-3 rounded-xl text-base font-bold text-[#071D12] hover:text-[#006B2C] hover:bg-white transition-colors"
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => handleOpenModalFromDrawer('inspection')}
              className="w-full px-4 py-3 rounded-xl text-left text-base font-bold text-[#46564C] hover:text-[#006B2C] hover:bg-white transition-colors"
            >
              Trung tâm minh bạch
            </button>
          </nav>

          <div className="pt-4 border-t border-[#071D12]/10 space-y-2.5">
            <a
              href={APK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="landing-btn-shine w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#006B2C] hover:bg-[#005523] text-white text-sm font-bold shadow-[0_14px_30px_-10px_rgba(0,107,44,0.45)] transition-colors"
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
