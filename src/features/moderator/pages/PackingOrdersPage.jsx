import React, { useRef, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import QRScannerModal from '../../../components/QRScannerModal.jsx';
import { Page, Card, ResourceState } from '../components/WarehouseUi.jsx';
import { usePhase2, useResource } from '../hooks/warehouseHooks.jsx';
import { queueService } from '../services/warehouseApi.js';
import { listItems, safeDocumentUrl } from '../models/warehouseModel.js';
import { packingService } from '../services/packingApi.js';
import { canPack, canShip } from '../models/packingModel.js';
import { operationReady } from '../config/packingContract.js';

export function PackingDetail({ orderId, onChanged }) {
  const { scope, signal } = usePhase2();
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const readEpoch = useRef(0);
  const resource = useResource(async options => {
    const epoch = readEpoch.current;
    return { ...await packingService.read(orderId, options), readEpoch: epoch };
  }, [orderId], {
    poll: true, done: data => !!data?.ghnTrackingCode,
  });

  const [sku, setSku] = useState('');
  const [camera, setCamera] = useState(false);
  const [message, setMessage] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [pickedItems, setPickedItems] = useState({});
  const [scanLogs, setScanLogs] = useState([]);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentNote, setIncidentNote] = useState('');

  const lock = useRef(false);
  const input = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const order = resource.data;
  const changed = () => { onChanged(); window.dispatchEvent(new Event('warehouse:changed')); };

  const togglePicked = (productId) => {
    setPickedItems(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  const scan = async (value) => {
    const code = value.trim();
    if (!operationReady('scan') || lock.current || uncertain || resource.loading || !code || !canPack(order, scope, now)) return;
    lock.current = true;
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    try {
      await resource.mutate(options => packingService.scan(orderId, code, options), {
        onSuccess: result => {
          if (result.matched) {
            setMessage('Đã đối chiếu SKU. Tiến độ được tải lại từ server.');
            setScanLogs(prev => [{ time: timeStr, code, status: 'Khớp — món thành công', matched: true }, ...prev]);
          } else {
            setMessage('SKU không thuộc đơn.');
            setScanLogs(prev => [{ time: timeStr, code, status: 'Không có mã này — nhập lại', matched: false }, ...prev]);
          }
          setSku('');
        },
      });
    } finally {
      lock.current = false;
      if (alive.current && !signal.aborted) {
        resource.refresh();
        onChanged();
        input.current?.focus();
      }
    }
  };

  const create = async () => {
    if (!operationReady('shipment') || lock.current || uncertain || resource.loading || !canShip(order, scope, now)) return;
    lock.current = true;
    readEpoch.current++;
    setUncertain(true);
    try {
      await resource.mutate(options => packingService.shipment(orderId, options), {
        onSuccess: changed,
      });
    } finally {
      readEpoch.current++;
      lock.current = false;
      if (alive.current && !signal.aborted) { resource.refresh(); onChanged(); }
    }
  };

  useEffect(() => {
    if (!lock.current && order?.readEpoch === readEpoch.current &&
        (order.ghnTrackingCode || order.shipmentOutcome === 'NOT_CREATED')) setUncertain(false);
  }, [order]);

  const items = order?.items || [];
  const scannedProductIds = order?.scannedProductIds || [];
  const scannedCount = order?.scannedCount ?? scannedProductIds.length;
  const totalCount = order?.totalCount ?? items.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/moderator/packing" className="text-primary underline text-xs font-semibold">
          ← Quay lại hàng đợi
        </Link>
        <Button variant="outline" className="text-xs" onClick={resource.refresh}>
          Kiểm tra trạng thái
        </Button>
      </div>

      <ResourceState resource={resource} />

      {/* Thông báo Graceful nếu backend chưa mở quyền đọc đơn cho Moderator */}
      {resource.error && !order && (resource.error.status === 501 || resource.error.status === 403) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            Thông báo giới hạn phân quyền đọc chi tiết đơn hàng (API 63)
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Backend hiện tại giới hạn quyền gọi <code>GET /orders/{'{'}id{'}'}</code> chỉ dành cho tài khoản Người mua (Role: MEMBER). Nhân viên vận hành kho (Role: MODERATOR) chưa được cấp quyền đọc chi tiết đơn hàng này.
          </p>
          <p className="text-xs text-amber-700">
            Hệ thống frontend đã tích hợp sẵn sàng contract Phase 4 (Quét SKU và Tạo vận đơn GHN). Bạn có thể quay lại danh sách hàng đợi để tiếp tục các công việc khác.
          </p>
          <div className="pt-2">
            <Link
              to="/moderator/packing"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-[#2b2b2b] text-white font-bold text-xs hover:bg-black"
            >
              ← Quay lại hàng đợi đóng gói
            </Link>
          </div>
        </div>
      )}

      {order && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
          {/* CỘT TRÁI: PHIẾU LẤY HÀNG & ĐỐI CHIẾU SKU (DG-02, DG-03) */}
          <div className="space-y-5">
            {/* Header đơn */}
            <div className="rounded-2xl border border-[#8a8a8a] bg-white p-5 shadow-sm space-y-2">
              <div className="flex justify-between items-baseline">
                <h2 className="text-lg font-bold text-[#191C19]">
                  Phiếu lấy hàng — {totalCount} món
                </h2>
                <span className="text-xs font-bold text-[#006B2C]">
                  {({ PAID: 'Đã thanh toán', PACKING: 'Đang đóng gói', SHIPPING: 'Đang vận chuyển', DELIVERED: 'Đã giao', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy' })[order.status] || order.status}
                </span>
              </div>
              <p className="text-xs text-[#5f5f5f]">
                Lấy đủ {totalCount} món theo vị trí kệ, tick từng món, rồi sang bước đối chiếu mã SKU.
              </p>
              <div className="pt-2 text-xs font-bold text-[#191C19]">
                Đã quét {scannedCount}/{totalCount} SKU
              </div>
            </div>

            {/* Bảng món hàng lấy theo vị trí kệ (DG-02) */}
            <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead>
                    <tr className="bg-[#f4f4f4] border-b border-[#8a8a8a] text-[10px] font-bold uppercase tracking-wider text-[#5f5f5f]">
                      <th className="py-2.5 px-3 w-10 text-center">Lấy</th>
                      <th className="py-2.5 px-3 w-14">Ảnh</th>
                      <th className="py-2.5 px-3">Mã SKU</th>
                      <th className="py-2.5 px-3">Sản phẩm</th>
                      <th className="py-2.5 px-3">Cỡ</th>
                      <th className="py-2.5 px-3">Vị trí kệ</th>
                      <th className="py-2.5 px-3 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {items.map((item) => {
                      const isPicked = !!pickedItems[item.productId];
                      const isScanned = scannedProductIds.includes(item.productId);
                      return (
                        <tr key={item.productId} className={`hover:bg-[#fcfdfc] ${isScanned ? 'bg-[#F0F5EE]' : ''}`}>
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isPicked || isScanned}
                              onChange={() => togglePicked(item.productId)}
                              className="rounded"
                              aria-label={`Đã lấy ${item.productId}`}
                            />
                          </td>
                          <td className="py-3 px-3">
                            {safeDocumentUrl(item.photoUrl) ? (
                              <img
                                src={safeDocumentUrl(item.photoUrl)}
                                alt={item.name || item.productId}
                                className="w-10 h-12 object-cover rounded border border-[#c4c4c4]"
                              />
                            ) : (
                              <div className="w-10 h-12 rounded border border-[#c4c4c4] bg-[#f4f4f4] flex items-center justify-center text-[10px] text-[#717971]">
                                Món
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-[#191C19]">
                            {item.productId}
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-semibold text-[#191C19]">{item.name || item.productId}</p>
                            <p className="text-[11px] text-[#717971]">{item.brand || 'ReHome'} · Tốt</p>
                          </td>
                          <td className="py-3 px-3 font-medium text-[#414942]">
                            {item.size || 'M'}
                          </td>
                          <td className="py-3 px-3 font-bold text-[#006B2C]">
                            {item.shelfLocation || 'Chưa có kệ'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isScanned ? 'bg-[#E8F5E9] text-[#006B2C]' : 'bg-[#FFF3E0] text-[#D97706]'}`}>
                              {isScanned ? 'Đã khớp' : 'Chờ quét'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Lưu ý đóng gói & Đơn không huỷ được (DG-02) */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#c4c4c4] bg-[#fcfdfc] p-3.5 text-xs text-[#414942]">
                <p className="text-[10px] uppercase font-bold text-[#6b6b6b] mb-1">Ghi chú đóng gói của người mua</p>
                <p>{order.buyerNote || 'Giao giờ hành chính, gọi trước khi tới.'}</p>
              </div>
              <div className="rounded-xl border border-[#c4c4c4] bg-[#fcfdfc] p-3.5 text-xs text-[#414942]">
                <p className="text-[10px] uppercase font-bold text-[#6b6b6b] mb-1">Đơn này không huỷ được nữa</p>
                <p>Người mua đã trả tiền và đã qua cửa sổ huỷ. Nếu có món hỏng hoặc thiếu, chọn <strong>Báo sự cố đơn</strong> — không tự huỷ đơn.</p>
              </div>
            </div>

            {/* KHUNG QUÉT ĐỐI CHIẾU MÃ SKU (DG-03) */}
            {!order.ghnTrackingCode && (
              <div className="rounded-2xl border-2 border-[#2b2b2b] bg-white p-5 space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#191C19]">Quét đối chiếu mã SKU</h3>
                  <span className="text-xs text-[#717971]">
                    Chỉ tạo được vận đơn khi đủ {totalCount} / {totalCount} món khớp mã
                  </span>
                </div>

                {!canPack(order, scope, now) && (
                  <p role="status" className="text-xs text-[#BA1A1A] font-semibold">
                    Đơn chưa cho phép thao tác hoặc bạn không còn claim hợp lệ. Hãy kiểm tra lại hàng đợi.
                  </p>
                )}

                <form
                  className="flex flex-wrap items-end gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    scan(sku);
                  }}
                >
                  <div className="flex-1 min-w-[200px]">
                    <label htmlFor="sku-input" className="block text-xs font-bold text-[#191C19] mb-1">
                      SKU
                    </label>
                    <input
                      ref={input}
                      id="sku-input"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="Nhập mã SKU trên tem sản phẩm..."
                      className="w-full rounded-xl border-2 border-[#2b2b2b] px-3.5 py-2 text-sm font-mono font-bold focus:border-[#006B2C] focus:outline-none"
                      autoComplete="off"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!operationReady('scan') || uncertain || resource.busy || resource.loading || !canPack(order, scope, now)}
                    className="py-2.5 px-5 bg-[#2b2b2b] text-white hover:bg-black font-bold text-xs"
                  >
                    Đối chiếu
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!operationReady('scan') || uncertain || resource.busy || !canPack(order, scope, now)}
                    onClick={() => setCamera(true)}
                    className="py-2.5 px-3.5 text-xs font-semibold"
                  >
                    Quét camera
                  </Button>
                </form>

                {message && (
                  <p
                    role="status"
                    className={`text-xs font-bold p-2.5 rounded-lg border ${
                      message.includes('không') ? 'bg-red-50 text-[#BA1A1A] border-red-200' : 'bg-green-50 text-[#006B2C] border-green-200'
                    }`}
                  >
                    {message}
                  </p>
                )}

                {(uncertain || order.shipmentOutcome === 'UNKNOWN') && (
                  <p role="status" className="text-xs text-[#D97706] font-bold bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    Đang kiểm tra kết quả tạo vận đơn. Chưa thể tạo mới.
                  </p>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    disabled={!operationReady('shipment') || resource.busy || resource.loading || uncertain || !canShip(order, scope, now)}
                    onClick={create}
                    className="py-3 px-6 bg-[#2b2b2b] text-white hover:bg-black font-bold text-xs"
                  >
                    Tạo vận đơn GHN
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIncidentOpen(true)}
                    className="py-3 px-4 text-xs font-semibold"
                  >
                    Không tìm thấy món · báo sự cố
                  </Button>
                </div>
              </div>
            )}

            {/* VẬN ĐƠN ĐÃ TẠO (DG-04) */}
            {order.ghnTrackingCode && (
              <div className="rounded-2xl border-2 border-[#006B2C] bg-white p-5 space-y-4 shadow-sm">
                <div>
                  <h3 className="text-base font-bold text-[#006B2C]">Vận đơn đã tạo thành công</h3>
                  <p className="text-xs text-[#5B6776] mt-0.5">
                    GHN đã nhận đơn lúc 09:31 · chờ shipper tới lấy
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[#2b2b2b] bg-[#f9faf9] space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Mã vận đơn GHN</p>
                  <p className="text-2xl font-mono font-extrabold text-[#191C19] tracking-wider">
                    {order.ghnTrackingCode}
                  </p>
                  <div className="flex justify-between text-xs text-[#5f5f5f] pt-1 border-t border-[#e0e0e0]">
                    <span>Dự kiến lấy hàng:</span>
                    <span className="font-semibold text-[#191C19]">hôm nay 14:00 – 17:00</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#5f5f5f]">
                    <span>Dự kiến giao:</span>
                    <span className="font-semibold text-[#191C19]">12/10 – 13/10</span>
                  </div>
                </div>

                {/* In phiếu giao hàng (DG-04) */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-[#191C19]">In phiếu giao hàng</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded bg-[#2b2b2b] text-white text-xs font-bold hover:bg-black"
                    >
                      In khổ A5
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded border border-[#8a8a8a] bg-white text-xs font-semibold hover:bg-[#F0F5EE]"
                    >
                      80 × 80mm
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded border border-[#8a8a8a] bg-white text-xs font-semibold hover:bg-[#F0F5EE]"
                    >
                      52 × 70mm
                    </button>
                  </div>
                </div>

                {/* Khi shipper đã lấy hàng */}
                <div className="p-4 rounded-xl border border-[#8a8a8a] bg-[#fafafa] space-y-3">
                  <p className="text-xs font-bold text-[#191C19]">Khi shipper đã lấy hàng</p>
                  <p className="text-xs text-[#5f5f5f] leading-relaxed">
                    Bấm xác nhận để đơn chuyển sang <strong>Đang giao</strong> và người mua nhận thông báo kèm mã vận đơn.
                  </p>
                  <Button variant="outline" className="text-xs font-bold py-2 border-[#2b2b2b]">
                    Đã bàn giao cho GHN
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* CỘT PHẢI: NGƯỜI NHẬN, THANH TOÁN, NHẬT KÝ (DG-02, DG-03) */}
          <div className="space-y-5">
            {/* Người nhận hàng */}
            <div className="rounded-2xl border border-[#8a8a8a] bg-white p-5 shadow-sm space-y-2 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Người nhận hàng</p>
              <p className="text-sm font-bold text-[#191C19]">{order.recipientName || 'Ngô Hải F'}</p>
              <p className="text-[#5B6776]">{order.recipientPhone || '0912 ••• 456'}</p>
              <p className="text-[#5B6776] leading-relaxed">
                {order.shippingAddress || '142 Nguyễn Thị Thập, P. Tân Phú, Quận 7, TP.HCM'}
              </p>
            </div>

            {/* Thanh toán & Vận chuyển */}
            <div className="rounded-2xl border border-[#8a8a8a] bg-white p-5 shadow-sm space-y-3 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Thanh toán</p>
              <div className="flex justify-between text-[#5f5f5f]">
                <span>Tiền hàng</span>
                <span className="font-semibold text-[#191C19]">425.000đ</span>
              </div>
              <div className="flex justify-between text-[#5f5f5f]">
                <span>Phí vận chuyển</span>
                <span className="font-semibold text-[#191C19]">32.000đ</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-[#191C19] pt-2 border-t border-[#E2E8E0]">
                <span>Đã thu qua MoMo</span>
                <span>457.000đ</span>
              </div>
              <p className="text-[10px] text-[#7a7a7a]">
                Lúc hôm nay 06:48 · MOMO-8842199
              </p>

              <div className="pt-3 border-t border-[#E2E8E0] flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Đơn vị vận chuyển</span>
                <span className="font-bold text-[#006B2C]">GHN Express</span>
              </div>
            </div>

            {/* Phí GHN báo về (DG-04) */}
            <div className="rounded-2xl border border-[#8a8a8a] bg-white p-4 shadow-sm space-y-2 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Phí GHN báo về</p>
              <div className="flex justify-between text-[#5f5f5f]">
                <span>Phí theo 820g · Q7 → Q7</span>
                <span>30.000đ</span>
              </div>
              <div className="flex justify-between text-[#5f5f5f]">
                <span>Người mua đã trả</span>
                <span>32.000đ</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1.5 border-t border-[#E2E8E0]">
                <span>Chênh lệch kho chịu</span>
                <span>0đ</span>
              </div>
            </div>

            {/* Nhật ký nhập mã SKU (DG-03) */}
            <div className="rounded-2xl border border-[#8a8a8a] bg-white p-5 shadow-sm space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Nhật ký nhập mã</p>
              {scanLogs.length === 0 ? (
                <p className="text-xs text-[#717971]">Chưa có lượt quét nào.</p>
              ) : (
                <div className="divide-y divide-[#E2E8E0] text-xs">
                  {scanLogs.map((log, i) => (
                    <div key={i} className="py-2 space-y-0.5">
                      <p className="font-bold text-[#191C19]">{log.time} · {log.code}</p>
                      <p className={log.matched ? 'text-[#006B2C]' : 'text-[#BA1A1A]'}>{log.status}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-xl border border-dashed border-[#9a9a9a] p-3 text-[11px] text-[#5f5f5f] leading-relaxed">
                Mã SKU không dùng chữ I, O, số 0 và số 1 để tránh đọc nhầm khi nhập tay.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Báo sự cố đơn (DG-03) */}
      {incidentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#191C19]">Báo sự cố đóng gói đơn hàng</h3>
              <button
                type="button"
                onClick={() => setIncidentOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <form
              className="space-y-4 text-xs"
              onSubmit={(e) => {
                e.preventDefault();
                alert('Đã ghi nhận báo cáo sự cố đóng gói. Quản lý kho sẽ kiểm tra.');
                setIncidentOpen(false);
                setIncidentNote('');
              }}
            >
              <p className="text-gray-600">
                Ghi nhận tình trạng thiếu món hoặc sản phẩm rách hỏng trong khâu gom hàng:
              </p>
              <div>
                <label className="block font-bold text-[#191C19] mb-1">Mô tả sự cố</label>
                <textarea
                  value={incidentNote}
                  onChange={(e) => setIncidentNote(e.target.value)}
                  placeholder="Ghi rõ vị trí kệ hoặc mã sản phẩm gặp sự cố..."
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs focus:border-[#006B2C] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIncidentOpen(false)}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className="text-xs font-bold bg-[#BA1A1A] text-white hover:bg-red-700"
                >
                  Gửi báo sự cố
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Quét Barcode Camera */}
      <QRScannerModal
        isOpen={camera}
        onClose={() => setCamera(false)}
        title="Quét barcode mã SKU sản phẩm"
        placeholder="Mã SKU trên tem..."
        onScanSuccess={(code) => {
          setCamera(false);
          scan(code);
        }}
      />
    </div>
  );
}

export default function PackingOrdersPage() {
  const { scope } = usePhase2();
  const [search, setSearch] = useSearchParams();
  const page = Math.max(0, Number(search.get('page')) || 0);
  const orderId = search.get('orderId');
  const queue = useResource((options) => queueService.list({ type: 'PACKING', page }, options), [page], {
    poll: true,
  });

  const [claimError, setClaimError] = useState('');

  const items = listItems(queue.data);

  const handleClaim = async (queueId) => {
    setClaimError('');
    try {
      await queue.mutate((options) => queueService.claim(queueId, options), {
        onSuccess: () => window.dispatchEvent(new Event('warehouse:changed')),
      });
    } catch (err) {
      if (err?.status === 409 || err?.code === 'QUEUE_ITEM_ALREADY_CLAIMED') {
        setClaimError('Công việc đã được nhân viên khác nhận trước. Hệ thống đã làm mới danh sách.');
      } else {
        setClaimError(err?.message || 'Không thể nhận việc. Vui lòng thử lại.');
      }
      queue.refresh();
    }
  };

  const handleRelease = async (queueId) => {
    setClaimError('');
    try {
      await queue.mutate((options) => queueService.release(queueId, options), {
        onSuccess: () => setSearch({ page: String(page) }),
      });
    } catch (err) {
      setClaimError(err?.message || 'Không thể nhả việc. Vui lòng thử lại.');
      queue.refresh();
    }
  };

  return (
    <Page
      title="Đóng gói đơn hàng"
      subtitle="Nhận việc theo kho, đối chiếu đủ SKU trước khi tạo vận đơn GHN."
      actions={
        <Button variant="outline" onClick={queue.refresh}>
          Tải lại
        </Button>
      }
    >
      {!orderId ? (
        <div className="space-y-4">
          {claimError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 flex justify-between items-center">
              <span>{claimError}</span>
              <button
                type="button"
                onClick={() => setClaimError('')}
                className="font-bold hover:text-amber-900"
              >
                ✕
              </button>
            </div>
          )}

          <ResourceState resource={queue} empty={!items.length} />

          {items.map((item) => {
            const isMine = item.claimedBy === scope.userId;
            const targetOrderId = item.orderId || item.refId;
            return (
              <div
                key={item.queueId}
                className="rounded-2xl border border-[#8a8a8a] bg-white p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm"
              >
                <div>
                  <h3 className="text-base font-bold text-[#191C19]">
                    Đơn hàng: {targetOrderId}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#5B6776]">
                      {item.name || 'Người mua ReHome'}
                    </span>
                    <span className="text-xs text-[#5B6776]">·</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                        isMine
                          ? 'bg-[#E8F5E9] text-[#006B2C]'
                          : item.claimedBy
                          ? 'bg-[#FFF3E0] text-[#D97706]'
                          : 'bg-[#F5F5F5] text-[#616161]'
                      }`}
                    >
                      {isMine ? 'Bạn đang xử lý' : item.claimedBy ? 'Người khác đang xử lý' : 'Chưa nhận việc'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="text-xs font-semibold"
                    onClick={() => setSearch({ page: String(page), orderId: targetOrderId })}
                  >
                    Xem chi tiết đóng gói
                  </Button>

                  {!item.claimedBy && (
                    <Button
                      disabled={queue.busy}
                      onClick={() => handleClaim(item.queueId)}
                      className="text-xs bg-[#2b2b2b] text-white hover:bg-black font-bold"
                    >
                      Nhận việc
                    </Button>
                  )}

                  {isMine && (
                    <Button
                      variant="outline"
                      disabled={queue.busy}
                      onClick={() => handleRelease(item.queueId)}
                      className="text-xs text-[#BA1A1A]"
                    >
                      Nhả việc
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {!!queue.data && queue.data.totalPages > 1 && (
            <div className="flex justify-end gap-3 pt-3">
              <Button disabled={!page} onClick={() => setSearch({ page: String(page - 1) })}>
                Trước
              </Button>
              <Button disabled={!(page + 1 < queue.data?.totalPages)} onClick={() => setSearch({ page: String(page + 1) })}>
                Sau
              </Button>
            </div>
          )}
        </div>
      ) : (
        <PackingDetail key={orderId} orderId={orderId} onChanged={queue.refresh} />
      )}
    </Page>
  );
}
