import { useState, useRef, useCallback, useEffect } from 'react';

/** Native QR decoding; manual / keyboard scanners remain available. */
export function useQRScanner(onScanSuccess, enabled = true) {
  const [isScanning, setScanning] = useState(false),
    [error, setError] = useState(null);
  const videoRef = useRef(null),
    streamRef = useRef(null),
    timer = useRef(null),
    generation = useRef(0),
    lastCode = useRef(null);
  const callback = useRef(onScanSuccess);
  callback.current = onScanSuccess;
  const stopScanning = useCallback(() => {
    generation.current++;
    clearTimeout(timer.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);
  const submit = useCallback(
    (code) => {
      const value = code?.trim();
      if (!value || lastCode.current === value) return;
      lastCode.current = value;
      stopScanning();
      callback.current?.(value);
    },
    [stopScanning],
  );
  const startScanning = useCallback(async () => {
    if (!enabled) return;
    stopScanning();
    setError(null);
    lastCode.current = null;
    const run = generation.current;
    if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      setError(
        'Trình duyệt chưa hỗ trợ quét QR bằng camera. Hãy nhập mã hoặc dùng máy quét bàn phím.',
      );
      return;
    }
    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      if (generation.current !== run || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setScanning(true);
      await videoRef.current.play();
      const decode = async () => {
        if (generation.current !== run) return;
        try {
          if (videoRef.current?.readyState >= 2) {
            const values = await detector.detect(videoRef.current);
            if (generation.current !== run) return;
            if (values[0]?.rawValue) {
              submit(values[0].rawValue);
              return;
            }
          }
        } catch {
          /* Ignore an unavailable video frame. */
        }
        if (generation.current === run) timer.current = setTimeout(decode, 250);
      };
      decode();
    } catch {
      if (generation.current === run) {
        stopScanning();
        setError('Không mở được camera. Kiểm tra quyền camera hoặc nhập mã thay thế.');
      }
    }
  }, [enabled, stopScanning, submit]);
  useEffect(() => {
    if (!enabled) stopScanning();
    else lastCode.current = null;
    return stopScanning;
  }, [enabled, stopScanning]);
  return {
    isScanning,
    error,
    videoRef,
    startScanning,
    stopScanning,
    handleManualCodeSubmit: submit,
  };
}
export default useQRScanner;
