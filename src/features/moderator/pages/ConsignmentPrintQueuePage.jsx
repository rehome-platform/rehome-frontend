import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page, Card, ResourceState, date } from '../components/WarehouseUi.jsx';
import Button from '../../../components/common/Button.jsx';
import { usePhase2, useResource } from '../hooks/warehouseHooks.jsx';
import { listItems } from '../models/warehouseModel.js';
import { skuLabelService } from '../services/warehouseApi.js';
import { downloadLabelPdf } from '../services/skuLabelApi.js';

export default function ConsignmentPrintQueuePage() {
  const [searchParams] = useSearchParams();
  const focusedSku = searchParams.get('sku');
  const { signal } = usePhase2();
  const resource = useResource(options => skuLabelService.list(options), []);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [pendingMark, setPendingMark] = useState([]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const activeRequest = useRef(null);
  const [feedback, setFeedback] = useState(null);
  const focusRef = useRef(null);
  const items = listItems(resource.data).map(item => ({ ...item, sku: item.sku || item.productSku || item.id }));
  const filtered = items.filter(item => [item.sku, item.name || item.productName, item.categoryName, item.brandName]
    .some(value => String(value || '').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))));
  const chosen = selected.filter(sku => items.some(item => item.sku === sku));
  const preview = items.find(item => item.sku === chosen[0]) || items.find(item => item.sku === focusedSku) || filtered[0];
  const allSelected = filtered.length > 0 && filtered.every(item => chosen.includes(item.sku));

  useEffect(() => {
    if (!resource.loading) focusRef.current?.scrollIntoView?.({ block: 'center' });
  }, [resource.loading, focusedSku]);
  useEffect(() => () => activeRequest.current?.abort(), []);

  const download = async () => {
    if (lock.current || (!pendingMark.length && !chosen.length)) return;
    lock.current = true;
    setBusy(true);
    setFeedback(null);
    const skus = pendingMark.length ? [...pendingMark] : [...chosen];
    const controller = new AbortController();
    activeRequest.current = controller;
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort);
    let downloaded = pendingMark.length > 0;
    try {
      if (!downloaded) {
        const blob = await skuLabelService.pdf(skus, { signal: controller.signal });
        if (signal.aborted || controller.signal.aborted) return;
        downloadLabelPdf(blob);
        downloaded = true;
        setPendingMark(skus);
      }
      await skuLabelService.markPrinted(skus, { signal: controller.signal });
      if (signal.aborted || controller.signal.aborted) return;
      setPendingMark([]);
      setSelected(previous => previous.filter(sku => !skus.includes(sku)));
      setFeedback({ error: false, message: `Đã tải PDF ${skus.length} tem và cập nhật hàng đợi.` });
      resource.refresh();
    } catch (error) {
      if (!signal.aborted && !controller.signal.aborted) setFeedback({ error: true, message: downloaded
        ? 'Đã tải PDF nhưng chưa cập nhật hàng đợi. Hãy thử lại bước cập nhật.'
        : error.message || 'Không thể tải PDF. Vui lòng thử lại.' });
    } finally {
      lock.current = false;
      signal.removeEventListener('abort', abort);
      activeRequest.current = null;
      if (!signal.aborted && !controller.signal.aborted) setBusy(false);
    }
  };

  return (
    <Page title="Hàng đợi in tem" subtitle="Món nhập kho xong tự vào đây. Tải PDF để in gom cả lô."
      actions={<Button variant="outline" disabled={busy} onClick={resource.refresh}>Tải lại</Button>}>
      <ResourceState resource={resource} empty={!items.length} />
      {feedback && <p role={feedback.error ? 'alert' : 'status'} className={`rounded-xl border p-4 text-sm ${feedback.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>{feedback.message}</p>}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card title="Danh sách chờ in tem">
          <input aria-label="Tìm tem" placeholder="Tìm SKU, tên món, danh mục…" value={search}
            onChange={event => setSearch(event.target.value)} className="w-full rounded-xl border border-neutral p-3 text-sm" />
          <p className="text-xs text-textSecondary">đã chọn {chosen.length} / {items.length} món</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-xs">
              <thead><tr className="border-b border-neutral">
                <th className="p-2"><input type="checkbox" aria-label="Chọn tất cả" disabled={busy || pendingMark.length > 0} checked={allSelected}
                  onChange={() => setSelected(previous => allSelected
                    ? previous.filter(sku => !filtered.some(item => item.sku === sku))
                    : [...new Set([...previous, ...filtered.map(item => item.sku)])])} /></th>
                <th>SKU</th><th>Sản phẩm</th><th>Danh mục</th><th>Nhập kho lúc</th><th>Người nhập</th>
              </tr></thead>
              <tbody>{filtered.map(item => <tr key={item.sku} ref={item.sku === focusedSku ? focusRef : null}
                className={`border-b border-neutral ${item.sku === focusedSku ? 'bg-green-50 ring-1 ring-inset ring-primary' : ''}`}>
                <td className="p-2"><input type="checkbox" aria-label={`Chọn ${item.sku}`} checked={chosen.includes(item.sku)} disabled={busy || pendingMark.length > 0}
                  onChange={() => setSelected(previous => previous.includes(item.sku) ? previous.filter(sku => sku !== item.sku) : [...previous, item.sku])} /></td>
                <td className="py-3 font-semibold">{item.sku}{item.sku === focusedSku && <span className="block text-primary">Vừa nhập kho</span>}</td>
                <td>{item.name || item.productName || '—'}</td><td>{item.categoryName || item.category?.name || '—'}</td>
                <td>{date(item.stockedAt || item.createdAt)}</td><td>{item.moderator?.fullName || item.moderatorName || item.moderatorCode || '—'}</td>
              </tr>)}</tbody>
            </table>
          </div>
          {!!items.length && !filtered.length && <p>Không có tem phù hợp.</p>}
          <p className="text-xs text-textSecondary">Món đã tải tem sẽ rời hàng đợi. Bạn có thể in lại tại Tồn kho.</p>
        </Card>
        <div className="space-y-4">
          <Card title="Xem trước một tem · 70 × 37 mm">
            {preview ? <div className="flex min-h-[140px] flex-col justify-center border border-neutral bg-white p-4" style={{ aspectRatio: '70 / 37' }}>
              <p className="text-[10px] tracking-widest">REHOME · {preview.warehouseName || 'ĐIỂM KÝ GỬI'}</p>
              <p className="my-2 font-mono text-xl font-bold">{preview.sku}</p>
              <p className="border-t border-neutral pt-2 text-sm font-semibold">{preview.name || preview.productName}</p>
              <p className="text-xs">{preview.brandName || preview.brand?.name || '—'} · Size {preview.size || '—'} · {preview.conditionNote || preview.condition || '—'}</p>
            </div> : <p className="text-sm">Chưa có tem để xem trước.</p>}
          </Card>
          <Card title="Bố cục tờ in">
            <div className="grid w-28 grid-cols-3 border border-neutral">{Array.from({ length: 24 }, (_, i) => <span key={i} className={`h-5 border border-neutral ${i < Math.min(chosen.length, 24) ? 'bg-primary' : 'bg-white'}`} />)}</div>
            <p className="text-xs">A4 · 3 × 8 = 24 ô · 70 × 37 mm · Lề 0</p>
            {chosen.length > 24 && <p className="text-xs">{Math.ceil(chosen.length / 24)} trang PDF</p>}
          </Card>
          <Button className="w-full" loading={busy} disabled={(!chosen.length && !pendingMark.length) || busy || resource.loading || !!resource.error} onClick={download}>
            {pendingMark.length ? 'Thử lại cập nhật hàng đợi' : `Tải PDF ${chosen.length} tem`}
          </Button>
        </div>
      </div>
    </Page>
  );
}
