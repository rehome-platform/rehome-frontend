import React, { useMemo, useState } from 'react';
import heroEditorialUrl from '../assets/hero-editorial.jpg';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import {
  APK_DOWNLOAD_URL,
  CITY_COORDS_PRESETS,
  CONSIGN_EARNING_PRESETS,
  INSPECTION_GRADES,
} from '../constants/landingConstants.js';
import { updateSpotlightCoords } from '../utils/spotlight.js';
import {
  AndroidIcon,
  ArrowRightIcon,
  ClockIcon,
  ExternalLinkIcon,
  LocateIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from './LandingIcons.jsx';

function buildMapsUrl(warehouse) {
  const lat = warehouse?.latitude;
  const lng = warehouse?.longitude;
  if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  }
  const query = warehouse?.address || warehouse?.name || 'ReHome';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  const nLat1 = Number(lat1);
  const nLng1 = Number(lng1);
  const nLat2 = Number(lat2);
  const nLng2 = Number(lng2);
  if (
    !Number.isFinite(nLat1) ||
    !Number.isFinite(nLng1) ||
    !Number.isFinite(nLat2) ||
    !Number.isFinite(nLng2)
  ) {
    return null;
  }
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(nLat2 - nLat1);
  const dLng = toRad(nLng2 - nLng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(nLat1)) *
      Math.cos(toRad(nLat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function formatDistanceLabel(km) {
  if (!Number.isFinite(km)) return '';
  if (km < 1) return `Cách ${Math.round(km * 1000)} m`;
  return `Cách ~${km.toFixed(1)} km`;
}

export default function WarehousesSection({
  warehouses = [],
  loading = false,
  onOpenInfoModal,
}) {
  const [selectedPrice, setSelectedPrice] = useState(CONSIGN_EARNING_PRESETS[1]);
  const [referenceCoords, setReferenceCoords] = useState(null);
  const [activeCityId, setActiveCityId] = useState('');
  const [geoMessage, setGeoMessage] = useState('');

  const commissionFee = Math.round(selectedPrice * 0.1);
  const sellerEarnings = selectedPrice - commissionFee;

  const sortedWarehouses = useMemo(() => {
    if (!referenceCoords) {
      return warehouses.map((wh) => ({ warehouse: wh, distanceKm: null }));
    }

    return warehouses
      .map((wh) => ({
        warehouse: wh,
        distanceKm: calculateDistanceKm(
          referenceCoords.lat,
          referenceCoords.lng,
          wh.latitude,
          wh.longitude
        ),
      }))
      .sort((a, b) => {
        const dA = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const dB = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return dA - dB;
      });
  }, [warehouses, referenceCoords]);

  const handleSelectCity = (preset) => {
    setActiveCityId(preset.id);
    setReferenceCoords({ lat: preset.lat, lng: preset.lng, label: preset.label });
    setGeoMessage(`Đang xếp điểm ký gửi gần khu vực ${preset.label} lên đầu.`);
  };

  const handleUseMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoMessage(
        'Trình duyệt chưa hỗ trợ định vị. Chọn nhanh TP. Hồ Chí Minh hoặc Hà Nội để xem kho gần nhất.'
      );
      return;
    }

    setGeoMessage('Đang xác định vị trí để tìm điểm ký gửi gần bạn...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setActiveCityId('gps');
        setReferenceCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'vị trí của bạn',
        });
        setGeoMessage('Đã xếp điểm ký gửi gần vị trí hiện tại của bạn lên đầu danh sách.');
      },
      () => {
        setGeoMessage(
          'Bạn chưa cấp quyền vị trí. Hãy chọn nhanh khu vực bên cạnh để xem khoảng cách tới kho.'
        );
      },
      { timeout: 6000 }
    );
  };

  const gridColsClass =
    sortedWarehouses.length === 1
      ? 'grid-cols-1 max-w-xl'
      : sortedWarehouses.length === 2
      ? 'md:grid-cols-2'
      : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section
      id="warehouses"
      className="relative overflow-hidden py-20 sm:py-24 bg-white border-b border-[#DDE5D9]"
    >
      <div
        aria-hidden="true"
        className="landing-editorial-grid absolute inset-0 opacity-45 pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Khối A: Thuyết phục người có đồ cũ đi Ký gửi + Quy trình kiểm định */}
        <div className="space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="max-w-3xl space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#E8F5E9] text-[#006B2C] text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                <ShieldCheckIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Dành cho người muốn bán đồ cũ · Kiểm định thực tế</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1F2A37] leading-[1.15]">
                Tủ đồ chật kín? Ký gửi kiểm định tại kho,{' '}
                <span className="text-[#006B2C]">nhận tới 90% doanh thu</span>
              </h2>
            </div>
            <p className="text-sm sm:text-base text-[#5B6776] max-w-md leading-relaxed">
              Mang đồ tới điểm ký gửi gần nhất — chuyên viên kiểm định, định giá công khai và bán
              hộ từ A–Z.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-6 items-stretch">
            {/* Trái: Card trực quan Kiểm định 6 bước & 4 cấp độ mới + nút mở Modal chi tiết */}
            <div className="lg:col-span-7 min-w-0 rounded-3xl bg-[#F6F9F4] border border-[#DDE5D9] overflow-hidden flex flex-col justify-between">
              <div className="relative h-52 sm:h-60 bg-[#062B19] overflow-hidden">
                <img
                  src={heroEditorialUrl}
                  alt="Quy trình kiểm định 6 bước tại quầy ReHome"
                  loading="lazy"
                  className="w-full h-full object-cover opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#041E12] via-[#041E12]/35 to-transparent" />
                <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEA619] text-[#1F2A37] text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap shadow-sm">
                  <ShieldCheckIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Kiểm định 6 bước tại quầy</span>
                </div>
                <div className="absolute bottom-4 inset-x-5 text-white">
                  <h3 className="text-xl font-extrabold leading-snug">
                    Kiểm định minh bạch — Dán tem SKU chuẩn sàn
                  </h3>
                  <p className="text-xs text-white/80 mt-1">
                    Không ép giá tại quầy · Khách không đồng ý có thể mang đồ về ngay
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#5B6776]">
                    4 cấp phân hạng độ mới công khai
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {INSPECTION_GRADES.map((grade) => (
                      <span
                        key={grade.label}
                        className="consign-card inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#DDE5D9] text-xs font-bold text-[#006B2C] shadow-sm whitespace-nowrap"
                      >
                        <ShieldCheckIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{grade.label}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {onOpenInfoModal && (
                  <div className="pt-2 border-t border-[#DDE5D9] flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-[#5B6776]">
                      Xem chi tiết quy trình 6 tiêu chí &amp; quy chuẩn phân hạng
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenInfoModal('inspection')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#006B2C] hover:bg-[#005523] text-white text-xs font-bold shadow-sm transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>Xem chi tiết 6 bước kiểm định</span>
                      <ArrowRightIcon className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Phải: Máy tính thu nhập ký gửi kỳ đầu (10% hoa hồng -> nhận 90%) */}
            <div
              onPointerMove={updateSpotlightCoords}
              className="consign-card landing-spotlight-card lg:col-span-5 min-w-0 rounded-3xl bg-gradient-to-br from-[#042414] via-[#063A1F] to-[#005A26] text-white p-6 sm:p-7 shadow-elevated flex flex-col justify-between gap-5"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#FEA619] text-[#1F2A37] text-[11px] font-extrabold uppercase whitespace-nowrap">
                    Ước tính tiền về Ví ReHome
                  </span>
                  <span className="text-xs font-bold text-[#A7F3D0] whitespace-nowrap">
                    Hoa hồng kỳ 1 chỉ 10%
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-extrabold">Chọn thử mức giá bán món đồ của bạn</h3>
                  <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Chọn mức giá ký gửi mẫu">
                    {CONSIGN_EARNING_PRESETS.map((price) => (
                      <button
                        key={price}
                        type="button"
                        onClick={() => setSelectedPrice(price)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                          selectedPrice === price
                            ? 'bg-white text-[#042414] shadow-sm'
                            : 'bg-white/10 text-white hover:bg-white/20 border border-white/15'
                        }`}
                      >
                        {formatCurrencyVND(price)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-black/25 border border-white/15 p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-white/80">
                    <span>Giá bán thống nhất tại quầy:</span>
                    <span className="font-bold text-white tabular-nums">
                      {formatCurrencyVND(selectedPrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-white/80">
                    <span>Phí kiểm định, chụp ảnh &amp; bán hộ (10%):</span>
                    <span className="font-bold text-white tabular-nums">
                      -{formatCurrencyVND(commissionFee)}
                    </span>
                  </div>
                  <div className="pt-2.5 border-t border-white/15 flex items-baseline justify-between gap-2">
                    <span className="font-bold text-[#A7F3D0]">Bạn thực nhận (90%):</span>
                    <span className="text-2xl font-extrabold text-[#FEA619] tabular-nums">
                      {formatCurrencyVND(sellerEarnings)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-white/80 leading-relaxed">
                  Chu kỳ ký gửi 30 ngày rõ ràng. Hết kỳ chưa bán có thể{' '}
                  <strong className="text-white">gia hạn tối đa 2 lần</strong>,{' '}
                  <strong className="text-white">nhận lại miễn phí trong 7 ngày</strong> hoặc{' '}
                  <strong className="text-white">chuyển thiện nguyện 1 chạm</strong>.
                </p>
              </div>

              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-btn-shine inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-[#FEA619] hover:bg-[#E59412] text-[#1F2A37] text-sm font-bold shadow-sm transition-colors whitespace-nowrap shrink-0"
              >
                <AndroidIcon className="w-4 h-4 shrink-0" />
                <span>Tải APK để đăng ký ký gửi</span>
              </a>
            </div>
          </div>
        </div>

        {/* Khối B: Gợi ý điểm ký gửi gần bạn nhất từ API GET /warehouses */}
        <div className="space-y-6 pt-4 border-t border-[#DDE5D9]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <h3 className="text-2xl font-extrabold text-[#1F2A37]">
                Điểm ký gửi &amp; kiểm định ReHome gần bạn
              </h3>
              <p className="text-xs sm:text-sm text-[#5B6776]">
                Trong app Android, bước chọn kho tự động định vị và xếp điểm ký gửi gần nhất lên
                đầu. Bạn có thể thử ngay bên dưới:
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleUseMyLocation}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap shrink-0 ${
                  activeCityId === 'gps'
                    ? 'bg-[#006B2C] text-white border-[#006B2C]'
                    : 'bg-[#F6F9F4] text-[#006B2C] border-[#006B2C]/35 hover:bg-[#E8F5E9]'
                }`}
              >
                <LocateIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Dùng vị trí của tôi</span>
              </button>

              {CITY_COORDS_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectCity(preset)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap shrink-0 ${
                    activeCityId === preset.id
                      ? 'bg-[#062B19] text-white border-[#062B19]'
                      : 'bg-white text-[#1F2A37] border-[#DDE5D9] hover:border-[#006B2C]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {geoMessage && (
            <div className="rounded-2xl bg-[#E8F5E9] border border-[#006B2C]/25 px-4 py-2.5 text-xs font-semibold text-[#006B2C]">
              {geoMessage}
            </div>
          )}

          {loading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="rounded-3xl bg-[#F6F9F4] border border-[#DDE5D9] p-6 h-48 animate-pulse"
                />
              ))}
            </div>
          ) : sortedWarehouses.length > 0 ? (
            <div className={`grid gap-6 ${gridColsClass}`}>
              {sortedWarehouses.map(({ warehouse: wh, distanceKm }, idx) => {
                const isNearest = Boolean(referenceCoords) && idx === 0 && distanceKm !== null;

                return (
                  <article
                    key={wh.id}
                    className={`warehouse-card group rounded-3xl p-6 sm:p-7 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between gap-5 border ${
                      isNearest
                        ? 'bg-[#F6FBF7] border-[#006B2C] ring-1 ring-[#006B2C]/20'
                        : 'bg-[#F6F9F4] border-[#DDE5D9]'
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <span className="w-11 h-11 rounded-2xl bg-[#E8F5E9] text-[#006B2C] flex items-center justify-center shrink-0">
                            <MapPinIcon className="w-5 h-5" />
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-lg font-bold text-[#1F2A37] leading-snug">
                              {wh.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#006B2C]">
                                <span className="landing-pulse-ring w-2 h-2 rounded-full bg-[#006B2C] text-[#006B2C]" />
                                Đang tiếp nhận ký gửi
                              </span>
                              {distanceKm !== null && (
                                <span className="text-xs font-bold text-[#00685F] tabular-nums whitespace-nowrap">
                                  • {formatDistanceLabel(distanceKm)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isNearest && (
                          <span className="px-3 py-1 rounded-full bg-[#006B2C] text-white text-[11px] font-bold shadow-sm whitespace-nowrap shrink-0">
                            Gần bạn nhất
                          </span>
                        )}
                      </div>

                      <div className="rounded-2xl bg-white border border-[#DDE5D9]/90 p-4 space-y-2.5">
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

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <a
                        href={buildMapsUrl(wh)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/map inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#006B2C] border border-[#DDE5D9] hover:border-[#006B2C] text-[#00685F] hover:text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                      >
                        <span>Chỉ đường Google Maps</span>
                        <ExternalLinkIcon className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover/map:translate-x-0.5" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl bg-[#F6F9F4] border border-[#DDE5D9] p-10 text-center">
              <p className="text-base font-bold text-[#1F2A37]">
                Thông tin các điểm ký gửi đang được đồng bộ từ hệ thống.
              </p>
              <p className="text-sm text-[#5B6776] mt-1">
                Trên ứng dụng ReHome Android, bạn còn có thể bật định vị để tự tìm điểm ký gửi gần
                nhất.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
