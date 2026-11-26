import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const BUTTON_ZOOM_STEP = 0.5;
const WHEEL_ZOOM_STEP = 0.25;

const clampScale = (value) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(value * 100) / 100));

function isSafeOpenableUrl(src) {
  if (!src || typeof src !== 'string') return false;
  const trimmed = src.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/')
  );
}

function normalizeImages(images, categoryLabel) {
  if (!Array.isArray(images)) return [];
  return images
    .map((item, idx) => {
      if (!item) return null;
      if (typeof item === 'string') {
        const src = item.trim();
        if (!src) return null;
        return {
          src,
          alt: categoryLabel ? `${categoryLabel} ${idx + 1}` : `Ảnh ${idx + 1}`,
          caption: '',
        };
      }
      const src = String(item.src || item.url || item.imageUrl || '').trim();
      if (!src) return null;
      const caption = item.caption || item.label || '';
      const alt =
        item.alt ||
        item.label ||
        item.caption ||
        (categoryLabel ? `${categoryLabel} ${idx + 1}` : `Ảnh ${idx + 1}`);
      return { src, alt, caption };
    })
    .filter(Boolean);
}

/**
 * Khung xem ảnh toàn màn hình hỗ trợ phóng to/thu nhỏ, kéo xem chi tiết và chuyển nhiều ảnh.
 */
export function ImageLightbox({
  isOpen,
  onClose,
  images = [],
  initialIndex = 0,
  title = '',
  categoryLabel = '',
}) {
  const items = useMemo(() => normalizeImages(images, categoryLabel), [images, categoryLabel]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scale, setScale] = useState(MIN_SCALE);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imgError, setImgError] = useState(false);

  const stageRef = useRef(null);
  const imgRef = useRef(null);
  const scaleRef = useRef(MIN_SCALE);
  scaleRef.current = scale;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const pointersRef = useRef(new Map());
  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const pinchStateRef = useRef({
    active: false,
    startDistance: 0,
    startScale: MIN_SCALE,
  });
  const didDragRef = useRef(false);

  const resetTransform = useCallback(() => {
    setScale(MIN_SCALE);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
    dragStateRef.current.active = false;
    pinchStateRef.current.active = false;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const clamped = Math.max(0, Math.min(Number(initialIndex) || 0, Math.max(0, items.length - 1)));
    setActiveIndex(clamped);
    resetTransform();
    setImgError(false);
  }, [isOpen, initialIndex, items.length, resetTransform]);

  const current = items[activeIndex] || items[0] || null;

  useEffect(() => {
    setImgError(false);
  }, [current?.src]);

  const clampOffset = useCallback((nextX, nextY, targetScale) => {
    const safeX = Number.isFinite(nextX) ? nextX : 0;
    const safeY = Number.isFinite(nextY) ? nextY : 0;
    if (targetScale <= MIN_SCALE) return { x: 0, y: 0 };

    const stageRect = stageRef.current?.getBoundingClientRect?.();
    const imgRect = imgRef.current?.getBoundingClientRect?.();

    const baseWidth =
      imgRect && imgRect.width > 0
        ? imgRect.width / (scale || 1)
        : stageRect && stageRect.width > 0
          ? stageRect.width * 0.75
          : 0;
    const baseHeight =
      imgRect && imgRect.height > 0
        ? imgRect.height / (scale || 1)
        : stageRect && stageRect.height > 0
          ? stageRect.height * 0.75
          : 0;

    const maxX =
      baseWidth > 0 ? Math.max(120, (baseWidth * (targetScale - 1)) / 2 + 120) : 600 * (targetScale - 1);
    const maxY =
      baseHeight > 0 ? Math.max(120, (baseHeight * (targetScale - 1)) / 2 + 120) : 600 * (targetScale - 1);

    return {
      x: Math.min(maxX, Math.max(-maxX, Math.round(safeX))),
      y: Math.min(maxY, Math.max(-maxY, Math.round(safeY))),
    };
  }, [scale]);

  const applyScale = useCallback(
    (nextScaleRaw) => {
      const nextScale = clampScale(nextScaleRaw);
      scaleRef.current = nextScale;
      setScale(nextScale);
      setOffset((prev) => clampOffset(prev.x, prev.y, nextScale));
    },
    [clampOffset]
  );

  const zoomIn = useCallback(() => {
    applyScale(scaleRef.current + BUTTON_ZOOM_STEP);
  }, [applyScale]);

  const zoomOut = useCallback(() => {
    applyScale(scaleRef.current - BUTTON_ZOOM_STEP);
  }, [applyScale]);

  const resetZoom = useCallback(() => {
    scaleRef.current = MIN_SCALE;
    setScale(MIN_SCALE);
    setOffset({ x: 0, y: 0 });
  }, []);

  const toggleDoubleClickZoom = useCallback(() => {
    if (scaleRef.current > MIN_SCALE) {
      resetZoom();
    } else {
      applyScale(2);
    }
  }, [applyScale, resetZoom]);

  const selectIndex = useCallback(
    (nextIdx) => {
      if (items.length === 0) return;
      const wrapped = ((nextIdx % items.length) + items.length) % items.length;
      setActiveIndex(wrapped);
      resetTransform();
    },
    [items.length, resetTransform]
  );

  const goPrev = useCallback(() => {
    selectIndex(activeIndex - 1);
  }, [activeIndex, selectIndex]);

  const goNext = useCallback(() => {
    selectIndex(activeIndex + 1);
  }, [activeIndex, selectIndex]);

  // Khóa cuộn trang nền và phục hồi đúng trạng thái trước đó (tránh làm hỏng Modal cha)
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Capture-phase keyboard shortcuts để ưu tiên trước Modal cha / phím tắt trang
  useEffect(() => {
    if (!isOpen || items.length === 0) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onCloseRef.current?.();
      } else if (e.key === 'ArrowLeft' && items.length > 1) {
        e.preventDefault();
        e.stopImmediatePropagation();
        goPrev();
      } else if (e.key === 'ArrowRight' && items.length > 1) {
        e.preventDefault();
        e.stopImmediatePropagation();
        goNext();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        e.stopImmediatePropagation();
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        e.stopImmediatePropagation();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        e.stopImmediatePropagation();
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, items.length, goPrev, goNext, zoomIn, zoomOut, resetZoom]);

  // Wheel listener không-passive để cuộn chuột zoom mượt mà không cuộn trang
  useEffect(() => {
    const stageEl = stageRef.current;
    if (!isOpen || !stageEl) return undefined;

    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? WHEEL_ZOOM_STEP : -WHEEL_ZOOM_STEP;
      applyScale(scaleRef.current + delta);
    };

    stageEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => stageEl.removeEventListener('wheel', handleWheel);
  }, [isOpen, applyScale]);

  const handlePointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const clientX = Number.isFinite(e.clientX) ? e.clientX : 0;
    const clientY = Number.isFinite(e.clientY) ? e.clientY : 0;
    const pointerId = e.pointerId ?? 1;

    pointersRef.current.set(pointerId, { x: clientX, y: clientY });
    didDragRef.current = false;

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchStateRef.current = {
        active: true,
        startDistance: Math.max(dist, 1),
        startScale: scaleRef.current,
      };
      dragStateRef.current.active = false;
      setIsDragging(false);
      return;
    }

    if (scaleRef.current > MIN_SCALE) {
      dragStateRef.current = {
        active: true,
        startX: clientX,
        startY: clientY,
        originX: offset.x,
        originY: offset.y,
      };
      setIsDragging(true);
      try {
        e.currentTarget.setPointerCapture?.(pointerId);
      } catch {
        // Bỏ qua trong môi trường jsdom
      }
    }
  };

  const handlePointerMove = (e) => {
    const clientX = Number.isFinite(e.clientX) ? e.clientX : 0;
    const clientY = Number.isFinite(e.clientY) ? e.clientY : 0;
    const pointerId = e.pointerId ?? 1;

    if (pointersRef.current.has(pointerId)) {
      pointersRef.current.set(pointerId, { x: clientX, y: clientY });
    }

    if (pinchStateRef.current.active && pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const ratio = dist / pinchStateRef.current.startDistance;
      didDragRef.current = true;
      applyScale(pinchStateRef.current.startScale * ratio);
      return;
    }

    if (!dragStateRef.current.active || scaleRef.current <= MIN_SCALE) return;

    const dx = clientX - dragStateRef.current.startX;
    const dy = clientY - dragStateRef.current.startY;
    if (Math.hypot(dx, dy) > 4) {
      didDragRef.current = true;
    }

    setOffset(
      clampOffset(dragStateRef.current.originX + dx, dragStateRef.current.originY + dy, scaleRef.current)
    );
  };

  const handlePointerUpOrCancel = (e) => {
    const pointerId = e.pointerId ?? 1;
    pointersRef.current.delete(pointerId);

    if (pointersRef.current.size < 2) {
      pinchStateRef.current.active = false;
    }

    if (dragStateRef.current.active) {
      dragStateRef.current.active = false;
      setIsDragging(false);
      try {
        if (e.currentTarget.hasPointerCapture?.(pointerId)) {
          e.currentTarget.releasePointerCapture(pointerId);
        }
      } catch {
        // Bỏ qua trong môi trường jsdom
      }
    }
  };

  const handleBackdropClick = (e) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  if (!isOpen || items.length === 0 || !current) return null;

  const modalTitle = title || (categoryLabel ? `Xem ảnh · ${categoryLabel}` : 'Xem ảnh chi tiết');
  const zoomPercent = Math.round(scale * 100);
  const canOpenOriginal = isSafeOpenableUrl(current.src);

  const lightboxNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={modalTitle}
      className="fixed inset-0 z-[80] flex flex-col bg-black/90 text-white backdrop-blur-sm select-none"
    >
      {/* Thanh công cụ phía trên */}
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-black/50 border-b border-white/10 shrink-0">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {categoryLabel && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/15 text-white text-xs font-semibold border border-white/15 truncate max-w-[240px]">
              {categoryLabel}
            </span>
          )}
          {title && title !== categoryLabel && (
            <span className="text-sm font-semibold text-white/95 truncate max-w-[260px]">
              {title}
            </span>
          )}
          {current.caption && current.caption !== title && current.caption !== categoryLabel && (
            <span className="text-xs text-white/75 truncate max-w-[220px]">· {current.caption}</span>
          )}
          <span className="text-xs font-semibold text-white/80 px-2 py-0.5 rounded-md bg-white/10 whitespace-nowrap">
            {`Ảnh ${activeIndex + 1} / ${items.length}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Thu nhỏ"
            title="Thu nhỏ (-)"
            disabled={scale <= MIN_SCALE}
            onClick={zoomOut}
            className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            −
          </button>

          <button
            type="button"
            aria-label="Đặt lại thu phóng"
            title="Đặt lại 100% (0)"
            onClick={resetZoom}
            className="h-8 min-w-[54px] px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition-colors cursor-pointer"
          >
            {`${zoomPercent}%`}
          </button>

          <button
            type="button"
            aria-label="Phóng to"
            title="Phóng to (+)"
            disabled={scale >= MAX_SCALE}
            onClick={zoomIn}
            className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            +
          </button>

          {scale > MIN_SCALE && (
            <button
              type="button"
              onClick={resetZoom}
              className="h-8 px-2.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Đặt lại
            </button>
          )}

          {canOpenOriginal && (
            <a
              href={current.src}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Mở ảnh gốc trong tab mới"
              title="Mở ảnh gốc trong tab mới"
              className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center transition-colors"
            >
              ↗
            </a>
          )}

          <button
            type="button"
            aria-label="Đóng"
            title="Đóng (Esc)"
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-white/15 hover:bg-red-600/80 text-white text-sm font-bold inline-flex items-center justify-center transition-colors cursor-pointer ml-1"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Khu vực hiển thị ảnh chính */}
      <div
        ref={stageRef}
        onClick={handleBackdropClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        className={`relative flex-1 min-h-0 flex items-center justify-center overflow-hidden p-4 touch-none ${
          scale > MIN_SCALE ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
      >
        {items.length > 1 && (
          <button
            type="button"
            aria-label="Ảnh trước"
            title="Ảnh trước (←)"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-3 sm:left-5 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 border border-white/20 text-white text-lg font-bold flex items-center justify-center transition-colors cursor-pointer"
          >
            ‹
          </button>
        )}

        {imgError ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl border border-white/20 bg-white/10 px-6 py-8 text-center space-y-2 max-w-sm"
          >
            <p className="text-sm font-semibold text-white">Không thể tải ảnh này</p>
            <p className="text-xs text-white/70">Đường dẫn ảnh không khả dụng hoặc đã hết hạn.</p>
          </div>
        ) : (
          <img
            ref={imgRef}
            src={current.src}
            alt={current.alt}
            draggable={false}
            onError={() => setImgError(true)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              toggleDoubleClickZoom();
            }}
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
            }}
            className={`max-h-full max-w-full object-contain rounded-lg select-none shadow-2xl ${
              scale === MIN_SCALE ? 'cursor-zoom-in' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
            } ${isDragging ? 'transition-none' : 'transition-transform duration-150 ease-out'}`}
          />
        )}

        {items.length > 1 && (
          <button
            type="button"
            aria-label="Ảnh sau"
            title="Ảnh sau (→)"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-3 sm:right-5 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 border border-white/20 text-white text-lg font-bold flex items-center justify-center transition-colors cursor-pointer"
          >
            ›
          </button>
        )}
      </div>

      {/* Thanh hướng dẫn và dải thumbnail phía dưới */}
      <footer className="px-4 py-2.5 bg-black/50 border-t border-white/10 shrink-0 space-y-2">
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-0.5">
            {items.map((item, idx) => (
              <button
                key={`${item.src}-${idx}`}
                type="button"
                aria-label={`Chuyển tới ảnh ${idx + 1}`}
                onClick={() => selectIndex(idx)}
                className={`w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                  idx === activeIndex
                    ? 'border-white ring-2 ring-white/40 opacity-100 scale-105'
                    : 'border-white/25 opacity-60 hover:opacity-95'
                }`}
              >
                <img
                  src={item.src}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full object-cover pointer-events-none"
                />
              </button>
            ))}
          </div>
        )}
        <p className="text-center text-[11px] text-white/65">
          Cuộn chuột hoặc bấm +/− để thu phóng · Kéo ảnh để xem chi tiết · Nhấp đúp để phóng to/đặt lại · Esc để đóng
        </p>
      </footer>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(lightboxNode, document.body) : lightboxNode;
}

/**
 * Wrapper nhẹ cho ảnh đơn lẻ: bấm để mở ImageLightbox phóng to & kéo xem chi tiết.
 */
export function ZoomableImage({
  src,
  alt = 'Hình ảnh',
  className = '',
  imgClassName = 'w-full h-full object-cover',
  title = '',
  categoryLabel = '',
  images,
  initialIndex = 0,
  onError,
  buttonAriaLabel,
  showHoverBadge = true,
}) {
  const [open, setOpen] = useState(false);

  if (!src) return null;

  const lightboxImages = Array.isArray(images) && images.length > 0 ? images : [{ src, alt }];

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={buttonAriaLabel}
        title="Bấm để xem & phóng to ảnh"
        className={`group relative cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006B2C]/40 ${className}`.trim()}
      >
        <img src={src} alt={alt} className={imgClassName} onError={onError} />
        {showHoverBadge && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/65 text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Phóng to
          </span>
        )}
      </button>
      {open && (
        <ImageLightbox
          isOpen={open}
          onClose={() => setOpen(false)}
          images={lightboxImages}
          initialIndex={initialIndex}
          title={title}
          categoryLabel={categoryLabel}
        />
      )}
    </>
  );
}

export default ImageLightbox;
