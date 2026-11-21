import React, { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import '../styles/landing.css';
import apkQrUrl from '../assets/apk-qr.svg';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { APK_DOWNLOAD_URL } from '../constants/landingConstants.js';
import {
  fetchLandingData,
  fetchPublicProducts,
  isBrokenSeedAssetUrl,
} from '../services/landingApi.js';
import LandingNavbar from '../components/LandingNavbar.jsx';
import HeroSection from '../components/HeroSection.jsx';
import FeaturesSection from '../components/FeaturesSection.jsx';
import MarketplaceShowcase from '../components/MarketplaceShowcase.jsx';
import CommunitySection from '../components/CommunitySection.jsx';
import WarehousesSection from '../components/WarehousesSection.jsx';
import MembershipPlansSection from '../components/MembershipPlansSection.jsx';
import ApkInstallSection from '../components/ApkInstallSection.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
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

const STAGGER_GROUP_SELECTORS = [
  '.bento-card',
  '.lookbook-card',
  '.community-card',
  '.warehouse-card',
  '.plan-card',
  '.install-step-card',
];

export default function LandingPage() {
  const containerRef = useRef(null);
  const [data, setData] = useState(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchLandingData();
      setData(result);
      setProductsError(result.errors.includes('products'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const result = await fetchLandingData();
        if (!active) return;
        setData(result);
        setProductsError(result.errors.includes('products'));
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
    document.title = 'ReHome — Ứng dụng Ký gửi Thời trang Tuần hoàn, Thử đồ AI & Thiện nguyện';
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

  const handleSelectCategory = async (categoryId) => {
    const nextId = categoryId || '';
    setSelectedCategoryId(nextId);

    if (!nextId) {
      setFilteredProducts(null);
      setProductsError(data.errors.includes('products'));
      return;
    }

    setLoadingProducts(true);
    setProductsError(false);
    try {
      const pageRes = await fetchPublicProducts({ page: 0, size: 6, categoryId: nextId });
      setFilteredProducts(pageRes.items);
    } catch {
      setFilteredProducts([]);
      setProductsError(true);
    } finally {
      setLoadingProducts(false);
    }
  };

  // 1. Hiệu ứng gắn cố định khi khởi tạo (Thanh tiến trình, Hero Choreography, Parallax Desktop)
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

      mm.add(
        {
          noMotion: '(prefers-reduced-motion: no-preference)',
          isDesktop: '(min-width: 1024px) and (prefers-reduced-motion: no-preference)',
        },
        (context) => {
          const { noMotion, isDesktop } = context.conditions;
          if (!noMotion) return;

          gsap.to('.landing-scroll-progress', {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: containerRef.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 0.15,
            },
          });

          const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
          heroTl
            .from('.hero-eyebrow', { y: 16, opacity: 0, duration: 0.45, clearProps: 'transform,opacity' })
            .from('.hero-title', { y: 22, opacity: 0, duration: 0.55, clearProps: 'transform,opacity' }, '-=0.28')
            .from('.hero-desc', { y: 18, opacity: 0, duration: 0.45, clearProps: 'transform,opacity' }, '-=0.34')
            .from('.hero-ctas', { y: 16, opacity: 0, duration: 0.45, clearProps: 'transform,opacity' }, '-=0.3')
            .from('.hero-meta', { y: 12, opacity: 0, duration: 0.4, clearProps: 'transform,opacity' }, '-=0.28')
            .from(
              '.hero-editorial-frame',
              { scale: 0.96, opacity: 0, duration: 0.7, clearProps: 'transform,opacity' },
              0.12
            )
            .from(
              '.hero-phone-float',
              { y: 24, opacity: 0, duration: 0.65, clearProps: 'opacity' },
              0.22
            );

          if (isDesktop) {
            gsap.to('.hero-phone-float', {
              y: -6,
              duration: 2.8,
              repeat: -1,
              yoyo: true,
              ease: 'sine.inOut',
            });

            gsap.to('.hero-editorial-frame', {
              yPercent: -5,
              ease: 'none',
              scrollTrigger: {
                trigger: '.landing-hero-mesh',
                start: 'top top',
                end: 'bottom top',
                scrub: 0.8,
              },
            });
          }
        }
      );

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  // 2. Stagger ScrollTrigger cho các nhóm thẻ sau khi dữ liệu API tải xong
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
        STAGGER_GROUP_SELECTORS.forEach((selector) => {
          const nodes = gsap.utils.toArray(selector);
          if (!nodes.length) return;
          gsap.from(nodes, {
            y: 22,
            opacity: 0,
            duration: 0.52,
            stagger: 0.08,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: nodes[0],
              start: 'top 90%',
              once: true,
            },
          });
        });

        gsap.utils.toArray('.reveal-section').forEach((sectionEl) => {
          gsap.from(sectionEl, {
            y: 20,
            opacity: 0,
            duration: 0.5,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: sectionEl,
              start: 'top 92%',
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
  }, [loading, filteredProducts]);

  const visibleProducts = selectedCategoryId ? filteredProducts || [] : data.products;
  const hasModalThumb =
    selectedProduct?.thumbnailUrl && !isBrokenSeedAssetUrl(selectedProduct.thumbnailUrl);

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col bg-[#F6F9F4] text-[#1F2A37]">
      <LandingNavbar />

      <main className="flex-1">
        <HeroSection
          stats={data.stats}
          loading={loading}
          hasLiveData={data.hasLiveData}
          products={data.products}
          campaigns={data.campaigns}
        />

        <FeaturesSection
          categories={data.categories}
          brands={data.brands}
          loading={loading}
        />

        <MarketplaceShowcase
          products={visibleProducts}
          categories={data.categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={handleSelectCategory}
          loading={loading || loadingProducts}
          hasError={productsError}
          onRetry={loadInitial}
          onOpenAppPrompt={setSelectedProduct}
        />

        <CommunitySection
          campaigns={data.campaigns}
          organizations={data.organizations}
          loading={loading}
        />

        <WarehousesSection warehouses={data.warehouses} loading={loading} />

        <MembershipPlansSection plans={data.plans} loading={loading} />

        <ApkInstallSection />
      </main>

      <LandingFooter />

      {/* Modal gọn khi nhấn xem sản phẩm để mời tải ứng dụng Android */}
      {selectedProduct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-prompt-title"
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white border border-[#DDE5D9] p-6 shadow-elevated space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5 min-w-0">
                {hasModalThumb && (
                  <img
                    src={selectedProduct.thumbnailUrl}
                    alt={selectedProduct.name}
                    className="w-16 h-20 rounded-2xl object-cover border border-[#DDE5D9] shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#006B2C] text-[11px] font-bold mb-1 whitespace-nowrap">
                    Trải nghiệm trên Android
                  </span>
                  <h3 id="app-prompt-title" className="text-lg font-bold text-[#1F2A37] line-clamp-2">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-base font-extrabold text-[#006B2C] mt-0.5">
                    {formatCurrencyVND(selectedProduct.currentPrice)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Đóng hộp thoại"
                onClick={() => setSelectedProduct(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#5B6776] hover:bg-[#F6F9F4] hover:text-[#1F2A37] shrink-0"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-[#F6F9F4] border border-[#DDE5D9] p-4 flex items-center gap-4">
              <img
                src={apkQrUrl}
                alt="Mã QR tải ReHome APK"
                className="w-20 h-20 rounded-xl bg-white p-1.5 border border-[#DDE5D9] shrink-0"
              />
              <p className="text-xs text-[#5B6776] leading-relaxed">
                Quét mã QR bằng điện thoại hoặc bấm nút bên dưới để tải ứng dụng ReHome Android,
                thử đồ AI và đặt mua an toàn.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-btn-shine flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#006B2C] hover:bg-[#005523] text-white text-sm font-bold transition-colors whitespace-nowrap shrink-0"
              >
                <DownloadIcon className="w-4 h-4 shrink-0" />
                <span>Tải APK từ Google Drive</span>
              </a>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-3 rounded-2xl border border-[#DDE5D9] text-sm font-semibold text-[#1F2A37] hover:bg-[#F6F9F4] whitespace-nowrap shrink-0"
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
