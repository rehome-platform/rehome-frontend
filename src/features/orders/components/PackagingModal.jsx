import React, { useState } from 'react';
import { Modal, Button } from '../../../components/common/index.js';

export default function PackagingModal({ isOpen, onClose, order, onConfirm }) {
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSimulateUpload = () => {
    setPhotoUrl('https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&auto=format&fit=crop&q=60');
  };

  const handleConfirm = () => {
    if (!photoUrl) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (onConfirm) onConfirm(order?.id, photoUrl);
      onClose();
    }, 500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Tải Ảnh Đóng Gói Đơn Hàng: #${order?.code || order?.id}`}>
      <div className="space-y-4">
        <p className="text-xs text-outline">
          * Quy định ReHome: Nhân viên cửa hàng bắt buộc chụp ảnh bọc hàng và tem vận chuyển trước khi bàn giao cho bưu tá.
        </p>

        <div className="border border-dashed border-outline-variant rounded-xl p-4 flex flex-col items-center justify-center bg-surface-container-low min-h-[160px]">
          {photoUrl ? (
            <div className="relative w-full max-w-xs rounded-lg overflow-hidden">
              <img src={photoUrl} alt="Ảnh đóng gói" className="w-full h-auto object-cover" />
              <button
                onClick={() => setPhotoUrl('')}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 text-xs"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <span className="material-symbols-outlined text-3xl text-outline">add_photo_alternate</span>
              <p className="text-xs text-outline">Nhấp để tải ảnh kiện hàng hoặc chụp nhanh</p>
              <Button size="sm" variant="outline" onClick={handleSimulateUpload}>
                Tải ảnh minh chứng
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button disabled={!photoUrl} loading={loading} onClick={handleConfirm}>
            Xác nhận đã đóng gói
          </Button>
        </div>
      </div>
    </Modal>
  );
}
