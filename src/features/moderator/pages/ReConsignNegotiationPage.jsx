import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import ReceiptPanel from '../components/ReceiptPanel.jsx';
import { inventoryService } from '../services/inventoryApi.js';
import { endTermService } from '../services/endTermApi.js';
import { pricingForProduct } from '../services/endTermPricingApi.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { resolveInventoryTermAndRates } from '../models/warehouseModel.js';
import { readProposals, rememberProposal, forgetProposal, proposalForProduct } from '../services/reconsignProposalStore.js';
import { Page, Card, ResourceState, Status, money } from '../components/WarehouseUi.jsx';

export default function ReConsignNegotiationPage() {
  const { sku } = useParams();
  return <Negotiation key={sku} sku={sku} />;
}

function Negotiation({ sku }) {
  const [tracking, setTracking] = useState(true);
  const [proposedPrice, setProposedPrice] = useState('');
  const [moderatorNote, setModeratorNote] = useState('');
  const [receiptId, setReceiptId] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [feedback, setFeedback] = useState('');
  const wasWaiting = useRef(false);
  const dirty = useRef(false);
  const resource = useResource(async options => {
    const [product, pricing] = await Promise.all([
      inventoryService.read(sku, options), endTermService.pendingPricing(options),
    ]);
    const request = pricingForProduct(pricing, product.id || sku);
    const proposal = proposalForProduct(readProposals(options), { ...product, id: product.id || sku }, request);
    if (proposal && product.status !== 'WAREHOUSE') forgetProposal(product.id || sku, options);
    return { product, request, proposal };
  }, [sku], { refreshInterval: tracking ? 30000 : 0 });
  const product = resource.data?.product;
  const request = resource.data?.request;
  const proposal = resource.data?.proposal;
  const confirmed = product?.status === 'ON_SALE' && product.currentTerm === 1 && (wasWaiting.current || proposal);
  const waiting = !confirmed && ['WAREHOUSE', 'WAITING_END_OF_TERM'].includes(product?.status) && (submitted || proposal || product?.reConsignStatus === 'PROPOSAL_SENT');
  const eligible = !waiting && ['WAREHOUSE', 'WAITING_END_OF_TERM'].includes(product?.status) && Boolean(request?.decisionId);

  useEffect(() => {
    if (!product) return;
    if (['WAREHOUSE', 'WAITING_END_OF_TERM'].includes(product.status) && (request?.decisionId || proposal || submitted)) wasWaiting.current = true;
    if (confirmed) { wasWaiting.current = true; setTracking(false); setFeedback(''); }
    if (['UNCLAIMED', 'DONATED', 'RETURNED', 'DESTROYED', 'SOLD'].includes(product.status)) { setTracking(false); setFeedback(''); }
    if (!dirty.current && request?.currentPrice != null) setProposedPrice(String(request.currentPrice));
    if (!dirty.current && proposal?.proposedPrice != null) setProposedPrice(String(proposal.proposedPrice));
    if (product.newReceiptId) setReceiptId(product.newReceiptId);
    if (proposal?.receiptId) setReceiptId(proposal.receiptId);
  }, [product, request, confirmed, proposal, submitted]);

  const send = async event => {
    event.preventDefault();
    if (!eligible || resource.busy) return;
    const price = Number(proposedPrice);
    if (!Number.isSafeInteger(price) || price <= 0) {
      setFeedback('Vui lòng nhập giá đề xuất hợp lệ.');
      return;
    }
    await resource.mutate(async options => {
      const { floorPricePercent } = resolveInventoryTermAndRates(product);
      const result = await endTermService.proposeReConsignPrice(request.decisionId, {
      agreedPrice: price, floorPrice: Math.round(price * (floorPricePercent / 100)),
      conditionNote: product.conditionNote, moderatorNote: moderatorNote.trim() || undefined,
      }, options);
      rememberProposal({ productId: product.id || sku, decisionId: request.decisionId,
        receiptId: result?.newReceiptId || result?.receiptId || null, proposedPrice: price }, options);
      return result;
    }, {
      onSuccess: result => {
        setReceiptId(result?.newReceiptId || result?.receiptId || null);
        setSubmitted(true);
        setFeedback('Đã gửi đề xuất. Đang chờ Member xác nhận biên nhận mới qua app.');
      },
      onUncertain: () => setFeedback('Chưa xác định được kết quả gửi đề xuất. Vui lòng tải lại trước khi thử lại.'),
    });
  };

  return (
    <Page title="Ký gửi lại — chốt giá mới" subtitle={`Mã SKU: ${sku}`} actions={
      <div className="flex gap-3 items-center">
        <Link className="text-primary hover:underline" to={`/moderator/inventory/${encodeURIComponent(sku)}`}>← Chi tiết sản phẩm</Link>
        <Button variant="outline" onClick={resource.refresh}>Tải lại</Button>
      </div>
    }>
      <ResourceState resource={resource} />
      {feedback && <p role="status" className="rounded-xl border border-neutral bg-surface p-4 text-sm">{feedback}</p>}
      {product && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-5">
          <Card title="Món đang ở kho">
            <h2 className="text-lg font-bold">{product.name}</h2>
            <p className="text-sm">{product.brandName || product.brand || '—'} · Size {product.size || '—'}</p>
            <p className="font-mono text-primary">{product.id || sku}</p>
            <Status>{product.status}</Status>
            <p className="text-sm">Người ký gửi: {product.memberFullName || product.member?.fullName || '—'} · {product.memberCode || product.member?.memberCode || '—'}</p>
          </Card>
          <Card title="Tham khảo khi định giá lại">
            <div className="flex justify-between"><span>Giá thỏa thuận biên nhận</span><strong>{money(request?.previousAgreedPrice ?? product.originalPrice ?? product.agreedPrice)}</strong></div>
            <div className="flex justify-between"><span>Giá đang ghi nhận</span><strong>{money(product.currentPrice)}</strong></div>
            <div className="flex justify-between"><span>Giá sàn</span><strong>{money(product.floorPrice)}</strong></div>
            <p className="text-sm">Kỳ {product.currentTerm ?? '—'} · ngày {product.daysIntoTerm ?? '—'}</p>
          </Card>
          <p className="rounded-xl border border-dashed border-neutral p-4 text-sm text-textSecondary">Hàng vẫn được lưu kho. Khi Member xác nhận biên nhận mới, kỳ ký gửi bắt đầu lại từ kỳ 1 với giá bán mới.</p>
        </div>
        {confirmed ? <Card title="MEMBER ĐÃ XÁC NHẬN · ĐÃ CHỐT">
          <p className="text-sm">Giá bán đã chốt</p>
          <strong className="text-3xl text-primary">{money(product.currentPrice)}</strong>
          <p>Sản phẩm đang bán · Kỳ {product.currentTerm} · ngày {product.daysIntoTerm ?? '—'}.</p>
          {receiptId && <Button onClick={() => setShowReceipt(true)}>Xem biên nhận ký gửi lại</Button>}
        </Card> : <Card title={waiting ? 'ĐÃ GỬI ĐỀ XUẤT · CHỜ MEMBER XÁC NHẬN QUA APP' : 'Đang thương lượng giá mới'}>
          {!eligible && !waiting && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">Chưa có yêu cầu đủ điều kiện đề xuất giá. Nếu đã gửi đề xuất, vui lòng chờ Member xác nhận qua app và tải lại.</p>}
          <form onSubmit={send} className="space-y-4">
            <div>
              <label htmlFor="reconsign-proposed-price" className="block font-semibold mb-2">Giá bán đề xuất ký gửi lại</label>
              <input id="reconsign-proposed-price" type="text" inputMode="numeric" value={proposedPrice}
                disabled={!eligible || resource.busy}
                onChange={event => { dirty.current = true; setProposedPrice(event.target.value.replace(/\D/g, '')); }}
                className="w-full text-2xl font-mono p-3 rounded-xl border border-neutral disabled:bg-background" />
            </div>
            <div>
              <label htmlFor="reconsign-moderator-note" className="block font-semibold mb-2">Ghi chú của Moderator gửi Member</label>
              <textarea id="reconsign-moderator-note" rows={3} value={moderatorNote} disabled={!eligible || resource.busy}
                onChange={event => setModeratorNote(event.target.value)} className="w-full p-3 rounded-xl border border-neutral disabled:bg-background" />
            </div>
            {waiting ? <p className="text-sm text-textSecondary">Đang chờ Member phản hồi qua app. Web tự kiểm tra trạng thái mỗi 30 giây.</p>
              : <Button type="submit" loading={resource.busy} disabled={!eligible || resource.busy}>Gửi đề xuất giá mới cho Member</Button>}
          </form>
          {receiptId && <Button variant="outline" onClick={() => setShowReceipt(true)}>Xem biên nhận ký gửi lại</Button>}
        </Card>}
      </div>}
      {showReceipt && receiptId && <Modal isOpen onClose={() => setShowReceipt(false)} title="Biên nhận ký gửi lại" size="lg"><ReceiptPanel receiptId={receiptId} /></Modal>}
    </Page>
  );
}
