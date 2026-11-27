import { CounterHandoverTask } from './CounterHandoverTask.jsx';
import React, { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../../../components/common/Button.jsx";
import Modal from "../../../../components/common/Modal.jsx";
import TableActionButton from "../../../../components/common/TableActionButton.jsx";
import ImageLightbox from "../../../../components/common/ImageLightbox.jsx";

import { Status, DetailLink, money, date } from "../WarehouseUi.jsx";

export function CounterHandoverDialog({
  confirmHandover,
  selected,
  handoverLoading,
  setConfirmHandover,
  executeHandover,
  onRefreshTasks,
  tasksLoading,
}) {
  const item = confirmHandover?.item || {};
  const context = confirmHandover?.context || 'ITEM_WITHDRAWAL';
  const targetSku = item.sku || item.productId || item.returnId || '';

  const [skuInput, setSkuInput] = useState('');
  const [isIdentityConfirmed, setIsIdentityConfirmed] = useState(false);

  const isFeePaid = Boolean(item.feePaid || item.feePaidAt);
  const requiresFeeConfirmation = Boolean(context === 'ITEM_WITHDRAWAL' && item.feeCharged > 0 && !isFeePaid);
  const isSkuMatched = Boolean(targetSku && skuInput.trim().toUpperCase() === targetSku.toUpperCase());
  const canHandover = Boolean(isSkuMatched && isIdentityConfirmed && !requiresFeeConfirmation);

  const reasonLabels = {
    ITEM_WITHDRAWAL: 'Member rút hàng',
    END_OF_TERM_TAKE_BACK: 'Nhận lại cuối kỳ',
    INVALID_RETURN_PICKUP: 'Người mua nhận hàng trả',
    DEGRADED_ITEM_PICKUP: 'Hàng xuống cấp (Đền 50% & nhận lại)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-card space-y-4 border border-neutral font-sans">
        <div className="flex items-center justify-between border-b border-neutral pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-text font-bold px-2.5 py-0.5">
              {reasonLabels[context] || 'Bàn giao tại quầy'}
            </span>
            <h3 className="text-base font-bold text-[#191C19] mt-1">
              Xác nhận bàn giao hiện vật tại quầy
            </h3>
          </div>
          <span className="text-xs font-semibold text-[#5B6776]">
            {selected?.memberCode}
          </span>
        </div>

        {/* Thông tin người nhận */}
        <div className="rounded-xl border border-neutral bg-background p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-[#5B6776]">Người nhận:</span>
            <span className="font-bold text-[#191C19]">{selected?.fullName || selected?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5B6776]">Số điện thoại:</span>
            <span className="font-medium text-[#191C19]">{selected?.phone || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5B6776]">Sản phẩm:</span>
            <span className="font-bold text-[#006B2C]">{item.productName || item.name || item.productId}</span>
          </div>
          {context === 'DEGRADED_ITEM_PICKUP' && (
            <div className="flex justify-between">
              <span className="text-[#5B6776]">Tiền đền bù 50%:</span>
              <span className="font-bold text-[#006B2C]">{money(item.paidAmount || item.compensationAmount || 0)} (đã cộng vào ví)</span>
            </div>
          )}
          {context === 'ITEM_WITHDRAWAL' && (
            <div className="flex justify-between items-center pt-1 border-t border-dashed border-neutral">
              <span className="text-[#5B6776]">Phí rút hàng:</span>
              <span>
                {item.feeCharged ? (
                  <>
                    <strong className="text-[#191C19] mr-1.5">{money(item.feeCharged)}</strong>
                    {isFeePaid ? (
                      <span className="font-bold text-[#006B2C]">(Đã thanh toán)</span>
                    ) : (
                      <span className="font-bold text-[#BA1A1A]">(Chưa thanh toán)</span>
                    )}
                  </>
                ) : (
                  <strong className="text-[#006B2C]">Miễn phí</strong>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Bước 2: Đối chiếu mã SKU */}
        <div className="rounded-xl rounded-xl border-2 border-neutral p-3.5 space-y-2 bg-surface">
          <div className="flex items-center justify-between">
            <label htmlFor="counter-sku-verify" className="text-xs font-bold text-[#191C19] uppercase tracking-wide">
              Nhập Mã hàng hóa để đối chiếu
            </label>
            {targetSku && (
              <span className="text-[11px] font-mono text-[#5B6776]">
                Mã hàng hóa cần so khớp: <strong className="text-[#191C19]">{targetSku}</strong>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              id="counter-sku-verify"
              type="text"
              placeholder={targetSku ? `Nhập ${targetSku}` : 'Nhập Mã hàng hóa...'}
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-mono font-bold focus:outline-none ${
                skuInput.trim()
                  ? isSkuMatched
                    ? 'border-[#006B2C] bg-[#E8F5E9]/30 text-[#006B2C]'
                    : 'border-[#BA1A1A] bg-[#FFEBEE]/30 text-[#BA1A1A]'
                  : 'border-[#2b2b2b] bg-white text-[#191C19]'
              }`}
            />
            {targetSku && !isSkuMatched && (
              <Button
                type="button"
                variant="outline"
                className="text-xs px-2.5 py-1 whitespace-nowrap"
                onClick={() => setSkuInput(targetSku)}
              >
                Khớp nhanh
              </Button>
            )}
          </div>
          {targetSku && (
            <p className="text-[11px] text-[#5B6776]">
              {isSkuMatched
                ? '✓ Đã đối chiếu khớp Mã hàng hóa sản phẩm'
                : 'Vui lòng quét hoặc gõ đúng Mã hàng hóa dán trên hiện vật để tránh giao nhầm'}
            </p>
          )}
        </div>

        {/* Bước 3: Xác nhận danh tính */}
        <div className="rounded-xl rounded-xl border border-neutral p-3.5 space-y-2 bg-background">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isIdentityConfirmed}
              onChange={(e) => setIsIdentityConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#8a8a8a] text-[#006B2C] focus:ring-[#006B2C]"
            />
            <span className="text-xs font-bold text-[#191C19] leading-snug">
              Tôi đã hỏi và xác nhận đúng người nhận
            </span>
          </label>
          <p className="text-[11px] text-[#717971] pl-6.5">
            Chưa tích thì nút bàn giao vẫn khoá. Thao tác được ghi nhận vào audit log kèm tài khoản của bạn.
          </p>
        </div>

        {/* Cảnh báo khi Member chưa thanh toán phí rút hàng trên app */}
        {requiresFeeConfirmation && (
          <div
            role="alert"
            className="rounded-xl border-2 border-[#BA1A1A] bg-[#FFEBEE]/30 p-3.5 space-y-2.5 text-xs"
          >
            <p className="font-bold text-[#BA1A1A] leading-snug">
              Member chưa trả phí rút hàng {money(item.feeCharged)}. Nhắc Member trả trên app ReHome (Ví hoặc VNPay), trả xong bấm Tải lại để bàn giao.
            </p>
            {onRefreshTasks && (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  loading={tasksLoading}
                  className="text-xs px-3 py-1.5 border-[#BA1A1A] text-[#BA1A1A] hover:bg-[#FFEBEE]"
                  onClick={() => onRefreshTasks()}
                >
                  Tải lại
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral">
          <span className="text-[11px] text-[#5B6776]">
            {requiresFeeConfirmation
              ? 'Member cần trả phí rút hàng trên app trước khi bàn giao'
              : !canHandover
                ? 'Cần đối chiếu Mã hàng hóa và tích xác nhận để hoàn tất'
                : 'Sẵn sàng bàn giao'}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              type="button"
              disabled={handoverLoading}
              onClick={() => setConfirmHandover(null)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              loading={handoverLoading}
              disabled={!canHandover}
              className={`font-bold ${
                canHandover
                  ? 'bg-[#006B2C] text-white hover:bg-[#005523]'
                  : 'bg-[#efefef] text-[#9a9a9a] cursor-not-allowed'
              }`}
              onClick={() => executeHandover(confirmHandover.item, confirmHandover.context)}
            >
              {context === 'ITEM_WITHDRAWAL' ? 'Xác nhận bàn giao' : 'Xác nhận đã bàn giao'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CounterWorkflowGuide({ recentServed, reopen, loading }) {
  if (!recentServed || !recentServed.length) return null;

  return (
    <div className="rounded-2xl border border-neutral bg-surface overflow-hidden shadow-sm">
      <div className="bg-background border-b border-neutral px-4 py-3 text-xs font-bold text-text">
        Đã phục vụ gần đây
      </div>
      <div className="divide-y divide-neutral">
        {recentServed.map((item) => (
          <div key={item.memberCode} className="p-3.5 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-text">
                {item.name} · {item.memberCode}
              </p>
              <p className="text-[11px] text-textSecondary">{item.taskNote}</p>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => reopen(item)}
              className="px-2.5 py-1 text-xs border border-[#8a8a8a] rounded bg-white hover:bg-[#F0F5EE] font-semibold cursor-pointer"
            >
              Mở lại
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CounterMemberResults({ submitted, results, resultList, selected, choose }) {
  return (
    <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
      <div className="bg-[#f4f4f4] border-b border-[#8a8a8a] px-4 py-3 text-xs font-bold text-[#191C19]">
        Kết quả
      </div>
      <div className="p-4 space-y-3">
    
        {submitted && !results.loading && !resultList.length && (
          <p className="text-xs text-[#BA1A1A] font-semibold py-2">
            Không tìm thấy Member phù hợp với thông tin đã nhập.
          </p>
        )}
    
        {resultList.map((member) => {
          const isItemChosen = selected?.memberId === member.memberId;
          return (
            <div
              key={member.memberId}
              className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${isItemChosen ? 'border-2 border-[#2b2b2b] bg-[#f4f5f4]' : 'border-[#c4c4c4] bg-[#fcfdfc]'
                }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#006B2C]/10 text-[#006B2C] font-bold flex items-center justify-center text-xs shrink-0">
                  {(member.fullName || member.name || 'M')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#191C19] truncate">
                    {member.fullName || member.name}
                  </p>
                  <p className="text-[11px] text-[#717971] truncate">
                    {member.memberCode} · {member.phone}
                  </p>
                </div>
              </div>
              <Button
                variant={isItemChosen ? 'primary' : 'outline'}
                onClick={() => choose(member)}
                className="text-xs py-1.5 px-3 shrink-0"
              >
                Chọn Member {member.memberCode}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const COUNTER_STEP_META = {
  START_INSPECTION: {
    header: 'Đã duyệt online — Tiếp nhận & Kiểm định',
    actionLabel: 'Bắt đầu kiểm định',
  },
  INSPECTION: {
    header: 'Đang kiểm định tại quầy',
    actionLabel: 'Tiếp tục kiểm định',
  },
  AWAIT_MEMBER_CONFIRM: {
    header: 'Đã lập biên nhận — Chờ Member xác nhận',
    actionLabel: 'Xem biên nhận chờ xác nhận',
  },
  STOCK_IN: {
    header: 'Member đã xác nhận — Sẵn sàng nhập kho',
    actionLabel: 'Tiếp tục nhập kho',
  },
  REVIEW_FORM: {
    header: 'Form ký gửi chờ duyệt',
    actionLabel: 'Mở duyệt form',
  },
};

function resolveCounterTaskAction(task) {
  const hasProduct = Boolean(task.productStatus || task.productSku || task.resumeStep === 'COMPLETED');
  if (hasProduct) {
    return { header: 'Sản phẩm đã nhập kho', actionLabel: null };
  }
  if (task.resumeStep && COUNTER_STEP_META[task.resumeStep]) {
    return COUNTER_STEP_META[task.resumeStep];
  }
  if (task.status === 'APPROVED') {
    return COUNTER_STEP_META.START_INSPECTION;
  }
  return { header: 'Form ký gửi', actionLabel: null };
}

export function CounterConsignmentTasks({ taskGroups }) {
  const [detailTask, setDetailTask] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const detailSku = detailTask?.productSku || detailTask?.sku || detailTask?.product?.sku || '';
  const detailPhoto = detailTask?.productPhotoUrl || detailTask?.photoUrl || detailTask?.photos?.[0]?.url || detailTask?.photos?.[0] || null;
  const detailPhotos = React.useMemo(() => {
    const raw = Array.isArray(detailTask?.photos)
      ? detailTask.photos.map((p) => (typeof p === 'string' ? p : p?.url || p?.imageUrl)).filter(Boolean)
      : [];
    if (raw.length > 0) return raw;
    return detailPhoto ? [detailPhoto] : [];
  }, [detailTask, detailPhoto]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#191C19]">
          1. Tiếp nhận hàng ký gửi & Kiểm định
        </h4>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5E9] text-[#006B2C]">
          {taskGroups.pendingForms.length}
        </span>
      </div>
      {taskGroups.pendingForms.map((task) => {
        const { header, actionLabel } = resolveCounterTaskAction(task);
        const sku = task.productSku || task.sku || task.product?.sku;
        return (
          <div
            key={task.formId}
            className="rounded-2xl border-2 border-[#2b2b2b] bg-white overflow-hidden shadow-sm"
          >
            <div className="bg-[#f4f4f4] border-b border-[#8a8a8a] px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#191C19] whitespace-nowrap">
                {header}
              </span>
              <span className="text-[11px] text-[#5B6776] flex items-center gap-1.5 flex-wrap justify-end">
                {sku && (
                  <span className="font-mono font-bold text-[#191C19] bg-white px-2 py-0.5 rounded border border-[#c4c4c4] whitespace-nowrap">
                    Mã hàng hóa: {sku}
                  </span>
                )}
                <Status>{task.status}</Status>
              </span>
            </div>
            <div className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-[#191C19]">{task.name || task.productName || 'Sản phẩm ký gửi'}</p>
                <p className="text-xs text-[#5B6776] mt-0.5">
                  {task.desiredPrice ? `Giá mong muốn: ${money(task.desiredPrice)}` : 'Đang có mặt tại quầy'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                <TableActionButton
                  action="view"
                  onClick={() => setDetailTask(task)}
                />
                {actionLabel && (
                  <Link
                    to={`/moderator/consignments/${encodeURIComponent(task.formId)}`}
                    state={{ form: task, identified: true }}
                  >
                    <Button size="sm" className="bg-[#2b2b2b] text-white hover:bg-black text-xs font-bold px-4 py-1.5 whitespace-nowrap">
                      {actionLabel}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <Modal
        isOpen={Boolean(detailTask)}
        title="Chi tiết sản phẩm tại quầy"
        onClose={() => setDetailTask(null)}
        size="md"
      >
        {detailTask && (
          <div className="space-y-4 text-xs text-textSecondary">
            {detailPhoto && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="group relative h-40 w-40 rounded-xl overflow-hidden border border-neutral cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006B2C]/40"
                  title="Phóng to ảnh sản phẩm"
                >
                  <img
                    src={detailPhoto}
                    alt={detailTask.name || detailTask.productName || 'Ảnh sản phẩm'}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/65 text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Phóng to
                  </span>
                </button>
              </div>
            )}
            <div className="rounded-xl border border-neutral bg-[#F6F9F4] p-3.5 space-y-2">
              <div className="flex justify-between gap-4">
                <span className="font-semibold shrink-0">Sản phẩm:</span>
                <span className="font-bold text-text text-right">{detailTask.name || detailTask.productName || '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold shrink-0">Mã form:</span>
                <span className="font-mono font-bold text-text text-right break-all">{detailTask.formId || detailTask.id || '—'}</span>
              </div>
              {detailSku && (
                <div className="flex justify-between gap-4">
                  <span className="font-semibold shrink-0">Mã hàng hóa:</span>
                  <span className="font-mono font-bold text-text text-right">{detailSku}</span>
                </div>
              )}
              {(detailTask.brandName || (typeof detailTask.brand === 'object' ? detailTask.brand?.name : detailTask.brand)) && (
                <div className="flex justify-between gap-4">
                  <span className="font-semibold shrink-0">Thương hiệu:</span>
                  <span className="text-text text-right">{detailTask.brandName || (typeof detailTask.brand === 'object' ? detailTask.brand?.name : detailTask.brand)}</span>
                </div>
              )}
              {(detailTask.categoryName || (typeof detailTask.category === 'object' ? detailTask.category?.name : detailTask.category)) && (
                <div className="flex justify-between gap-4">
                  <span className="font-semibold shrink-0">Danh mục:</span>
                  <span className="text-text text-right">{detailTask.categoryName || (typeof detailTask.category === 'object' ? detailTask.category?.name : detailTask.category)}</span>
                </div>
              )}
              {detailTask.size && (
                <div className="flex justify-between gap-4">
                  <span className="font-semibold shrink-0">Kích cỡ:</span>
                  <span className="text-text text-right">{detailTask.size}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="font-semibold shrink-0">Giá mong muốn:</span>
                <span className="font-bold text-text text-right">{detailTask.desiredPrice != null ? money(detailTask.desiredPrice) : '—'}</span>
              </div>
              {(detailTask.agreedPrice != null || detailTask.currentPrice != null) && (
                <div className="flex justify-between gap-4">
                  <span className="font-semibold shrink-0">Giá bán / chốt:</span>
                  <span className="font-bold text-[#006B2C] text-right">{money(detailTask.currentPrice ?? detailTask.agreedPrice)}</span>
                </div>
              )}
              <div className="flex justify-between items-center gap-4">
                <span className="font-semibold shrink-0">Trạng thái:</span>
                <Status>{detailTask.status}</Status>
              </div>
              {detailTask.receiptId && (
                <div className="flex justify-between gap-4">
                  <span className="font-semibold shrink-0">Biên nhận:</span>
                  <span className="font-semibold text-text text-right">
                    {detailTask.confirmedAt ? 'Biên nhận đã xác nhận' : 'Biên nhận chờ xác nhận'}
                  </span>
                </div>
              )}
              {detailTask.createdAt && (
                <div className="flex justify-between gap-4">
                  <span className="font-semibold shrink-0">Ngày tạo:</span>
                  <span className="text-text text-right">{date(detailTask.createdAt)}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDetailTask(null)} className="whitespace-nowrap">
                Đóng
              </Button>
              {detailSku && (
                <Link
                  to={`/moderator/inventory/${encodeURIComponent(detailSku)}`}
                  className="inline-flex items-center justify-center rounded-xl bg-[#006B2C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#005523] whitespace-nowrap"
                >
                  Xem sản phẩm
                </Link>
              )}
              {detailTask.formId && (
                <Link
                  to={`/moderator/consignments/${encodeURIComponent(detailTask.formId)}`}
                  state={{ form: detailTask, identified: true }}
                  className="inline-flex items-center justify-center rounded-xl border border-neutral bg-white px-3 py-1.5 text-xs font-semibold text-text hover:bg-[#F6F9F4] whitespace-nowrap"
                >
                  Mở phiếu ký gửi
                </Link>
              )}
            </div>
          </div>
        )}
      </Modal>
      {lightboxOpen && detailPhotos.length > 0 && (
        <ImageLightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          images={detailPhotos}
          initialIndex={0}
          title={detailTask?.name || detailTask?.productName || 'Ảnh sản phẩm'}
        />
      )}
    </div>
  );
}

export function CounterMemberSummary({ selected }) {
  return (
    <div className="rounded-2xl border border-[#006B2C] bg-[#E8F5E9]/50 p-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#006B2C] text-white font-extrabold flex items-center justify-center text-xl shadow-sm">
          {(selected.fullName || selected.name || 'M')[0].toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#191C19]">{selected.fullName || selected.name}</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#006B2C] text-white">
              Đã xác nhận danh tính
            </span>
          </div>
          <p className="text-xs text-[#5B6776] mt-0.5">
            {selected.memberCode} · {selected.phone || '—'} · Phiên xác nhận hiệu lực 15 phút
          </p>
        </div>
      </div>
    
      <div className="flex items-center gap-4">
        <Link to="/moderator/inbox">
          <Button variant="outline" className="text-xs">
            Nhắn cho khách
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function CounterIdentityPanel({ selected, results, confirmed, confirmIdentity, reset }) {
  return (
    <div className="rounded-2xl border-2 border-[#2b2b2b] bg-white p-6 shadow-sm space-y-5">
      <div className="border-b border-[#d4d4d4] pb-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Họ và tên</p>
        <h2 className="text-2xl font-extrabold text-[#191C19] mt-1">
          {selected.fullName || selected.name}
        </h2>
      </div>
    
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-[#d4d4d4] pb-4 text-xs">
        <div>
          <p className="text-[10px] text-[#717971] uppercase font-bold">Mã Member</p>
          <p className="font-bold text-sm text-[#191C19] mt-0.5">{selected.memberCode}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#717971] uppercase font-bold">Số điện thoại</p>
          <p className="font-bold text-sm text-[#191C19] mt-0.5">{selected.phone || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#717971] uppercase font-bold">Email đăng ký</p>
          <p className="font-bold text-sm text-[#191C19] mt-0.5">{selected.email || '—'}</p>
        </div>
      </div>
    
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#5B6776]">
        <div>
          <p className="text-[10px] text-[#717971] uppercase font-bold">Tham gia từ</p>
          <p className="font-medium text-[#191C19] mt-0.5">
            {selected.joinedAt
              ? new Date(selected.joinedAt).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#717971] uppercase font-bold">Đến điểm kí gửi gần nhất</p>
          <p className="font-medium text-[#191C19] mt-0.5">
            {selected.lastWarehouseVisit
              ? new Date(selected.lastWarehouseVisit).toLocaleDateString('vi-VN')
              : 'Lần đầu đến điểm kí gửi'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#717971] uppercase font-bold">Lịch sử</p>
          <p className="font-medium text-[#191C19] mt-0.5">
            {typeof selected.violationSummary === 'object' && selected.violationSummary !== null
              ? (selected.violationSummary.totalViolations > 0
                  ? `${selected.violationSummary.totalViolations} lần vi phạm`
                  : 'Chưa có vi phạm')
              : (selected.violationSummary || 'Chưa có vi phạm')}
          </p>
        </div>
      </div>
    
      <div className="rounded-xl border border-[#8a8a8a] bg-[#fcfdfc] p-4 space-y-2">
        <h3 className="text-xs font-bold text-[#191C19] uppercase tracking-wide">
          Đang ký gửi tại điểm kí gửi này · {selected.activeConsignments?.length || 0} món
        </h3>
        {selected.activeConsignments && selected.activeConsignments.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selected.activeConsignments.map((tag, i) => {
              const name = typeof tag === 'object' && tag !== null
                ? (tag.productName || tag.formNo || 'Món ký gửi')
                : tag;
              return (
                <span key={i} className="px-2.5 py-1 rounded border border-[#a8a8a8] bg-white text-xs text-[#414942]">
                  {name}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-[#717971]">Không có món hàng nào đang ký gửi tại điểm kí gửi này.</p>
        )}
      </div>
    
      <div className="flex gap-4">
        <Button
          className="flex-[2] py-3.5 text-sm font-bold bg-[#2b2b2b] text-white hover:bg-black"
          loading={results.busy}
          disabled={confirmed}
          onClick={confirmIdentity}
        >
          Tôi đã đối chiếu đúng Member
        </Button>
        <Button variant="outline" className="flex-1 py-3.5 text-sm font-semibold" onClick={reset}>
          Tra cứu lại
        </Button>
      </div>
    </div>
  );
}

export function CounterLookupForm({ handleFormSubmit, kind, setKind, memberCodeInputRef, query, setQuery, setScanner }) {
  return (
    <div className="rounded-2xl border-2 border-[#2b2b2b] bg-white p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-base font-bold text-[#191C19]">
          Hỏi khách mã Member hoặc số điện thoại
        </h2>
        <p className="mt-1 text-xs text-[#5B6776] leading-relaxed">
          Mã Member nằm ở mục Cá nhân trong ứng dụng. Khách không mở được app thì dùng số điện thoại đã đăng ký.
        </p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* Hidden select kept for backwards-compatibility with legacy test queries */}
        <select
          id="lookup-kind-select"
          aria-label="Tra cứu bằng"
          className="hidden"
          tabIndex={-1}
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="memberCode">Mã Member</option>
          <option value="phone">Số điện thoại</option>
        </select>

        <div>
          <label htmlFor="lookup-query-input" className="block text-xs font-bold text-[#191C19] mb-1.5">
            Mã Member hoặc số điện thoại
          </label>
          <input
            ref={memberCodeInputRef}
            id="lookup-query-input"
            type="text"
            aria-label={kind === 'phone' ? 'Số điện thoại' : 'Mã Member'}
            placeholder="Nhập MB-0000000 hoặc 09xx xxx xxx"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border-2 border-[#2b2b2b] bg-white px-4 py-3 text-lg font-semibold tracking-wide text-[#191C19] placeholder:text-[#a8a8a8] focus:border-[#006B2C] focus:outline-none"
          />
          <p className="mt-1.5 text-[11px] text-[#5B6776]">
            Hệ thống tự động nhận diện: Bắt đầu bằng 0 (số điện thoại) hoặc tiền tố MB- (mã thành viên).
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Button
            type="submit"
            disabled={!query.trim()}
            className="flex-1 py-3 text-sm font-bold bg-[#2b2b2b] text-white hover:bg-black"
          >
            Tra cứu
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setScanner(true)}
            className="py-3 px-4 text-xs font-semibold"
          >
            Quét QR Member
          </Button>
        </div>
      </form>
    </div>
  );
}
