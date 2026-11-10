import React from 'react';
import Button from '../../../../components/common/Button.jsx';
import { date, money } from '../WarehouseUi.jsx';

const STYLES = {
  ITEM_WITHDRAWAL: {
    border: 'border-[#E65100]/40',
    header: 'bg-[#FFF8E1] border-[#FFE082]',
    color: 'text-[#B78103]',
    title: 'Rút hàng giữa kỳ (Chờ nhận lại)',
    deadlineLabel: 'Hạn lấy:',
    groupTitle: '2. Khách đến nhận lại hàng rút giữa kỳ',
    badge: 'bg-[#FFF3E0] text-[#E65100]',
    badgeLabel: 'Member rút hàng',
  },
  END_OF_TERM_TAKE_BACK: {
    border: 'border-[#512DA8]/30',
    header: 'bg-[#F3E5F5] border-[#E1BEE7]',
    color: 'text-[#512DA8]',
    title: 'Hàng cuối kỳ (Đã chọn nhận lại)',
    deadlineLabel: 'Hạn xử lý:',
    groupTitle: '3. Khách đến nhận lại hàng hết kỳ ký gửi',
    badge: 'bg-[#EDE7F6] text-[#512DA8]',
    badgeLabel: 'Nhận lại cuối kỳ',
  },
  INVALID_RETURN_PICKUP: {
    border: 'border-[#C62828]/30',
    header: 'bg-[#FFEBEE] border-[#FFCDD2]',
    color: 'text-[#C62828]',
    title: 'Hàng trả không hợp lệ (Khách nhận lại)',
    deadlineLabel: 'Hạn lấy:',
    groupTitle: '4. Nhận lại hàng trả không hợp lệ',
    badge: 'bg-[#FFEBEE] text-[#C62828]',
    badgeLabel: 'Người mua nhận hàng trả',
  },
  DEGRADED_ITEM_PICKUP: {
    border: 'border-[#006B2C]/40',
    header: 'bg-[#E8F5E9] border-[#C8E6C9]',
    color: 'text-[#006B2C]',
    title: 'Hàng xuống cấp (Member chọn nhận lại + đền một phần)',
    deadlineLabel: 'Thời hạn đến nhận:',
    groupTitle: '5. Khách đến nhận lại hàng xuống cấp',
    badge: 'bg-[#E8F5E9] text-[#006B2C]',
    badgeLabel: 'Đền một phần & nhận lại',
  },
};

export function CounterHandoverTasks({ items = [], context, setConfirmHandover, activeRefId = '' }) {
  const style = STYLES[context] || STYLES.ITEM_WITHDRAWAL;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#191C19]">{style.groupTitle}</h4>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${style.badge}`}>{items.length}</span>
      </div>
      {items.map((item) => (
        <CounterHandoverTask
          key={item.id || item.refId}
          item={item}
          context={context}
          setConfirmHandover={setConfirmHandover}
          activeRefId={activeRefId}
        />
      ))}
    </div>
  );
}

export function CounterHandoverTask({ item, context, setConfirmHandover, activeRefId = '' }) {
  const style = STYLES[context] || STYLES.ITEM_WITHDRAWAL;
  const withdrawal = context === 'ITEM_WITHDRAWAL';
  const degraded = context === 'DEGRADED_ITEM_PICKUP';
  const deadlineValue = degraded ? item.pickupDeadline : (item.pickupDeadline || item.deadline || item.handoverDeadline);

  const isMatched = Boolean(
    activeRefId &&
      (String(item.id || '').toUpperCase() === String(activeRefId).toUpperCase() ||
        String(item.refId || '').toUpperCase() === String(activeRefId).toUpperCase() ||
        String(item.productId || '').toUpperCase() === String(activeRefId).toUpperCase() ||
        String(item.sku || '').toUpperCase() === String(activeRefId).toUpperCase())
  );

  return (
    <div
      className={`rounded-2xl border-2 ${
        isMatched ? 'ring-2 ring-[#006B2C] border-[#006B2C]' : style.border
      } bg-white overflow-hidden shadow-sm transition-all`}
    >
      <div className={`${style.header} border-b px-4 py-2.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${style.color}`}>{style.title}</span>
          {isMatched && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#006B2C] text-white">
              Khớp từ chi tiết sản phẩm
            </span>
          )}
        </div>
        {(!degraded || deadlineValue) && <span className="text-[11px] text-[#717971]">
          {style.deadlineLabel} {deadlineValue ? date(deadlineValue) : 'Chưa có thông tin thời hạn'}
        </span>}
      </div>
      <div className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-bold text-sm text-[#191C19]">{item.productName || item.itemName || item.productId}</p>
          <p className="text-xs text-[#5B6776] mt-0.5">
            Mã SP: <span className="font-mono font-bold text-[#191C19]">{item.productId || item.id}</span>
            {item.sku && <span className="font-mono font-bold text-[#191C19] ml-1"> · SKU: {item.sku}</span>}
            {withdrawal && (
              <>
                {' '}
                · Phí rút:{' '}
                {item.feeCharged ? (
                  <>
                    <span className="font-bold text-[#191C19]">{money(item.feeCharged)}</span>
                    {item.feePaid ? (
                      <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E8F5E9] text-[#006B2C]">
                        ✓ Đã đóng phí
                      </span>
                    ) : (
                      <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FFEBEE] text-[#BA1A1A]">
                        ⚠ Chưa đóng phí
                      </span>
                    )}
                  </>
                ) : (
                  <span className="font-bold text-[#006B2C]">Miễn phí</span>
                )}
              </>
            )}
            {degraded && (
              <>
                {' '}
                · Tiền đền:{' '}
                <span className="font-bold text-[#006B2C]">
                  {money(item.paidAmount ?? item.compensationAmount)}
                </span>{' '}
                (đã vào ví Member)
              </>
            )}
          </p>
        </div>
        <Button
          type="button"
          className={`${
            isMatched ? 'bg-[#006B2C] hover:bg-[#005523]' : 'bg-[#2b2b2b] hover:bg-black'
          } text-white text-xs font-bold py-2 px-3.5`}
          onClick={() => setConfirmHandover({ item, context })}
        >
          Bàn giao cho khách
        </Button>
      </div>
    </div>
  );
}

export default CounterHandoverTasks;
