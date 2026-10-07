import React, { useRef, useState } from 'react';
import Button from '../../../components/common/Button.jsx';

export default function CounterCamera({ onCapture, label = "Chụp ảnh nhãn mác & quần áo tại quầy" }) {
  const [streamActive, setStreamActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const videoRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch {
      alert("Không thể khởi động camera tại quầy.");
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");
    setPreviewUrl(dataUrl);

    // Stop tracks
    const stream = videoRef.current.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStreamActive(false);

    if (onCapture) onCapture(dataUrl);
  };

  const handleRetake = () => {
    setPreviewUrl(null);
    startCamera();
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-on-surface">{label}</label>
      <div className="border border-dashed border-outline-variant rounded-xl p-4 flex flex-col items-center justify-center bg-surface-container-low min-h-[220px]">
        {previewUrl ? (
          <div className="relative w-full max-w-sm rounded-lg overflow-hidden">
            <img src={previewUrl} alt="Ảnh chụp tại quầy" className="w-full h-auto object-cover" />
            <div className="absolute bottom-2 right-2 flex space-x-2">
              <Button size="sm" variant="ghost" onClick={handleRetake} className="bg-black/60 text-white hover:bg-black/80">
                Chụp lại
              </Button>
            </div>
          </div>
        ) : streamActive ? (
          <div className="flex flex-col items-center space-y-3">
            <video ref={videoRef} className="rounded-lg max-w-sm w-full aspect-video object-cover" />
            <Button size="sm" onClick={takeSnapshot}>
              Bấm chụp ảnh
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-outline">photo_camera</span>
            <p className="text-xs text-outline">Sử dụng camera máy tính hoặc webcam tại quầy để chụp ảnh món đồ</p>
            <Button size="sm" variant="outline" onClick={startCamera}>
              Bật Camera Quầy
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
