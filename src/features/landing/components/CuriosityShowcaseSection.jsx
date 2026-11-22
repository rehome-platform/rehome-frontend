import React, { useState } from 'react';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { APK_DOWNLOAD_URL, CURIOSITY_CARDS } from '../constants/landingConstants.js';
import { isBrokenSeedAssetUrl } from '../services/landingApi.js';
import { ArrowRightIcon, ShoppingBagIcon } from './LandingIcons.jsx';
import { CardSticker } from './LandingStickers.jsx';

function ProductThumb({ src, alt }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed || isBrokenSeedAssetUrl(src)) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#EAF2E5] to-[#DAE7D4] text-[#006B2C] p-4">
        <div className="w-11 h-11 rounded-2xl bg-white/90 flex items-center justify-center shadow-sm">
          <ShoppingBagIcon className="w-5 h-5" />
        </div>
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

export default function CuriosityShowcaseSection({
  products = [],
  loading = false,
  onOpenAppPrompt,
  onOpenInfoModal,
}) {
  const visibleProducts = products.slice(0, 5);

  return (
    <section className="py-12 sm:py-16 bg-transparent">
      <div className="max-w-[1220px] mx-auto px-5 sm:px-8 space-y-16 sm:space-y-20">
        {/* Khối A: Dải Lookbook đồ thật vừa kiểm định tại kho */}
        {(loading || visibleProducts.length > 0) && (
          <div id="drops" className="space-y-6 scroll-mt-24">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2.5">
                <span className="landing-pulse-ring w-2.5 h-2.5 rounded-full bg-[#006B2C] text-[#006B2C]" />
                <h2 className="text-base sm:text-lg font-bold text-[#0D2419]">
                  Vừa kiểm định tại kho
                </h2>
              </div>

              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#006B2C] hover:text-[#005523] whitespace-nowrap"
              >
                <span>Xem thêm trên App</span>
                <ArrowRightIcon className="w-4 h-4 shrink-0" />
              </a>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className={`aspect-[3/4] rounded-[28px] animate-pulse bg-[#E7EFE4] ${
                      n === 5 ? 'hidden lg:block' : ''
                    }`}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
                {visibleProducts.map((product, idx) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => onOpenAppPrompt?.(product)}
                    className={`lookbook-card group relative aspect-[3/4] rounded-[28px] overflow-hidden bg-[#E7EFE4] text-left shadow-[0_12px_30px_-16px_rgba(13,36,25,0.22)] hover:-translate-y-1.5 transition-all duration-300 ${
                      idx === 4 ? 'hidden lg:block' : ''
                    }`}
                  >
                    <ProductThumb src={product.thumbnailUrl} alt={product.name} />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-[#061A10]/80 via-[#061A10]/20 to-transparent"
                    />
                    <div className="absolute inset-x-3.5 bottom-3.5 space-y-1 text-white">
                      <p className="text-xs sm:text-[13px] font-bold line-clamp-1">
                        {product.name}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-[13px] font-extrabold text-[#FFD27D] tabular-nums">
                          {formatCurrencyVND(product.currentPrice)}
                        </span>
                        <span className="hidden sm:inline-flex items-center text-[11px] font-bold text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
                          Thử AI →
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Khối B: 4 thẻ Squircle với sticker die-cut mở tab chi tiết trong ReHomeInfoModal */}
        <div id="explore" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 scroll-mt-24">
          {CURIOSITY_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onOpenInfoModal?.(card.modalTab)}
              className="curiosity-card landing-squircle-card group relative text-left p-6 sm:p-7 min-h-[256px] flex flex-col justify-start gap-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006B2C] focus-visible:ring-offset-2"
            >
              <span
                aria-hidden="true"
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#0D2419]/[0.04] group-hover:bg-[#006B2C] text-[#0D2419]/45 group-hover:text-white flex items-center justify-center transition-all duration-200"
              >
                <ArrowRightIcon className="w-3.5 h-3.5 -rotate-45 group-hover:rotate-0 transition-transform duration-200" />
              </span>

              <div className="h-[112px] w-full shrink-0 flex items-center justify-center pt-1">
                <CardSticker visual={card.visual} />
              </div>

              <div className="space-y-1.5">
                <h3 className="landing-text-balance text-[16px] xl:text-[17px] font-bold tracking-[-0.015em] text-[#0D2419] leading-snug">
                  {card.title}
                </h3>
                <p className="landing-text-balance text-[13.5px] font-medium text-[#0D2419]/65 leading-[1.55]">
                  {card.desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
