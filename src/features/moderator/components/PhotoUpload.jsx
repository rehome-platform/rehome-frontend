import React, { useEffect, useRef, useState } from 'react';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import { inventoryService } from '../services/warehouseApi.js';
import { usePhase2 } from '../hooks/warehouseHooks.jsx';
import { normalizeError } from '../models/warehouseModel.js';

export default function PhotoUpload({ onChange, disabled = false }) {
  const phase2 = usePhase2();
  const fallbackController = useRef(new AbortController());
  const signal = phase2?.signal || fallbackController.current.signal;
  const scope = phase2?.scope || 'warehouse';

  const [files, setFiles] = useState([]);
  const [previewModal, setPreviewModal] = useState(null); // { url, name }
  const controllers = useRef(new Set());
  const active = useRef(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controllers.current.forEach((controller) => controller.abort());
      // Revoke any created preview URLs to prevent memory leaks
      files.forEach((f) => {
        if (f.previewUrl && typeof window !== 'undefined' && window.URL?.revokeObjectURL) {
          window.URL.revokeObjectURL(f.previewUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (onChange) {
      onChange(
        files.filter((file) => file.status === 'DONE').map((file) => file.url),
        files.some((file) => ['PENDING', 'UPLOADING', 'FAILED'].includes(file.status))
      );
    }
  }, [files, onChange]);

  const upload = async (item) => {
    const controller = new AbortController();
    controllers.current.add(controller);
    const abort = () => controller.abort();
    signal?.addEventListener?.('abort', abort);

    const update = (patch) => {
      if (active.current && !signal?.aborted && !controller.signal.aborted) {
        setFiles((previous) =>
          previous.map((file) => (file.key === item.key ? { ...file, ...patch } : file))
        );
      }
    };

    update({ status: 'UPLOADING', error: null, progress: 0 });

    try {
      if (signal?.aborted) return;
      const result = await inventoryService.upload(item.file, {
        signal: controller.signal,
        scope,
        onUploadProgress: (event) =>
          update({ progress: event.total ? Math.round((event.loaded / event.total) * 100) : 0 }),
      });
      if (!result?.url) throw new Error('Upload không trả về URL ảnh.');
      update({ status: 'DONE', url: result.url, progress: 100 });
    } catch (error) {
      update({ status: 'FAILED', error: normalizeError(error).message });
    } finally {
      controllers.current.delete(controller);
      signal?.removeEventListener?.('abort', abort);
    }
  };

  const handleFilesAdded = (event) => {
    const rawFiles = Array.from(event.target.files || []);
    if (!rawFiles.length) return;

    const added = rawFiles.map((file) => {
      let previewUrl = '';
      if (typeof window !== 'undefined' && window.URL?.createObjectURL) {
        try {
          previewUrl = window.URL.createObjectURL(file);
        } catch {
          previewUrl = '';
        }
      }
      return {
        file,
        key: crypto.randomUUID ? crypto.randomUUID() : `photo-${Date.now()}-${Math.random()}`,
        status: 'PENDING',
        previewUrl,
        progress: 0,
        url: null,
        error: null,
      };
    });

    setFiles((previous) => [...previous, ...added]);
    added.forEach(upload);
    event.target.value = '';
  };

  const removePhoto = (item) => {
    if (item.previewUrl && typeof window !== 'undefined' && window.URL?.revokeObjectURL) {
      try {
        window.URL.revokeObjectURL(item.previewUrl);
      } catch {
        // ignore
      }
    }
    setFiles((previous) => previous.filter((file) => file.key !== item.key));
  };

  const movePhoto = (index, offset) => {
    const target = index + offset;
    if (target < 0 || target >= files.length) return;
    setFiles((previous) => {
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <div className="space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <label htmlFor="photo-file-input" className="block text-sm font-semibold text-[#191C19]">
          Ảnh sản phẩm ({files.length})
        </label>
        <span className="text-xs text-[#5B6776]">
          Ảnh đầu tiên sẽ là <strong>Ảnh chính</strong>
        </span>
      </div>

      {/* Grid danh sách ảnh thumbnail preview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
        {files.map((item, index) => {
          const imgSrc = item.url || item.previewUrl;
          const isPrimary = index === 0;

          return (
            <div
              key={item.key}
              className={`group relative rounded-2xl border-2 transition-all overflow-hidden bg-[#FAFBF9] flex flex-col ${
                isPrimary ? 'border-[#006B2C] shadow-sm' : 'border-[#DDE5D9] hover:border-[#717971]'
              }`}
            >
              {/* Ảnh Thumbnail */}
              <div className="relative aspect-square w-full bg-[#F0F2EE] flex items-center justify-center overflow-hidden">
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={item.file.name}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <span className="text-xs text-[#717971] p-2 text-center break-all">{item.file.name}</span>
                )}

                {/* Badge Ảnh chính */}
                {isPrimary && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#006B2C] text-white shadow-sm z-10">
                    Ảnh chính
                  </span>
                )}

                {/* Lớp phủ hành động: Phóng to & Xóa */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                  {imgSrc && (
                    <button
                      type="button"
                      aria-label={`Phóng to ${item.file.name}`}
                      onClick={() => setPreviewModal({ url: imgSrc, name: item.file.name })}
                      className="w-8 h-8 rounded-full bg-white text-[#191C19] flex items-center justify-center text-xs font-bold hover:bg-[#E8F5E9] transition-colors shadow"
                      title="Xem phóng to"
                    >
                      🔍
                    </button>
                  )}
                  {item.status !== 'UPLOADING' && (
                    <button
                      type="button"
                      aria-label={`Xóa ảnh ${item.file.name}`}
                      disabled={disabled}
                      onClick={() => removePhoto(item)}
                      className="w-8 h-8 rounded-full bg-white text-[#D92D20] flex items-center justify-center text-xs font-bold hover:bg-[#FEE4E2] transition-colors shadow"
                      title="Xóa ảnh"
                    >
                      🗑
                    </button>
                  )}
                </div>

                {/* Trạng thái Uploading / Tiến độ */}
                {item.status === 'UPLOADING' && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-3 text-white z-30 space-y-1">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mb-1" />
                    <span className="text-[11px] font-semibold">{item.progress}%</span>
                    <div className="w-full bg-white/30 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#006B2C] h-full" style={{ width: `${item.progress}%` }} />
                    </div>
                  </div>
                )}

                {/* Trạng thái lỗi */}
                {item.status === 'FAILED' && (
                  <div className="absolute inset-0 bg-red-950/70 p-2 flex flex-col items-center justify-center text-center text-white z-30">
                    <span className="text-[10px] font-semibold text-red-200 line-clamp-2 mb-1">
                      {item.error || 'Lỗi tải ảnh'}
                    </span>
                    <button
                      type="button"
                      onClick={() => upload(item)}
                      className="text-[10px] font-bold underline bg-white/20 px-2 py-0.5 rounded hover:bg-white/30"
                    >
                      Thử tải lại
                    </button>
                  </div>
                )}
              </div>

              {/* Thông tin & Điều hướng thứ tự bên dưới thumbnail */}
              <div className="p-2 border-t border-[#DDE5D9] bg-white flex items-center justify-between text-xs">
                <span className="truncate max-w-[90px] text-[11px] text-[#5B6776]" title={item.file.name}>
                  {item.file.name}
                </span>
                <span className="sr-only">
                  {item.file.name} · {item.status === 'DONE' ? 'Đã tải ảnh gốc' : item.status === 'UPLOADING' ? `Đang tải ${item.progress}%` : 'Chưa tải thành công'}
                </span>

                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label={`Đưa lên ${item.file.name}`}
                    disabled={disabled || index === 0}
                    onClick={() => movePhoto(index, -1)}
                    className="p-1 text-xs text-[#717971] hover:text-[#191C19] disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Đưa lên trước"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    aria-label={`Đưa xuống ${item.file.name}`}
                    disabled={disabled || index === files.length - 1}
                    onClick={() => movePhoto(index, 1)}
                    className="p-1 text-xs text-[#717971] hover:text-[#191C19] disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Đưa về sau"
                  >
                    ▶
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Ô bấm thêm ảnh (Dropzone / Add tile) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => !disabled && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              !disabled && fileInputRef.current?.click();
            }
          }}
          className={`aspect-square rounded-2xl border-2 border-dashed border-[#A5D6A7] bg-[#F8FAF8] hover:bg-[#E8F5E9] hover:border-[#006B2C] transition-all flex flex-col items-center justify-center p-3 text-center cursor-pointer ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-[#E8F5E9] text-[#006B2C] flex items-center justify-center text-xl font-bold mb-1">
            +
          </div>
          <span className="text-xs font-bold text-[#006B2C]">Thêm ảnh</span>
          <span className="text-[10px] text-[#5B6776] mt-0.5">Chọn hoặc kéo ảnh vào</span>
        </div>
      </div>

      {/* Input file ẩn thực tế */}
      <input
        ref={fileInputRef}
        id="photo-file-input"
        aria-label="Ảnh sản phẩm"
        className="hidden"
        type="file"
        multiple
        accept="image/*"
        disabled={disabled}
        onChange={handleFilesAdded}
      />

      {/* Modal xem trước ảnh kích thước lớn (Lightbox Zoom) */}
      {previewModal && (
        <Modal
          isOpen={!!previewModal}
          onClose={() => setPreviewModal(null)}
          title={previewModal.name || 'Xem trước ảnh sản phẩm'}
          size="lg"
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-full max-h-[70vh] flex items-center justify-center overflow-hidden rounded-xl bg-black/5">
              <img
                src={previewModal.url}
                alt={previewModal.name}
                className="max-h-[68vh] max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="flex justify-between items-center w-full pt-2">
              <span className="text-xs text-[#5B6776] truncate">{previewModal.name}</span>
              <Button variant="outline" size="sm" onClick={() => setPreviewModal(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
