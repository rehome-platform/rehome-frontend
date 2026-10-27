import { PackingAccessNotice } from '../components/packing/PackingAccessNotice.jsx';
import { PackingQueueItem } from '../components/packing/PackingQueueItem.jsx';
import { usePackingDetail } from '../hooks/usePackingDetail.jsx';
import {
  PackingIncidentDialog,
  PackingRecipientPanel,
  PackingShipmentPanel,
  PackingScanPanel,
  PackingItemTable,
} from '../components/packing/PackingDetailSections.jsx';
import React, { useState } from "react";
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import QRScannerModal from '../../../components/QRScannerModal.jsx';
import { Page, ResourceState } from "../components/WarehouseUi.jsx";
import { usePhase2, useResource } from '../hooks/warehouseHooks.jsx';
import { queueService } from '../services/warehouseApi.js';
import { listItems } from "../models/warehouseModel.js";

export function PackingDetail({ orderId, onChanged }) {
  const model = usePackingDetail({ orderId, onChanged });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/moderator/packing" className="text-primary underline text-xs font-semibold">
          ← Quay lại hàng đợi
        </Link>
        <Button variant="outline" className="text-xs" onClick={model.resource.refresh}>
          Kiểm tra trạng thái
        </Button>
      </div>

      <ResourceState resource={model.resource} />

      {/* Thông báo Graceful nếu backend chưa mở quyền đọc đơn cho Moderator */}
      {model.resource.error && !model.order && (model.resource.error.status === 501 || model.resource.error.status === 403) && (
        <PackingAccessNotice />
      )}

      {model.order && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
          {/* CỘT TRÁI: PHIẾU LẤY HÀNG & ĐỐI CHIẾU SKU (DG-02, DG-03) */}
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
              <div className="pt-2 text-xs font-bold text-[#191C19]">
                Đã quét {model.scannedCount}/{model.totalCount} SKU
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
              <PackingShipmentPanel order={model.order} />
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
                <PackingQueueItem
                  key={item.queueId}
                  item={item}
                  targetOrderId={targetOrderId}
                  isMine={isMine}
                  setSearch={setSearch}
                  page={page}
                  queue={queue}
                  handleClaim={handleClaim}
                  handleRelease={handleRelease}
                />
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
