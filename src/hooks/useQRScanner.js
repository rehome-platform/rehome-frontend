import { useState, useRef, useCallback } from 'react';

/**
 * useQRScanner hook to control camera streams and mock/real QR decoder
 */
export function useQRScanner(onScanSuccess) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);

  const startScanning = useCallback(async () => {
    setError(null);
    setIsScanning(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }
    } catch (err) {
      setError('Không thể mở camera hoặc quyền truy cập bị từ chối.');
      setIsScanning(false);
    }
  }, []);

  const stopScanning = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  const handleManualCodeSubmit = useCallback((code) => {
    if (code && onScanSuccess) {
      onScanSuccess(code.trim());
      stopScanning();
    }
  }, [onScanSuccess, stopScanning]);

  return {
    isScanning,
    error,
    videoRef,
    startScanning,
    stopScanning,
    handleManualCodeSubmit,
  };
}

export default useQRScanner;
