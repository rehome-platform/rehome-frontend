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
  const [sku, setSku] = useState(''), [camera, setCamera] = useState(false);
  const [message, setMessage] = useState(''), [uncertain, setUncertain] = useState(false);
  const [now, setNow] = useState(Date.now());
  const lock = useRef(false), input = useRef(null);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const order = resource.data;
  const changed = () => { onChanged(); window.dispatchEvent(new Event('warehouse:changed')); };
  const scan = async value => {
    const code = value.trim();
    if (!operationReady('scan') || lock.current || uncertain || resource.loading || !code || !canPack(order, scope, now)) return;
    lock.current = true;
    try {
      await resource.mutate(options => packingService.scan(orderId, code, options), {
        onSuccess: result => { setMessage(result.matched ? 'Đã đối chiếu SKU. Tiến độ được tải lại từ server.' : 'SKU không thuộc đơn.'); setSku(''); },
      });
    } finally {
      lock.current = false;
      if (alive.current && !signal.aborted) { resource.refresh(); onChanged(); input.current?.focus(); }
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
    // Only a fresh authoritative read can unlock an uncertain shipment request.
    if (!lock.current && order?.readEpoch === readEpoch.current &&
        (order.ghnTrackingCode || order.shipmentOutcome === 'NOT_CREATED')) setUncertain(false);
  }, [order]);
  return <Card title={`Đóng gói đơn ${orderId}`}>
    <ResourceState resource={resource} />
    <Link to="/moderator/packing" className="text-primary underline">Quay lại hàng đợi</Link>
    {order && <>
      <p>Đã quét {order.scannedCount}/{order.totalCount} SKU</p>
      <p>Trạng thái đơn: {({ PAID: 'Đã thanh toán', PACKING: 'Đang đóng gói', SHIPPING: 'Đang vận chuyển', DELIVERED: 'Đã giao', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy' })[order.status] || 'Theo dữ liệu server'}</p>
      {!canPack(order, scope, now) && !order.ghnTrackingCode && <p role="status">Đơn chưa cho phép thao tác hoặc bạn không còn claim hợp lệ. Hãy kiểm tra lại hàng đợi.</p>}
      <ul className="space-y-3">{order.items.map(item => <li key={item.productId} className="border rounded-xl p-3">
        {safeDocumentUrl(item.photoUrl) && <img src={safeDocumentUrl(item.photoUrl)} alt={item.name || item.productId} className="h-20 w-20 object-cover rounded-xl" />}
        <strong>{item.name || item.productId}</strong> · {item.productId} · {item.shelfLocation || 'Chưa có vị trí kệ'}
        <span className="block">{order.scannedProductIds.includes(item.productId) ? 'Đã quét' : 'Chưa quét'}</span>
      </li>)}</ul>
      {!order.ghnTrackingCode && <>
        {(!operationReady('scan') || !operationReady('shipment')) && <p role="status">Một số thao tác đang chờ contract backend được xác minh.</p>}
        <form className="flex flex-wrap gap-3" onSubmit={event => { event.preventDefault(); scan(sku); }}>
          <label>SKU <input ref={input} value={sku} onChange={event => setSku(event.target.value)} className="rounded-xl border-neutral" autoComplete="off" /></label>
          <Button type="submit" disabled={!operationReady('scan') || uncertain || resource.busy || resource.loading || !canPack(order, scope, now)}>Đối chiếu</Button>
          <Button type="button" variant="outline" disabled={!operationReady('scan') || uncertain || resource.busy || !canPack(order, scope, now)} onClick={() => setCamera(true)}>Quét camera</Button>
        </form>
        <p role="status">{message}</p>
        {(uncertain || order.shipmentOutcome === 'UNKNOWN') && <p role="status">Đang kiểm tra kết quả tạo vận đơn. Chưa thể tạo mới.</p>}
        <Button disabled={!operationReady('shipment') || resource.busy || resource.loading || uncertain || !canShip(order, scope, now)} onClick={create}>Tạo vận đơn GHN</Button>
        <Button variant="outline" onClick={resource.refresh}>Kiểm tra trạng thái</Button>
      </>}
      {order.ghnTrackingCode && <p role="status">Mã GHN: <strong>{order.ghnTrackingCode}</strong>. {order.shippingStatusLabel || 'Đã tạo vận đơn'}; vị trí hàng theo dữ liệu kho.</p>}
    </>}
    <QRScannerModal isOpen={camera} onClose={() => setCamera(false)} onScanSuccess={code => { setCamera(false); scan(code); }} />
  </Card>;
}

export default function PackingOrdersPage() {
  const { scope } = usePhase2();
  const [search, setSearch] = useSearchParams();
  const page = Math.max(0, Number(search.get('page')) || 0), orderId = search.get('orderId');
  const queue = useResource(options => queueService.list({ type: 'PACKING', page }, options), [page], { poll: true });
  return <Page title="Đóng gói và tạo vận đơn" subtitle="Nhận việc theo kho, đối chiếu đủ SKU trước khi tạo vận đơn GHN.">
    <ResourceState resource={queue} empty={!listItems(queue.data).length} />
    {listItems(queue.data).map(item => <Card key={item.queueId} title={item.orderId || item.refId}>
      <p>{item.claimedBy === scope.userId ? 'Bạn đang xử lý' : item.claimedBy ? 'Người khác đang xử lý' : 'Chưa nhận việc'}</p>
      <Button variant="outline" onClick={() => setSearch({ page: String(page), orderId: item.orderId || item.refId })}>Chi tiết</Button>
      {!item.claimedBy && <Button disabled={queue.busy} onClick={() => queue.mutate(options => queueService.claim(item.queueId, options), { onSuccess: () => window.dispatchEvent(new Event('warehouse:changed')) })}>Nhận việc</Button>}
      {item.claimedBy === scope.userId && <Button disabled={queue.busy} onClick={() => queue.mutate(options => queueService.release(item.queueId, options), { onSuccess: () => setSearch({ page: String(page) }) })}>Nhả việc</Button>}
    </Card>)}
    <div className="flex gap-3"><Button disabled={!page} onClick={() => setSearch({ page: String(page - 1) })}>Trước</Button>
      <Button disabled={!(page + 1 < queue.data?.totalPages)} onClick={() => setSearch({ page: String(page + 1) })}>Sau</Button></div>
    {orderId && <PackingDetail key={orderId} orderId={orderId} onChanged={queue.refresh} />}
  </Page>;
}
