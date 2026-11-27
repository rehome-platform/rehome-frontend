import React from "react";
import { Link } from 'react-router-dom';

import Button, { getButtonClasses } from "../../../../components/common/Button.jsx";

import { Status, date } from "../WarehouseUi.jsx";
import { isCounterResponseOverdue } from "../../models/reConsignModel.js";

export function EndTermInventoryRow({ item, sku, change }) {
  const isProposed = item.reConsignStatus === 'PROPOSAL_SENT' || item.reConsignStatus === 'PROPOSED';
  const isCountered = item.reConsignStatus === 'COUNTER_OFFERED';
  const counterOverdue = isCounterResponseOverdue(item);
  return (
    <div
      key={item.sku}
      className={`flex flex-wrap justify-between items-center gap-3 py-3.5 transition-colors ${
        counterOverdue ? 'border-l-4 border-l-[#B42318] bg-[#FEF3F2]/50 px-3 rounded-xl' : sku === item.sku ? 'bg-primary/5 rounded-xl px-3' : ''
      }`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-text">{item.sku}</span>
          <span className="text-textSecondary">·</span>
          <span className="font-semibold text-text">{item.name}</span>
          <Status>{item.status}</Status>
          {item.status === 'WAREHOUSE' && (
            <span className={`text-xs ${counterOverdue ? 'font-bold text-[#B42318]' : ''}`}>
              {isCountered
                ? counterOverdue
                  ? 'Member trả giá (Quá 2 ngày chưa phản hồi)'
                  : 'Member trả giá'
                : isProposed
                  ? 'Chờ Member xác nhận biên nhận'
                  : item.pricingEligible
                    ? 'Chờ thương lượng giá'
                    : 'Chờ Member chọn phương án'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-textSecondary flex-wrap">
          {item.deadline && (
            <span>
              Hạn: <span className="font-medium text-text">{date(item.deadline)}</span>
            </span>
          )}
          {item.status === 'UNCLAIMED' && (
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Đã quá hạn xử lý
            </span>
          )}
        </div>
      </div>
      {item.pricingEligible || isProposed || isCountered ? (
        <Link
          className={getButtonClasses({ variant: 'primary', size: 'sm', className: 'whitespace-nowrap' })}
          to={`/moderator/inventory/${encodeURIComponent(item.sku)}/re-consign`}
        >
          {isCountered ? 'Phản hồi trả giá →' : isProposed ? 'Theo dõi xác nhận →' : 'Đàm phán giá →'}
        </Link>
      ) : (
        <Button
          size="sm"
          variant={sku === item.sku ? 'primary' : 'outline'}
          className="whitespace-nowrap"
          onClick={() => change('sku', item.sku)}
        >
          {sku === item.sku ? 'Đang mở' : 'Mở xử lý'}
        </Button>
      )}
    </div>
  );
}
