import React, { useState } from 'react';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { APK_DOWNLOAD_URL } from '../constants/landingConstants.js';
import { isBrokenSeedAssetUrl } from '../services/landingApi.js';
import { AndroidIcon, ShoppingBagIcon } from './LandingIcons.jsx';

function ProductThumbnail({ src, alt }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError || isBrokenSeedAssetUrl(src)) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F4F8F2] to-[#E3EDE0] text-[#006B2C] p-6">
        <div className="w-12 h-12 rounded-2xl bg-white/95 border border-[#DDE5D9] flex items-center justify-center mb-2.5 shadow-sm">
          <ShoppingBagIcon className="w-6 h-6" />
        </div>
        <span className="text-xs font-bold tracking-wide">Đã kiểm định ReHome</span>
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
  const filterCategories = categories.slice(0, 6);

  return (
    <section
      id="marketplace"
      className="relative overflow-hidden py-20 sm:py-24 bg-[#F4F7F1] border-b border-[#DDE5D9]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 18% 0%, rgba(0, 107, 44, 0.06), transparent 46%)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-9">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-2xl space-y-3">
            <span className="inline-block px-3.5 py-1 rounded-full bg-white border border-[#DDE5D9] text-[#006B2C] text-xs font-bold uppercase tracking-wider">
              Lookbook sàn tuần hoàn
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1F2A37]">
              Sản phẩm đang mở bán trên ReHome
            </h2>
            <p className="text-sm sm:text-base text-[#5B6776] leading-relaxed">
              Mỗi món đồ đều đã qua kiểm định thực tế tại kho, sẵn sàng để bạn thử đồ AI và đặt
              mua trên ứng dụng Android.
            </p>
          </div>

          <a
            href={APK_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="landing-btn-shine inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#006B2C] hover:bg-[#005523] text-white text-sm font-bold shrink-0 shadow-sm transition-colors whitespace-nowrap"
          >
            <AndroidIcon className="w-4 h-4 shrink-0" />
            <span>Xem thêm trên App</span>
          </a>
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
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
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
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
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

        {/* Trạng thái tải / lỗi / rỗng / lưới sản phẩm lookbook */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="rounded-3xl bg-white border border-[#DDE5D9] overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/5] bg-[#EBF1E8]" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-3/4 bg-[#EBF1E8] rounded" />
                  <div className="h-3 w-1/2 bg-[#EBF1E8] rounded" />
                  <div className="h-5 w-1/3 bg-[#EBF1E8] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : hasError && products.length === 0 ? (
          <div className="rounded-3xl bg-white border border-[#DDE5D9] p-10 text-center space-y-3">
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
                  className="px-4 py-2.5 rounded-xl border border-[#DDE5D9] text-xs font-bold text-[#1F2A37] hover:bg-[#F6F9F4] whitespace-nowrap shrink-0"
                >
                  Thử tải lại
                </button>
              )}
              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-[#006B2C] text-white text-xs font-bold hover:bg-[#005523] whitespace-nowrap shrink-0"
              >
                Tải APK Android
              </a>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl bg-white border border-[#DDE5D9] p-10 text-center space-y-2">
            <p className="text-base font-bold text-[#1F2A37]">
              Chưa có sản phẩm phù hợp trong danh mục này.
            </p>
            <p className="text-sm text-[#5B6776]">
              Hãy chọn danh mục khác hoặc mở ứng dụng ReHome Android để theo dõi sản phẩm mới lên sàn.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.slice(0, 6).map((product) => {
              const current = Number(product.currentPrice) || 0;
              const original = Number(product.originalPrice) || 0;
              const hasDiscount = original > current && current > 0;
              const discountPct = hasDiscount
                ? Math.round(((original - current) / original) * 100)
                : 0;

              return (
                <article
                  key={product.id}
                  className="lookbook-card group rounded-3xl bg-white border border-[#DDE5D9] overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-[4/5] bg-[#EBF1E8] overflow-hidden">
                      <ProductThumbnail src={product.thumbnailUrl} alt={product.name} />

                      {/* Badges góc ảnh */}
                      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-start justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {product.featured && (
                            <span className="px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FEA619]/40 text-[11px] font-bold shadow-sm whitespace-nowrap">
                              Nổi bật
                            </span>
                          )}
                          {discountPct > 0 && (
                            <span className="px-2.5 py-1 rounded-full bg-[#062B19]/85 backdrop-blur-sm text-white text-[11px] font-bold whitespace-nowrap">
                              -{discountPct}%
                            </span>
                          )}
                        </div>
                        {product.size && (
                          <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[#1F2A37] text-[11px] font-bold shadow-sm shrink-0 whitespace-nowrap">
                            Size {product.size}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-5 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs text-[#5B6776]">
                        <span className="font-bold text-[#00685F] truncate">
                          {product.categoryName || 'Thời trang'}
                        </span>
                        {product.brandName && (
                          <span className="font-medium truncate">{product.brandName}</span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-[#1F2A37] line-clamp-2 min-h-[2.75rem]">
                        {product.name}
                      </h3>

                      {product.condition && (
                        <p className="text-xs text-[#5B6776]">Tình trạng: {product.condition}</p>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-3 border-t border-[#DDE5D9]/70 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-extrabold text-[#006B2C] tabular-nums">
                        {formatCurrencyVND(current)}
                      </div>
                      {hasDiscount && (
                        <div className="text-xs text-[#5B6776] line-through tabular-nums">
                          {formatCurrencyVND(original)}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenAppPrompt?.(product)}
                      className="px-4 py-2 rounded-xl bg-[#F6F9F4] hover:bg-[#006B2C] border border-[#DDE5D9] hover:border-[#006B2C] text-[#1F2A37] hover:text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                    >
                      Mở trong App
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
