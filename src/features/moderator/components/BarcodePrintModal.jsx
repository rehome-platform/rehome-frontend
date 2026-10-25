import React from 'react';
import Modal from '../../../components/common/Modal.jsx';
import Button from '../../../components/common/Button.jsx';
import { inventoryService } from '../services/warehouseApi.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { DocumentLink, ResourceState } from './WarehouseUi.jsx';

export default function BarcodePrintModal({ isOpen, onClose, item }) {
  const label = useResource(
    (options) => inventoryService.label(item.sku, options),
    [item?.sku, isOpen],
    { enabled: isOpen && !!item?.sku },
  );
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Tem SKU · ${item?.sku || ''}`}>
      <div className="space-y-4">
        <ResourceState resource={label} />
        <DocumentLink url={label.data?.labelPdfUrl}>Mở PDF tem để xem và in</DocumentLink>
        <p className="text-sm text-textSecondary">
          Dùng chức năng in của trình xem PDF. Nếu liên kết hết hạn, tải lại tem; không nhập kho
          lại.
        </p>
        <Button variant="outline" onClick={label.refresh}>
          Tải lại tem
        </Button>
      </div>
    </Modal>
  );
}
