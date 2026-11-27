import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Modal, Table, TableActionButton } from '../../../components/common/index.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { membershipAdminApi } from '../services/membershipAdminApi.js';
import { VOUCHER_TYPE_LABELS } from './membershipConstants.js';
import VoucherTemplateModal from './VoucherTemplateModal.jsx';
import {
  STATIC_STALE_TIME_MS,
  useAdminCache,
  useAdminCacheActions,
} from '../hooks/useAdminQuery.jsx';

const VOUCHERS_CACHE_KEY = 'admin:vouchers:list';

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
  const toast = useToast();
  const cache = useAdminCache();
  const cacheActions = useAdminCacheActions();
  const initialCached = cache?.read(VOUCHERS_CACHE_KEY)?.data || null;

  const [templates, setTemplates] = useState(() => initialCached ?? []);
  const [loading, setLoading] = useState(() => !initialCached);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [togglingId, setTogglingId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [detailTemplate, setDetailTemplate] = useState(null);

  const seqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadTemplates = useCallback(async ({ force = false } = {}) => {
    const cachedEntry = cache?.read(VOUCHERS_CACHE_KEY) || null;
    if (!force && cachedEntry && cache.isFresh(cachedEntry, STATIC_STALE_TIME_MS)) {
      setTemplates(cachedEntry.data ?? []);
      setError('');
      setLoading(false);
      return;
    }

    const reqId = ++seqRef.current;
    const hasCached = Boolean(cachedEntry?.data);
    if (hasCached) {
      setTemplates(cachedEntry.data);
      setError('');
      setLoading(false);
    } else {
      setLoading(true);
      setError('');
    }

    try {
      const data = await membershipAdminApi.getVoucherTemplates();
      if (!mountedRef.current || reqId !== seqRef.current) return;
      const list = Array.isArray(data) ? data : [];
      cache?.write(VOUCHERS_CACHE_KEY, list);
      setTemplates(list);
    } catch (err) {
      if (!mountedRef.current || reqId !== seqRef.current) return;
      if (!hasCached || force) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Không thể tải danh sách mẫu voucher.'
        );
      }
    } finally {
      if (mountedRef.current && reqId === seqRef.current) {
        setLoading(false);
      }
    }
  }, [cache]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const filteredTemplates = useMemo(() => {
    if (statusFilter === 'ACTIVE') return templates.filter((t) => t.active);
    if (statusFilter === 'INACTIVE') return templates.filter((t) => !t.active);
    return templates;
  }, [templates, statusFilter]);

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (template) => {
    setEditingTemplate(template);
    setModalOpen(true);
  };

  // Bật/tắt ngay tại bảng, không cần hộp thoại xác nhận — có thể bật lại bất cứ lúc nào nên không
  // phải thao tác một chiều/nguy hiểm như xoá
  const handleToggleActive = async (template) => {
    if (togglingId) return;
    setTogglingId(template.id);
    try {
      if (template.active) {
        await membershipAdminApi.deactivateVoucherTemplate(template.id);
        toast.success(`Đã ngừng phát "${template.name}". Mã đã phát trước đó vẫn dùng được tới hết hạn.`);
      } else {
        await membershipAdminApi.activateVoucherTemplate(template.id);
        toast.success(`Đã phát mã trở lại cho "${template.name}".`);
      }
      cacheActions?.invalidate(['admin:vouchers:', 'admin:audit-logs:']);
      await loadTemplates({ force: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || 'Không thể đổi trạng thái mẫu voucher.';
      toast.error(msg);
    } finally {
      setTogglingId(null);
    }
  };

  const columns = [
    {
      header: 'Tên',
      className: 'w-[28%]',
      cellClassName: 'font-semibold text-[#1F2A37]',
      render: (row) => row.name,
    },
    {
      header: 'Loại',
      className: 'w-[24%]',
      cellClassName: 'text-[#475467] whitespace-nowrap',
      render: (row) => VOUCHER_TYPE_LABELS[row.type] || row.type,
    },
    {
      header: 'Hiệu lực',
      className: 'w-[14%]',
      cellClassName: 'tabular-nums whitespace-nowrap text-[#1F2A37]',
      render: (row) => `${row.validDays} ngày`,
    },
    {
      header: 'Trạng thái',
      className: 'w-[16%]',
      cellClassName: 'whitespace-nowrap',
      render: (row) => (
        <button
          type="button"
          role="switch"
          aria-checked={row.active}
          disabled={togglingId === row.id}
          onClick={() => handleToggleActive(row)}
          title={row.active ? 'Đang phát — bấm để ngừng phát' : 'Đã ngừng phát — bấm để phát lại'}
          className="flex items-center gap-2 group disabled:opacity-50"
        >
          <span
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
              row.active ? 'bg-[#006B2C]' : 'bg-[#D9DEDA] group-hover:bg-[#C4CCC6]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                row.active ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </span>
          <span className={`text-xs font-semibold ${row.active ? 'text-[#006B2C]' : 'text-[#5B6776]'}`}>
            {row.active ? 'Đang phát' : 'Ngừng phát'}
          </span>
        </button>
      ),
    },
    {
      header: 'Thao tác',
      className: 'w-[18%] text-right',
      cellClassName: 'text-right whitespace-nowrap',
      render: (row) => (
        <div className="inline-flex items-center justify-end gap-2">
          <TableActionButton action="view" onClick={() => setDetailTemplate(row)} />
          <TableActionButton action="edit" onClick={() => handleOpenEdit(row)} />
        </div>
      ),
    },
  ];

  return (
    <div className="p-5 bg-white rounded-xl border border-[#DDE5D9] space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3.5 border-b border-[#DDE5D9]">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-sm text-[#5B6776]">
            Thiết lập mẫu voucher định kỳ phát cho các hạng thành viên.
          </p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#006B2C] whitespace-nowrap">
            {filteredTemplates.length}/{templates.length} mẫu
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <label htmlFor="voucher-status-filter" className="text-xs font-medium text-[#5B6776] whitespace-nowrap">
              Trạng thái
            </label>
            <select
              id="voucher-status-filter"
              aria-label="Lọc theo trạng thái"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-[#DDE5D9] bg-white px-3 py-2 text-sm font-medium text-[#1F2A37] focus:outline-none focus:ring-2 focus:ring-[#006B2C]/20 focus:border-[#006B2C]"
            >
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Đang phát</option>
              <option value="INACTIVE">Ngừng phát</option>
            </select>
          </div>
          <Button variant="primary" onClick={handleOpenCreate} className="gap-1.5 whitespace-nowrap">
            <span className="material-symbols-outlined text-base">add</span>
            <span>Tạo mẫu voucher</span>
          </Button>
        </div>
      </div>

      {error ? (
        <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/30 text-xs text-[#D92D20]">
          {error}
        </div>
      ) : null}

      <Table
        columns={columns}
        data={filteredTemplates}
        loading={loading}
        emptyMessage="Chưa có mẫu voucher nào."
      />

      <VoucherTemplateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        template={editingTemplate}
        onSuccess={() => {
          cacheActions?.invalidate(['admin:vouchers:', 'admin:audit-logs:']);
          loadTemplates({ force: true });
        }}
      />

      <Modal
        isOpen={Boolean(detailTemplate)}
        onClose={() => setDetailTemplate(null)}
        title={detailTemplate ? `Chi tiết mẫu voucher "${detailTemplate.name}"` : 'Chi tiết mẫu voucher'}
        size="md"
      >
        {detailTemplate && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="sm:col-span-2 px-3 py-2.5 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]/40">
              <dt className="text-[10px] uppercase tracking-wide text-[#5B6776] font-semibold mb-0.5">Mô tả</dt>
              <dd className="text-[#1F2A37] font-medium">{detailTemplate.description || '—'}</dd>
            </div>
            <div className="px-3 py-2.5 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]/40">
              <dt className="text-[10px] uppercase tracking-wide text-[#5B6776] font-semibold mb-0.5">Loại</dt>
              <dd className="text-[#1F2A37] font-semibold">
                {VOUCHER_TYPE_LABELS[detailTemplate.type] || detailTemplate.type}
              </dd>
            </div>
            <div className="px-3 py-2.5 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]/40">
              <dt className="text-[10px] uppercase tracking-wide text-[#5B6776] font-semibold mb-0.5">Mức giảm</dt>
              <dd className="text-[#1F2A37] font-semibold">{formatDiscountDisplay(detailTemplate)}</dd>
            </div>
            <div className="px-3 py-2.5 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]/40">
              <dt className="text-[10px] uppercase tracking-wide text-[#5B6776] font-semibold mb-0.5">Đơn tối thiểu</dt>
              <dd className="text-[#1F2A37] font-semibold">{formatVndCompact(detailTemplate.minOrderAmount)}</dd>
            </div>
            <div className="px-3 py-2.5 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]/40">
              <dt className="text-[10px] uppercase tracking-wide text-[#5B6776] font-semibold mb-0.5">Hiệu lực</dt>
              <dd className="text-[#1F2A37] font-semibold">{detailTemplate.validDays} ngày</dd>
            </div>
            <div className="sm:col-span-2 px-3 py-2.5 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]/40">
              <dt className="text-[10px] uppercase tracking-wide text-[#5B6776] font-semibold mb-1">Phát cho hạng</dt>
              <dd>
                {Array.isArray(detailTemplate.tierRules) && detailTemplate.tierRules.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {detailTemplate.tierRules.map((rule) => (
                      <Badge key={rule.tier} variant="info" size="sm">
                        {`${rule.tier} ×${rule.quantityPerMonth}`}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-[#5B6776]">Chưa gán hạng</span>
                )}
              </dd>
            </div>
            <div className="px-3 py-2.5 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]/40">
              <dt className="text-[10px] uppercase tracking-wide text-[#5B6776] font-semibold mb-0.5">Trạng thái</dt>
              <dd>
                <Badge variant={detailTemplate.active ? 'success' : 'default'}>
                  {detailTemplate.active ? 'Đang phát' : 'Ngừng phát'}
                </Badge>
              </dd>
            </div>
          </dl>
        )}
      </Modal>
    </div>
  );
}
