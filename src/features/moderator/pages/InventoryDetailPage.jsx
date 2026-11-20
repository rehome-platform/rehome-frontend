import DegradedCaseDetails, { DegradedCaseSummary } from '../components/DegradedCaseDetails.jsx';
import { latestDegradedCase, DEGRADED_DECISION_POLICY } from '../models/degradedCaseModel.js';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import BarcodePrintModal from '../components/BarcodePrintModal.jsx';
import PhotoUpload from '../components/PhotoUpload.jsx';
import ProductEditModal from '../components/ProductEditModal.jsx';
import { inventoryService } from '../services/warehouseApi.js';
import returnService, { pendingReturnFromInventory } from '../services/returnApi.js';
import { endTermService } from '../services/endTermApi.js';
import { pricingForProduct } from '../services/endTermPricingApi.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { listItems, resolveInventoryTermAndRates } from '../models/warehouseModel.js';
import { Page, Card, Photos, Status, ResourceState, date, money } from '../components/WarehouseUi.jsx';
import { ReturnOutcomeDialog } from '../components/returns/ReturnSections.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import {
  WAREHOUSE_REASON,
  productStatusKey,
  resolveProductStatusLabel,
  warehouseReasonOf,
} from '../../../constants/productStatus.js';

export default function InventoryDetailPage() {
  const { sku } = useParams();
  const navigate = useNavigate();

  const product = useResource((options) => inventoryService.read(sku, options), [sku], {
    poll: true,
    refreshInterval: 30000,
    done: (value) => !value?.photos?.some((photo) => photo.status === 'PROCESSING'),
  });

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [print, setPrint] = useState(false);
  const [photoUrls, setPhotos] = useState([]);
  const [uploadPending, setPending] = useState(false);
  const [uploadVersion, setUploadVersion] = useState(0);

  // Modal lập biên bản hàng xuống cấp (TK-02)
  const [degradedModalOpen, setDegradedModalOpen] = useState(false);
  const [degradedNotes, setDegradedNotes] = useState('');
  const [degradedPhotos, setDegradedPhotos] = useState([]);
  const [degradedUploadPending, setDegradedUploadPending] = useState(false);
  const [isSubmittingDegraded, setIsSubmittingDegraded] = useState(false);
  const [submittedCase, setSubmittedCase] = useState(null);
  const [caseDetailsOpen, setCaseDetailsOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [relistModalOpen, setRelistModalOpen] = useState(false);
  const [relistSubmitting, setRelistSubmitting] = useState(false);
  const degradedLock = useRef(false);
  const relistLock = useRef(false);
  const toast = useToast();
  useEffect(() => {
    setSubmittedCase(null);
    setCaseDetailsOpen(false);
    setDegradedModalOpen(false);
    setEditModalOpen(false);
    setRelistModalOpen(false);
    setDegradedNotes('');
    setDegradedPhotos([]);
  }, [sku]);

  const onPhotos = useCallback((urls, pending) => {
    setPhotos(urls);
    setPending(pending);
  }, []);

  const onDegradedPhotos = useCallback((urls, pending) => {
    setDegradedPhotos(urls);
    setDegradedUploadPending(pending);
  }, []);

  const data = product.data;
  const existingCase = useResource(async options => {
    if (data.degradedCaseId) return returnService.getDegradedCase(data.degradedCaseId, options);
    if (data.degradedCaseId === null) return null;
    const cases = await inventoryService.degradedCases({}, options);
    return latestDegradedCase(cases, data.id);
  }, [data?.id, data?.status, data?.degradedCaseId], { enabled: Boolean(data?.id && data.status !== 'ON_SALE'), refreshInterval: 30000 });
  const activeCase = data?.status === 'ON_SALE' || data?.degradedCaseId === null ? null
    : data?.degradedCaseId
      ? [existingCase.data, submittedCase].find(item => item?.id === data.degradedCaseId)
      : existingCase.data || submittedCase;
  const pricing = useResource(options => endTermService.pendingPricing(options), [sku], {
    enabled: Boolean(data && ['WAREHOUSE', 'WAITING_END_OF_TERM'].includes(data.status)), refreshInterval: 30000,
  });
  const pendingReturnData = useMemo(() => pendingReturnFromInventory(data), [data]);
  const pendingReturn = useMemo(
    () => ({ data: pendingReturnData, refresh: () => product.refresh?.() }),
    [pendingReturnData, product]
  );
  const pricingRequest = pricingForProduct(pricing.data || [], data?.id || sku);
  const canNegotiate = Boolean(pricingRequest?.decisionId && ['WAREHOUSE', 'WAITING_END_OF_TERM'].includes(data?.status));
  const canReportDegraded = Boolean(['ON_SALE', 'RETURNED'].includes(data?.status) && !submittedCase && !activeCase);

  const handleCopySku = () => {
    if (!sku) return;
    navigator.clipboard?.writeText(sku);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const sellingPrice = data?.currentPrice ?? data?.agreedPrice;
  const termAndRates = resolveInventoryTermAndRates(data);

  const [degradedError, setDegradedError] = useState('');

  const handleSendDegradedProposal = async () => {
    if (degradedLock.current || degradedUploadPending || !['ON_SALE', 'RETURNED'].includes(data?.status) || submittedCase || !data?.id) return;
    setDegradedError('');
    if (!degradedNotes.trim()) {
      const msg = 'Vui lòng nhập mô tả chi tiết hư hỏng hoặc nguyên nhân xuống cấp.';
      setDegradedError(msg);
      toast.warn(msg);
      return;
    }
    if (!degradedPhotos.length) {
      const msg = 'Vui lòng tải lên ít nhất 1 ảnh hiện trạng hư hỏng.';
      setDegradedError(msg);
      toast.warn(msg);
      return;
    }
    degradedLock.current = true;
    setIsSubmittingDegraded(true);
    try {
      const created = await returnService.createDegradedCase({
        productId: data.id,
        notes: degradedNotes.trim(),
        photos: degradedPhotos,
      });
      setDegradedModalOpen(false);
      setSubmittedCase(created);
      toast.success('Đã gửi đề xuất hàng xuống cấp thành công.');
      product.refresh();
    } catch (err) {
      const msg = err?.message || 'Lỗi khi gửi đề xuất hàng xuống cấp.';
      setDegradedError(msg);
      toast.error(msg);
    } finally {
      degradedLock.current = false;
      setIsSubmittingDegraded(false);
    }
  };

  const handleConfirmRelist = async (outcome) => {
    const targetReturn = pendingReturn.data;
    if (!targetReturn?.id || relistLock.current) return;
    relistLock.current = true;
    setRelistSubmitting(true);
    try {
      await returnService.applyItemAction(targetReturn.id, outcome);
      toast.success(`Đã đăng bán lại sản phẩm ${data?.sku || sku} lên sàn.`);
      setRelistModalOpen(false);
      product.refresh();
      pendingReturn.refresh();
    } catch (err) {
      toast.error(err?.message || 'Không thể đăng bán lại sản phẩm. Vui lòng thử lại.');
    } finally {
      relistLock.current = false;
      setRelistSubmitting(false);
    }
  };

  // 1. Xử lý lỗi phân quyền (403) và không tìm thấy (404)
  const isForbidden =
    product.error?.status === 403 || product.error?.code === 'PRODUCT_NOT_IN_YOUR_WAREHOUSE';
  const isNotFound =
    product.error?.status === 404 || product.error?.code === 'PRODUCT_NOT_FOUND';

  return (
    <Page
      title="Chi tiết sản phẩm"
      subtitle={`Mã SKU: ${sku}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/moderator/inventory')}>
            ← Quay lại Quản lý sản phẩm
          </Button>
          <Button variant="outline" onClick={() => product.refresh()}>
            Tải lại
          </Button>
        </div>
      }
    >
      {/* Thông báo lỗi đặc thù nếu gặp phải */}
      {isForbidden && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-amber-900 text-base">Sản phẩm không thuộc kho bạn quản lý</h3>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Sản phẩm với mã SKU <strong>{sku}</strong> đang được lưu trữ tại chi nhánh kho khác. Bạn chỉ có quyền kiểm kê và in tem đối với các sản phẩm thuộc kho bạn được phân công.
          </p>
          <Button variant="outline" onClick={() => navigate('/moderator/inventory')}>
            Quay lại Quản lý sản phẩm
          </Button>
        </div>
      )}

      {isNotFound && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-red-900 text-base">Không tìm thấy sản phẩm</h3>
          </div>
          <p className="text-xs text-red-800 leading-relaxed">
            Hệ thống không tìm thấy bất kỳ sản phẩm nào có mã SKU: <strong>{sku}</strong>. Vui lòng kiểm tra lại tem nhãn hoặc quét lại mã QR.
          </p>
          <Button variant="outline" onClick={() => navigate('/moderator/inventory')}>
            Quay lại Quản lý sản phẩm
          </Button>
        </div>
      )}

      {!isForbidden && !isNotFound && <ResourceState resource={product} />}

      {data && (() => {
        const statusItem = {
          ...data,
          warehouseReason:
            data.warehouseReason ||
            (activeCase && !activeCase.choice ? WAREHOUSE_REASON.DEGRADED : undefined) ||
            (canNegotiate ? WAREHOUSE_REASON.NEGOTIATING : undefined) ||
            warehouseReasonOf(data),
        };
        return (
        <div className="space-y-6">
          {/* 1. THẺ THÔNG TIN SẢN PHẨM */}
          <div className="rounded-2xl border border-[#8a8a8a] bg-white p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-[#191C19]">{data.name}</h2>
                  <Status label={resolveProductStatusLabel(statusItem)}>{productStatusKey(statusItem)}</Status>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-bold bg-[#f4f4f4] px-2.5 py-1 rounded-lg border border-[#d0d0d0] text-[#191C19]">
                    SKU: {data.sku}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySku}
                    className="text-primary hover:underline font-semibold"
                  >
                    {copyFeedback ? '✓ Đã sao chép' : 'Sao chép mã'}
                  </button>
                </div>
              </div>

                <div className="flex flex-wrap items-center gap-3">
                  {data.status === 'RETURNED' && pendingReturn.data && (
                    <Button
                      onClick={() => setRelistModalOpen(true)}
                      variant="outline"
                      className="border-[#006B2C] text-[#006B2C] hover:bg-[#E8F5E9] font-bold py-2 px-4 shadow-sm"
                    >
                      Đăng bán lại
                    </Button>
                  )}
                  {data.status === 'ON_SALE' && (
                    <Button
                      onClick={() => setEditModalOpen(true)}
                      variant="outline"
                      className="border-[#006B2C] text-[#006B2C] hover:bg-[#F1F8F4] font-bold py-2 px-4 shadow-sm"
                    >
                      Chỉnh sửa thông tin
                    </Button>
                  )}
                  {canReportDegraded && <Button
                    onClick={() => setDegradedModalOpen(true)}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50 font-bold py-2 px-4 shadow-sm"
                  >
                    Hàng xuống cấp
                  </Button>}
                  <Button
                    onClick={() => setPrint(true)}
                    className="bg-[#006B2C] text-white hover:bg-[#005221] font-bold py-2 px-4 shadow-sm"
                  >
                    Mở / In lại tem SKU
                  </Button>
                </div>
              </div>

              {/* Bảng thuộc tính chi tiết chuẩn TK-02 */}
              <div className="border border-[#c4c4c4] rounded-xl overflow-hidden divide-y divide-[#e0e0e0] text-xs">
                <div className="flex items-center p-3 gap-3 bg-[#fafafa]">
                  <span className="w-28 text-[#5f5f5f] flex-shrink-0">Người ký gửi:</span>
                  <span className="text-[#191C19]">
                    <strong className="font-mono">{data.member?.memberCode || data.memberCode || data.memberId || '—'}</strong> · {data.member?.fullName || data.memberName || 'Chưa có thông tin'}
                  </span>
                </div>
                <div className="flex items-center p-3 gap-3">
                  <span className="w-28 text-[#5f5f5f] flex-shrink-0">Giá bán hiện tại:</span>
                  <span className="font-bold text-sm text-[#006B2C]">{money(sellingPrice)}</span>
                </div>
                <div className="flex items-center p-3 gap-3">
                  <span className="w-28 text-[#5f5f5f] flex-shrink-0">Giá sàn:</span>
                  <span className="text-[#191C19]">{money(termAndRates.floorPrice)}</span>
                </div>
                <div className="flex items-center p-3 gap-3 bg-[#fafafa]">
                  <span className="w-28 text-[#5f5f5f] flex-shrink-0">Kỳ ký gửi:</span>
                  <span className="text-[#191C19] font-medium">
                    Kỳ {termAndRates.currentTerm} · ngày {termAndRates.daysIntoTerm} / {termAndRates.termLengthDays} · hoa hồng {termAndRates.commissionPercent}%
                  </span>
                </div>
                <div className="flex items-center p-3 gap-3">
                  <span className="w-28 text-[#5f5f5f] flex-shrink-0">Điều khoản biên nhận:</span>
                  <span className="text-[#191C19]">
                    Hoa hồng kỳ 1/2/3: {termAndRates.commissionTerm1}% / {termAndRates.commissionTerm2}% / {termAndRates.commissionTerm3}% · Đền xuống cấp (nhận lại): {termAndRates.degradedCompensationRatePercent}%
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-[#e5e5e5]">
                <div className="p-3.5 rounded-xl border border-[#e0e0e0] bg-[#fafafa]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#5f5f5f]">Giá niêm yết</p>
                  <p className="text-lg font-bold text-[#191C19] mt-0.5">
                    {money(data.agreedPrice || data.currentPrice)}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-[#e0e0e0] bg-[#fafafa]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#5f5f5f]">Kích cỡ & Phân loại</p>
                  <p className="text-base font-semibold text-[#191C19] mt-0.5">
                    {data.brandName || data.brand || 'ReHome'}
                    {data.size ? ` · Size ${data.size}` : ''}
                  </p>
                </div>
              </div>

              {data.photos && data.photos.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-bold text-[#191C19] mb-2">Ảnh sản phẩm lưu kho</p>
                  <Photos photos={data.photos} />
                </div>
              )}
            </div>

            {data.status === 'RETURNED' && (
              <div className="rounded-xl border border-[#FEDF89] bg-[#FFFAEB] p-4 text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-[#B54708]">
                    Hàng đã bàn giao về kho (chưa mở bán lại · không thuộc sở hữu nền tảng)
                  </span>
                  {pendingReturn.data && (
                    <Link
                      to={`/moderator/returns?id=${encodeURIComponent(pendingReturn.data.id)}`}
                      className="font-semibold text-[#006B2C] underline whitespace-nowrap"
                    >
                      Xem yêu cầu trả hàng
                    </Link>
                  )}
                </div>
                <p className="text-[#414942] leading-relaxed">
                  {pendingReturn.data
                    ? 'Người mua đã được hoàn tiền · Món hàng đang chờ chọn phương án xử lý (Đăng bán lại) hoặc báo hàng xuống cấp nếu phát hiện hư hỏng.'
                    : 'Sản phẩm đang ở trạng thái Đã bàn giao tại kho. Nếu phát hiện hư hỏng thực tế, bạn có thể lập biên bản hàng xuống cấp.'}
                </p>
              </div>
            )}

            {data.status === 'WAREHOUSE' && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
                Sản phẩm đang lưu kho, tạm ngừng bán trong khi chờ xử lý. {activeCase && DEGRADED_DECISION_POLICY}
              </div>
            )}
            <ResourceState resource={existingCase} />
            {activeCase && <div className="rounded-2xl border border-neutral bg-surface p-5 space-y-4">
              <DegradedCaseSummary item={activeCase} onNavigateToCounter={() => navigate('/moderator/counter')} />
              <Button variant="outline" onClick={() => setCaseDetailsOpen(true)}>Xem biên bản hàng xuống cấp</Button>
            </div>}


            {/* BANNER XỬ LÝ CUỐI KỲ (L-02 · TK-02) */}
            <ResourceState resource={pricing} />
            {data.status === 'WAREHOUSE' && data.decisionId && !canNegotiate && <p className="rounded-xl border border-neutral p-4 text-sm">Đã hết kỳ ký gửi. Đang chờ Member chọn nhận lại hoặc ký gửi lại qua app.</p>}
            {canNegotiate && (
              <div className="rounded-2xl border border-neutral bg-[#F8FAF8] p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 bg-[#006B2C] text-white rounded">
                      {data.reConsignStatus === 'PROPOSAL_SENT' ? 'ĐÃ GỬI ĐỀ XUẤT' : 'ĐƯỢC YÊU CẦU KÝ GỬI LẠI'}
                    </span>
                    <h3 className="text-sm font-bold text-[#191C19]">Ký gửi lại cuối kỳ (Hết kỳ 3: 90 ngày)</h3>
                  </div>
                  <p className="text-xs text-[#5f5f5f]">
                    Member đã chọn ký gửi lại với giá mới. Moderator cần đàm phán giá và tạo biên nhận mới tại quầy.
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => navigate(`/moderator/inventory/${encodeURIComponent(sku)}/re-consign`)}
                  className="text-xs py-2 px-3.5 font-semibold"
                >
                  Đàm phán giá →
                </Button>
              </div>
            )}

            {data.status === 'WITHDRAWN' && data.decision === 'TAKE_BACK' && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 bg-amber-800 text-white rounded">
                      ĐƯỢC YÊU CẦU NHẬN LẠI HÀNG
                    </span>
                    <h3 className="text-sm font-bold text-amber-900">Khách đã chọn nhận lại cuối kỳ (miễn phí)</h3>
                  </div>
                  <p className="text-xs text-amber-800">
                    Khách đã chọn nhận lại hàng{data.takeBackDate ? ` ${date(data.takeBackDate)}` : ''}{data.daysToTakeBack != null ? ` — còn ${data.daysToTakeBack} ngày đến quầy lấy` : ''}. Vui lòng nhận hàng trong thời hạn được thông báo.
                  </p>
                </div>
                <Link
                  to={
                    (data.member?.memberCode || data.memberCode)
                      ? `/moderator/counter?memberCode=${encodeURIComponent(data.member?.memberCode || data.memberCode)}&refId=${encodeURIComponent(data.id || data.sku || sku || '')}`
                      : '/moderator/counter'
                  }
                >
                  <Button variant="outline" className="text-xs border-amber-800 text-amber-900 font-bold">
                    Quầy tiếp nhận →
                  </Button>
                </Link>
              </div>
            )}

            {/* Bổ sung ảnh (nếu được hỗ trợ) */}
            {data.allowedActions?.includes('ADD_PHOTOS') && (
              <Card title="Bổ sung ảnh">
                <PhotoUpload key={uploadVersion} disabled={product.busy} onChange={onPhotos} />
                <Button
                  disabled={!photoUrls.length || uploadPending}
                  loading={product.busy}
                  onClick={() =>
                    product.mutate((options) => inventoryService.addPhotos(sku, photoUrls, options), {
                      onSuccess: () => {
                        setPhotos([]);
                        setUploadVersion((version) => version + 1);
                      },
                    })
                  }
                >
                  Lưu ảnh bổ sung
                </Button>
                <p className="text-sm text-textSecondary">
                  Ảnh tách nền được cập nhật theo kết quả xử lý của máy chủ.
                </p>
              </Card>
            )}
          </div>
        );
      })()}

          {/* Modal In tem mã vạch SKU */}
          <BarcodePrintModal isOpen={print} onClose={() => setPrint(false)} item={data} />

          {/* Modal Chỉnh sửa thông tin sản phẩm */}
          <ProductEditModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            item={data}
            onUpdated={() => product.refresh()}
          />

          {/* Modal Đăng bán lại từ chi tiết sản phẩm */}
          <ReturnOutcomeDialog
            isOutcomeModalOpen={relistModalOpen}
            setIsOutcomeModalOpen={(open) => {
              if (!open && !relistLock.current) setRelistModalOpen(false);
            }}
            selectedItem={pendingReturn.data}
            submitting={relistSubmitting}
            handleConfirmOutcome={handleConfirmRelist}
          />

          {/* Modal Lập biên bản hàng xuống cấp tại kho (TK-02) */}
          {caseDetailsOpen && activeCase && <Modal isOpen onClose={() => setCaseDetailsOpen(false)} title="Biên bản hàng xuống cấp">
            <DegradedCaseDetails caseId={activeCase.id} onNavigateToCounter={() => navigate('/moderator/counter')} />
          </Modal>}

          {degradedModalOpen && (
            <Modal
              isOpen={degradedModalOpen}
              onClose={() => !isSubmittingDegraded && setDegradedModalOpen(false)}
              title="Lập biên bản hàng xuống cấp"
            >
              <div className="space-y-4 max-w-lg text-xs">
                <div className="p-3 bg-[#fafafa] rounded-xl border border-[#e0e0e0] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#5f5f5f]">Mã SKU:</span>
                    <span className="font-mono font-bold text-[#191C19]">{sku}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f5f5f]">Tên sản phẩm:</span>
                    <span className="font-bold text-[#191C19]">{data?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f5f5f]">Giá bán niêm yết:</span>
                    <span className="font-bold text-[#006B2C]">{money(sellingPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f5f5f]">Kỳ ký gửi hiện tại:</span>
                    <span className="font-semibold text-[#191C19]">
                      {data?.currentTerm ? `Kỳ ${data.currentTerm}` : 'Chưa có thông tin kỳ'}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-neutral p-4 space-y-2">
                  <p>Mức đền đủ = giá đang bán trừ hoa hồng kỳ hiện tại ({termAndRates.commissionPercent}%); sản phẩm trở thành tài sản nền tảng khi Member chọn nhận đền đủ.</p>
                  <p>Nếu nhận lại hàng, mức đền áp dụng theo tỷ lệ trên biên nhận ({termAndRates.degradedCompensationRatePercent}%). Backend xác định và lưu mức đền khi mở ca.</p>
                  <p>{DEGRADED_DECISION_POLICY}</p>
                </div>

                {/* Mô tả hư hỏng */}
                <div className="space-y-1">
                  <label htmlFor="degraded-notes-input" className="block font-bold text-[#191C19]">
                    Mô tả hiện trạng hư hỏng / nguyên nhân xuống cấp <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="degraded-notes-input"
                    rows={3}
                    value={degradedNotes}
                    onChange={(e) => {
                      setDegradedNotes(e.target.value);
                      if (degradedError) setDegradedError('');
                    }}
                    placeholder="VD: Sản phẩm bị ẩm mốc góc dưới, xước mặt kính hoặc sờn rách trong quá trình lưu kho..."
                    className="w-full rounded-xl border border-[#DDE5D9] p-2.5 text-xs text-[#191C19] focus:border-[#006B2C] focus:outline-none"
                  />
                </div>

                {degradedError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                  >
                    {degradedError}
                  </div>
                )}

                {/* Upload ảnh hư hỏng thực tế */}
                <div className="space-y-1">
                  <label className="block font-bold text-[#191C19]">
                    Ảnh chụp hiện trạng hư hỏng thực tế <span className="text-red-600">*</span>
                  </label>
                  <PhotoUpload onChange={onDegradedPhotos} disabled={isSubmittingDegraded} />
                  {degradedPhotos.length > 0 && (
                    <p className="text-[11px] text-[#006B2C] font-semibold">
                      ✓ Đã tải lên {degradedPhotos.length} ảnh bằng chứng
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#e0e0e0]">
                  <Button
                    variant="outline"
                    disabled={isSubmittingDegraded}
                    onClick={() => setDegradedModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs"
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    variant="primary"
                    loading={isSubmittingDegraded}
                    disabled={isSubmittingDegraded || degradedUploadPending || !degradedNotes.trim() || !degradedPhotos.length}
                    onClick={handleSendDegradedProposal}
                    className="px-4 py-1.5 text-xs font-bold bg-[#006B2C] hover:bg-[#005221]"
                  >
                    Gửi đề xuất cho người ký gửi
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </Page >
      );
}
