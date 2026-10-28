import React, { useState } from 'react';
import Modal from '../../../components/common/Modal.jsx';
import Button from '../../../components/common/Button.jsx';
import { catalogService } from '../services/warehouseApi.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { Field, ResourceState } from './WarehouseUi.jsx';
import {
  SUPPORTED_TRYON_SLOTS,
  TRYON_SLOT_CONFIG,
  validateCatalogInput,
} from '../models/warehouseModel.js';

export default function CatalogEditor({ kind, item, slots = [], onClose, onSaved }) {
  const isCategory = kind === 'category';
  const labelText = isCategory ? 'danh mục' : 'thương hiệu';
  const availableSlots = slots.length > 0 ? slots : SUPPORTED_TRYON_SLOTS;

  const [name, setName] = useState(item?.name || '');
  const [slot, setSlot] = useState(item?.slot || item?.tryonSlot || 'TOP');
  const [clientError, setClientError] = useState('');
  const mutation = useResource(async () => null, [], { enabled: false });

  // Kiểm tra lỗi trùng tên từ backend error (409 Conflict hoặc ErrorCode)
  const isDuplicate =
    mutation.error?.code === 'CATEGORY_NAME_ALREADY_EXISTS' ||
    mutation.error?.code === 'BRAND_NAME_ALREADY_EXISTS' ||
    mutation.error?.code === 'DUPLICATE' ||
    mutation.error?.status === 409 ||
    mutation.error?.message?.toLowerCase().includes('đã tồn tại') ||
    mutation.error?.message?.toLowerCase().includes('already exists') ||
    mutation.error?.fields?.name?.toLowerCase().includes('tồn tại');

  const errorMessage = isDuplicate
    ? `${isCategory ? 'Danh mục' : 'Thương hiệu'} "${name.trim()}" đã tồn tại trên hệ thống, vui lòng chọn tên khác.`
    : clientError || mutation.error?.fields?.name || (mutation.error?.status === 400 ? mutation.error?.message : null);

  const handleSubmit = (event) => {
    event.preventDefault();
    setClientError('');

    const validation = validateCatalogInput(kind, {
      name,
      tryonSlot: isCategory ? slot : undefined,
    });

    if (!validation.valid) {
      setClientError(validation.message);
      return;
    }

    mutation.mutate(
      (options) =>
        catalogService.save(
          kind,
          item?.id,
          {
            name: validation.value.name,
            ...(isCategory ? { tryonSlot: validation.value.tryonSlot, slot: validation.value.tryonSlot } : {}),
            ...(item?.status ? { status: item.status } : {}),
          },
          options,
        ),
      {
        onSuccess: (result) => {
          onSaved(result);
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      isOpen
      title={`${item ? 'Sửa' : 'Thêm'} ${labelText} ${item ? '' : 'mới'}`}
      onClose={() => {
        if (!mutation.busy) onClose();
      }}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-xs text-[#5f5f5f] leading-relaxed">
          {item
            ? `Chỉnh sửa thông tin ${labelText}. Các sản phẩm cũ đã liên kết vẫn được bảo toàn nguyên vẹn.`
            : `Thêm mới ${labelText} vào hệ thống để áp dụng cho các sản phẩm ký gửi.`}
        </p>

        <ResourceState resource={mutation} />

        {/* Ô nhập tên */}
        <div>
          <Field
            label={`Tên ${labelText}`}
            value={name}
            required
            onChange={(event) => {
              setName(event.target.value);
              if (clientError) setClientError('');
            }}
            error={errorMessage}
            placeholder={`VD: ${isCategory ? 'Áo khoác dạ' : 'Uniqlo'}`}
          />
        </div>

        {/* Dropdown Slot thử đồ AI (DM-02) */}
        {isCategory && (
          <div>
            <Field label="Slot thử đồ AI (Bắt buộc)">
              <select
                className="w-full rounded-xl border-[#8a8a8a] text-xs py-2 px-3 focus:border-[#2b2b2b] focus:ring-1 focus:ring-[#2b2b2b]"
                value={slot}
                onChange={(event) => {
                  setSlot(event.target.value);
                  if (clientError) setClientError('');
                }}
              >
                {availableSlots.map((value) => {
                  const key = String(value).toUpperCase();
                  const config = TRYON_SLOT_CONFIG[key] || { label: `Slot ${value}`, description: '' };
                  return (
                    <option key={value} value={key}>
                      {config.label} {config.description ? `— ${config.description}` : ''}
                    </option>
                  );
                })}
              </select>
            </Field>
            <p className="mt-1 text-[11px] text-[#717971]">
              Slot thử đồ AI xác định vị trí trang phục trên cơ thể người mẫu khi khách hàng thử đồ ảo trên web/app.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 py-2.5 text-xs font-semibold"
            onClick={onClose}
            disabled={mutation.busy}
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            className="flex-1 py-2.5 bg-[#2b2b2b] text-white hover:bg-black font-bold text-xs"
            loading={mutation.busy}
            disabled={!name.trim() || (isCategory && !slot)}
          >
            Lưu {labelText}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
