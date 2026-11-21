import React, { useState } from 'react';
import charityVisualUrl from '../assets/charity-community.svg';
import { formatDate } from '../../../utils/formatters.js';
import { APK_DOWNLOAD_URL } from '../constants/landingConstants.js';
import { isBrokenSeedAssetUrl } from '../services/landingApi.js';
import {
  AndroidIcon,
  CheckCircleIcon,
  HeartHandshakeIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from './LandingIcons.jsx';

const CHARITY_PILLARS = [
  {
    title: '100% tổ chức thẩm định pháp lý',
    description:
      'Mọi tổ chức thiện nguyện đều phải hoàn tất xác minh hồ sơ trước khi mở chiến dịch tiếp nhận.',
  },
  {
    title: '2 cách quyên góp cực linh hoạt',
    description:
      'Mang đồ trực tiếp tới kho/điểm nhận, hoặc 1 chạm chuyển món ký gửi cuối kỳ thành quà tặng.',
  },
  {
    title: 'Đúng món cần · Rõ điểm nhận',
    description:
      'Theo dõi danh sách trang phục chiến dịch đang ưu tiên và các điểm kho tiếp nhận công khai.',
  },
];

function CampaignCover({ src, title }) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = !src || failed || isBrokenSeedAssetUrl(src) ? charityVisualUrl : src;

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
        className="w-12 h-12 rounded-2xl object-cover border border-[#DDE5D9] shrink-0 bg-white"
      />
    );
  }

  return (
    <div className="w-12 h-12 rounded-2xl bg-[#006B2C] text-white font-bold text-lg flex items-center justify-center shrink-0">
      {initial}
    </div>
  );
}

export default function CommunitySection({ campaigns = [], organizations = [], loading = false }) {
  const visibleCampaigns = campaigns.slice(0, 4);
  const visibleOrganizations = organizations.slice(0, 6);
  const isSingleCampaign = visibleCampaigns.length === 1;

  const orgGridClass =
    visibleOrganizations.length === 1
      ? 'grid-cols-1 max-w-xl'
      : visibleOrganizations.length === 2
      ? 'sm:grid-cols-2'
      : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section
      id="community"
      className="relative overflow-hidden py-20 sm:py-24 bg-[#F7F3EA] border-b border-[#E5DEC9]"
    >
      {/* Họa tiết vòng tròn mảnh trang trí nền */}
      <svg
        aria-hidden="true"
        viewBox="0 0 360 360"
        fill="none"
        className="absolute -top-24 -right-24 w-80 h-80 text-[#006B2C]/10 pointer-events-none"
      >
        <circle cx="180" cy="180" r="170" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 8" />
        <circle cx="180" cy="180" r="120" stroke="currentColor" strokeWidth="1" />
      </svg>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FEA619]/30 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
              <HeartHandshakeIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Cộng đồng thiện nguyện minh bạch</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1F2A37]">
              Trao đi món đồ còn tốt — Gửi trọn hơi ấm đúng nơi
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#5B6776] max-w-md leading-relaxed">
            Không để trang phục nằm im trong góc tủ. Đóng góp trực tiếp hoặc chuyển tiếp đồ ký gửi
            cuối kỳ tới các tổ chức thiện nguyện đã qua thẩm định pháp lý.
          </p>
        </div>

        {/* 3 Trụ cột minh bạch thiện nguyện */}
        <div className="grid md:grid-cols-3 gap-4 reveal-section">
          {CHARITY_PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-2xl bg-white/95 border border-[#E5DEC9] p-5 shadow-sm space-y-2"
            >
              <div className="inline-flex items-center gap-2 text-xs font-extrabold text-[#006B2C]">
                <ShieldCheckIcon className="w-4 h-4 shrink-0" />
                <span>{pillar.title}</span>
              </div>
              <p className="text-xs text-[#5B6776] leading-relaxed">{pillar.description}</p>
            </div>
          ))}
        </div>

        {/* Chiến dịch thiện nguyện */}
        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="rounded-3xl border border-[#DDE5D9] bg-white p-5 h-56 animate-pulse"
              />
            ))}
          </div>
        ) : visibleCampaigns.length > 0 ? (
          isSingleCampaign ? (
            <article className="community-card group rounded-3xl border border-[#DDE5D9] bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-all grid lg:grid-cols-12">
              <div className="lg:col-span-5 min-w-0 aspect-[16/10] lg:aspect-auto min-h-[260px] bg-[#EBF1E8] overflow-hidden relative">
                <CampaignCover
                  src={visibleCampaigns[0].coverUrl}
                  title={visibleCampaigns[0].title}
                />
                <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#062B19]/85 backdrop-blur-sm text-white text-[11px] font-bold whitespace-nowrap">
                  Chiến dịch đang tiếp nhận
                </span>
              </div>

              <div className="lg:col-span-7 min-w-0 p-6 sm:p-8 flex flex-col justify-between gap-5">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#5B6776]">
                    <span className="px-2.5 py-1 rounded-full bg-[#E8F5E9] text-[#006B2C] font-bold whitespace-nowrap">
                      {visibleCampaigns[0].organization?.displayName || 'Tổ chức đối tác'}
                    </span>
                    <span>•</span>
                    <span className="font-medium whitespace-nowrap">
                      {formatDate(visibleCampaigns[0].startTime)} –{' '}
                      {formatDate(visibleCampaigns[0].endTime)}
                    </span>
                  </div>

                  <h3 className="text-2xl font-extrabold text-[#1F2A37] leading-snug">
                    {visibleCampaigns[0].title}
                  </h3>

                  {visibleCampaigns[0].description && (
                    <p className="text-sm text-[#5B6776] leading-relaxed">
                      {visibleCampaigns[0].description}
                    </p>
                  )}
                </div>

                <div className="space-y-4 pt-4 border-t border-[#DDE5D9]">
                  {Array.isArray(visibleCampaigns[0].preferredItemTypes) &&
                    visibleCampaigns[0].preferredItemTypes.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-[#5B6776]">Đang tiếp nhận:</span>
                        {visibleCampaigns[0].preferredItemTypes.slice(0, 5).map((itemType) => (
                          <span
                            key={itemType}
                            className="px-3 py-1 rounded-full bg-[#F6F9F4] border border-[#DDE5D9] text-xs font-semibold text-[#1F2A37] whitespace-nowrap"
                          >
                            {itemType}
                          </span>
                        ))}
                      </div>
                    )}

                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[#5B6776]">
                      {Array.isArray(visibleCampaigns[0].warehouses) &&
                        visibleCampaigns[0].warehouses.length > 0 && (
                          <span className="inline-flex items-center gap-1.5 text-[#00685F] font-bold whitespace-nowrap">
                            <MapPinIcon className="w-4 h-4 shrink-0" />
                            Nhận tại {visibleCampaigns[0].warehouses.length} điểm kho ReHome
                          </span>
                        )}
                      {visibleCampaigns[0].receiveAtOwnAddress && (
                        <span>• Có điểm nhận riêng của tổ chức</span>
                      )}
                    </div>

                    <a
                      href={APK_DOWNLOAD_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="landing-btn-shine group/btn inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#006B2C] hover:bg-[#005523] text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                    >
                      <AndroidIcon className="w-4 h-4 shrink-0" />
                      <span>Chung tay quyên góp qua App</span>
                    </a>
                  </div>
                </div>
              </div>
            </article>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {visibleCampaigns.map((campaign) => {
                const warehousesCount = Array.isArray(campaign.warehouses)
                  ? campaign.warehouses.length
                  : 0;
                return (
                  <article
                    key={campaign.id}
                    className="community-card group rounded-3xl border border-[#DDE5D9] bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-all grid sm:grid-cols-12"
                  >
                    <div className="sm:col-span-5 min-w-0 aspect-[16/10] sm:aspect-auto bg-[#EBF1E8] overflow-hidden">
                      <CampaignCover src={campaign.coverUrl} title={campaign.title} />
                    </div>
                    <div className="sm:col-span-7 min-w-0 p-5 flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-[#5B6776]">
                          <span className="font-bold text-[#006B2C] truncate">
                            {campaign.organization?.displayName || 'Tổ chức đối tác'}
                          </span>
                          <span>•</span>
                          <span className="shrink-0">
                            {formatDate(campaign.startTime)} – {formatDate(campaign.endTime)}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-[#1F2A37] line-clamp-2">
                          {campaign.title}
                        </h3>

                        {campaign.description && (
                          <p className="text-xs text-[#5B6776] line-clamp-2 leading-relaxed">
                            {campaign.description}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-[#DDE5D9]">
                        {Array.isArray(campaign.preferredItemTypes) &&
                          campaign.preferredItemTypes.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {campaign.preferredItemTypes.slice(0, 3).map((itemType) => (
                                <span
                                  key={itemType}
                                  className="px-2.5 py-0.5 rounded-full bg-[#F6F9F4] border border-[#DDE5D9] text-[11px] font-semibold text-[#1F2A37] whitespace-nowrap"
                                >
                                  {itemType}
                                </span>
                              ))}
                            </div>
                          )}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-[#5B6776]">
                          {warehousesCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[#00685F] font-semibold whitespace-nowrap">
                              <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                              Nhận tại {warehousesCount} điểm kho ReHome
                            </span>
                          )}
                          {campaign.receiveAtOwnAddress && (
                            <span>Có điểm nhận riêng của tổ chức</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : (
          <div className="rounded-3xl border border-[#DDE5D9] bg-white p-8 text-center">
            <p className="text-sm font-bold text-[#1F2A37]">
              Các chiến dịch thiện nguyện mới sẽ sớm được cập nhật từ các tổ chức đối tác.
            </p>
            <p className="text-xs text-[#5B6776] mt-1">
              Tải ứng dụng ReHome Android để nhận thông báo ngay khi chiến dịch mới mở.
            </p>
          </div>
        )}

        {/* Dải Tổ chức đã xác minh */}
        <div className="space-y-4 reveal-section">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-[#1F2A37]">Tổ chức thiện nguyện đồng hành</h3>
            <span className="text-xs font-bold text-[#006B2C] whitespace-nowrap">
              Hồ sơ đã được kiểm duyệt
            </span>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="rounded-2xl border border-[#DDE5D9] bg-white p-4 h-28 animate-pulse"
                />
              ))}
            </div>
          ) : visibleOrganizations.length > 0 ? (
            <div className={`grid gap-4 ${orgGridClass}`}>
              {visibleOrganizations.map((org) => (
                <article
                  key={org.id}
                  className="community-card rounded-2xl border border-[#DDE5D9] bg-white p-5 shadow-card hover:shadow-card-hover transition-all flex items-start gap-4"
                >
                  <OrgAvatar logoUrl={org.logoUrl} name={org.displayName} />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-bold text-[#1F2A37] truncate">
                        {org.displayName}
                      </h4>
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#006B2C] text-[11px] font-bold shrink-0 whitespace-nowrap"
                        title="Tổ chức đã xác minh"
                      >
                        <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                        Đã xác minh
                      </span>
                    </div>
                    {org.description && (
                      <p className="text-xs text-[#5B6776] line-clamp-2 leading-relaxed">
                        {org.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5B6776] pt-1">
                      <span className="font-bold text-[#1F2A37]">
                        {new Intl.NumberFormat('vi-VN').format(Number(org.followerCount) || 0)} người
                        theo dõi
                      </span>
                      {org.donationPointAddress && (
                        <span className="truncate max-w-full">• {org.donationPointAddress}</span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#5B6776]">
              Các tổ chức thiện nguyện phải hoàn tất xác minh giấy tờ pháp lý trước khi mở chiến
              dịch trên ReHome.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
