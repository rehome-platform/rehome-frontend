import React from 'react';
import { ClockIcon, ExternalLinkIcon, MapPinIcon } from './LandingIcons.jsx';

function buildMapsUrl(warehouse) {
  const lat = warehouse?.latitude;
  const lng = warehouse?.longitude;
  if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  }
  const query = warehouse?.address || warehouse?.name || 'ReHome';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function WarehousesSection({ warehouses = [], loading = false }) {
  const gridColsClass =
    warehouses.length === 1
      ? 'grid-cols-1 max-w-xl'
      : warehouses.length === 2
      ? 'md:grid-cols-2'
      : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section
      id="warehouses"
      className="relative overflow-hidden py-20 sm:py-24 bg-[#F6F9F4] border-b border-[#DDE5D9]"
    >
      <div
        aria-hidden="true"
        className="landing-editorial-grid absolute inset-0 opacity-55 pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-9">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl space-y-3">
            <span className="inline-block px-3.5 py-1 rounded-full bg-white border border-[#DDE5D9] text-[#00685F] text-xs font-bold uppercase tracking-wider">
              Mạng lưới tiếp nhận
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1F2A37]">
              Điểm ký gửi &amp; kiểm định ReHome
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#5B6776] max-w-md leading-relaxed">
            Mang sản phẩm đã đăng ký trên ứng dụng đến trực tiếp điểm ký gửi gần bạn để kiểm định
            tại quầy và kích hoạt bán hàng tuần hoàn.
          </p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="rounded-3xl bg-white border border-[#DDE5D9] p-6 h-48 animate-pulse"
              />
            ))}
          </div>
        ) : warehouses.length > 0 ? (
          <div className={`grid gap-6 ${gridColsClass}`}>
            {warehouses.map((wh) => (
              <article
                key={wh.id}
                className="warehouse-card group rounded-3xl bg-white border border-[#DDE5D9] p-6 sm:p-7 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between gap-5"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <span className="w-11 h-11 rounded-2xl bg-[#E8F5E9] text-[#006B2C] flex items-center justify-center shrink-0">
                        <MapPinIcon className="w-5 h-5" />
                      </span>
                      <div>
                        <h3 className="text-lg font-bold text-[#1F2A37] leading-snug">{wh.name}</h3>
                        <span className="inline-flex items-center gap-2 mt-1 text-xs font-semibold text-[#006B2C]">
                          <span className="landing-pulse-ring w-2 h-2 rounded-full bg-[#006B2C] text-[#006B2C]" />
                          Đang hoạt động
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#F6F9F4] border border-[#DDE5D9]/80 p-4 space-y-2.5">
                    {wh.address && (
                      <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#1F2A37] leading-relaxed">
                        <MapPinIcon className="w-4 h-4 text-[#006B2C] shrink-0 mt-0.5" />
                        <span>{wh.address}</span>
                      </div>
                    )}

                    {wh.openingHours && (
                      <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#5B6776]">
                        <ClockIcon className="w-4 h-4 text-[#00685F] shrink-0 mt-0.5" />
                        <span>Giờ mở cửa: {wh.openingHours}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <a
                    href={buildMapsUrl(wh)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/map inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EBF1E8] hover:bg-[#006B2C] text-[#00685F] hover:text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Chỉ đường Google Maps</span>
                    <ExternalLinkIcon className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover/map:translate-x-0.5" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-white border border-[#DDE5D9] p-10 text-center">
            <p className="text-base font-bold text-[#1F2A37]">
              Thông tin các điểm ký gửi đang được đồng bộ từ hệ thống.
            </p>
            <p className="text-sm text-[#5B6776] mt-1">
              Trên ứng dụng ReHome Android, bạn còn có thể tìm điểm ký gửi gần vị trí hiện tại nhất.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
