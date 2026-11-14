import React, { useEffect, useRef, useState } from 'react';
import Button from '../../../../components/common/Button.jsx';
import { packingService } from '../../services/packingApi.js';
import { usePhase2 } from '../../hooks/warehouseHooks.jsx';

function ghnA5Url(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.ghn.vn')
      || !url.pathname.endsWith('/printA5') || !url.searchParams.get('token')
      || url.username || url.password) {
    throw new Error('Đường dẫn phiếu A5 từ GHN không hợp lệ.');
  }
  return url.href;
}

export function WaybillPrintModal({ isOpen, onClose, order }) {
  const { scope } = usePhase2();
  const targetOrderId = order?.orderId || order?.id;
  const [realOrder, setRealOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [printUrl, setPrintUrl] = useState('');
  const generation = useRef(0);
  const lock = useRef(false);
  const pendingPopup = useRef(null);
  const printRequest = useRef(null);

  useEffect(() => {
    const epoch = ++generation.current;
    setRealOrder(null);
    setPrintUrl('');
    setError('');
    setBusy(false);
    lock.current = false;
    const controller = new AbortController();
    if (isOpen && targetOrderId && scope?.warehouseId) {
      packingService.read(targetOrderId, { scope, signal: controller.signal }).then(data => {
        if (epoch === generation.current) setRealOrder(data);
      }).catch(() => {});
    }
    return () => {
      generation.current++;
      controller.abort();
      printRequest.current?.abort();
      pendingPopup.current?.close();
      pendingPopup.current = null;
      lock.current = false;
    };
  }, [isOpen, targetOrderId, scope?.userId, scope?.warehouseId]);

  if (!isOpen || !order) return null;
  const current = (realOrder?.orderId || realOrder?.id) === targetOrderId ? realOrder : order;
  const handlePrint = async () => {
    if (lock.current || !current.ghnTrackingCode) return;
    lock.current = true;
    const epoch = generation.current;
    setBusy(true);
    setError('');
    setPrintUrl('');
    let popup = null;
    try {
      popup = window.open('about:blank', '_blank');
      if (popup) popup.opener = null;
    } catch { /* Show the manual link when popups are blocked. */ }
    pendingPopup.current = popup;
    const controller = new AbortController();
    printRequest.current = controller;
    try {
      const label = await packingService.label(targetOrderId, { scope, signal: controller.signal });
      if (epoch !== generation.current) { popup?.close(); return; }
      const url = ghnA5Url(label?.printUrl);
      setPrintUrl(url);
      if (popup && !popup.closed) {
        try { popup.location.href = url; } catch { popup.close(); }
      }
      pendingPopup.current = null;
    } catch (err) {
      popup?.close();
      if (epoch === generation.current) setError(err?.message || 'Không thể lấy phiếu A5. Vui lòng thử lại.');
    } finally {
      if (epoch === generation.current) {
        pendingPopup.current = null;
        lock.current = false;
        setBusy(false);
      }
    }
  };
  const address = current.shippingAddress || [current.shippingAddressDetail,
    current.shippingWardName, current.shippingProvinceName].filter(Boolean).join(', ');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div role="dialog" aria-modal="true" aria-labelledby="waybill-title" className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl space-y-5">
        <div className="flex justify-between items-start gap-3">
          <h3 id="waybill-title" className="text-lg font-bold">Chi tiết phiếu giao hàng</h3>
          <button type="button" onClick={onClose} aria-label="Đóng">✕</button>
        </div>
        <span className="sr-only">In phiếu giao hàng GHN</span>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
          <dt>Mã đơn</dt><dd className="font-semibold break-all">{current.orderNo || targetOrderId}</dd>
          <dt>Mã vận đơn GHN</dt><dd className="font-bold text-primary break-all">{current.ghnTrackingCode || 'Chưa có vận đơn'}</dd>
          <dt>Người nhận</dt><dd>{current.shippingRecipientName || current.recipientName || 'Chưa có thông tin'}</dd>
          <dt>Điện thoại</dt><dd>{current.shippingPhone || current.recipientPhone || 'Chưa có thông tin'}</dd>
          <dt>Địa chỉ</dt><dd className="break-words">{address || 'Chưa có thông tin'}</dd>
        </dl>
        <p className="text-sm text-textSecondary">Phiếu A5 lấy trực tiếp từ GHN, gồm mã vận đơn và mã vạch. Chọn khổ A5 khi in tại tab phiếu.</p>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
        {printUrl && <a className="block text-sm text-primary underline" href={printUrl} target="_blank" rel="noopener noreferrer">Mở phiếu A5</a>}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button disabled={busy || !current.ghnTrackingCode} onClick={handlePrint}>
            {busy ? 'Đang lấy phiếu A5…' : error ? 'Thử lại in A5' : 'In vận đơn A5'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default WaybillPrintModal;
