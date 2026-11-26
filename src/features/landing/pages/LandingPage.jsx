import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import '../styles/landing.css';
import apkQrUrl from '../assets/apk-qr.svg';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { APK_DOWNLOAD_URL } from '../constants/landingConstants.js';
import { fetchLandingData, isBrokenSeedAssetUrl } from '../services/landingApi.js';
import LandingNavbar from '../components/LandingNavbar.jsx';
import HeroSection from '../components/HeroSection.jsx';
import CuratedDropsSection from '../components/CuratedDropsSection.jsx';
import ValueBentoSection from '../components/ValueBentoSection.jsx';
import NetworkCommunitySection from '../components/NetworkCommunitySection.jsx';
import ApkDownloadSection from '../components/ApkDownloadSection.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import ReHomeInfoModal from '../components/ReHomeInfoModal.jsx';
import { CloseIcon, DownloadIcon } from '../components/LandingIcons.jsx';

const hasMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';

if (typeof gsap?.registerPlugin === 'function') {
  if (typeof useGSAP === 'function') {
    gsap.registerPlugin(useGSAP);
  }
  if (hasMatchMedia && ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }
}

const useSafeGSAP = typeof useGSAP === 'function' ? useGSAP : () => {};

const INITIAL_DATA = {
  stats: {
    productsTotal: 0,
    warehousesTotal: 0,
    campaignsTotal: 0,
    organizationsTotal: 0,
    categoriesTotal: 0,
    brandsTotal: 0,
  },
  products: [],
  warehouses: [],
  campaigns: [],
  organizations: [],
  plans: [],
  categories: [],
  brands: [],
  errors: [],
  hasLiveData: false,
};

export default function LandingPage() {
  const containerRef = useRef(null);
  const [data, setData] = useState(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [infoModalTab, setInfoModalTab] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const result = await fetchLandingData();
        if (!active) return;
        setData(result);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'ReHome — Thời trang tuần hoàn, Thử đồ AI & Ký gửi nhận 90%';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    if (!selectedProduct) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedProduct(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedProduct]);

  useSafeGSAP(
    () => {
      if (
        typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function' ||
        typeof gsap?.matchMedia !== 'function'
      ) {
        return undefined;
      }

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        heroTl
          .from('.hero-stagger', {
            y: 16,
            opacity: 0,
            duration: 0.45,
            stagger: 0.06,
            clearProps: 'transform,opacity',
          })
          .from(
            '.hero-stage',
            {
              y: 20,
              opacity: 0,
              duration: 0.55,
              clearProps: 'transform,opacity',
            },
            '-=0.3'
          );
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  useSafeGSAP(
    () => {
      if (
        loading ||
        typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function' ||
        typeof gsap?.matchMedia !== 'function'
      ) {
        return undefined;
      }

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const lookbookCards = gsap.utils.toArray('.lookbook-card');
        if (lookbookCards.length) {
          gsap.from(lookbookCards, {
            y: 18,
            opacity: 0,
            duration: 0.45,
            stagger: 0.06,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: lookbookCards[0],
              start: 'top 90%',
              once: true,
            },
          });
        }

        const bentoCards = gsap.utils.toArray('.bento-card');
        if (bentoCards.length) {
          gsap.from(bentoCards, {
            y: 18,
            opacity: 0,
            duration: 0.48,
            stagger: 0.07,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: bentoCards[0],
              start: 'top 90%',
              once: true,
            },
          });
        }

        gsap.utils.toArray('.editorial-reveal').forEach((node) => {
          gsap.from(node, {
            y: 16,
            opacity: 0,
            duration: 0.45,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: node,
              start: 'top 90%',
              once: true,
            },
          });
        });
      });

      return () => mm.revert();
    },
    { scope: containerRef, dependencies: [loading], revertOnUpdate: true }
  );

  useEffect(() => {
    if (!loading && hasMatchMedia && typeof ScrollTrigger?.refresh === 'function') {
      ScrollTrigger.refresh();
    }
  }, [loading]);

  const hasModalThumb =
    selectedProduct?.thumbnailUrl && !isBrokenSeedAssetUrl(selectedProduct.thumbnailUrl);

  return (
    <div
      ref={containerRef}
      className="min-h-screen flex flex-col bg-[#F6F9F4] text-[#071D12] overflow-x-clip relative"
    >
      <LandingNavbar
        onOpenInfoModal={setInfoModalTab}
        hasProducts={loading || data.products.length > 0}
      />

      <main className="flex-1 overflow-x-clip">
        <HeroSection
          products={data.products}
          stats={data.stats}
          onOpenInfoModal={setInfoModalTab}
        />

        <CuratedDropsSection
          products={data.products}
          categories={data.categories}
          brands={data.brands}
          loading={loading}
          onOpenAppPrompt={setSelectedProduct}
        />

        <ValueBentoSection onOpenInfoModal={setInfoModalTab} />

        <NetworkCommunitySection
          warehouses={data.warehouses}
          campaigns={data.campaigns}
          organizations={data.organizations}
          loading={loading}
          onOpenInfoModal={setInfoModalTab}
        />

        <ApkDownloadSection onOpenInfoModal={setInfoModalTab} />
      </main>

      <LandingFooter onOpenInfoModal={setInfoModalTab} />

      <ReHomeInfoModal
        isOpen={Boolean(infoModalTab)}
        activeTab={infoModalTab || 'about'}
        onSelectTab={setInfoModalTab}
        onClose={() => setInfoModalTab(null)}
      />

      {/* Modal gọn khi nhấn xem sản phẩm để quét QR mở ứng dụng */}
      {selectedProduct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-prompt-title"
          className="fixed inset-0 z-50 bg-[#071D12]/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#F6F9F4] border border-[#071D12]/10 p-6 shadow-[0_28px_64px_rgba(7,29,18,0.26)] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {hasModalThumb && (
                  <img
                    src={selectedProduct.thumbnailUrl}
                    alt={selectedProduct.name}
                    className="w-16 h-20 rounded-2xl object-cover border border-[#071D12]/10 shrink-0"
                  />
                )}
                <div className="min-w-0 space-y-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#EBF1E8] text-[#006B2C] text-[10px] font-bold whitespace-nowrap">
                    Live Try-On &amp; AI Phối đồ
                  </span>
                  <h3
                    id="app-prompt-title"
                    className="text-base font-bold text-[#071D12] line-clamp-2 leading-snug"
                  >
                    {selectedProduct.name}
                  </h3>
                  {(selectedProduct.brandName || selectedProduct.size || selectedProduct.condition) && (
                    <p className="text-[11px] font-medium text-[#46564C] truncate">
                      {[
                        selectedProduct.brandName || selectedProduct.categoryName,
                        selectedProduct.size ? `Size ${selectedProduct.size}` : '',
                        selectedProduct.condition,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                  <p className="text-sm font-extrabold text-[#006B2C] tabular-nums">
                    {formatCurrencyVND(selectedProduct.currentPrice)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Đóng hộp thoại"
                onClick={() => setSelectedProduct(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#46564C] hover:bg-[#071D12]/[0.06] hover:text-[#071D12] shrink-0"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-white border border-[#071D12]/10 p-3.5 flex items-center gap-3.5">
              <img
                src={apkQrUrl}
                alt="Mã QR tải ReHome APK"
                className="w-20 h-20 rounded-xl bg-[#F6F9F4] p-1 border border-[#071D12]/[0.06] shrink-0"
              />
              <p className="text-[11px] font-medium text-[#46564C] leading-relaxed">
                Quét mã QR hoặc tải ReHome APK để thử món này bằng Live Try-On, nhờ AI phối nguyên
                set và chốt đơn an toàn.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-btn-shine flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#006B2C] hover:bg-[#005523] text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0"
              >
                <DownloadIcon className="w-4 h-4 shrink-0" />
                <span>Tải APK từ Google Drive</span>
              </a>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2.5 rounded-xl bg-white border border-[#071D12]/15 hover:bg-[#EBF1E8] text-xs sm:text-sm font-semibold text-[#071D12] whitespace-nowrap shrink-0 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
