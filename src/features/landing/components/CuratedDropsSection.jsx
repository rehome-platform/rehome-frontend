import React, { useEffect, useMemo, useState } from 'react';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { APK_DOWNLOAD_URL } from '../constants/landingConstants.js';
import { isBrokenSeedAssetUrl } from '../services/landingApi.js';
import { ArrowRightIcon, ShoppingBagIcon } from './LandingIcons.jsx';

function ProductThumb({ src, alt }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed || isBrokenSeedAssetUrl(src)) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#EDF3EA] to-[#DDE7D9] text-[#006B2C] p-4">
        <div className="w-11 h-11 rounded-2xl bg-white/95 border border-[#071D12]/[0.08] flex items-center justify-center shadow-sm">
          <ShoppingBagIcon className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-bold tracking-wide text-[#071D12]/70">
          Đã kiểm định Mã hàng hóa
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  );
}

function matchesCategory(product, category) {
  if (!category) return true;
  if (
    product?.categoryId !== undefined &&
    product?.categoryId !== null &&
    String(product.categoryId) === String(category.id)
  ) {
    return true;
  }
  if (
    product?.category?.id !== undefined &&
    product?.category?.id !== null &&
    String(product.category.id) === String(category.id)
  ) {
    return true;
  }
  const pName = String(product?.categoryName || product?.category?.name || '')
    .trim()
    .toLowerCase();
  const cName = String(category?.name || '')
    .trim()
    .toLowerCase();
  return Boolean(pName && cName && pName === cName);
}

export default function CuratedDropsSection({
  products = [],
  categories = [],
  brands = [],
  loading = false,
  onOpenAppPrompt,
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const matchedCategories = useMemo(
    () => categories.filter((cat) => products.some((product) => matchesCategory(product, cat))),
    [categories, products]
  );

  useEffect(() => {
    if (
      selectedCategoryId &&
      !matchedCategories.some((cat) => String(cat.id) === String(selectedCategoryId))
    ) {
      setSelectedCategoryId('');
    }
  }, [matchedCategories, selectedCategoryId]);

  const activeCategory = useMemo(
    () => matchedCategories.find((cat) => String(cat.id) === String(selectedCategoryId)) || null,
    [matchedCategories, selectedCategoryId]
  );

  const filteredProducts = useMemo(() => {
    if (!activeCategory) return products;
    return products.filter((product) => matchesCategory(product, activeCategory));
  }, [products, activeCategory]);

  if (!loading && products.length === 0) {
    return null;
  }

  const visibleProducts = filteredProducts.slice(0, 8);

  return (
    <section id="drops" className="scroll-mt-20 bg-transparent">
      {/* Dải thương hiệu tinh tế khi có dữ liệu thật */}
      {!loading && brands.length > 0 && (
        <div className="border-y border-[#071D12]/[0.08] bg-white/75 py-3">
          <div className="max-w-[1240px] mx-auto px-5 sm:px-8 flex items-center gap-5 overflow-hidden">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#46564C] whitespace-nowrap shrink-0">
              Thương hiệu tại điểm kí gửi
            </span>
            <div className="landing-marquee-viewport flex-1 min-w-0">
              <div className="landing-marquee-track gap-6">
                <div className="flex items-center gap-6 shrink-0">
                  {brands.map((brand) => (
                    <span
                      key={brand.id}
                      className="text-xs font-bold tracking-wide text-[#071D12]/80 whitespace-nowrap"
                    >
                      {brand.name}
                    </span>
                  ))}
                </div>
                <div
                  aria-hidden="true"
                  className="landing-marquee-duplicate flex items-center gap-6 shrink-0"
                >
                  {brands.map((brand) => (
                    <span
                      key={`dup-${brand.id}`}
                      className="text-xs font-bold tracking-wide text-[#071D12]/80 whitespace-nowrap"
                    >
                      {brand.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-16 sm:py-20 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#006B2C]">
              <span className="landing-pulse-ring w-2 h-2 rounded-full bg-[#006B2C] text-[#006B2C]" />
              <span>Vừa kiểm định tại điểm kí gửi</span>
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-[#071D12]">
              Kệ hàng tuyển chọn hôm nay
            </h2>
          </div>

          <a
            href={APK_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#006B2C] hover:text-[#005523] transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <span>Xem toàn bộ trên App</span>
            <ArrowRightIcon className="w-4 h-4 shrink-0" />
          </a>
        </div>

        {/* Bộ lọc danh mục hoàn toàn phía client dựa trên dữ liệu đã tải */}
        {!loading && matchedCategories.length > 0 && (
          <div
            role="group"
            aria-label="Lọc sản phẩm theo danh mục"
            className="flex items-center gap-2 overflow-x-auto pb-1 landing-rail-scroll"
          >
            <button
              type="button"
              aria-pressed={!selectedCategoryId}
              onClick={() => setSelectedCategoryId('')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                !selectedCategoryId
                  ? 'bg-[#071D12] text-white'
                  : 'bg-white text-[#46564C] border border-[#071D12]/10 hover:border-[#006B2C] hover:text-[#071D12]'
              }`}
            >
              Tất cả
            </button>
            {matchedCategories.map((cat) => {
              const isActive = String(selectedCategoryId) === String(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#071D12] text-white'
                      : 'bg-white text-[#46564C] border border-[#071D12]/10 hover:border-[#006B2C] hover:text-[#071D12]'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="space-y-3 animate-pulse">
                <div className="aspect-[3/4] rounded-2xl bg-[#EBF1E8]" />
                <div className="h-3 w-2/5 rounded bg-[#EBF1E8]" />
                <div className="h-4 w-4/5 rounded bg-[#EBF1E8]" />
                <div className="h-4 w-1/3 rounded bg-[#EBF1E8]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {visibleProducts.map((product) => {
              const current = Number(product.currentPrice) || 0;
              const original = Number(product.originalPrice) || 0;
              const hasDiscount = original > current && current > 0;
              const discountPct = hasDiscount
                ? Math.round(((original - current) / original) * 100)
                : 0;

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onOpenAppPrompt?.(product)}
                  className="lookbook-card group text-left flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006B2C] focus-visible:ring-offset-4 rounded-2xl"
                >
                  <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden bg-[#EBF1E8] border border-[#071D12]/[0.07] relative">
                    <ProductThumb src={product.thumbnailUrl} alt={product.name} />

                    <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                      {product.size ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-sm border border-[#071D12]/[0.08] text-[11px] font-bold text-[#071D12] whitespace-nowrap">
                          Size {product.size}
                        </span>
                      ) : (
                        <span />
                      )}

                      {discountPct > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#071D12]/90 text-white text-[11px] font-bold tabular-nums whitespace-nowrap">
                          -{discountPct}%
                        </span>
                      )}
                    </div>

                    <div className="absolute inset-x-3 bottom-3 flex justify-center opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-[11px] font-bold text-[#071D12] shadow-sm whitespace-nowrap">
                        <span>Mở App để thử AI</span>
                        <ArrowRightIcon className="w-3 h-3 text-[#006B2C]" />
                      </span>
                    </div>
                  </div>

                  <div className="pt-3.5 space-y-1 w-full">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold uppercase tracking-[0.08em] text-[#00685F] truncate">
                        {product.brandName || product.categoryName || 'Đã kiểm định'}
                      </span>
                      {product.condition && (
                        <span className="font-medium text-[#46564C] shrink-0 truncate">
                          {product.condition}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-[#071D12] line-clamp-1 group-hover:text-[#006B2C] transition-colors">
                      {product.name}
                    </h3>

                    <div className="flex items-baseline gap-2 pt-0.5">
                      <span className="text-[15px] font-extrabold text-[#006B2C] tabular-nums">
                        {formatCurrencyVND(current)}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-[#46564C]/75 line-through tabular-nums">
                          {formatCurrencyVND(original)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
