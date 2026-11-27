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
    <footer className="bg-[#F6F9F4] text-[#071D12] border-t border-[#071D12]/[0.08] pt-14 sm:pt-16 pb-10">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 space-y-12">
        <div className="grid md:grid-cols-12 gap-10 items-start">
          {/* Cột trái: Logo + email hỗ trợ + mô tả ngắn */}
          <div className="md:col-span-5 space-y-4">
            <Logo size="sm" to="/landing" className="[&_span]:whitespace-nowrap" />

            <p className="text-xs sm:text-sm text-[#46564C] leading-relaxed max-w-sm">
              Nền tảng thời trang tuần hoàn kết hợp thử đồ AI qua camera, kiểm định 6 bước tại điểm kí gửi
              và thiện nguyện xác minh pháp lý.
            </p>

            <div>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-[#071D12]/10 hover:border-[#006B2C] text-xs font-semibold text-[#071D12] transition-colors"
              >
                <MailIcon className="w-3.5 h-3.5 text-[#006B2C] shrink-0" />
                <span>{FOOTER_CONTACT.email}</span>
                {copiedEmail ? (
                  <span className="inline-flex items-center gap-1 text-[#006B2C] font-bold">
                    <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Đã sao chép!</span>
                  </span>
                ) : (
                  <CopyIcon className="w-3.5 h-3.5 text-[#46564C] shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* Cột phải: 3 cột liên kết rõ ràng */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#46564C]">
                Ứng dụng
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm">
                <li>
                  <a
                    href={APK_DOWNLOAD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#071D12]/80 hover:text-[#006B2C] transition-colors"
                  >
                    Android APK
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenInfoModal?.('install')}
                    className="font-semibold text-[#071D12]/80 hover:text-[#006B2C] transition-colors text-left"
                  >
                    Hướng dẫn cài đặt
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#46564C]">
                Minh bạch
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm">
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenInfoModal?.('about')}
                    className="font-semibold text-[#071D12]/80 hover:text-[#006B2C] transition-colors text-left"
                  >
                    Giới thiệu
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenInfoModal?.('inspection')}
                    className="font-semibold text-[#071D12]/80 hover:text-[#006B2C] transition-colors text-left"
                  >
                    Kiểm định 6 bước
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenInfoModal?.('consignment')}
                    className="font-semibold text-[#071D12]/80 hover:text-[#006B2C] transition-colors text-left"
                  >
                    Quy chế ký gửi 90%
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenInfoModal?.('policy')}
                    className="font-semibold text-[#071D12]/80 hover:text-[#006B2C] transition-colors text-left"
                  >
                    Chính sách &amp; Bảo mật
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-3 col-span-2 sm:col-span-1">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#46564C]">
                Liên hệ
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm">
                <li>
                  <a
                    href={`mailto:${FOOTER_CONTACT.email}`}
                    className="font-semibold text-[#071D12]/80 hover:text-[#006B2C] transition-colors"
                  >
                    {FOOTER_CONTACT.email}
                  </a>
                </li>
                <li className="text-xs font-medium text-[#46564C] tabular-nums">
                  Hotline: {FOOTER_CONTACT.hotline}
                </li>
                <li className="text-xs font-medium text-[#46564C] leading-relaxed">
                  TP.HCM · Hà Nội · Đà Nẵng
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Thanh chân trang gọn nhẹ thay cho watermark phóng đại */}
        <div className="pt-6 border-t border-[#071D12]/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#46564C]">
          <p className="font-medium tabular-nums">
            © {new Date().getFullYear()} ReHome · {APP_METADATA.platform} v{APP_METADATA.version}
          </p>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#071D12]/45">
            WEAR AGAIN · LIVE GREEN
          </p>
        </div>
      </div>
    </footer>
  );
}
