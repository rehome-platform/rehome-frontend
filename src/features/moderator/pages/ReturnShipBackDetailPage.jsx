import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import { ZoomableImage } from '../../../components/common/ImageLightbox.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { notifyWarehouseChanged, useResource } from '../hooks/warehouseHooks.jsx';
import { isShipBackDeadlineNear } from '../models/queueModel.js';
import returnService from '../services/returnApi.js';
import { Page, Card, ResourceState, date, formatDeadlineWithCountdown, money } from '../components/WarehouseUi.jsx';

function paymentMethodLabel(method) {
  if (method === 'WALLET') return 'Ví ReHome';
  if (method === 'VNPAY') return 'VNPay';
  return method || '—';
}

function validGhnPrintUrl(value) {
  if (!value || typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    return url.href;
  } catch {
    return '';
  }
}

export default function ReturnShipBackDetailPage() {
  const { returnId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const detailResource = useResource(
    (options) => returnService.detail(returnId, options),
    [returnId],
    { enabled: Boolean(returnId) }
  );

  const item = detailResource.data;
  const [skuChecked, setSkuChecked] = useState(false);
  const [packedChecked, setPackedChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shipError, setShipError] = useState('');
  const [createdResult, setCreatedResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [printUrl, setPrintUrl] = useState('');
  const [labelBusy, setLabelBusy] = useState(false);
  const [labelNote, setLabelNote] = useState('');

  useEffect(() => {
    setSkuChecked(false);
    setPackedChecked(false);
    setShipError('');
    setCreatedResult(null);
    setCopied(false);
    setPrintUrl('');
    setLabelNote('');
  }, [returnId]);

  const trackingCode = createdResult?.shipBackTrackingCode || item?.shipBackTrackingCode || '';
  const effectivePrintUrl =
    printUrl ||
    validGhnPrintUrl(createdResult?.shipBackPrintUrl) ||
    validGhnPrintUrl(item?.shipBackPrintUrl);

  const photos =
    item?.packingPhotoUrls?.length
      ? item.packingPhotoUrls
      : item?.stockInPhotos?.length
        ? item.stockInPhotos
        : item?.buyerPhotos || [];
  const mainPhoto = photos[0] || null;
  const nearDeadline = isShipBackDeadlineNear(item?.shipBackDeadline);

  const handleCreateShipment = async () => {
    if (!skuChecked || !packedChecked || submitting || trackingCode) return;
    setSubmitting(true);
    setShipError('');
    try {
      const res = await returnService.shipBack(returnId);
      setCreatedResult(res);
      const urlFromRes = validGhnPrintUrl(res?.shipBackPrintUrl);
      if (urlFromRes) setPrintUrl(urlFromRes);
      notifyWarehouseChanged(['queue:', 'returns:']);
      toast.success(`Đã tạo vận đơn GHN ${res?.shipBackTrackingCode || ''} và rời khỏi hàng đợi.`);
      detailResource.refresh();
    } catch (err) {
      const msg =
        err?.status === 502 || /GHN/i.test(String(err?.code || ''))
          ? 'GHN chưa tạo được vận đơn, thử lại'
          : (err?.message || 'Không thể tạo vận đơn GHN.');
      setShipError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyTrackingCode = async () => {
    if (!trackingCode) return;
    try {
      await navigator.clipboard?.writeText?.(trackingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info(`Mã vận đơn GHN: ${trackingCode}`);
    }
  };

  const handlePrintLabel = async () => {
    if (!trackingCode || labelBusy) return;
    setLabelNote('');
    if (effectivePrintUrl) {
      window.open(effectivePrintUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    setLabelBusy(true);
    try {
      const res = await returnService.shipBackLabel(returnId, 'A5');
      const nextUrl = validGhnPrintUrl(res?.printUrl);
      if (!nextUrl) {
        setLabelNote('GHN chưa cung cấp link in nhãn cho vận đơn này.');
        return;
      }
      setPrintUrl(nextUrl);
      window.open(nextUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setLabelNote(err?.message || 'Không lấy được link in nhãn GHN.');
    } finally {
      setLabelBusy(false);
    }
  };

  return (
    <Page
      title="Gửi lại hàng trả không hợp lệ"
      subtitle={item ? `Đơn #${item.orderNo || item.orderId || '—'} · Mã hàng hóa ${item.sku || '—'}` : 'Kiểm tra SKU, đóng gói và tạo vận đơn GHN chiều gửi lại'}
      actions={
        <>
          <Link to="/moderator/queue?type=RETURN_SHIP_BACK">
            <Button variant="outline" type="button">
              Quay lại hàng đợi
            </Button>
          </Link>
          <Button variant="outline" type="button" onClick={() => detailResource.refresh()}>
            Tải lại
          </Button>
        </>
      }
    >
      <ResourceState resource={detailResource} empty={!item && !detailResource.loading}>
        {item && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-5">
              <Card title="Món hàng cần lấy trong điểm kí gửi">
                <div className="flex items-start gap-4">
                  {mainPhoto ? (
                    <ZoomableImage
                      src={mainPhoto}
                      alt={item.itemName || 'Sản phẩm'}
                      className="w-24 h-28 rounded-xl border border-neutral overflow-hidden shrink-0"
                      imgClassName="w-full h-full object-cover"
                      images={photos}
                      categoryLabel={item.itemName || 'Sản phẩm'}
                      showHoverBadge={false}
                    />
                  ) : (
                    <div className="w-24 h-28 rounded-xl border border-dashed border-neutral bg-background flex items-center justify-center text-xs text-textSecondary shrink-0">
                      Không có ảnh
                    </div>
                  )}
                  <div className="space-y-1.5 text-xs">
                    <p className="text-sm font-bold text-text">{item.itemName || 'Sản phẩm ký gửi'}</p>
                    <p className="text-textSecondary">
                      Mã hàng hóa (SKU):{' '}
                      <strong className="font-mono text-sm text-[#006B2C]">{item.sku || '—'}</strong>
                    </p>
                    <p className="text-textSecondary">
                      Mã đơn: <strong className="font-mono text-text">{item.orderNo || item.orderId || '—'}</strong>
                    </p>
                    <p className="text-textSecondary">
                      Mã yêu cầu trả: <strong className="font-mono text-text">{item.code || item.id}</strong>
                    </p>
                  </div>
                </div>
              </Card>

              <Card title="Thông tin người nhận">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-textSecondary shrink-0">Người nhận:</span>
                    <span className="font-bold text-text text-right">
                      {item.shipBackRecipientName || item.buyerName || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-textSecondary shrink-0">Số điện thoại:</span>
                    <span className="font-semibold text-text text-right">
                      {item.shipBackPhone || item.buyerPhone || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-textSecondary shrink-0">Địa chỉ:</span>
                    <span className="text-text text-right">
                      {item.shipBackAddress || item.buyerAddress || '—'}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-5 space-y-5">
              <Card title="Phí gửi lại đã thu">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-textSecondary">Phí đã thu:</span>
                    <span className="font-bold text-[#006B2C] text-sm">
                      {item.shipBackFee != null ? money(item.shipBackFee) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-textSecondary">Cách trả:</span>
                    <span className="font-semibold text-text">{paymentMethodLabel(item.shipBackPaymentMethod)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-textSecondary">Thời điểm trả phí:</span>
                    <span className="text-text">
                      {item.shipBackFeePaidAt ? date(item.shipBackFeePaidAt) : 'Chưa thanh toán'}
                    </span>
                  </div>
                  {item.shipBackDeadline && (
                    <div className="flex justify-between gap-4">
                      <span className="text-textSecondary">Hạn gửi hàng:</span>
                      <span className={nearDeadline ? 'font-bold text-[#B42318]' : 'font-semibold text-text'}>
                        {formatDeadlineWithCountdown(item.shipBackDeadline)}
                      </span>
                    </div>
                  )}
                </div>
              </Card>

              <Card title="Xác nhận & Tạo vận đơn GHN">
                {!trackingCode ? (
                  <div className="space-y-4 text-xs">
                    <div className="space-y-2.5 rounded-xl border border-neutral bg-background p-3.5">
                      <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-text">
                        <input
                          type="checkbox"
                          checked={skuChecked}
                          onChange={(e) => setSkuChecked(e.target.checked)}
                          className="h-4 w-4 rounded border-neutral text-[#006B2C]"
                        />
                        <span>Đã kiểm SKU</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-text">
                        <input
                          type="checkbox"
                          checked={packedChecked}
                          onChange={(e) => setPackedChecked(e.target.checked)}
                          className="h-4 w-4 rounded border-neutral text-[#006B2C]"
                        />
                        <span>Đã đóng gói</span>
                      </label>
                    </div>

                    {shipError && (
                      <div
                        role="alert"
                        className="rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-3 text-xs font-semibold text-[#B42318]"
                      >
                        {shipError}
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="primary"
                      className="w-full py-2.5 font-bold"
                      loading={submitting}
                      disabled={!skuChecked || !packedChecked || submitting}
                      onClick={handleCreateShipment}
                    >
                      Tạo vận đơn GHN
                    </Button>
                  </div>
                ) : (
                  <div role="status" className="space-y-3 text-xs">
                    <div className="rounded-xl border border-[#ABEFC6] bg-[#ECFDF3] p-3.5 space-y-1.5">
                      <p className="font-bold text-[#067647]">Đã tạo vận đơn GHN &amp; rời hàng đợi</p>
                      <p className="text-textSecondary">
                        Mã vận đơn:{' '}
                        <strong className="font-mono text-sm text-text">{trackingCode}</strong>
                      </p>
                      {item.shipBackShippedAt && (
                        <p className="text-textSecondary">Tạo lúc: {date(item.shipBackShippedAt)}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={handleCopyTrackingCode}>
                        {copied ? 'Đã sao chép' : 'Copy mã vận đơn'}
                      </Button>
                      {(effectivePrintUrl || createdResult || item.shipBackTrackingCode) && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          loading={labelBusy}
                          onClick={handlePrintLabel}
                        >
                          In nhãn GHN
                        </Button>
                      )}
                    </div>

                    {effectivePrintUrl && (
                      <a
                        href={effectivePrintUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs font-semibold text-[#006B2C] underline"
                      >
                        Mở phiếu in nhãn GHN
                      </a>
                    )}
                    {labelNote && <p className="text-[11px] text-[#B54708]">{labelNote}</p>}

                    <div className="pt-2 border-t border-neutral flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/moderator/queue?type=RETURN_SHIP_BACK')}
                      >
                        Quay lại hàng đợi
                      </Button>
                      <Link to={`/moderator/returns?id=${encodeURIComponent(returnId)}`}>
                        <Button type="button" variant="ghost" size="sm">
                          Xem chi tiết yêu cầu trả hàng
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </ResourceState>
    </Page>
  );
}
