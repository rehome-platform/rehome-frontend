import React, { useEffect } from 'react';
import Modal from '../../../components/common/Modal.jsx';
import Button from '../../../components/common/Button.jsx';
import { inventoryService } from '../services/warehouseApi.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { DocumentLink, ResourceState } from './WarehouseUi.jsx';

export default function BarcodePrintModal({ isOpen, onClose, item }) {
  const sku = item?.sku || item?.id || '';
  const label = useResource(
    (options) => inventoryService.label(sku, options),
    [sku, isOpen],
    { enabled: isOpen && Boolean(sku) },
  );

  useEffect(() => {
    return () => {
      if (label.data?.labelPdfUrl) {
        try {
          URL.revokeObjectURL(label.data.labelPdfUrl);
        } catch {
          // ignore
        }
      }
    };
  }, [label.data?.labelPdfUrl]);

  const handlePrintNow = () => {
    if (label.data?.labelPdfUrl) {
      window.open(label.data.labelPdfUrl, '_blank');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Tem mã vạch SKU · ${sku}`}>
      <div className="space-y-4">
        <ResourceState resource={label} />

        {label.error?.status === 403 && (
          <p role="alert" className="text-sm text-error bg-red-50 p-3 rounded-lg border border-red-200">
            Sản phẩm không thuộc chi nhánh kho bạn quản lý. Bạn chỉ có thể in tem cho sản phẩm tại kho mình phụ trách.
          </p>
        )}

        {label.data?.labelPdfUrl && (
          <div className="space-y-3 pt-1">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral flex items-center justify-between">
              <span className="text-sm font-medium text-textPrimary">File PDF tem mã vạch đã sẵn sàng</span>
              <Button size="sm" onClick={handlePrintNow} className="text-xs font-bold bg-primary text-white">
                In tem ngay
              </Button>
            </div>
            <DocumentLink url={label.data.labelPdfUrl}>Mở PDF tem để xem và in</DocumentLink>
          </div>
        )}

        <p className="text-xs text-textSecondary leading-relaxed">
          Dùng chức năng in của trình xem PDF để in ra máy in mã vạch. Nếu liên kết hết hạn, bấm "Tải lại tem"; không cần nhập kho lại.
        </p>

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral">
          <Button variant="outline" size="sm" onClick={label.refresh} loading={label.busy}>
            Tải lại tem
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
}
