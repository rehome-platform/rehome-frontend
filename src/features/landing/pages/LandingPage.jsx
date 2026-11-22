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
import CuriosityShowcaseSection from '../components/CuriosityShowcaseSection.jsx';
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

const STAGGER_GROUP_SELECTORS = ['.lookbook-card', '.curiosity-card'];

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
    document.title = 'ReHome — Thử đồ AI qua camera & Ký gửi nhận 90%';
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

      mm.add(
        {
          noMotion: '(prefers-reduced-motion: no-preference)',
          isDesktop: '(min-width: 1024px) and (prefers-reduced-motion: no-preference)',
        },
        (context) => {
          const { noMotion, isDesktop } = context.conditions;
          if (!noMotion) return;

          const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
          heroTl
            .from('.hero-phone-float', {
              y: 20,
              opacity: 0,
              duration: 0.6,
              clearProps: 'opacity',
            })
            .from(
              '.hero-brand',
              { y: 16, opacity: 0, duration: 0.45, clearProps: 'transform,opacity' },
              '-=0.35'
            )
            .from(
              '.hero-title',
              { y: 16, opacity: 0, duration: 0.45, clearProps: 'transform,opacity' },
              '-=0.3'
            )
            .from(
              '.hero-actions',
              { y: 14, opacity: 0, duration: 0.4, clearProps: 'transform,opacity' },
              '-=0.25'
            );

          if (isDesktop) {
            gsap.to('.hero-phone-float', {
              y: -6,
              duration: 2.8,
              repeat: -1,
              yoyo: true,
              ease: 'sine.inOut',
            });
          }
        }
      );

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
        STAGGER_GROUP_SELECTORS.forEach((selector) => {
          const nodes = gsap.utils.toArray(selector);
          if (!nodes.length) return;
          gsap.from(nodes, {
            y: 20,
            opacity: 0,
            duration: 0.48,
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
      className="min-h-screen flex flex-col bg-[#F6F9F2] text-[#0D2419] overflow-x-clip relative"
    >
      <div
        aria-hidden="true"
        className="landing-top-glow pointer-events-none absolute inset-x-0 top-0 h-[760px]"
      />

      <LandingNavbar onOpenInfoModal={setInfoModalTab} />

      <main className="flex-1 overflow-x-clip relative z-10">
        <HeroSection products={data.products} onOpenInfoModal={setInfoModalTab} />

        <CuriosityShowcaseSection
          products={data.products}
          loading={loading}
          onOpenAppPrompt={setSelectedProduct}
          onOpenInfoModal={setInfoModalTab}
        />
      </main>

      <LandingFooter onOpenInfoModal={setInfoModalTab} />

      <ReHomeInfoModal
        isOpen={Boolean(infoModalTab)}
        activeTab={infoModalTab || 'about'}
        onSelectTab={setInfoModalTab}
        onClose={() => setInfoModalTab(null)}
      />

      {/* Modal gọn khi nhấn xem sản phẩm để mời tải ứng dụng Android */}
      {selectedProduct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-prompt-title"
          className="fixed inset-0 z-50 bg-[#0D2419]/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="w-full max-w-sm rounded-[32px] bg-[#F6F9F2] border border-white p-5 shadow-[0_24px_60px_rgba(13,36,25,0.24)] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {hasModalThumb && (
                  <img
                    src={selectedProduct.thumbnailUrl}
                    alt={selectedProduct.name}
                    className="w-14 h-[72px] rounded-2xl object-cover border-2 border-white shadow-sm shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#006B2C] text-[10px] font-bold mb-1 whitespace-nowrap">
                    Live Try-On &amp; AI Phối đồ
                  </span>
                  <h3 id="app-prompt-title" className="text-base font-bold text-[#0D2419] line-clamp-2">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-sm font-extrabold text-[#006B2C] mt-0.5 tabular-nums">
                    {formatCurrencyVND(selectedProduct.currentPrice)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Đóng hộp thoại"
                onClick={() => setSelectedProduct(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#0D2419]/55 hover:bg-[#0D2419]/[0.06] hover:text-[#0D2419] shrink-0"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-[24px] bg-white p-3.5 flex items-center gap-3.5 shadow-sm">
              <img
                src={apkQrUrl}
                alt="Mã QR tải ReHome APK"
                className="w-20 h-20 rounded-xl bg-[#F6F9F2] p-1 shrink-0"
              />
              <p className="text-[11px] font-medium text-[#0D2419]/65 leading-relaxed">
                Quét mã QR hoặc tải ReHome APK để thử món này bằng Live Try-On, nhờ AI phối nguyên
                set và chốt đơn an toàn.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-btn-shine flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#006B2C] hover:bg-[#005523] text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0"
              >
                <DownloadIcon className="w-4 h-4 shrink-0" />
                <span>Tải APK từ Google Drive</span>
              </a>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2.5 rounded-full bg-[#0D2419]/[0.07] hover:bg-[#0D2419]/[0.12] text-xs sm:text-sm font-semibold text-[#0D2419] whitespace-nowrap shrink-0 transition-colors"
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
