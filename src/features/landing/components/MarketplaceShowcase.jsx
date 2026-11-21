import React, { useRef, useState } from 'react';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { APK_DOWNLOAD_URL, BUYER_VOUCHER_PERKS } from '../constants/landingConstants.js';
import { isBrokenSeedAssetUrl } from '../services/landingApi.js';
import { updateSpotlightCoords } from '../utils/spotlight.js';
import {
  AndroidIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TicketPercentIcon,
} from './LandingIcons.jsx';

function ProductThumbnail({ src, alt }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError || isBrokenSeedAssetUrl(src)) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F4F8F2] to-[#E3EDE0] text-[#006B2C] p-4">
        <div className="w-10 h-10 rounded-xl bg-white/95 border border-[#DDE5D9] flex items-center justify-center mb-1.5 shadow-sm">
          <ShoppingBagIcon className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-bold tracking-wide">Đã kiểm định ReHome</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setHasError(true)}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  );
}

export default function MarketplaceShowcase({
  products = [],
  categories = [],
  selectedCategoryId = '',
  onSelectCategory,
  loading = false,
  hasError = false,
  onRetry,
  onOpenAppPrompt,
}) {
  const railRef = useRef(null);
  const filterCategories = categories.slice(0, 6);

  const handleScrollRail = (direction) => {
    const node = railRef.current;
    if (!node || typeof node.scrollBy !== 'function') return;
    node.scrollBy({
      left: direction * 280,
      behavior: 'smooth',
    });
  };

  return (
    <section
      id="marketplace"
      className="relative overflow-hidden py-16 sm:py-20 bg-[#F4F7F1] border-b border-[#DDE5D9]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 18% 0%, rgba(0, 107, 44, 0.06), transparent 46%)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2.5">
            <span className="inline-block px-3.5 py-1 rounded-full bg-white border border-[#DDE5D9] text-[#006B2C] text-xs font-bold uppercase tracking-wider">
              Kệ hàng tuyển chọn · Sẵn sàng thử AI
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1F2A37]">
              Sản phẩm đang mở bán trên ReHome
            </h2>
            <p className="text-sm sm:text-base text-[#5B6776] leading-relaxed">
              Lướt nhanh những món vừa kiểm định tại kho — chạm bất kỳ món nào để quét QR mở app
              thử qua Camera hoặc nhờ AI phối bộ.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleScrollRail(-1)}
                aria-label="Cuộn sản phẩm sang trái"
                className="w-10 h-10 rounded-full bg-white border border-[#DDE5D9] hover:border-[#006B2C] text-[#1F2A37] hover:text-[#006B2C] flex items-center justify-center shadow-sm transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScrollRail(1)}
                aria-label="Cuộn sản phẩm sang phải"
                className="w-10 h-10 rounded-full bg-white border border-[#DDE5D9] hover:border-[#006B2C] text-[#1F2A37] hover:text-[#006B2C] flex items-center justify-center shadow-sm transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>

            <a
              href={APK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-btn-shine inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#006B2C] hover:bg-[#005523] text-white text-sm font-bold shrink-0 shadow-sm transition-colors whitespace-nowrap"
            >
              <AndroidIcon className="w-4 h-4 shrink-0" />
              <span>Xem thêm trên App</span>
            </a>
          </div>
        </div>

        {/* Bộ lọc nhanh theo danh mục */}
        {filterCategories.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Lọc sản phẩm theo danh mục"
          >
            <button
              type="button"
              onClick={() => onSelectCategory?.('')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                !selectedCategoryId
                  ? 'bg-[#062B19] text-white shadow-sm'
                  : 'bg-white text-[#1F2A37] border border-[#DDE5D9] hover:border-[#006B2C]'
              }`}
            >
              Tất cả
            </button>
            {filterCategories.map((cat) => {
              const active = String(selectedCategoryId) === String(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory?.(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#062B19] text-white shadow-sm'
                      : 'bg-white text-[#1F2A37] border border-[#DDE5D9] hover:border-[#006B2C]'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Dải sản phẩm hàng ngang gọn gàng */}
        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="w-[228px] sm:w-[246px] shrink-0 rounded-2xl bg-white border border-[#DDE5D9] overflow-hidden animate-pulse"
              >
                <div className="h-52 bg-[#EBF1E8]" />
                <div className="p-3.5 space-y-2.5">
                  <div className="h-3.5 w-3/4 bg-[#EBF1E8] rounded" />
                  <div className="h-3 w-1/2 bg-[#EBF1E8] rounded" />
                  <div className="h-8 w-full bg-[#EBF1E8] rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : hasError && products.length === 0 ? (
          <div className="rounded-3xl bg-white border border-[#DDE5D9] p-8 text-center space-y-3">
            <p className="text-base font-bold text-[#1F2A37]">
              Không thể tải danh sách sản phẩm trực tiếp từ máy chủ lúc này.
            </p>
            <p className="text-sm text-[#5B6776]">
              Bạn vẫn có thể tải ứng dụng ReHome APK để xem toàn bộ sản phẩm mới nhất.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="px-4 py-2 rounded-xl border border-[#DDE5D9] text-xs font-bold text-[#1F2A37] hover:bg-[#F6F9F4] whitespace-nowrap shrink-0"
                >
                  Thử tải lại
                </button>
              )}
              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-[#006B2C] text-white text-xs font-bold hover:bg-[#005523] whitespace-nowrap shrink-0"
              >
                Tải APK Android
              </a>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl bg-white border border-[#DDE5D9] p-8 text-center space-y-2">
            <p className="text-base font-bold text-[#1F2A37]">
              Chưa có sản phẩm phù hợp trong danh mục này.
            </p>
            <p className="text-sm text-[#5B6776]">
              Hãy chọn danh mục khác hoặc mở ứng dụng ReHome Android để theo dõi sản phẩm mới lên sàn.
            </p>
          </div>
        ) : (
          <div
            ref={railRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 landing-rail-scroll min-w-0 w-full"
          >
            {products.slice(0, 8).map((product) => {
              const current = Number(product.currentPrice) || 0;
              const original = Number(product.originalPrice) || 0;
              const hasDiscount = original > current && current > 0;
              const discountPct = hasDiscount
                ? Math.round(((original - current) / original) * 100)
                : 0;

              return (
                <article
                  key={product.id}
                  className="lookbook-card group w-[228px] sm:w-[246px] shrink-0 snap-start rounded-2xl bg-white border border-[#DDE5D9] overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-52 sm:h-56 bg-[#EBF1E8] overflow-hidden">
                      <ProductThumbnail src={product.thumbnailUrl} alt={product.name} />

                      {/* Badges gọn */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-1.5">
                        <div className="flex flex-wrap gap-1">
                          {product.featured && (
                            <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FEA619]/40 text-[10px] font-bold shadow-sm whitespace-nowrap">
                              Nổi bật
                            </span>
                          )}
                          {discountPct > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-[#062B19]/85 backdrop-blur-sm text-white text-[10px] font-bold whitespace-nowrap">
                              -{discountPct}%
                            </span>
                          )}
                        </div>
                        {product.size && (
                          <span className="px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-sm text-[#1F2A37] text-[10px] font-bold shadow-sm shrink-0 whitespace-nowrap">
                            Size {product.size}
                          </span>
                        )}
                      </div>

                      <span className="absolute bottom-2 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-sm text-white text-[10px] font-semibold whitespace-nowrap">
                        <SparklesIcon className="w-3 h-3 text-[#FEA619] shrink-0" />
                        <span>Hỗ trợ thử AI</span>
                      </span>
                    </div>

                    <div className="p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#5B6776]">
                        <span className="font-bold text-[#00685F] truncate">
                          {product.categoryName || 'Thời trang'}
                        </span>
                        {product.brandName && (
                          <span className="font-medium truncate">{product.brandName}</span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-[#1F2A37] line-clamp-1">
                        {product.name}
                      </h3>

                      <div className="flex items-baseline gap-2 pt-0.5">
                        <span className="text-base font-extrabold text-[#006B2C] tabular-nums">
                          {formatCurrencyVND(current)}
                        </span>
                        {hasDiscount && (
                          <span className="text-[11px] text-[#5B6776] line-through tabular-nums">
                            {formatCurrencyVND(original)}
                          </span>
                        )}
                      </div>
                      {product.condition && (
                        <p className="text-[11px] text-[#5B6776] truncate">
                          Độ mới: {product.condition}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-3.5 pb-3.5 pt-2 border-t border-[#DDE5D9]/60">
                    <button
                      type="button"
                      onClick={() => onOpenAppPrompt?.(product)}
                      className="w-full py-2 px-3 rounded-xl bg-[#F6F9F4] hover:bg-[#006B2C] border border-[#DDE5D9] hover:border-[#006B2C] text-[#1F2A37] hover:text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                    >
                      Thử AI &amp; Xem trên App
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Lời mời gọi Kho Voucher dành riêng cho Người mua */}
        <div
          onPointerMove={updateSpotlightCoords}
          className="landing-spotlight-card relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#042414] via-[#063A1F] to-[#005A26] text-white p-6 sm:p-8 shadow-elevated reveal-section"
        >
          <div
            aria-hidden="true"
            className="landing-dot-grid absolute inset-0 opacity-70 pointer-events-none"
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEA619] text-[#1F2A37] text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap">
                <TicketPercentIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Dành riêng cho người mua · Kho Voucher ReHome</span>
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug">
                Mua đồ hiệu đã kiểm định, giảm thêm cực đã với Voucher trên App
              </h3>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Người bán nhận tới 90% doanh thu, còn người mua cũng có đặc quyền riêng: lưu mã
                giảm giá, ưu đãi đơn đầu tiên và freeship ngay trong mục Kho Voucher của ứng dụng
                ReHome.
              </p>
            </div>

            <a
              href={APK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-btn-shine inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-[#FEA619] hover:bg-[#E59412] text-[#1F2A37] text-sm font-bold shadow-elevated transition-colors whitespace-nowrap shrink-0"
            >
              <AndroidIcon className="w-4 h-4 shrink-0" />
              <span>Tải APK để săn Voucher ngay</span>
            </a>
          </div>

          <div className="relative z-10 grid sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/15">
            {BUYER_VOUCHER_PERKS.map((perk) => (
              <div
                key={perk.id}
                className="rounded-2xl bg-white/10 border border-dashed border-[#FEA619]/45 p-3.5 space-y-1.5"
              >
                <span className="inline-block px-2 py-0.5 rounded-md bg-[#FEA619]/20 text-[#FEA619] text-[10px] font-bold uppercase tracking-wider">
                  {perk.tag}
                </span>
                <p className="text-sm font-bold text-white leading-snug">{perk.title}</p>
                <p className="text-xs text-white/75 leading-relaxed">{perk.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
