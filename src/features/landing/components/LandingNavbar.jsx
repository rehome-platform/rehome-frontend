import React, { useEffect, useState } from 'react';
import Logo from '../../../components/common/Logo.jsx';
import { APK_DOWNLOAD_URL, NAV_LINKS } from '../constants/landingConstants.js';
import { AndroidIcon, CloseIcon, MenuIcon } from './LandingIcons.jsx';

export default function LandingNavbar() {
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

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-md transition-all duration-200 ${
        scrolled
          ? 'bg-white/95 border-[#DDE5D9]/90 shadow-sm'
          : 'bg-[#F6F9F4]/85 border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Logo size="sm" to="/landing" subtitle="Thời trang tuần hoàn" />

        <nav aria-label="Điều hướng trang giới thiệu" className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-3.5 py-1.5 rounded-full text-sm font-medium text-[#5B6776] hover:text-[#006B2C] hover:bg-[#E8F5E9]/70 transition-colors whitespace-nowrap"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-2.5 shrink-0">
          <a
            href="#install-guide"
            className="px-4 py-2 text-sm font-semibold text-[#1F2A37] hover:text-[#006B2C] rounded-full border border-[#DDE5D9] hover:border-[#006B2C]/50 bg-white/90 hover:bg-white transition-colors whitespace-nowrap shrink-0"
          >
            Hướng dẫn cài APK
          </a>
          <a
            href={APK_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="landing-btn-shine inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#006B2C] hover:bg-[#005523] rounded-full shadow-sm transition-all whitespace-nowrap shrink-0"
          >
            <AndroidIcon className="w-4 h-4 shrink-0" />
            <span>Tải APK Android</span>
          </a>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#DDE5D9] bg-white text-[#1F2A37] hover:bg-[#F6F9F4] whitespace-nowrap shrink-0"
        >
          {mobileOpen ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </button>
      </div>

      {/* Thanh tiến trình cuộn trang */}
      <div
        aria-hidden="true"
        className="landing-scroll-progress h-[2.5px] w-full origin-left scale-x-0 bg-gradient-to-r from-[#006B2C] via-[#10B981] to-[#FEA619]"
      />

      {mobileOpen && (
        <div className="lg:hidden border-t border-[#DDE5D9] bg-white px-4 py-4 space-y-3 shadow-card">
          <nav aria-label="Điều hướng di động" className="grid grid-cols-2 gap-2">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-xl text-sm font-medium text-[#1F2A37] hover:bg-[#F6F9F4] hover:text-[#006B2C] whitespace-nowrap"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="pt-2 border-t border-[#DDE5D9] flex flex-col sm:flex-row gap-2.5">
            <a
              href={APK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-btn-shine inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#006B2C] hover:bg-[#005523] rounded-xl whitespace-nowrap shrink-0"
            >
              <AndroidIcon className="w-4 h-4 shrink-0" />
              <span>Tải ReHome APK</span>
            </a>
            <a
              href="#install-guide"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-[#1F2A37] border border-[#DDE5D9] rounded-xl hover:bg-[#F6F9F4] whitespace-nowrap shrink-0"
            >
              Hướng dẫn cài APK
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
