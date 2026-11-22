import React, { useEffect, useState } from 'react';
import Logo from '../../../components/common/Logo.jsx';
import {
  APK_DOWNLOAD_URL,
  APP_METADATA,
  FOOTER_CONTACT,
} from '../constants/landingConstants.js';
import { CheckCircleIcon, CopyIcon, MailIcon } from './LandingIcons.jsx';

export default function LandingFooter({ onOpenInfoModal }) {
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    if (!copiedEmail) return undefined;
    const timer = setTimeout(() => setCopiedEmail(false), 2500);
    return () => clearTimeout(timer);
  }, [copiedEmail]);

  const handleCopyEmail = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(FOOTER_CONTACT.email);
      }
      setCopiedEmail(true);
    } catch {
      setCopiedEmail(true);
    }
  };

  return (
    <footer className="bg-transparent text-[#0D2419] pt-16 sm:pt-24 pb-4 overflow-hidden">
      <div className="max-w-[1220px] mx-auto px-5 sm:px-8">
        <div className="grid md:grid-cols-12 gap-10 items-start">
          {/* Cột trái: Logo + nút copy email + bản quyền */}
          <div className="md:col-span-5 space-y-4">
            <Logo size="sm" to="/landing" className="[&_span]:whitespace-nowrap" />

            <div>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0D2419]/[0.05] hover:bg-[#0D2419]/[0.09] text-xs font-semibold text-[#0D2419]/75 transition-colors"
              >
                <MailIcon className="w-3.5 h-3.5 text-[#006B2C] shrink-0" />
                <span>{FOOTER_CONTACT.email}</span>
                {copiedEmail ? (
                  <span className="inline-flex items-center gap-1 text-[#006B2C] font-bold">
                    <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Đã sao chép!</span>
                  </span>
                ) : (
                  <CopyIcon className="w-3.5 h-3.5 text-[#0D2419]/45 shrink-0" />
                )}
              </button>
            </div>

            <p className="text-xs font-medium text-[#0D2419]/65">
              © {new Date().getFullYear()} ReHome · Android v{APP_METADATA.version}
            </p>
          </div>

          {/* Cột phải: 3 cột link chữ tối giản */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0D2419]/65">
                Tải ứng dụng
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href={APK_DOWNLOAD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#0D2419]/75 hover:text-[#006B2C] transition-colors"
                  >
                    Android APK
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenInfoModal?.('install')}
                    className="font-semibold text-[#0D2419]/75 hover:text-[#006B2C] transition-colors text-left"
                  >
                    Hướng dẫn cài đặt
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0D2419]/65">
                Về ReHome
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenInfoModal?.('about')}
                    className="font-semibold text-[#0D2419]/75 hover:text-[#006B2C] transition-colors text-left"
                  >
                    Giới thiệu
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenInfoModal?.('inspection')}
                    className="font-semibold text-[#0D2419]/75 hover:text-[#006B2C] transition-colors text-left"
                  >
                    Kiểm định 6 bước
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenInfoModal?.('consignment')}
                    className="font-semibold text-[#0D2419]/75 hover:text-[#006B2C] transition-colors text-left"
                  >
                    Quy chế ký gửi 90%
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenInfoModal?.('policy')}
                    className="font-semibold text-[#0D2419]/75 hover:text-[#006B2C] transition-colors text-left"
                  >
                    Chính sách &amp; Bảo mật
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0D2419]/65">
                Kết nối
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href={`mailto:${FOOTER_CONTACT.email}`}
                    className="font-semibold text-[#0D2419]/75 hover:text-[#006B2C] transition-colors"
                  >
                    {FOOTER_CONTACT.email}
                  </a>
                </li>
                <li className="text-xs font-medium text-[#0D2419]/65 leading-relaxed">
                  TP.HCM · Hà Nội · Đà Nẵng
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Watermark cực lớn cuối trang kiểu Locket */}
      <p
        aria-hidden="true"
        className="landing-footer-watermark mt-14 sm:mt-20 px-4 text-center font-bold uppercase tracking-[-0.03em] leading-none select-none whitespace-nowrap text-[clamp(1.25rem,5.4vw,4.8rem)]"
      >
        WEAR AGAIN · LIVE GREEN
      </p>
    </footer>
  );
}
