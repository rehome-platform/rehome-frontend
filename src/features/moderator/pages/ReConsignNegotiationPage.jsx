import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import ReceiptPanel from '../components/ReceiptPanel.jsx';
import { inventoryService } from '../services/inventoryApi.js';
import { endTermService } from '../services/endTermApi.js';
import { pricingForProduct } from '../services/endTermPricingApi.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { resolveInventoryTermAndRates, validMoney } from '../models/warehouseModel.js';
import {
  RECONSIGN_STATUS,
  RECONSIGN_STATUS_META,
  RECONSIGN_HISTORY_ACTION_LABELS,
  RECONSIGN_ACTOR_LABELS,
  normalizeReConsignStatus,
  isCounterResponseOverdue,
  formatReConsignError,
} from '../models/reConsignModel.js';
import { readProposals, rememberProposal, forgetProposal, proposalForProduct } from '../services/reconsignProposalStore.js';
import { Page, Card, ResourceState, Status, date, formatDeadlineWithCountdown, money } from '../components/WarehouseUi.jsx';

const COUNTER_ACTIONS = [
  {
    key: 'ACCEPT',
    label: 'Chấp nhận giá Member',
    hint: 'Tạo biên nhận mới theo đúng mức giá Member đề xuất.',
  },
  {
    key: 'REPROPOSE',
    label: 'Đề xuất giá mới khác',
    hint: 'Đưa ra mức giá bán & giá sàn mới để Member xác nhận.',
  },
  {
    key: 'KEEP',
    label: 'Giữ nguyên giá đã đề xuất',
    hint: 'Giữ nguyên mức giá ReHome đã đề xuất trước đó để Member quyết định lần cuối.',
  },
];

export default function ReConsignNegotiationPage() {
  const { sku } = useParams();
  return <Negotiation key={sku} sku={sku} />;
}

function Negotiation({ sku }) {
  const [proposedPrice, setProposedPrice] = useState('');
  const [proposedFloorPrice, setProposedFloorPrice] = useState('');
  const [moderatorNote, setModeratorNote] = useState('');

  const [counterAction, setCounterAction] = useState('ACCEPT');
  const [reproposePrice, setReproposePrice] = useState('');
  const [reproposeFloorPrice, setReproposeFloorPrice] = useState('');
  const [counterNote, setCounterNote] = useState('');

  const [receiptId, setReceiptId] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [actionError, setActionError] = useState('');

  const wasWaiting = useRef(false);
  const dirty = useRef(false);
  const floorDirty = useRef(false);
  const reproposeFloorDirty = useRef(false);

  const resource = useResource(async (options) => {
    const [product, pricing] = await Promise.all([
      inventoryService.read(sku, options),
      endTermService.pendingPricing(options),
    ]);
    const request = pricingForProduct(pricing, product.id || sku);
    const proposal = proposalForProduct(readProposals(options), { ...product, id: product.id || sku }, request);
    if (proposal && product.status !== 'WAREHOUSE') forgetProposal(product.id || sku, options);
    return { product, request, proposal };
  }, [sku], {
    invalidatePrefixes: ['inventory:', 'end-of-term:', 'queue:', 'history:'],
  });

  const product = resource.data?.product;
  const request = resource.data?.request;
  const proposal = resource.data?.proposal;
  const decisionObj = product?.endOfTermDecision || null;

  const decisionId = request?.decisionId || decisionObj?.id || null;
  const rawReConsignStatus = request?.reConsignStatus ?? decisionObj?.reConsignStatus ?? product?.reConsignStatus ?? null;
  const reConsignStatus = normalizeReConsignStatus(rawReConsignStatus, {
    productStatus: product?.status,
    currentTerm: product?.currentTerm,
    hasProposal: Boolean(submitted || proposal),
    hasReceipt: Boolean(request?.newReceiptId || decisionObj?.newReceiptId || product?.newReceiptId),
    hasDecision: Boolean(request?.decisionId),
  });

  const confirmed = Boolean(
    reConsignStatus === RECONSIGN_STATUS.CONFIRMED ||
      (product?.status === 'ON_SALE' && product.currentTerm === 1 && (wasWaiting.current || proposal)),
  );
  const isDeclinedOrExpired =
    reConsignStatus === RECONSIGN_STATUS.DECLINED ||
    reConsignStatus === RECONSIGN_STATUS.EXPIRED;
  const isCounterOffered = !confirmed && !isDeclinedOrExpired && reConsignStatus === RECONSIGN_STATUS.COUNTER_OFFERED;
  const waiting = !confirmed && !isDeclinedOrExpired && !isCounterOffered &&
    ['WAREHOUSE', 'WAITING_END_OF_TERM'].includes(product?.status) &&
    (submitted || proposal || reConsignStatus === RECONSIGN_STATUS.PROPOSED);
  const eligible = !confirmed && !isDeclinedOrExpired && !isCounterOffered && !waiting &&
    ['WAREHOUSE', 'WAITING_END_OF_TERM'].includes(product?.status) &&
    Boolean(request?.decisionId);

  const memberCounterPrice = request?.memberCounterPrice ?? decisionObj?.memberCounterPrice ?? product?.memberCounterPrice ?? null;
  const memberCounterNote = request?.memberCounterNote ?? decisionObj?.memberCounterNote ?? product?.memberCounterNote ?? '';
  const counteredAt = request?.counteredAt ?? request?.counterOfferedAt ?? decisionObj?.counteredAt ?? decisionObj?.counterOfferedAt ?? null;
  const counterRoundsUsed = request?.counterRoundsUsed ?? decisionObj?.counterRoundsUsed ?? null;
  const maxCounterRounds = request?.maxCounterRounds ?? decisionObj?.maxCounterRounds ?? 2;
  const proposalDeadline = request?.proposalDeadline ?? decisionObj?.proposalDeadline ?? null;
  const declineReason = request?.declineReason ?? decisionObj?.declineReason ?? null;
  const declinedAt = request?.declinedAt ?? decisionObj?.declinedAt ?? null;
  const pickupDeadline = request?.pickupDeadline ?? decisionObj?.pickupDeadline ?? product?.pickupDeadline ?? null;
  const negotiationHistory =
    (Array.isArray(request?.negotiationHistory) && request.negotiationHistory) ||
    (Array.isArray(decisionObj?.negotiationHistory) && decisionObj.negotiationHistory) ||
    (Array.isArray(product?.negotiationHistory) && product.negotiationHistory) ||
    [];

  const counterOverdue = isCounterOffered && isCounterResponseOverdue({
    reConsignStatus: RECONSIGN_STATUS.COUNTER_OFFERED,
    counteredAt,
    decidedAt: request?.decidedAt || decisionObj?.decidedAt,
  });

  useEffect(() => {
    if (!product) return;
    const { floorPricePercent } = resolveInventoryTermAndRates(product);
    if (['WAREHOUSE', 'WAITING_END_OF_TERM'].includes(product.status) && (request?.decisionId || proposal || submitted)) {
      wasWaiting.current = true;
    }
    if (confirmed) {
      wasWaiting.current = true;
      setFeedback('');
    }
    if (['UNCLAIMED', 'DONATED', 'RETURNED', 'DESTROYED', 'SOLD'].includes(product.status)) {
      setFeedback('');
    }
    if (!dirty.current && request?.currentPrice != null) {
      const nextPrice = String(request.currentPrice);
      setProposedPrice(nextPrice);
      if (!floorDirty.current) {
        setProposedFloorPrice(String(Math.round(Number(request.currentPrice) * (floorPricePercent / 100))));
      }
    }
    if (!dirty.current && proposal?.proposedPrice != null) {
      setProposedPrice(String(proposal.proposedPrice));
      if (!floorDirty.current) {
        setProposedFloorPrice(String(Math.round(Number(proposal.proposedPrice) * (floorPricePercent / 100))));
      }
    }
    const nextReceiptId = request?.newReceiptId || decisionObj?.newReceiptId || product.newReceiptId || proposal?.receiptId || null;
    if (nextReceiptId) setReceiptId(nextReceiptId);
  }, [product, request, decisionObj, confirmed, proposal, submitted]);

  const isPriceValid = validMoney(proposedPrice);
  const priceError = proposedPrice !== '' && !isPriceValid ? 'Giá tối thiểu phải từ 1.000đ' : null;

  const { floorPricePercent, termLengthDays } = resolveInventoryTermAndRates(product || {});
  const computedDefaultFloor = isPriceValid ? Math.round(Number(proposedPrice) * (floorPricePercent / 100)) : 0;
  const effectiveFloor = proposedFloorPrice !== '' ? Number(proposedFloorPrice) : computedDefaultFloor;
  const isFloorValid = !isPriceValid || (Number.isFinite(effectiveFloor) && effectiveFloor > 0 && effectiveFloor <= Number(proposedPrice));
  const floorError = isPriceValid && proposedFloorPrice !== '' && !isFloorValid
    ? 'Giá sàn phải lớn hơn 0 và không vượt quá giá thỏa thuận.'
    : null;

  const isReproposePriceValid = counterAction !== 'REPROPOSE' || validMoney(reproposePrice);
  const reproposePriceError = counterAction === 'REPROPOSE' && reproposePrice !== '' && !isReproposePriceValid
    ? 'Giá tối thiểu phải từ 1.000đ'
    : null;
  const computedReproposeFloor = validMoney(reproposePrice)
    ? Math.round(Number(reproposePrice) * (floorPricePercent / 100))
    : 0;
  const effectiveReproposeFloor = reproposeFloorPrice !== '' ? Number(reproposeFloorPrice) : computedReproposeFloor;
  const isReproposeFloorValid = counterAction !== 'REPROPOSE' || (
    validMoney(reproposePrice) &&
    Number.isFinite(effectiveReproposeFloor) &&
    effectiveReproposeFloor > 0 &&
    effectiveReproposeFloor <= Number(reproposePrice)
  );
  const reproposeFloorError = counterAction === 'REPROPOSE' && validMoney(reproposePrice) && reproposeFloorPrice !== '' && !isReproposeFloorValid
    ? 'Giá sàn phải lớn hơn 0 và không vượt quá giá thỏa thuận.'
    : null;

  const send = async (event) => {
    event.preventDefault();
    if (!eligible || resource.busy) return;
    setActionError('');
    if (!validMoney(proposedPrice)) {
      setFeedback('Giá tối thiểu phải từ 1.000đ');
      return;
    }
    const price = Number(proposedPrice);
    const floorPrice = proposedFloorPrice !== '' ? Number(proposedFloorPrice) : Math.round(price * (floorPricePercent / 100));
    if (!Number.isFinite(floorPrice) || floorPrice <= 0 || floorPrice > price) {
      setActionError('Giá sàn không hợp lệ: phải lớn hơn 0 và không vượt quá giá thỏa thuận.');
      return;
    }

    await resource.mutate(async (options) => {
      const result = await endTermService.proposeReConsignPrice(request.decisionId, {
        agreedPrice: price,
        floorPrice,
        termLengthDays,
        conditionNote: product.conditionNote,
        moderatorNote: moderatorNote.trim() || undefined,
      }, options);
      rememberProposal({
        productId: product.id || sku,
        decisionId: request.decisionId,
        receiptId: result?.newReceiptId || result?.receiptId || null,
        proposedPrice: price,
      }, options);
      return result;
    }, {
      onSuccess: (result) => {
        setReceiptId(result?.newReceiptId || result?.receiptId || null);
        setSubmitted(true);
        setFeedback('Đã gửi đề xuất. Đang chờ Member xác nhận biên nhận mới qua app.');
      },
      onError: (err) => {
        setActionError(formatReConsignError(err));
      },
      onUncertain: () => setFeedback('Chưa xác định được kết quả gửi đề xuất. Vui lòng tải lại trước khi thử lại.'),
    });
  };

  const sendCounterResponse = async (event) => {
    event.preventDefault();
    if (!isCounterOffered || !decisionId || resource.busy) return;
    setActionError('');

    let agreedPrice;
    let floorPrice;
    if (counterAction === 'REPROPOSE') {
      if (!validMoney(reproposePrice)) {
        setActionError('Giá đề xuất mới tối thiểu phải từ 1.000đ.');
        return;
      }
      agreedPrice = Number(reproposePrice);
      floorPrice = reproposeFloorPrice !== ''
        ? Number(reproposeFloorPrice)
        : Math.round(agreedPrice * (floorPricePercent / 100));
      if (!Number.isFinite(floorPrice) || floorPrice <= 0 || floorPrice > agreedPrice) {
        setActionError('Giá sàn không hợp lệ: phải lớn hơn 0 và không vượt quá giá thỏa thuận.');
        return;
      }
    }

    await resource.mutate(async (options) => {
      const result = await endTermService.respondToCounterOffer(decisionId, {
        action: counterAction,
        ...(agreedPrice != null ? { agreedPrice, floorPrice } : {}),
        moderatorNote: counterNote.trim() || undefined,
      }, options);
      const nextReceipt = result?.newReceiptId || result?.receiptId || receiptId || null;
      if (nextReceipt) {
        rememberProposal({
          productId: product.id || sku,
          decisionId,
          receiptId: nextReceipt,
          proposedPrice: agreedPrice ?? memberCounterPrice ?? Number(proposedPrice || 0),
        }, options);
      }
      return result;
    }, {
      onSuccess: (result) => {
        const nextReceipt = result?.newReceiptId || result?.receiptId || null;
        if (nextReceipt) setReceiptId(nextReceipt);
        setSubmitted(true);
        setFeedback(
          counterAction === 'ACCEPT'
            ? 'Đã chấp nhận mức giá Member đề xuất và gửi biên nhận mới chờ Member xác nhận.'
            : counterAction === 'REPROPOSE'
              ? 'Đã gửi mức giá đề xuất mới để Member xác nhận qua app.'
              : 'Đã giữ nguyên giá cũ và gửi lại cho Member xác nhận lần cuối.',
        );
      },
      onError: (err) => {
        setActionError(formatReConsignError(err));
        if (err?.code === 'RE_CONSIGN_NOT_COUNTERED') {
          resource.refresh();
        }
      },
    });
  };

  const statusMeta = reConsignStatus ? RECONSIGN_STATUS_META[reConsignStatus] : null;

  return (
    <Page title="Ký gửi lại — chốt giá mới" subtitle={`Mã hàng hóa: ${sku}`} actions={
      <div className="flex gap-3 items-center">
        <Link className="text-primary hover:underline" to={`/moderator/inventory/${encodeURIComponent(sku)}`}>← Chi tiết sản phẩm</Link>
        <Button variant="outline" onClick={resource.refresh} className="gap-1.5 whitespace-nowrap">
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">refresh</span>
          <span>Tải lại</span>
        </Button>
      </div>
    }>
      <ResourceState resource={resource} />
      {feedback && <p role="status" className="rounded-xl border border-[#ABEFC6] bg-[#ECFDF3] p-4 text-sm text-[#067647] font-medium">{feedback}</p>}
      {actionError && !resource.actionError && <p role="alert" className="rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-4 text-sm text-[#B42318] font-semibold">{actionError}</p>}

      {product && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-5">
              <Card title="Món đang ở điểm kí gửi">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h2 className="text-lg font-bold">{product.name}</h2>
                    <p className="text-sm">{product.brandName || product.brand || '—'} · Size {product.size || '—'}</p>
                    <p className="font-mono text-primary">{product.id || sku}</p>
                  </div>
                  {statusMeta && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusMeta.badgeClass}`}>
                      {statusMeta.label}
                    </span>
                  )}
                </div>
                <Status>{product.status}</Status>
                <p className="text-sm">Người ký gửi: {product.memberFullName || product.member?.fullName || '—'} · {product.memberCode || product.member?.memberCode || '—'}</p>
              </Card>

              <Card title="Tham khảo khi định giá lại">
                <div className="flex justify-between"><span>Giá thỏa thuận biên nhận</span><strong>{money(request?.previousAgreedPrice ?? product.originalPrice ?? product.agreedPrice)}</strong></div>
                <div className="flex justify-between"><span>Giá đang ghi nhận</span><strong>{money(product.currentPrice)}</strong></div>
                <div className="flex justify-between"><span>Giá sàn</span><strong>{money(product.floorPrice)}</strong></div>
                <p className="text-sm">Kỳ {product.currentTerm ?? '—'} · ngày {product.daysIntoTerm ?? '—'}</p>
                {proposalDeadline && (
                  <p className="text-xs text-textSecondary">
                    Hạn Member xác nhận: <strong className="text-text">{formatDeadlineWithCountdown(proposalDeadline)}</strong>
                  </p>
                )}
              </Card>

              <p className="rounded-xl border border-dashed border-neutral p-4 text-sm text-textSecondary">
                Hàng vẫn được lưu kho. Khi Member xác nhận biên nhận mới, kỳ ký gửi bắt đầu lại từ kỳ 1 với giá bán mới.
              </p>
            </div>

            {confirmed ? (
              <Card title="MEMBER ĐÃ XÁC NHẬN · ĐÃ CHỐT">
                <p className="text-sm">Giá bán đã chốt</p>
                <strong className="text-3xl text-primary">{money(product.currentPrice)}</strong>
                <p>Sản phẩm đang bán · Kỳ {product.currentTerm} · ngày {product.daysIntoTerm ?? '—'}.</p>
                {receiptId && <Button onClick={() => setShowReceipt(true)}>Xem biên nhận ký gửi lại</Button>}
              </Card>
            ) : isDeclinedOrExpired ? (
              <Card title={reConsignStatus === RECONSIGN_STATUS.EXPIRED ? 'QUÁ HẠN XÁC NHẬN · CHUYỂN NHẬN LẠI HÀNG' : 'MEMBER KHÔNG ĐỒNG Ý · CHUYỂN NHẬN LẠI HÀNG'}>
                <div className="space-y-3 text-sm">
                  <div className="rounded-xl border border-[#FEDF89] bg-[#FFFAEB] p-4 text-[#B54708] space-y-1">
                    <p className="font-bold">
                      {reConsignStatus === RECONSIGN_STATUS.EXPIRED
                        ? 'Đã quá hạn Member xác nhận biên nhận ký gửi lại.'
                        : 'Member đã từ chối đề xuất giá ký gửi lại.'}
                    </p>
                    <p className="text-xs">
                      Hệ thống đã chuyển món hàng sang nhận lại miễn phí tại quầy (TAKE_BACK).
                    </p>
                  </div>
                  {declineReason && (
                    <p className="text-xs text-textSecondary">
                      Lý do của Member: <strong className="text-text">{declineReason}</strong>
                    </p>
                  )}
                  {declinedAt && (
                    <p className="text-xs text-textSecondary">Thời điểm: {date(declinedAt)}</p>
                  )}
                  {pickupDeadline && (
                    <p className="text-xs text-textSecondary">
                      Hạn đến nhận lại: <strong className="text-text">{formatDeadlineWithCountdown(pickupDeadline)}</strong>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link to="/moderator/counter">
                      <Button variant="primary" size="sm">Mở Quầy tiếp nhận →</Button>
                    </Link>
                    {receiptId && (
                      <Button variant="outline" size="sm" onClick={() => setShowReceipt(true)}>
                        Xem biên nhận ký gửi lại
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ) : isCounterOffered ? (
              <Card title="MEMBER ĐỀ XUẤT GIÁ KHÁC · CẦN PHẢN HỒI">
                <div className="space-y-4">
                  {counterOverdue && (
                    <div role="note" className="rounded-xl border-2 border-[#B42318] bg-[#FEF3F2] p-3 text-xs font-bold text-[#B42318]">
                      Cảnh báo: Đã quá 2 ngày kể từ lúc Member trả giá mà chưa phản hồi!
                    </div>
                  )}

                  <div className="rounded-xl border border-neutral bg-background p-4 space-y-2 text-sm">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-textSecondary">Giá Member đề xuất:</span>
                      <strong className="text-xl font-extrabold text-[#B42318]">
                        {memberCounterPrice != null ? money(memberCounterPrice) : '—'}
                      </strong>
                    </div>
                    {memberCounterNote && (
                      <p className="text-xs text-textSecondary">
                        Ghi chú của Member: <span className="text-text font-medium">"{memberCounterNote}"</span>
                      </p>
                    )}
                    {counteredAt && (
                      <p className="text-xs text-textSecondary">
                        Gửi lúc: <span className="text-text">{date(counteredAt)}</span>
                      </p>
                    )}
                    {counterRoundsUsed != null && (
                      <p className="text-xs text-textSecondary">
                        Lượt thương lượng: <strong className="text-text">{counterRoundsUsed} / {maxCounterRounds}</strong>
                      </p>
                    )}
                  </div>

                  <form onSubmit={sendCounterResponse} className="space-y-4">
                    <div className="space-y-2">
                      <span className="block text-xs font-bold uppercase tracking-wider text-textSecondary">
                        Chọn phương án phản hồi
                      </span>
                      {COUNTER_ACTIONS.map((opt) => (
                        <label
                          key={opt.key}
                          className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                            counterAction === opt.key
                              ? 'border-[#006B2C] bg-[#F6F9F4]'
                              : 'border-neutral bg-white hover:bg-background'
                          }`}
                        >
                          <input
                            type="radio"
                            name="counter-action"
                            value={opt.key}
                            checked={counterAction === opt.key}
                            onChange={() => {
                              setCounterAction(opt.key);
                              setActionError('');
                            }}
                            className="mt-0.5 text-[#006B2C]"
                          />
                          <div>
                            <span className="block text-sm font-bold text-text">{opt.label}</span>
                            <span className="block text-xs text-textSecondary">{opt.hint}</span>
                          </div>
                        </label>
                      ))}
                    </div>

                    {counterAction === 'REPROPOSE' && (
                      <div className="space-y-3 rounded-xl border border-neutral bg-background p-3.5">
                        <div>
                          <label htmlFor="reconsign-repropose-price" className="block font-semibold text-sm mb-1.5">
                            Giá đề xuất mới
                          </label>
                          <input
                            id="reconsign-repropose-price"
                            type="text"
                            inputMode="numeric"
                            value={reproposePrice}
                            disabled={resource.busy}
                            onChange={(e) => {
                              const next = e.target.value.replace(/\D/g, '');
                              setReproposePrice(next);
                              if (!reproposeFloorDirty.current && next) {
                                setReproposeFloorPrice(String(Math.round(Number(next) * (floorPricePercent / 100))));
                              }
                            }}
                            placeholder="Nhập giá bán mới..."
                            className="w-full text-xl font-mono p-2.5 rounded-xl border border-neutral bg-white"
                          />
                          {reproposePriceError && (
                            <p role="alert" className="mt-1 text-xs font-medium text-[#C62828]">{reproposePriceError}</p>
                          )}
                        </div>
                        <div>
                          <label htmlFor="reconsign-repropose-floor" className="block font-semibold text-sm mb-1.5">
                            Giá sàn mới
                          </label>
                          <input
                            id="reconsign-repropose-floor"
                            type="text"
                            inputMode="numeric"
                            value={reproposeFloorPrice}
                            disabled={resource.busy}
                            onChange={(e) => {
                              reproposeFloorDirty.current = true;
                              setReproposeFloorPrice(e.target.value.replace(/\D/g, ''));
                            }}
                            placeholder="Tự tính theo tỷ lệ giá sàn nếu để trống"
                            className="w-full text-base font-mono p-2.5 rounded-xl border border-neutral bg-white"
                          />
                          {reproposeFloorError && (
                            <p role="alert" className="mt-1 text-xs font-medium text-[#C62828]">{reproposeFloorError}</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <label htmlFor="reconsign-counter-note" className="block font-semibold mb-1.5">
                        Ghi chú phản hồi gửi Member
                      </label>
                      <textarea
                        id="reconsign-counter-note"
                        rows={3}
                        value={counterNote}
                        disabled={resource.busy}
                        onChange={(e) => setCounterNote(e.target.value)}
                        placeholder="Giải thích lý do chấp nhận / đề xuất giá khác / giữ nguyên giá..."
                        className="w-full p-3 rounded-xl border border-neutral"
                      />
                    </div>

                    <Button
                      type="submit"
                      loading={resource.busy}
                      disabled={resource.busy || !isReproposePriceValid || !isReproposeFloorValid}
                    >
                      Gửi phản hồi cho Member
                    </Button>
                  </form>

                  {receiptId && (
                    <Button variant="outline" onClick={() => setShowReceipt(true)}>
                      Xem biên nhận ký gửi lại
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <Card title={waiting ? 'ĐÃ GỬI ĐỀ XUẤT · CHỜ MEMBER XÁC NHẬN QUA APP' : 'Đang thương lượng giá mới'}>
                {!eligible && !waiting && (
                  <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
                    Chưa có yêu cầu đủ điều kiện đề xuất giá. Nếu đã gửi đề xuất, vui lòng chờ Member xác nhận qua app và tải lại.
                  </p>
                )}
                <form onSubmit={send} className="space-y-4">
                  <div>
                    <label htmlFor="reconsign-proposed-price" className="block font-semibold mb-2">
                      Giá bán đề xuất ký gửi lại
                    </label>
                    <input
                      id="reconsign-proposed-price"
                      type="text"
                      inputMode="numeric"
                      value={proposedPrice}
                      disabled={!eligible || resource.busy}
                      onChange={(event) => {
                        dirty.current = true;
                        const next = event.target.value.replace(/\D/g, '');
                        setProposedPrice(next);
                        if (!floorDirty.current && next) {
                          setProposedFloorPrice(String(Math.round(Number(next) * (floorPricePercent / 100))));
                        }
                      }}
                      className="w-full text-2xl font-mono p-3 rounded-xl border border-neutral disabled:bg-background"
                    />
                    {priceError && (
                      <p role="alert" className="mt-1.5 text-xs font-medium text-[#C62828]">
                        {priceError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="reconsign-floor-price" className="block font-semibold mb-2">
                      Giá sàn đề xuất
                    </label>
                    <input
                      id="reconsign-floor-price"
                      type="text"
                      inputMode="numeric"
                      value={proposedFloorPrice}
                      disabled={!eligible || resource.busy}
                      onChange={(event) => {
                        floorDirty.current = true;
                        setProposedFloorPrice(event.target.value.replace(/\D/g, ''));
                      }}
                      className="w-full text-lg font-mono p-2.5 rounded-xl border border-neutral disabled:bg-background"
                    />
                    {floorError && (
                      <p role="alert" className="mt-1.5 text-xs font-medium text-[#C62828]">
                        {floorError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="reconsign-moderator-note" className="block font-semibold mb-2">
                      Ghi chú của Moderator gửi Member
                    </label>
                    <textarea
                      id="reconsign-moderator-note"
                      rows={3}
                      value={moderatorNote}
                      disabled={!eligible || resource.busy}
                      onChange={(event) => setModeratorNote(event.target.value)}
                      className="w-full p-3 rounded-xl border border-neutral disabled:bg-background"
                    />
                  </div>
                  {waiting ? (
                    <p className="text-sm text-textSecondary">
                      Đang chờ Member phản hồi qua app. Web tự kiểm tra trạng thái mỗi 30 giây.
                    </p>
                  ) : (
                    <Button type="submit" loading={resource.busy} disabled={!eligible || resource.busy || !isPriceValid || !isFloorValid}>
                      Gửi đề xuất giá mới cho Member
                    </Button>
                  )}
                </form>
                {receiptId && <Button variant="outline" onClick={() => setShowReceipt(true)}>Xem biên nhận ký gửi lại</Button>}
              </Card>
            )}
          </div>

          {negotiationHistory.length > 0 && (
            <Card title="Lịch sử thương lượng giá">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral bg-background text-textSecondary font-semibold whitespace-nowrap">
                      <th className="py-2.5 px-3">Thời gian</th>
                      <th className="py-2.5 px-3">Bên thực hiện</th>
                      <th className="py-2.5 px-3">Hành động</th>
                      <th className="py-2.5 px-3 text-right">Mức giá</th>
                      <th className="py-2.5 px-3">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral">
                    {negotiationHistory.map((entry, idx) => (
                      <tr key={entry.id || `${entry.action}-${entry.createdAt || idx}`}>
                        <td className="py-2.5 px-3 whitespace-nowrap text-textSecondary">
                          {entry.createdAt ? date(entry.createdAt) : '—'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-text">
                          {RECONSIGN_ACTOR_LABELS[entry.actor] || entry.actor || '—'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-medium text-text">
                          {RECONSIGN_HISTORY_ACTION_LABELS[entry.action] || entry.action || '—'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono font-bold text-[#006B2C]">
                          {entry.price != null ? money(entry.price) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-textSecondary">
                          {entry.note || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {showReceipt && receiptId && (
        <Modal isOpen onClose={() => setShowReceipt(false)} title="Biên nhận ký gửi lại" size="lg">
          <ReceiptPanel receiptId={receiptId} />
        </Modal>
      )}
    </Page>
  );
}
