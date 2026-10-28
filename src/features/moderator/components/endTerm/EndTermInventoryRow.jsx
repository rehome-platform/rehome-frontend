import React from "react";

import Button from "../../../../components/common/Button.jsx";

import { Status, date } from "../WarehouseUi.jsx";

export function EndTermInventoryRow({ item, sku, change }) {
  return (
    <div
      key={item.sku}
      className={`flex flex-wrap justify-between items-center gap-3 py-3.5 transition-colors ${
        sku === item.sku ? 'bg-primary/5 rounded-xl px-3' : ''
      }`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-text">{item.sku}</span>
          <span className="text-textSecondary">·</span>
          <span className="font-semibold text-text">{item.name}</span>
          <Status>{item.status}</Status>
        </div>
        <div className="flex items-center gap-3 text-xs text-textSecondary flex-wrap">
          <span>
            Vị trí kệ: <span className="font-medium text-text">{item.shelfLocation}</span>
          </span>
          {item.deadline && (
            <span>
              Hạn: <span className="font-medium text-text">{date(item.deadline)}</span>
            </span>
          )}
          {item.status === 'UNCLAIMED' && (
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Quá hạn 30 ngày
            </span>
          )}
        </div>
      </div>
      <Button
        variant={sku === item.sku ? 'primary' : 'outline'}
        onClick={() => change('sku', item.sku)}
      >
        {sku === item.sku ? 'Đang mở' : 'Mở xử lý'}
      </Button>
    </div>
  );
}
