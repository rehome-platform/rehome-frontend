import { PackingQueueItem } from "./PackingQueueItem.jsx";
import { usePackingDetail } from "../../hooks/usePackingDetail.jsx";
import {
  PackingIncidentDialog,
  PackingRecipientPanel,
  PackingShipmentPanel,
  PackingScanPanel,
  PackingItemTable,
} from "./PackingDetailSections.jsx";
import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Button from "../../../../components/common/Button.jsx";
import QRScannerModal from "../../../../components/QRScannerModal.jsx";
import { Page, ResourceState } from "../WarehouseUi.jsx";
import { usePhase2, useResource } from "../../hooks/warehouseHooks.jsx";
import { queueService } from "../../services/warehouseApi.js";
import { listItems } from "../../models/warehouseModel.js";

export function PackingAccessNotice({  }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 space-y-3">
      <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500"></span>
        Thông báo giới hạn phân quyền đọc chi tiết đơn hàng (API 63)
      </div>
      <p className="text-xs text-amber-800 leading-relaxed">
        Backend hiện tại giới hạn quyền gọi <code>GET /orders/{'{'}id{'}'}</code> chỉ dành cho tài khoản Người mua (Role: MEMBER). Nhân viên vận hành kho (Role: MODERATOR) chưa được cấp quyền đọc chi tiết đơn hàng này.
      </p>
      <p className="text-xs text-amber-700">
        Hệ thống frontend đã tích hợp sẵn sàng contract Phase 4 (Quét SKU và Tạo vận đơn GHN). Bạn có thể quay lại danh sách hàng đợi để tiếp tục các công việc khác.
      </p>
      <div className="pt-2">
        <Link
          to="/moderator/packing"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-[#2b2b2b] text-white font-bold text-xs hover:bg-black"
        >
          ← Quay lại hàng đợi đóng gói
        </Link>
      </div>
    </div>
  );
}
