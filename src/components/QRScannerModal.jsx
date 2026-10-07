import React, { useState } from 'react';
import Modal from './common/Modal.jsx';
import Button from './common/Button.jsx';
import Input from './common/Input.jsx';
import { useQRScanner } from '../hooks/useQRScanner.js';

export default function QRScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = "Quét mã QR hoặc Nhập mã",
  placeholder = "Nhập mã số (8 số ký gửi hoặc 6 số trả đồ)...",
}) {
  const [manualCode, setManualCode] = useState('');
  const { videoRef, startScanning, stopScanning, isScanning, error } = useQRScanner(onScanSuccess);

  const handleSubmitManual = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
      setManualCode('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Camera stream view */}
        <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden flex items-center justify-center border border-outline-variant">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${isScanning ? 'block' : 'hidden'}`}
          />
          {!isScanning && (
            <div className="text-center p-4">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">qr_code_scanner</span>
              <p className="text-xs text-white/70">Camera chưa được kích hoạt</p>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-error">{error}</p>}

        <div className="flex justify-center space-x-2">
          {!isScanning ? (
            <Button size="sm" variant="outline" onClick={startScanning}>
              Bật Camera
            </Button>
          ) : (
            <Button size="sm" variant="danger" onClick={stopScanning}>
              Tắt Camera
            </Button>
          )}
        </div>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-outline-variant"></div>
          <span className="flex-shrink mx-4 text-xs text-outline uppercase">Hoặc nhập mã số</span>
          <div className="flex-grow border-t border-outline-variant"></div>
        </div>

        {/* Manual code form */}
        <form onSubmit={handleSubmitManual} className="space-y-3">
          <Input
            placeholder={placeholder}
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
          />
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={!manualCode.trim()}>
              Xác nhận mã
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
