import React from 'react';

export function ReturnPhotoGallery({ photos = [], label, emptyText }) {
  return <div className="flex flex-wrap gap-2">
    {photos.length ? photos.map((src, index) => <img key={`${src}-${index}`} src={src} alt={`${label} ${index + 1}`} className="w-28 h-32 object-contain rounded-xl border border-neutral" />)
      : <p className="text-xs text-textSecondary">{emptyText}</p>}
  </div>;
}

export function ReturnEvidence({ evidenceImageUrls = [], evidenceUploading = false, evidenceError = '', uploadEvidence, retryEvidence, removeEvidence }) {
  return <div className="space-y-2 border border-neutral rounded-xl p-3 text-xs">
    <label className="block font-bold">Ảnh bằng chứng kiểm hàng (2 đến 5 ảnh) *
      <input aria-label="Tải ảnh bằng chứng kiểm hàng" type="file" accept="image/*" multiple disabled={evidenceUploading || evidenceImageUrls.length >= 5}
        onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; uploadEvidence?.(files); }} />
    </label>
    <p>{evidenceImageUrls.length} / 5 ảnh đã tải lên</p>
    <div className="flex flex-wrap gap-2">{evidenceImageUrls.map((url, index) => <div key={`${url}-${index}`}>
      <img src={url} alt={`Bằng chứng kiểm hàng ${index + 1}`} className="w-20 h-24 object-contain" />
      <button type="button" disabled={evidenceUploading} onClick={() => removeEvidence?.(index)} aria-label={`Xóa ảnh bằng chứng ${index + 1}`}>Xóa ảnh</button>
    </div>)}</div>
    {evidenceUploading && <p role="status">Đang tải ảnh lên...</p>}
    {evidenceError && <div role="alert">{evidenceError} <button type="button" disabled={evidenceUploading} onClick={() => retryEvidence?.()}>Thử tải lại</button></div>}
  </div>;
}
