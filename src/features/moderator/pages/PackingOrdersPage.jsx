import { WarehouseHistoryTabs } from '../components/WarehouseHistoryTabs.jsx';
import { TABLE_COLUMN_LABELS } from '../../../constants/tableColumns.js';
import React, { useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Tooltip from '../../../components/common/Tooltip.jsx';
import QRScannerModal from '../../../components/QRScannerModal.jsx';
import { Page, ResourceState } from "../components/WarehouseUi.jsx";
import { usePhase2, useResource } from '../hooks/warehouseHooks.jsx';
import { isFixtureMode } from '../config/warehouseContract.js';
import { queueService } from '../services/warehouseApi.js';
import { listItems, ownsClaim } from "../models/warehouseModel.js";
import { formatOrderStatus } from "../models/packingModel.js";
import { usePackingDetail } from '../hooks/usePackingDetail.jsx';
import { PackingQueueItem } from '../components/packing/PackingQueueItem.jsx';
import { PackingWrongItemModal } from '../components/packing/PackingWrongItemModal.jsx';
import { WaybillPrintModal } from '../components/packing/WaybillPrintModal.jsx';
import {
  PackingRecipientPanel,
  PackingShipmentPanel,
  PackingPhotosPanel,
  PackingScanPanel,
  PackingItemTable,
} from '../components/packing/PackingDetailSections.jsx';

export function PackingDetail({ orderId, onChanged }) {
  const navigate = useNavigate();
  const model = usePackingDetail({ orderId, onChanged });
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState('');

  // Xác định món đơn này đang cần (chưa quét) để hiển thị trong modal báo sai món
  const targetItem = useMemo(() => {
    return model.items.find(i => !model.scannedProductIds.includes(i.productId));
  }, [model.items, model.scannedProductIds]);

  const isClaimedByMe = Boolean(
    model.order?.claimedBy &&
    model.scope?.userId &&
    model.order.claimedBy === model.scope.userId
  );

  const handleUnclaim = async () => {
    const queueId = model.order?.queueId || model.order?.id || orderId;
    setReleasing(true);
    setReleaseError('');
    try {
      await queueService.release(queueId);
      window.dispatchEvent(new Event('warehouse:changed'));
      if (onChanged) onChanged();
      navigate('/moderator/packing');
    } catch (err) {
      setReleaseError(err?.message || 'Không thể nhả việc. Vui lòng thử lại.');
    } finally {
      setReleasing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/moderator/packing" className="text-primary underline text-xs font-semibold flex items-center gap-1">
          <span>←</span> Quay lại hàng đợi đóng gói
        </Link>
        <div className="flex items-center gap-3">
          {isClaimedByMe && !model.order?.ghnTrackingCode && (
            <Button
              variant="outline"
              className="text-xs text-[#D92D20] border-[#D92D20]/40 hover:bg-[#FEE4E2]"
              disabled={releasing}
              onClick={handleUnclaim}
            >
              {releasing ? 'Đang nhả việc...' : 'Nhả việc'}
            </Button>
          )}
          <Button variant="outline" className="text-xs" onClick={model.resource.refresh}>
            Kiểm tra trạng thái
          </Button>
          {model.order?.ghnTrackingCode && (
            <Button
              variant="primary"
              size="sm"
              className="flex items-center gap-1.5"
              onClick={() => model.setPrintModalOpen(true)}
            >
              In vận đơn A5
            </Button>
          )}
        </div>
      </div>

      {releaseError && (
        <div role="alert" className="p-3 rounded-lg bg-[#FFF5F5] border border-[#D92D20]/30 text-xs text-[#D92D20]">
          {releaseError}
        </div>
      )}

      <ResourceState resource={model.resource} />

      {model.order && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
          {/* CỘT TRÁI: PHIẾU LẤY HÀNG & ĐỐI CHIẾU SKU (DG-02, DG-03, DG-04) */}
          <div className="space-y-5">
            {/* Header đơn */}
            <div className="rounded-2xl border border-[#8a8a8a] bg-white p-5 shadow-sm space-y-2">
              <div className="flex justify-between items-baseline">
                <h2 className="text-lg font-bold text-[#191C19]">
                  Phiếu lấy hàng — {model.totalCount} món
                </h2>
                <span className="text-xs font-bold text-[#006B2C]">
                  {formatOrderStatus(model.order.status)}
                </span>
              </div>
              <p className="text-xs text-[#5f5f5f]">
                Lấy đủ {model.totalCount} món, tick từng món, rồi sang bước đối chiếu Mã hàng hóa.
              </p>
              <div className="pt-2 text-xs font-bold text-[#191C19] flex items-center gap-2">
                <span>Tiến độ đối chiếu:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border font-mono text-xs font-semibold ${model.scannedCount === model.totalCount
                  ? 'bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]'
                  : 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]'
                  }`}>
                  {`Đã quét ${model.scannedCount}/${model.totalCount} Mã hàng hóa`}
                </span>
              </div>
            </div>

            {/* Bảng món hàng (DG-02) */}
            <PackingItemTable {...model.sections.PackingItemTable} />

            {/* ẢNH ĐÓNG GÓI ĐƠN HÀNG (ORDER_PACKING) */}
            <PackingPhotosPanel {...model.sections.PackingPhotosPanel} />

            {/* KHUNG QUÉT ĐỐI CHIẾU MÃ SKU (DG-03) */}
            {!model.order.ghnTrackingCode && (
              <PackingScanPanel {...model.sections.PackingScanPanel} />
            )}

            {/* VẬN ĐƠN ĐÃ TẠO (DG-04) */}
            {model.order.ghnTrackingCode && (
              <PackingShipmentPanel
                order={model.order}
                onOpenPrintModal={() => model.setPrintModalOpen(true)}
                onHandover={model.handoverGhn}
                handoverLoading={model.handoverLoading}
              />
            )}
          </div>

          {/* CỘT PHẢI: NGƯỜI NHẬN, THANH TOÁN, NHẬT KÝ (DG-02, DG-03) */}
          <PackingRecipientPanel order={model.order} scanLogs={model.scanLogs} />
        </div>
      )}

      {/* Modal Cảnh báo Quét Sai Món (DG-03-SaiMon) */}
      <PackingWrongItemModal
        isOpen={model.wrongItemModalOpen}
        onClose={() => model.setWrongItemModalOpen(false)}
        wrongItem={model.wrongItem}
        currentOrderNo={model.order?.orderNo || orderId}
        targetItem={targetItem}
      />

      {/* Modal In Phiếu Vận Đơn GHN (DG-04) */}
      <WaybillPrintModal
        isOpen={model.printModalOpen}
        onClose={() => model.setPrintModalOpen(false)}
        order={model.order}
      />

      {/* Modal Quét Barcode Camera */}
      <QRScannerModal
        isOpen={model.camera}
        onClose={() => model.setCamera(false)}
        title="Quét barcode Mã hàng hóa sản phẩm"
        placeholder="Mã hàng hóa trên tem..."
        onScanSuccess={(code) => {
          model.setCamera(false);
          model.scan(code);
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
  const [keyword, setKeyword] = useState('');

  const queue = useResource((options) => queueService.list({ type: 'PACKING', mine: true, page }, options), [page], {
    cacheKey: `queue:packing:mine:${page}`,
    invalidatePrefixes: ['queue:', 'inventory:', 'history:'],
  });

  const [claimError, setClaimError] = useState('');

  const apiItems = listItems(queue.data);

  const isAssignedToMe = (item) =>
    ownsClaim(item, scope.userId) ||
    item.claimedBy === 'CURRENT_USER' ||
    Boolean(item.claimedByName && item.claimedByName.includes('Bạn đang giữ'));

  // Tab Công việc chỉ hiển thị đơn đã được chính Moderator hiện tại nhận ("Bạn đang giữ").
  // Đơn "Chưa ai nhận" nằm bên Hàng đợi công việc để Moderator bấm Nhận việc.
  const items = useMemo(() => {
    let source = apiItems.filter((item) => isAssignedToMe(item));
    if (keyword.trim()) {
      const q = keyword.toLowerCase().trim();
      source = source.filter(
        i =>
          (i.orderNo || i.refId || i.orderId || '').toLowerCase().includes(q) ||
          (i.buyerName || i.name || '').toLowerCase().includes(q)
      );
    }
    return [...source].sort((a, b) => {
      const rawA = a?.orderCreatedAt || a?.createdAt || a?.queuedAt;
      const rawB = b?.orderCreatedAt || b?.createdAt || b?.queuedAt;
      const tA = rawA ? Date.parse(rawA) : NaN;
      const tB = rawB ? Date.parse(rawB) : NaN;
      if (Number.isFinite(tA) && Number.isFinite(tB)) return tB - tA;
      if (Number.isFinite(tB)) return 1;
      if (Number.isFinite(tA)) return -1;
      return (a?.waitingMinutes ?? Number.MAX_SAFE_INTEGER) - (b?.waitingMinutes ?? Number.MAX_SAFE_INTEGER);
    });
  }, [apiItems, keyword, scope.userId]);

  const handleClaim = async (queueId) => {
    setClaimError('');
    await queue.mutate((options) => queueService.claim(queueId, options), {
      onSuccess: () => window.dispatchEvent(new Event('warehouse:changed')),
      onError: (err) => {
        if (err?.status === 409 || err?.code === 'QUEUE_ITEM_ALREADY_CLAIMED') {
          setClaimError('Công việc đã được nhân viên khác nhận trước. Hệ thống đã làm mới danh sách.');
        } else {
          setClaimError(err?.message || 'Không thể nhận việc. Vui lòng thử lại.');
        }
        queue.refresh();
      },
    });
  };

  const handleRelease = async (queueId) => {
    setClaimError('');
    await queue.mutate((options) => queueService.release(queueId, options), {
      onSuccess: () => {
        window.dispatchEvent(new Event('warehouse:changed'));
        setSearch({ page: String(page) });
      },
      onError: (err) => {
        setClaimError(err?.message || 'Không thể nhả việc. Vui lòng thử lại.');
        queue.refresh();
      },
    });
  };

  return (
    <Page
      title="Đóng gói đơn hàng"
      subtitle="Các đơn hàng bạn đã nhận đóng gói — đối chiếu đủ Mã hàng hóa trước khi tạo vận đơn GHN."
      actions={
        <div className="flex gap-2">
          <Link to="/moderator/queue?type=PACKING">
            <Button variant="outline" className="whitespace-nowrap">
              Hàng đợi công việc
            </Button>
          </Link>
          <Button variant="outline" onClick={queue.refresh} className="gap-1.5 whitespace-nowrap">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Tải lại</span>
          </Button>
        </div>
      }
    >

      <WarehouseHistoryTabs type="PACKING">
        {!orderId ? (
          <div className="space-y-4">
            {/* Header tìm kiếm chuẩn DG-01 */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral shadow-sm">
              <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm Mã hàng hóa, mã đơn, mã Member..."
                  className="w-full text-xs outline-none bg-transparent"
                />
                {keyword && (
                  <Tooltip content="Xóa từ khóa tìm kiếm">
                    <button
                      type="button"
                      aria-label="Xóa từ khóa tìm kiếm"
                      onClick={() => setKeyword('')}
                      className="text-textSecondary hover:text-text text-xs font-bold p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      ✕
                    </button>
                  </Tooltip>
                )}
              </div>
              <div className="text-xs text-textSecondary">
                Bạn đang giữ <strong>{items.length}</strong> đơn đóng gói
              </div>
            </div>

            {claimError && (
              <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 flex justify-between items-center">
                <span>{claimError}</span>
                <Tooltip content="Đóng thông báo lỗi">
                  <button
                    type="button"
                    aria-label="Đóng thông báo lỗi"
                    onClick={() => setClaimError('')}
                    className="font-bold hover:text-amber-900 p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/40"
                  >
                    ✕
                  </button>
                </Tooltip>
              </div>
            )}

            <ResourceState resource={queue} />

            {/* BẢNG ĐƠN ĐÓNG GÓI ĐANG GIỮ */}
            <div className="rounded-2xl border border-neutral bg-surface overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-xs">
                  <thead>
                    <tr className="bg-background border-b border-neutral text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                      <th className="py-3 px-3">Mã đơn</th>
                      <th className="py-3 px-3">Người mua</th>
                      <th className="py-3 px-3">Số món</th>
                      <th className="py-3 px-3">Thời gian đặt</th>
                      <th className="py-3 px-3">{TABLE_COLUMN_LABELS.WAITED}</th>
                      <th className="py-3 px-3">{TABLE_COLUMN_LABELS.STATUS}</th>
                      <th className="py-3 px-3 text-right">{TABLE_COLUMN_LABELS.ACTIONS}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-xs text-textSecondary space-y-2">
                          <p>
                            {keyword.trim()
                              ? 'Không tìm thấy đơn đóng gói phù hợp với từ khóa.'
                              : 'Bạn chưa nhận đơn đóng gói nào.'}
                          </p>
                          {!keyword.trim() && (
                            <Link
                              to="/moderator/queue?type=PACKING"
                              className="inline-block text-primary font-semibold underline"
                            >
                              Đi tới Hàng đợi công việc để nhận đơn
                            </Link>
                          )}
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const targetOrderId = item.orderId || item.refId || item.orderNo;
                        return (
                          <PackingQueueItem
                            key={item.queueId || targetOrderId}
                            item={item}
                            targetOrderId={targetOrderId}
                            isMine={isAssignedToMe(item)}
                            setSearch={setSearch}
                            page={page}
                            queue={queue}
                            handleClaim={handleClaim}
                            handleRelease={handleRelease}
                          />
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

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
      </WarehouseHistoryTabs>
    </Page>
  );
}
