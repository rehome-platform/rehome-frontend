import React, { useState } from 'react';
import Button from '../../../../components/common/Button.jsx';
import ImageLightbox from '../../../../components/common/ImageLightbox.jsx';

export function ReturnImageLightbox({
  isOpen,
  onClose,
  images = [],
  initialIndex = 0,
  categoryLabel = '',
}) {
  return (
    <ImageLightbox
      isOpen={isOpen}
      onClose={onClose}
      images={images}
      initialIndex={initialIndex}
      categoryLabel={categoryLabel}
    />
  );
}

export function ReturnPhotoGallery({ photos = [], label, emptyText }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const safePhotos = Array.isArray(photos) ? photos.filter(Boolean) : [];
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {safePhotos.length ? (
          safePhotos.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setLightboxIndex(index)}
              title={`Phóng to ${label || 'ảnh'} ${index + 1}`}
              className="group relative w-28 h-32 rounded-xl overflow-hidden border border-neutral bg-background cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006B2C]/40"
            >
              <img
                src={src}
                alt={`${label} ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/65 text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Phóng to
              </span>
            </button>
          ))
        ) : (
          <p className="text-xs text-textSecondary">{emptyText}</p>
        )}
      </div>
      {lightboxIndex !== null && (
        <ImageLightbox
          isOpen={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
          images={safePhotos}
          initialIndex={lightboxIndex ?? 0}
          categoryLabel={label || ''}
        />
      )}
    </>
  );
}

export function ReturnEvidence({
  evidenceImageUrls = [],
  evidenceUploading = false,
  evidenceError = '',
  uploadEvidence,
  retryEvidence,
  removeEvidence,
}) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const count = evidenceImageUrls.length;
  const remaining = Math.max(0, 5 - count);
  const isCountValid = count >= 2 && count <= 5;
  const isDisabled = evidenceUploading || count >= 5;

  return (
    <div className="rounded-2xl border border-[#C6E1CE] bg-[#F6F9F4]/70 p-4 space-y-3 text-xs font-sans shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#ECFDF3] text-[#067647] border border-[#ABEFC6]">
            Bằng chứng kiểm hàng tại kho
          </span>
          <p className="font-bold text-text text-xs">Ảnh bằng chứng kiểm hàng (2 đến 5 ảnh) *</p>
          <p className="text-[11px] text-textSecondary">
            Ảnh chụp thực tế khi mở kiện hàng tại kho, tách biệt với ảnh đóng gói và ảnh người mua gửi.
          </p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${
            isCountValid
              ? 'bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]'
              : 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]'
          }`}
        >
          {`${count} / 5 ảnh đã tải lên`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <label
          className={`inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl border text-xs font-semibold transition-colors ${
            isDisabled
              ? 'border-neutral bg-white/60 text-textSecondary opacity-60 cursor-not-allowed'
              : 'border-[#006B2C] bg-white text-[#006B2C] hover:bg-[#ECFDF3] cursor-pointer'
          }`}
        >
          <span>
            {evidenceUploading
              ? 'Đang tải ảnh...'
              : remaining === 0
                ? 'Đã đủ tối đa 5 ảnh'
                : count === 0
                  ? 'Chọn ảnh kiểm hàng (2–5 ảnh)'
                  : `Thêm ảnh (còn ${remaining})`}
          </span>
          <input
            aria-label="Tải ảnh bằng chứng kiểm hàng"
            type="file"
            accept="image/*"
            multiple
            disabled={isDisabled}
            className="sr-only"
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              event.target.value = '';
              uploadEvidence?.(files);
            }}
          />
        </label>
        {count > 0 && (
          <span className="text-[11px] text-textSecondary">Bấm vào ảnh để xem kích thước đầy đủ</span>
        )}
      </div>

      {count > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {evidenceImageUrls.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="relative aspect-square rounded-xl overflow-hidden border border-neutral bg-white shadow-sm group"
            >
              <button
                type="button"
                onClick={() => setLightboxIndex(index)}
                className="w-full h-full block cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#006B2C]/40"
                title={`Xem ảnh bằng chứng ${index + 1}`}
              >
                <img
                  src={url}
                  alt={`Bằng chứng kiểm hàng ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/65 text-white text-[10px] font-bold">
                  #{index + 1}
                </span>
                <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-white/90 text-[#1F2A37] text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Phóng to
                </span>
              </button>
              <button
                type="button"
                disabled={evidenceUploading}
                onClick={(event) => {
                  event.stopPropagation();
                  removeEvidence?.(index);
                }}
                aria-label={`Xóa ảnh bằng chứng ${index + 1}`}
                title="Xóa ảnh"
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white text-xs font-bold flex items-center justify-center hover:bg-[#D92D20] disabled:opacity-50 cursor-pointer transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#C6E1CE] bg-white/70 px-3.5 py-4 text-center text-[11px] text-textSecondary">
          Chưa có ảnh bằng chứng kiểm hàng. Vui lòng tải lên từ 2 đến 5 ảnh rõ nét.
        </div>
      )}

      {evidenceUploading && (
        <p role="status" className="text-xs font-semibold text-[#006B2C]">
          Đang tải ảnh lên...
        </p>
      )}
      {evidenceError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#FECDCA] bg-[#FEF3F2] px-3 py-2 text-[#B42318]"
        >
          <span className="font-medium">{evidenceError}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={evidenceUploading}
            onClick={() => retryEvidence?.()}
            className="border-[#FECDCA] text-[#B42318] hover:bg-white"
          >
            Thử tải lại
          </Button>
        </div>
      )}

      <ReturnImageLightbox
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        images={evidenceImageUrls}
        initialIndex={lightboxIndex ?? 0}
        categoryLabel="Ảnh bằng chứng kiểm hàng"
      />
    </div>
  );
}

export function ReturnPhotoComparison({
  packingPhotos = [],
  stockPhotos = [],
  buyerPhotos = [],
  stockInDate,
  compact = false,
}) {
  const [lightboxState, setLightboxState] = useState(null);
  const safePacking = Array.isArray(packingPhotos) ? packingPhotos.filter(Boolean) : [];
  const safeStock = Array.isArray(stockPhotos) ? stockPhotos.filter(Boolean) : [];
  const safeBuyer = Array.isArray(buyerPhotos) ? buyerPhotos.filter(Boolean) : [];

  const hasPackingPhotos = safePacking.length > 0;
  const referencePhotos = hasPackingPhotos ? safePacking : safeStock;
  const referenceCategoryLabel = hasPackingPhotos ? 'Ảnh đóng gói' : 'Ảnh nhập kho ban đầu';
  const tileGridClass = compact
    ? 'grid grid-cols-2 gap-2.5'
    : 'grid grid-cols-2 sm:grid-cols-2 gap-3';

  return (
    <div className="space-y-4 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* Nhóm 1: Ảnh đóng gói */}
        <section className="rounded-2xl border border-[#ABEFC6] bg-white overflow-hidden shadow-sm flex flex-col">
          <div className="px-3.5 py-2.5 bg-[#ECFDF3] border-b border-[#ABEFC6] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[#12B76A] shrink-0" />
              <h3 className="text-xs font-bold text-[#067647] truncate">Ảnh đóng gói</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#067647] border border-[#ABEFC6] whitespace-nowrap">
              {`${referencePhotos.length} ảnh`}
            </span>
          </div>
          <div className="p-3.5 space-y-2.5 flex-1">
            <p className="text-[11px] text-textSecondary leading-snug">
              {hasPackingPhotos
                ? 'So với ảnh đóng gói lúc xuất kho'
                : `Đơn cũ dùng ảnh nhập kho ban đầu (${stockInDate || 'Kho'})`}
            </p>
            {referencePhotos.length > 0 ? (
              <div className={tileGridClass}>
                {referencePhotos.map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() =>
                      setLightboxState({
                        images: referencePhotos,
                        index,
                        categoryLabel: referenceCategoryLabel,
                      })
                    }
                    className="relative aspect-[4/3] w-full rounded-xl overflow-hidden border border-neutral bg-[#F8FAF8] group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#006B2C]/40"
                    title={`Phóng to ${hasPackingPhotos ? `ảnh đóng gói ${index + 1}` : `ảnh nhập kho ${index + 1}`}`}
                  >
                    <img
                      src={src}
                      alt={hasPackingPhotos ? `Ảnh đóng gói ${index + 1}` : `Ảnh nhập kho ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/65 text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      Phóng to
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral bg-[#F8FAF8] p-4 text-center text-xs text-[#717971]">
                Chưa có ảnh đóng gói / chưa có ảnh nhập kho
              </div>
            )}
          </div>
        </section>

        {/* Nhóm 2: Ảnh người mua gửi */}
        <section className="rounded-2xl border border-[#FEDF89] bg-white overflow-hidden shadow-sm flex flex-col">
          <div className="px-3.5 py-2.5 bg-[#FFFAEB] border-b border-[#FEDF89] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[#F79009] shrink-0" />
              <h3 className="text-xs font-bold text-[#B54708] truncate">Ảnh người mua gửi</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#B54708] border border-[#FEDF89] whitespace-nowrap">
              {`${safeBuyer.length} ảnh`}
            </span>
          </div>
          <div className="p-3.5 space-y-2.5 flex-1">
            <p className="text-[11px] text-textSecondary leading-snug">
              Ảnh bằng chứng do người mua gửi kèm yêu cầu trả hàng
            </p>
            {safeBuyer.length > 0 ? (
              <div className={tileGridClass}>
                {safeBuyer.map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() =>
                      setLightboxState({
                        images: safeBuyer,
                        index,
                        categoryLabel: 'Ảnh người mua gửi',
                      })
                    }
                    className="relative aspect-[4/3] w-full rounded-xl overflow-hidden border border-neutral bg-[#FFFDF7] group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F79009]/40"
                    title={`Phóng to ảnh người mua ${index + 1}`}
                  >
                    <img
                      src={src}
                      alt={`Ảnh người mua ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/65 text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      Phóng to
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral bg-[#FFFDF7] p-4 text-center text-xs text-[#717971]">
                Chưa có ảnh người mua
              </div>
            )}
          </div>
        </section>
      </div>

      {hasPackingPhotos && safeStock.length > 0 && (
        <div className="rounded-xl border border-neutral bg-background/60 p-3 space-y-2">
          <div className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">
            Tham khảo thêm · Ảnh nhập kho ban đầu
          </div>
          <div className="flex flex-wrap gap-2">
            {safeStock.map((src, index) => (
              <button
                key={`${src}-${index}`}
                type="button"
                onClick={() =>
                  setLightboxState({
                    images: safeStock,
                    index,
                    categoryLabel: 'Ảnh nhập kho ban đầu',
                  })
                }
                className="w-16 h-16 rounded-lg overflow-hidden border border-neutral bg-white cursor-pointer hover:ring-2 hover:ring-[#006B2C]/30"
                title={`Phóng to ảnh nhập kho ${index + 1}`}
              >
                <img
                  src={src}
                  alt={`Ảnh nhập kho ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <ReturnImageLightbox
        isOpen={Boolean(lightboxState)}
        onClose={() => setLightboxState(null)}
        images={lightboxState?.images || []}
        initialIndex={lightboxState?.index ?? 0}
        categoryLabel={lightboxState?.categoryLabel || ''}
      />
    </div>
  );
}
