import React, { useState } from 'react';
import Modal from '../../../components/common/Modal.jsx';
import Button from '../../../components/common/Button.jsx';
import { catalogService } from './api.js';
import { useResource } from './hooks.jsx';
import { Field, ResourceState } from './ui.jsx';

export default function CatalogEditor({ kind, item, slots = [], onClose, onSaved }) {
  const [name, setName] = useState(item?.name || ''),
    [slot, setSlot] = useState(item?.slot || '');
  const mutation = useResource(async () => null, [], { enabled: false });
  return (
    <Modal
      isOpen
      title={`${item ? 'Sửa' : 'Thêm'} ${kind === 'category' ? 'danh mục' : 'thương hiệu'}`}
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
                { name: name.trim(), ...(kind === 'category' ? { slot } : {}) },
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
        <ResourceState resource={mutation} />
        <Field
          label="Tên"
          value={name}
          required
          onChange={(event) => setName(event.target.value)}
          error={mutation.error?.fields?.name}
        />
        {kind === 'category' && (
          <Field label="Slot">
            <select
              className="w-full rounded-xl border-neutral"
              required
              value={slot}
              onChange={(event) => setSlot(event.target.value)}
            >
              <option value="">Chọn slot theo contract</option>
              {slots.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Button
          type="submit"
          loading={mutation.busy}
          disabled={!name.trim() || (kind === 'category' && !slots.includes(slot))}
        >
          Lưu
        </Button>
      </form>
    </Modal>
  );
}
