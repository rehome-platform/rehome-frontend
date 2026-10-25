import React, { useState } from 'react';
import Modal from '../../../components/common/Modal.jsx';
import Button from '../../../components/common/Button.jsx';
import { catalogService } from '../services/warehouseApi.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { Field, ResourceState } from './WarehouseUi.jsx';

export default function CatalogEditor({ kind, item, slots = [], onClose, onSaved }) {
  const isCategory = kind === 'category';
  const labelText = isCategory ? 'danh mục' : 'thương hiệu';
  const [name, setName] = useState(item?.name || '');
  const [slot, setSlot] = useState(item?.slot || '');
  const mutation = useResource(async () => null, [], { enabled: false });

  // Kiểm tra lỗi trùng tên từ backend error
  const duplicateError =
    mutation.error?.message?.toLowerCase().includes('tồn tại') ||
    mutation.error?.fields?.name?.toLowerCase().includes('tồn tại') ||
    mutation.error?.code === 'DUPLICATE'
      ? `${isCategory ? 'Danh mục' : 'Thương hiệu'} "${name}" đã tồn tại, chọn tên khác.`
      : mutation.error?.fields?.name;

  return (
    <Modal
      isOpen
      title={`${item ? 'Sửa' : 'Thêm'} ${labelText} ${item ? '' : 'mới'}`}
      onClose={() => {
        if (!mutation.busy) onClose();
      }}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(
            (options) =>
              catalogService.save(
                kind,
                item?.id,
                { name: name.trim(), ...(isCategory ? { slot: slot || undefined } : {}) },
                options,
              ),
            {
              onSuccess: (result) => {
                onSaved(result);
                onClose();
              },
            },
          );
        }}
      >
        <p className="text-xs text-[#5f5f5f] leading-relaxed">
          Modal này dùng chung cho Thêm mới và Sửa — sửa thì chỉ đổi tiêu đề và điền sẵn giá trị cũ, bố cục giữ nguyên.
        </p>

        <ResourceState resource={mutation} />

        {/* Ô nhập tên */}
        <div>
          <Field
            label={`Tên ${labelText}`}
            value={name}
            required
            onChange={(event) => setName(event.target.value)}
            error={duplicateError}
            placeholder={`VD: ${isCategory ? 'Áo khoác dạ' : 'Uniqlo'}`}
          />
          {duplicateError && (
            <p className="mt-1 text-xs font-bold text-[#BA1A1A]">
              {duplicateError}
            </p>
          )}
        </div>

        {/* Dropdown Slot thử đồ AI (DM-02) */}
        {isCategory && (
          <div>
            <Field label="Slot thử đồ AI">
              <select
                className="w-full rounded-xl border-neutral"
                value={slot}
                onChange={(event) => setSlot(event.target.value)}
              >
                <option value="">Không áp dụng thử đồ</option>
                {slots.map((value) => (
                  <option key={value} value={value}>
                    Slot {value}
                  </option>
                ))}
              </select>
            </Field>
            <p className="mt-1 text-[11px] text-[#717971]">
              Chọn "Không áp dụng" nếu danh mục này không dùng được cho thử đồ AI (ví dụ túi xách, giày)
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
            disabled={!name.trim()}
          >
            Lưu {labelText}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
