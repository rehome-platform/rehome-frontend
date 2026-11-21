import React from 'react';
import Logo from '../../../components/common/Logo.jsx';
import { APK_DOWNLOAD_URL, APP_METADATA, NAV_LINKS } from '../constants/landingConstants.js';
import { AndroidIcon, DownloadIcon } from './LandingIcons.jsx';

export default function LandingFooter() {
  return (
    <footer className="bg-white border-t border-[#DDE5D9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-12 gap-8 items-start pb-10 border-b border-[#DDE5D9]">
          <div className="md:col-span-5 space-y-3.5">
            <Logo size="sm" to="/landing" subtitle="Thời trang tuần hoàn & Thiện nguyện" />
            <p className="text-sm text-[#5B6776] leading-relaxed max-w-md">
              Nền tảng ký gửi quần áo cũ có kiểm định tại kho, thử đồ AI và kết nối chiến dịch
              thiện nguyện từ các tổ chức đã xác minh.
            </p>
            <div className="inline-flex flex-wrap items-center gap-2 text-xs text-[#5B6776] bg-[#F6F9F4] border border-[#DDE5D9] rounded-full px-3.5 py-1.5">
              <span>Android v{APP_METADATA.version}</span>
              <span>•</span>
              <code className="font-semibold text-[#1F2A37]">{APP_METADATA.packageName}</code>
            </div>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2A37]">
              Khám phá nhanh
            </h3>
            <ul className="space-y-2">
              {NAV_LINKS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-sm text-[#5B6776] hover:text-[#006B2C] transition-colors whitespace-nowrap"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2A37]">
              Tải ứng dụng Android
            </h3>
            <div className="flex flex-col gap-2.5">
              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-btn-shine inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#006B2C] hover:bg-[#005523] text-white text-sm font-bold transition-colors shadow-sm whitespace-nowrap shrink-0"
              >
                <AndroidIcon className="w-4 h-4 shrink-0" />
                <span>Tải ReHome APK (Google Drive)</span>
              </a>
              <a
                href="#install-guide"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-[#DDE5D9] bg-[#F6F9F4] hover:bg-[#EBF1E8] text-[#1F2A37] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <DownloadIcon className="w-4 h-4 text-[#006B2C] shrink-0" />
                <span>Hướng dẫn cài APK (4 bước)</span>
              </a>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#5B6776]">
          <span>© {new Date().getFullYear()} ReHome Platform. Thời trang tuần hoàn bền vững.</span>
          <span>Ứng dụng ReHome dành cho Thành viên &amp; Tổ chức thiện nguyện trên Android.</span>
        </div>
      </div>
    </footer>
  );
}
