import React from "react";

import Button from "../../../../components/common/Button.jsx";
import Modal from "../../../../components/common/Modal.jsx";

import { validMoney } from "../../models/warehouseModel.js";
import { Field, Status, ResourceState, date, money } from "../WarehouseUi.jsx";

import { CHARITY_PARTNER_SUGGESTIONS } from '../../pages/EndOfTermPage.config.js';

export function EndTermConfirmDialog({ confirm, resource, setConfirm, sku, price, data, partner, run }) {
  return (
    <Modal
      isOpen={!!confirm}
      onClose={() => {
        if (!resource.busy) setConfirm(null);
      }}
      title={
        confirm === 'TRANSFER'
          ? 'Xác nhận chuyển giao từ thiện'
          : confirm === 'HANDOVER'
            ? 'Xác nhận bàn giao tại quầy'
            : 'Xác nhận ký gửi lại'
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text leading-relaxed">
          {confirm === 'HANDOVER'
            ? `Xác nhận đã bàn giao đúng sản phẩm ${sku} cho Member đã đối chiếu danh tính?`
            : confirm === 'RE_CONSIGN'
              ? `Tạo biên nhận mới cho SKU ${sku} với giá ${money(Number(price))}?`
              : `Xác nhận chuyển giao sản phẩm SKU ${sku} (${data?.name}) cho tổ chức từ thiện "${partner.trim()}"? Thao tác này sẽ đổi trạng thái sản phẩm sang ĐÃ CHUYỂN GIAO (DONATED) và lưu vào Audit Log.`}
        </p>
        <ResourceState resource={resource} />
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            disabled={resource.busy}
            onClick={() => setConfirm(null)}
          >
            Hủy
          </Button>
          <Button
            loading={resource.busy}
            variant={confirm === 'TRANSFER' ? 'danger' : 'primary'}
            onClick={run}
          >
            Xác nhận
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function EndTermReconsignPanel({ price, setPrice, resource, term, setTerm, enums, setConfirm }) {
  return (
    <div className="space-y-3 rounded-xl border border-neutral p-4 bg-background">
      <h3 className="font-semibold text-text">Chốt tái ký gửi lại</h3>
      <Field
        label="Giá ký gửi lại (VND)"
        value={price}
        inputMode="numeric"
        onChange={(event) => setPrice(event.target.value)}
        error={
          price && !validMoney(price)
            ? 'Giá phải là số nguyên dương.'
            : resource.error?.fields?.agreedPrice
        }
      />
      <Field label="Độ dài kỳ mới">
        <select
          className="rounded-xl border-neutral w-full p-2"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        >
          <option value="">Chọn kỳ</option>
          {(enums.data?.termLengthDays || []).map((days) => (
            <option key={days} value={days}>
              {days} ngày
            </option>
          ))}
        </select>
      </Field>
      <Button
        disabled={
          !validMoney(price) || !(enums.data?.termLengthDays || []).includes(Number(term))
        }
        onClick={() => setConfirm('RE_CONSIGN')}
      >
        Chốt giá ký gửi lại
      </Button>
    </div>
  );
}

export function EndTermTransferPanel({ partner, setPartner, partnerValidation, resource, setConfirm }) {
  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <h3 className="font-semibold text-amber-900">Chuyển giao cho tổ chức từ thiện (API 36)</h3>
      <p className="text-xs text-textSecondary">
        Sản phẩm vô thừa nhận quá hạn 30 ngày. Vui lòng nhập tên đối tác từ thiện tiếp nhận để chuyển trạng thái sang <span className="font-semibold text-text">DONATED</span>.
      </p>
    
      <Field
        label="Tên tổ chức đối tác nhận chuyển giao"
        value={partner}
        placeholder="VD: Quỹ Tình Thương TP.HCM, Mái Ấm Hy Vọng..."
        onChange={(event) => setPartner(event.target.value)}
        error={partner && !partnerValidation.valid ? partnerValidation.message : resource.error?.fields?.partnerOrganizationName}
      />
    
      {/* Gợi ý tên đối tác phổ biến */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs text-textSecondary">Gợi ý nhanh:</span>
        {CHARITY_PARTNER_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="text-xs bg-white hover:bg-neutral px-2.5 py-1 rounded-lg border border-neutral transition-colors text-text"
            onClick={() => setPartner(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    
      <div className="pt-2">
        <Button
          variant="danger"
          disabled={!partnerValidation.valid}
          onClick={() => setConfirm('TRANSFER')}
        >
          Chuyển giao hàng vô thừa nhận
        </Button>
      </div>
    </div>
  );
}

export function EndTermProductSummary({ data }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-background p-4 rounded-xl border border-neutral">
      <div>
        <p className="text-xs text-textSecondary uppercase font-medium">Tên sản phẩm</p>
        <p className="font-semibold text-text">{data.name}</p>
      </div>
      <div>
        <p className="text-xs text-textSecondary uppercase font-medium">Vị trí kệ</p>
        <p className="font-semibold text-text">{data.shelfLocation}</p>
      </div>
      <div>
        <p className="text-xs text-textSecondary uppercase font-medium">Trạng thái kho</p>
        <div className="mt-1">
          <Status>{data.status}</Status>
        </div>
      </div>
      <div>
        <p className="text-xs text-textSecondary uppercase font-medium">Giá thỏa thuận / Niêm yết</p>
        <p className="font-semibold text-text">{money(data.agreedPrice || data.currentPrice)}</p>
      </div>
      {data.deadline && (
        <div>
          <p className="text-xs text-textSecondary uppercase font-medium">Hạn xử lý</p>
          <p className="text-sm text-text">{date(data.deadline)}</p>
        </div>
      )}
      {data.decision && (
        <div>
          <p className="text-xs text-textSecondary uppercase font-medium">Quyết định ban đầu</p>
          <p className="text-sm text-text">{data.decision}</p>
        </div>
      )}
    </div>
  );
}
