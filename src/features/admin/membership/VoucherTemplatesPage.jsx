import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Modal, Table } from '../../../components/common/index.js';
import { membershipAdminApi } from '../services/membershipAdminApi.js';
import { VOUCHER_TYPE_LABELS } from './membershipConstants.js';
import VoucherTemplateModal from './VoucherTemplateModal.jsx';

const DEACTIVATE_NOTICE =
  'Ngừng phát chỉ dừng cấp mã mới; các voucher đã phát cho thành viên vẫn giữ hiệu lực.';

function formatVndCompact(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return '0đ';
  return `${num.toLocaleString('vi-VN')}đ`;
}

function formatDiscountDisplay(row) {
  if (row.discountKind === 'PERCENT') {
    const pct = Number((Number(row.discountValue || 0) * 100).toPrecision(12));
    if (row.maxDiscountAmount != null) {
      return `${pct}% (tối đa ${formatVndCompact(row.maxDiscountAmount)})`;
    }
    return `${pct}%`;
  }
  return formatVndCompact(row.discountValue);
}

export default function VoucherTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState('');
  const deactivatingRef = useRef(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await membershipAdminApi.getVoucherTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể tải danh sách mẫu voucher.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (template) => {
    setEditingTemplate(template);
    setModalOpen(true);
  };

  const handleOpenDeactivate = (template) => {
    setDeactivateError('');
    deactivatingRef.current = false;
    setDeactivating(false);
    setDeactivateTarget(template);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget || deactivatingRef.current) return;
    deactivatingRef.current = true;
    setDeactivating(true);
    setDeactivateError('');
    try {
      await membershipAdminApi.deactivateVoucherTemplate(deactivateTarget.id);
      setDeactivateTarget(null);
      await loadTemplates();
    } catch (err) {
      setDeactivateError(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể ngừng phát mẫu voucher.'
      );
    } finally {
      deactivatingRef.current = false;
      setDeactivating(false);
    }
  };

  const columns = [
    {
      header: 'Tên',
      render: (row) => (
        <div>
          <p className="font-semibold text-[#191C19]">{row.name}</p>
          {row.description ? (
            <p className="text-xs text-[#5B6776] mt-0.5">{row.description}</p>
          ) : null}
        </div>
      ),
    },
    {
      header: 'Loại',
      render: (row) => VOUCHER_TYPE_LABELS[row.type] || row.type,
    },
    {
      header: 'Mức giảm',
      render: (row) => (
        <span className="font-medium text-[#191C19]">{formatDiscountDisplay(row)}</span>
      ),
    },
    {
      header: 'Đơn tối thiểu',
      render: (row) => formatVndCompact(row.minOrderAmount),
    },
    {
      header: 'Hiệu lực',
      render: (row) => `${row.validDays} ngày`,
    },
    {
      header: 'Phát cho hạng',
      render: (row) =>
        Array.isArray(row.tierRules) && row.tierRules.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {row.tierRules.map((rule) => (
              <Badge key={rule.tier} variant="info" size="sm">
                {`${rule.tier} ×${rule.quantityPerMonth}`}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-[#5B6776]">Chưa gán hạng</span>
        ),
    },
    {
      header: 'Trạng thái',
      render: (row) => (
        <Badge variant={row.active ? 'success' : 'default'}>
          {row.active ? 'Đang phát' : 'Ngừng phát'}
        </Badge>
      ),
    },
    {
      header: 'Thao tác',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => handleOpenEdit(row)}>
            Sửa
          </Button>
          {row.active ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleOpenDeactivate(row)}
            >
              Ngừng phát
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 bg-white rounded-xl border border-[#E2E8E0] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#191C19]">Quản lý mẫu voucher</h2>
          <p className="text-xs text-[#5B6776] mt-0.5">
            Thiết lập mẫu voucher định kỳ phát cho các hạng thành viên VIP.
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}>
          Tạo mẫu voucher
        </Button>
      </div>

      {error ? (
        <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/30 text-xs text-[#D92D20]">
          {error}
        </div>
      ) : null}

      <Table
        columns={columns}
        data={templates}
        loading={loading}
        emptyMessage="Chưa có mẫu voucher nào."
      />

      <VoucherTemplateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        template={editingTemplate}
        onSuccess={loadTemplates}
      />

      <Modal
        isOpen={Boolean(deactivateTarget)}
        onClose={() => !deactivating && setDeactivateTarget(null)}
        title="Xác nhận ngừng phát mẫu voucher"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#1F2A37]">
            Bạn có chắc muốn ngừng phát mẫu{' '}
            <span className="font-semibold">{deactivateTarget?.name}</span>?
          </p>
          <div className="p-3 rounded-xl bg-[#F6F9F4] border border-[#DDE5D9] text-xs text-[#5B6776]">
            {DEACTIVATE_NOTICE}
          </div>
          {deactivateError ? (
            <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/30 text-xs text-[#D92D20]">
              {deactivateError}
            </div>
          ) : null}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={deactivating}
              onClick={() => setDeactivateTarget(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={deactivating}
              disabled={deactivating}
              onClick={handleConfirmDeactivate}
            >
              Xác nhận ngừng phát
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
