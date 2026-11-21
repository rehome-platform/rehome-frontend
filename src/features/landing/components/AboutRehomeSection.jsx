import React from 'react';
import heroEditorialUrl from '../assets/hero-editorial.jpg';
import { ABOUT_PILLARS, APK_DOWNLOAD_URL, ECOSYSTEM_ROLES } from '../constants/landingConstants.js';
import { AndroidIcon, CheckCircleIcon, ShieldCheckIcon } from './LandingIcons.jsx';

export default function AboutRehomeSection() {
  return (
    <section
      id="about"
      className="relative overflow-hidden py-20 sm:py-24 bg-[#F6F9F4] border-b border-[#DDE5D9]"
    >
      <div
        aria-hidden="true"
        className="landing-editorial-grid absolute inset-0 opacity-45 pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Cột trái: Hình ảnh Editorial & Tuyên ngôn thương hiệu */}
          <div className="lg:col-span-5 min-w-0 reveal-section">
            <div className="relative rounded-[2rem] overflow-hidden border border-white shadow-elevated bg-[#062B19]">
              <img
                src={heroEditorialUrl}
                alt="Câu chuyện thời trang tuần hoàn ReHome"
                loading="lazy"
                className="w-full h-72 sm:h-96 object-cover opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#041E12] via-[#041E12]/45 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-6 text-white space-y-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEA619] text-[#1F2A37] text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap">
                  <ShieldCheckIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Sứ mệnh ReHome</span>
                </span>
                <p className="text-lg sm:text-xl font-extrabold leading-snug">
                  “Mỗi món đồ đẹp xứng đáng nhiều hơn một vòng đời trong tủ quần áo.”
                </p>
                <p className="text-xs text-white/80 leading-relaxed">
                  ReHome được xây dựng tại Việt Nam để kết nối tủ đồ thừa thành món hời chuẩn gu,
                  nguồn thu nhập minh bạch và những phần quà ấm áp cho cộng đồng.
                </p>
              </div>
            </div>
          </div>

          {/* Cột phải: Câu chuyện & 3 giá trị khác biệt */}
          <div className="lg:col-span-7 min-w-0 space-y-6">
            <div className="space-y-3 reveal-section">
              <span className="inline-block px-3.5 py-1 rounded-full bg-white border border-[#DDE5D9] text-[#006B2C] text-xs font-bold uppercase tracking-wider">
                Về chúng tôi · Câu chuyện ReHome
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1F2A37] leading-[1.16]">
                Từ tủ đồ bị lãng quên đến hệ sinh thái{' '}
                <span className="text-[#006B2C]">Thời trang – AI – Thiện nguyện</span>
              </h2>
              <p className="text-sm sm:text-base text-[#5B6776] leading-relaxed">
                Người Việt bỏ lỡ hàng triệu trang phục còn rất mới mỗi năm vì ngại đăng bán lặt vặt,
                còn người muốn mua đồ secondhand lại ngại không được mặc thử và sợ hàng kém chất
                lượng. ReHome sinh ra để giải quyết trọn vẹn cả hai đầu bằng công nghệ AI và mạng
                lưới điểm ký gửi kiểm định thực tế.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {ABOUT_PILLARS.map((pillar) => (
                <article
                  key={pillar.id}
                  className="about-card min-w-0 rounded-2xl bg-white border border-[#DDE5D9] p-4 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between gap-2.5"
                >
                  <div className="space-y-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#006B2C] text-[10px] font-bold uppercase tracking-wide whitespace-nowrap">
                      {pillar.badge}
                    </span>
                    <h3 className="text-sm font-bold text-[#1F2A37] leading-snug">
                      {pillar.title}
                    </h3>
                    <p className="text-xs text-[#5B6776] leading-relaxed">{pillar.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        {/* Hệ sinh thái 3 vai trò khép kín trong 1 ứng dụng */}
        <div className="rounded-3xl bg-white border border-[#DDE5D9] p-6 sm:p-8 shadow-card space-y-5 reveal-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-[#1F2A37]">
                Một nền tảng — Lợi ích trọn vẹn cho cả 3 phía
              </h3>
              <p className="text-xs sm:text-sm text-[#5B6776] mt-0.5">
                Tất cả vận hành liền mạch trên ứng dụng ReHome Android và hệ thống kiểm định tại kho.
              </p>
            </div>
            <a
              href={APK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-btn-shine inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#006B2C] hover:bg-[#005523] text-white text-xs sm:text-sm font-bold shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              <AndroidIcon className="w-4 h-4 shrink-0" />
              <span>Trải nghiệm ReHome trên Android</span>
            </a>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {ECOSYSTEM_ROLES.map((item) => (
              <div
                key={item.role}
                className="rounded-2xl bg-[#F6F9F4] border border-[#DDE5D9] p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold text-[#1F2A37]">{item.role}</span>
                  <CheckCircleIcon className="w-4 h-4 text-[#006B2C] shrink-0" />
                </div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-white border border-[#DDE5D9] text-[11px] font-bold text-[#00685F] whitespace-nowrap">
                  {item.highlight}
                </span>
                <p className="text-xs text-[#5B6776] leading-relaxed">{item.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
