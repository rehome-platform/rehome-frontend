import React, { useState, useMemo } from "react";
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import QRScannerModal from '../../../components/QRScannerModal.jsx';
import { Page, ResourceState } from "../components/WarehouseUi.jsx";
import { usePhase2, useResource } from '../hooks/warehouseHooks.jsx';
import { queueService } from '../services/warehouseApi.js';
import { listItems } from "../models/warehouseModel.js";
import { usePackingDetail } from '../hooks/usePackingDetail.jsx';
import { PackingQueueItem } from '../components/packing/PackingQueueItem.jsx';
import { PackingWrongItemModal } from '../components/packing/PackingWrongItemModal.jsx';
import { WaybillPrintModal } from '../components/packing/WaybillPrintModal.jsx';
import {
  PackingIncidentDialog,
  PackingRecipientPanel,
  PackingShipmentPanel,
  PackingScanPanel,
  PackingItemTable,
} from '../components/packing/PackingDetailSections.jsx';

export function PackingDetail({ orderId, onChanged }) {
  const model = usePackingDetail({ orderId, onChanged });

  // Xác định món đơn này đang cần (chưa quét) để hiển thị trong modal báo sai món
  const targetItem = useMemo(() => {
    return model.items.find(i => !model.scannedProductIds.includes(i.productId));
  }, [model.items, model.scannedProductIds]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/moderator/packing" className="text-primary underline text-xs font-semibold flex items-center gap-1">
          <span>←</span> Quay lại hàng đợi đóng gói
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="text-xs" onClick={model.resource.refresh}>
            Kiểm tra trạng thái
          </Button>
          {model.order?.ghnTrackingCode && (
            <Button
              className="text-xs bg-[#2b2b2b] text-white hover:bg-black font-bold flex items-center gap-1.5"
              onClick={() => model.setPrintModalOpen(true)}
            >
              <span>🖨️</span> In phiếu giao hàng
            </Button>
          )}
        </div>
      </div>

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
                  {({ PAID: 'Đã thanh toán', PACKING: 'Đang đóng gói', SHIPPING: 'Đang vận chuyển', DELIVERED: 'Đã giao', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy' })[model.order.status] || model.order.status}
                </span>
              </div>
              <p className="text-xs text-[#5f5f5f]">
                Lấy đủ {model.totalCount} món theo vị trí kệ, tick từng món, rồi sang bước đối chiếu mã SKU.
              </p>
              <div className="pt-2 text-xs font-bold text-[#191C19] flex items-center gap-2">
                <span>Tiến độ đối chiếu:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-bold ${model.scannedCount === model.totalCount
                    ? 'bg-[#E8F5E9] text-[#006B2C]'
                    : 'bg-[#FFF3E0] text-[#D97706]'
                  }`}>
                  {`Đã quét ${model.scannedCount}/${model.totalCount} SKU`}
                </span>
              </div>
            </div>

            {/* Bảng món hàng lấy theo vị trí kệ (DG-02) */}
            <PackingItemTable {...model.sections.PackingItemTable} />

            {/* Lưu ý đóng gói & Đơn không huỷ được (DG-02) */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#c4c4c4] bg-[#fcfdfc] p-3.5 text-xs text-[#414942]">
                <p className="text-[10px] uppercase font-bold text-[#6b6b6b] mb-1">Ghi chú đóng gói của người mua</p>
                <p>{model.order.buyerNote || 'Giao giờ hành chính, gọi trước khi tới.'}</p>
              </div>
              <div className="rounded-xl border border-[#c4c4c4] bg-[#fcfdfc] p-3.5 text-xs text-[#414942]">
                <p className="text-[10px] uppercase font-bold text-[#6b6b6b] mb-1">Đơn này không huỷ được nữa</p>
                <p>Người mua đã trả tiền và đã qua cửa sổ huỷ. Nếu có món hỏng hoặc thiếu, chọn <strong>Báo sự cố đơn</strong> — không tự huỷ đơn.</p>
              </div>
            </div>

            {/* KHUNG QUÉT ĐỐI CHIẾU MÃ SKU (DG-03) */}
            {!model.order.ghnTrackingCode && (
              <PackingScanPanel {...model.sections.PackingScanPanel} />
            )}

            {/* VẬN ĐƠN ĐÃ TẠO (DG-04) */}
            {model.order.ghnTrackingCode && (
              <PackingShipmentPanel
                order={model.order}
                onOpenPrintModal={() => model.setPrintModalOpen(true)}
              />
            )}
          </div>

          {/* CỘT PHẢI: NGƯỜI NHẬN, THANH TOÁN, NHẬT KÝ (DG-02, DG-03) */}
          <PackingRecipientPanel order={model.order} scanLogs={model.scanLogs} />
        </div>
      )}

      {/* Modal Báo sự cố đơn (DG-03) */}
      {model.incidentOpen && (
        <PackingIncidentDialog {...model.sections.PackingIncidentDialog} />
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
        title="Quét barcode mã SKU sản phẩm"
        placeholder="Mã SKU trên tem..."
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

  const queue = useResource((options) => queueService.list({ type: 'PACKING', page }, options), [page], {
    poll: true,
  });

  const [claimError, setClaimError] = useState('');

  const apiItems = listItems(queue.data);

  // Dữ liệu hàng đợi đóng gói 100% nạp từ API service (API 68), không còn fallback mock data tĩnh
  const items = useMemo(() => {
    let source = apiItems;
    if (keyword.trim()) {
      const q = keyword.toLowerCase().trim();
      source = source.filter(
        i =>
          (i.orderNo || i.refId || i.orderId || '').toLowerCase().includes(q) ||
          (i.buyerName || i.name || '').toLowerCase().includes(q) ||
          (i.shelfLocations || '').toLowerCase().includes(q)
      );
    }
    return source;
  }, [apiItems, keyword]);

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
          {/* Header tìm kiếm chuẩn DG-01 */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm SKU, mã đơn, mã Member..."
                className="w-full text-xs outline-none bg-transparent"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword('')}
                  className="text-gray-400 hover:text-gray-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="text-xs text-[#5f5f5f]">
              Đang có <strong>{items.length}</strong> đơn trong hàng đợi
            </div>
          </div>

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

          {/* BẢNG HÀNG ĐỢI ĐÓNG GÓI 8 CỘT CHUẨN WIREFRAME DG-01 */}
          <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-xs">
                <thead>
                  <tr className="bg-[#f4f4f4] border-b border-[#8a8a8a] text-[10px] font-bold uppercase tracking-wider text-[#5f5f5f]">
                    <th className="py-3 px-3">Mã đơn</th>
                    <th className="py-3 px-3">Người mua</th>
                    <th className="py-3 px-3">Số món</th>
                    <th className="py-3 px-3">Vị trí kệ gom hàng</th>
                    <th className="py-3 px-3">Thời gian đặt</th>
                    <th className="py-3 px-3">Chờ</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {items.map((item) => {
                    const isMine =
                      item.claimedBy === scope.userId ||
                      item.claimedBy === 'CURRENT_USER' ||
                      (item.claimedByName && item.claimedByName.includes('Bạn đang giữ'));
                    const targetOrderId = item.orderNo || item.orderId || item.refId;
                    return (
                      <PackingQueueItem
                        key={item.queueId || targetOrderId}
                        item={item}
                        targetOrderId={targetOrderId}
                        isMine={Boolean(isMine)}
                        setSearch={setSearch}
                        page={page}
                        queue={queue}
                        handleClaim={handleClaim}
                        handleRelease={handleRelease}
                      />
                    );
                  })}
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
    </Page>
  );
}
