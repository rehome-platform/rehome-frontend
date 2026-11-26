import React, { useMemo, useState } from 'react';
import { formatDate } from '../../../utils/formatters.js';
import heroEditorialUrl from '../assets/hero-editorial.jpg';
import { CITY_COORDS_PRESETS } from '../constants/landingConstants.js';
import { isBrokenSeedAssetUrl } from '../services/landingApi.js';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExternalLinkIcon,
  HeartHandshakeIcon,
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
  const dLat = toRad(nLat2 - nLat1);
  const dLng = toRad(nLng2 - nLng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(nLat1)) *
      Math.cos(toRad(nLat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

function formatDistanceLabel(km) {
  if (!Number.isFinite(km)) return '';
  if (km < 1) return `Cách ${Math.round(km * 1000)} m`;
  return `Cách ~${km.toFixed(1)} km`;
}

function CampaignCover({ src, title }) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = !src || failed || isBrokenSeedAssetUrl(src) ? heroEditorialUrl : src;

  return (
    <img
      src={resolvedSrc}
      alt={title}
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  );
}

function OrgAvatar({ logoUrl, name }) {
  const [failed, setFailed] = useState(false);
  const initial = String(name || 'R').trim().charAt(0).toUpperCase() || 'R';

  if (logoUrl && !failed && !isBrokenSeedAssetUrl(logoUrl)) {
    return (
      <img
        src={logoUrl}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        className="w-10 h-10 rounded-xl object-cover border border-[#071D12]/10 shrink-0 bg-white"
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-xl bg-[#006B2C] text-white font-bold text-sm flex items-center justify-center shrink-0">
      {initial}
    </div>
  );
}

export default function NetworkCommunitySection({
  warehouses = [],
  campaigns = [],
  organizations = [],
  loading = false,
  onOpenInfoModal,
}) {
  const [activeCityId, setActiveCityId] = useState('');

  const activePreset = useMemo(
    () => CITY_COORDS_PRESETS.find((city) => city.id === activeCityId) || null,
    [activeCityId]
  );

  const sortedWarehouses = useMemo(() => {
    if (!activePreset) {
      return warehouses.map((wh) => ({ warehouse: wh, distanceKm: null }));
    }
    return warehouses
      .map((wh) => ({
        warehouse: wh,
        distanceKm: calculateDistanceKm(
          activePreset.lat,
          activePreset.lng,
          wh.latitude,
          wh.longitude
        ),
      }))
      .sort((a, b) => {
        const dA = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const dB = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return dA - dB;
      });
  }, [warehouses, activePreset]);

  const visibleCampaigns = campaigns.slice(0, 2);
  const visibleOrganizations = organizations.slice(0, 4);

  const warehouseGridClass =
    sortedWarehouses.length === 1
      ? 'grid-cols-1 max-w-xl'
      : sortedWarehouses.length === 2
        ? 'md:grid-cols-2'
        : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section
      id="network"
      className="scroll-mt-20 bg-[#F7F4EC] border-b border-[#071D12]/[0.08] py-16 sm:py-24"
    >
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 space-y-16">
        {/* Khối A: Mạng lưới Kho kiểm định */}
        <div className="space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="editorial-reveal max-w-2xl space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#006B2C]">
                Mạng lưới kho kiểm định
              </p>
              <h2 className="landing-text-balance text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-[#071D12]">
                Điểm tiếp nhận &amp; kiểm định ReHome gần bạn
              </h2>
              <p className="text-sm text-[#46564C] leading-relaxed">
                Trên ứng dụng Android, ReHome tự động sắp xếp điểm kho gần vị trí của bạn nhất.
              </p>
            </div>

            {!loading && warehouses.length > 1 && (
              <div
                role="group"
                aria-label="Sắp xếp kho theo khu vực"
                className="flex flex-wrap items-center gap-2 shrink-0"
              >
                {CITY_COORDS_PRESETS.map((preset) => {
                  const isActive = activeCityId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveCityId(isActive ? '' : preset.id)}
                      className={`px-3.5 py-2 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-[#071D12] text-white'
                          : 'bg-white text-[#46564C] border border-[#071D12]/10 hover:border-[#006B2C] hover:text-[#071D12]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 gap-5">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="rounded-2xl bg-white border border-[#071D12]/10 p-6 h-44 animate-pulse"
                />
              ))}
            </div>
          ) : sortedWarehouses.length > 0 ? (
            <div className={`grid gap-5 ${warehouseGridClass}`}>
              {sortedWarehouses.map(({ warehouse: wh, distanceKm }, idx) => {
                const isNearest = Boolean(activePreset) && idx === 0 && distanceKm !== null;

                return (
                  <article
                    key={wh.id}
                    data-testid="warehouse-card"
                    className={`rounded-2xl bg-white p-6 flex flex-col justify-between gap-5 transition-colors border ${
                      isNearest
                        ? 'border-[#006B2C] ring-1 ring-[#006B2C]/20'
                        : 'border-[#071D12]/10'
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <h3 className="text-base sm:text-lg font-bold text-[#071D12] leading-snug">
                            {wh.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-[#006B2C]">
                              <span className="landing-pulse-ring w-2 h-2 rounded-full bg-[#006B2C] text-[#006B2C]" />
                              <span>Đang tiếp nhận</span>
                            </span>
                            {distanceKm !== null && (
                              <span className="font-bold text-[#00685F] tabular-nums whitespace-nowrap">
                                · {formatDistanceLabel(distanceKm)}
                              </span>
                            )}
                          </div>
                        </div>

                        {isNearest && (
                          <span className="px-2.5 py-1 rounded-full bg-[#006B2C] text-white text-[11px] font-bold whitespace-nowrap shrink-0">
                            Gần nhất
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-xs sm:text-sm text-[#46564C]">
                        {wh.address && (
                          <div className="flex items-start gap-2.5 leading-relaxed">
                            <MapPinIcon className="w-4 h-4 text-[#006B2C] shrink-0 mt-0.5" />
                            <span className="text-[#071D12] font-medium">{wh.address}</span>
                          </div>
                        )}

                        {wh.openingHours && (
                          <div className="flex items-start gap-2.5">
                            <ClockIcon className="w-4 h-4 text-[#00685F] shrink-0 mt-0.5" />
                            <span>Giờ mở cửa: {wh.openingHours}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#071D12]/[0.07]">
                      <a
                        href={buildMapsUrl(wh)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-bold text-[#006B2C] hover:text-[#005523] transition-colors whitespace-nowrap"
                      >
                        <span>Chỉ đường Google Maps</span>
                        <ExternalLinkIcon className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-[#071D12]/10 p-8 text-center space-y-1.5">
              <p className="text-sm font-bold text-[#071D12]">
                Danh sách điểm kho đang được đồng bộ từ hệ thống.
              </p>
              <p className="text-xs text-[#46564C]">
                Mở ứng dụng ReHome Android để bật định vị và xem các điểm tiếp nhận đang hoạt động.
              </p>
            </div>
          )}
        </div>

        {/* Khối B: Thiện nguyện xác minh pháp lý */}
        <div className="border-t border-[#071D12]/10 pt-12 grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#071D12]/10 text-[11px] font-bold uppercase tracking-wider text-[#006B2C]">
              <HeartHandshakeIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Thiện nguyện xác minh</span>
            </span>

            <h3 className="landing-text-balance text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-[#071D12] leading-tight">
              Trao món đồ còn tốt tới đúng nơi cần
            </h3>

            <p className="text-sm text-[#46564C] leading-relaxed">
              Chỉ các tổ chức hoàn tất thẩm định giấy tờ pháp lý mới được mở chiến dịch tiếp nhận
              trực tiếp hoặc nhận chuyển quyên góp 1 chạm từ đồ ký gửi cuối kỳ.
            </p>

            {onOpenInfoModal && (
              <button
                type="button"
                onClick={() => onOpenInfoModal('policy')}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#006B2C] hover:text-[#005523] transition-colors"
              >
                <span>Xem chính sách xác minh</span>
                <ArrowRightIcon className="w-4 h-4 shrink-0" />
              </button>
            )}
          </div>

          <div className="lg:col-span-7 space-y-4">
            {loading ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-white border border-[#071D12]/10 p-5 h-44 animate-pulse" />
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white border border-[#071D12]/10 p-4 h-20 animate-pulse" />
                  <div className="rounded-2xl bg-white border border-[#071D12]/10 p-4 h-20 animate-pulse" />
                </div>
              </div>
            ) : visibleCampaigns.length > 0 || visibleOrganizations.length > 0 ? (
              <div className="space-y-4">
                {visibleCampaigns.map((campaign) => (
                  <article
                    key={campaign.id}
                    className="group rounded-2xl bg-white border border-[#071D12]/10 overflow-hidden grid sm:grid-cols-12"
                  >
                    <div className="sm:col-span-4 aspect-[16/10] sm:aspect-auto min-h-[168px] bg-[#EBF1E8] overflow-hidden">
                      <CampaignCover src={campaign.coverUrl} title={campaign.title} />
                    </div>
                    <div className="sm:col-span-8 p-5 flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#46564C]">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#EBF1E8] text-[#006B2C] font-bold whitespace-nowrap">
                            {campaign.organization?.displayName || 'Tổ chức đối tác'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium tabular-nums whitespace-nowrap">
                            {formatDate(campaign.startTime)} – {formatDate(campaign.endTime)}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-[#071D12] leading-snug">
                          {campaign.title}
                        </h4>

                        {campaign.description && (
                          <p className="text-xs text-[#46564C] line-clamp-2 leading-relaxed">
                            {campaign.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#071D12]/[0.07]">
                        <div className="flex flex-wrap gap-1.5">
                          {Array.isArray(campaign.preferredItemTypes) &&
                            campaign.preferredItemTypes.slice(0, 3).map((itemType) => (
                              <span
                                key={itemType}
                                className="px-2.5 py-0.5 rounded-full bg-[#F6F9F4] border border-[#071D12]/10 text-[11px] font-semibold text-[#071D12] whitespace-nowrap"
                              >
                                {itemType}
                              </span>
                            ))}
                        </div>

                        {Array.isArray(campaign.warehouses) && campaign.warehouses.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00685F] whitespace-nowrap">
                            <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>Nhận tại {campaign.warehouses.length} kho</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}

                {visibleOrganizations.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-3.5">
                    {visibleOrganizations.map((org) => (
                      <article
                        key={org.id}
                        className="rounded-2xl bg-white border border-[#071D12]/10 p-4 flex items-center gap-3.5"
                      >
                        <OrgAvatar logoUrl={org.logoUrl} name={org.displayName} />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-[#071D12] truncate">
                              {org.displayName}
                            </h4>
                            <CheckCircleIcon
                              className="w-3.5 h-3.5 text-[#006B2C] shrink-0"
                              aria-label="Đã xác minh"
                            />
                          </div>
                          <p className="text-[11px] font-medium text-[#46564C] truncate">
                            {new Intl.NumberFormat('vi-VN').format(Number(org.followerCount) || 0)}{' '}
                            người theo dõi
                            {org.donationPointAddress ? ` · ${org.donationPointAddress}` : ''}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <article className="rounded-2xl bg-white border border-[#071D12]/10 p-5 space-y-2">
                  <ShieldCheckIcon className="w-5 h-5 text-[#006B2C]" />
                  <h4 className="text-sm font-bold text-[#071D12]">
                    100% tổ chức xác minh pháp lý
                  </h4>
                  <p className="text-xs text-[#46564C] leading-relaxed">
                    Hồ sơ pháp lý được kiểm duyệt trước khi mở chiến dịch tiếp nhận trang phục công
                    khai.
                  </p>
                </article>
                <article className="rounded-2xl bg-white border border-[#071D12]/10 p-5 space-y-2">
                  <HeartHandshakeIcon className="w-5 h-5 text-[#006B2C]" />
                  <h4 className="text-sm font-bold text-[#071D12]">
                    Chuyển thiện nguyện 1 chạm cuối kỳ
                  </h4>
                  <p className="text-xs text-[#46564C] leading-relaxed">
                    Đồ ký gửi chưa bán hết có thể chuyển thẳng tới tổ chức đối tác mà không tốn
                    công vận chuyển lại.
                  </p>
                </article>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
