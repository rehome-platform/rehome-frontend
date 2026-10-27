import React from 'react';
import Button from '../../../../components/common/Button.jsx';
import { date, money } from '../WarehouseUi.jsx';

const STYLES = {
  ITEM_WITHDRAWAL: {
    border: 'border-[#E65100]/40', header: 'bg-[#FFF8E1] border-[#FFE082]', color: 'text-[#B78103]',
    title: 'Rút hàng giữa kỳ (Chờ nhận lại)', deadlineLabel: 'Hạn lấy:',
    groupTitle: '2. Khách đến nhận lại hàng rút giữa kỳ', badge: 'bg-[#FFF3E0] text-[#E65100]',
  },
  END_OF_TERM_TAKE_BACK: {
    border: 'border-[#512DA8]/30', header: 'bg-[#F3E5F5] border-[#E1BEE7]', color: 'text-[#512DA8]',
    title: 'Hàng cuối kỳ (Đã chọn nhận lại)', deadlineLabel: 'Hạn xử lý:',
    groupTitle: '3. Khách đến nhận lại hàng hết kỳ ký gửi', badge: 'bg-[#EDE7F6] text-[#512DA8]',
  },
};

export function CounterHandoverTasks({ items, context, setConfirmHandover }) {
  const style = STYLES[context];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#191C19]">{style.groupTitle}</h4>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${style.badge}`}>{items.length}</span>
      </div>
      {items.map(item => <CounterHandoverTask key={item.id} item={item} context={context} setConfirmHandover={setConfirmHandover} />)}
    </div>
  );
}

export function CounterHandoverTask({ item, context, setConfirmHandover }) {
  const style = STYLES[context];
  const withdrawal = context === 'ITEM_WITHDRAWAL';
  return (
    <div className={`rounded-2xl border-2 ${style.border} bg-white overflow-hidden shadow-sm`}>
      <div className={`${style.header} border-b px-4 py-2.5 flex items-center justify-between`}>
        <span className={`text-xs font-bold ${style.color}`}>{style.title}</span>
        <span className="text-[11px] text-[#717971]">
          {style.deadlineLabel} {date(withdrawal ? item.pickupDeadline : item.deadline)}
        </span>
      </div>
      <div className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-bold text-sm text-[#191C19]">{item.productName || item.productId}</p>
          <p className="text-xs text-[#5B6776] mt-0.5">
            Mã SP: <span className="font-mono font-bold text-[#191C19]">{item.productId}</span>
            {withdrawal && <> · Phí rút: {item.feeCharged ? money(item.feeCharged) : 'Miễn phí'}</>}
          </p>
        </div>
        <Button type="button" className="bg-[#2b2b2b] text-white hover:bg-black text-xs font-bold py-2 px-3.5"
          onClick={() => setConfirmHandover({ item, context })}>
          Bàn giao cho khách
        </Button>
      </div>
    </div>
  );
}
