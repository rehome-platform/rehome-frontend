import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Table } from '../../../components/common/index.js';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { membershipAdminApi } from '../services/membershipAdminApi.js';
import { TIER_LABELS, TIER_ORDER, formatQuotaValue } from './membershipConstants.js';
import PlanEditModal from './PlanEditModal.jsx';

function sortPlansByTierOrder(list) {
  const items = Array.isArray(list) ? [...list] : [];
  return items.sort((a, b) => {
    const idxA = TIER_ORDER.indexOf(a.tier);
    const idxB = TIER_ORDER.indexOf(b.tier);
    const orderA = idxA === -1 ? TIER_ORDER.length : idxA;
    const orderB = idxB === -1 ? TIER_ORDER.length : idxB;
    return orderA - orderB;
  });
}

export default function MembershipPlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPlan, setEditingPlan] = useState(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await membershipAdminApi.getPlans();
      setPlans(sortPlansByTierOrder(data));
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể tải danh sách gói thành viên.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const columns = [
    {
      header: 'Hạng',
      render: (row) => (
        <div>
          <div className="font-bold text-[#191C19]">{row.tier}</div>
          <div className="text-xs text-[#5B6776]">{TIER_LABELS[row.tier] || row.tier}</div>
        </div>
      ),
    },
    {
      header: 'Tên',
      render: (row) => <span className="font-medium text-[#191C19]">{row.name}</span>,
    },
    {
      header: 'Giá/tháng',
      render: (row) =>
        row.tier === 'FREE' || row.pricePerMonth === null || row.pricePerMonth === undefined
          ? '—'
          : formatCurrencyVND(row.pricePerMonth),
    },
    {
      header: 'Giá/năm',
      render: (row) =>
        row.tier === 'FREE' || row.pricePerYear === null || row.pricePerYear === undefined
          ? '—'
          : formatCurrencyVND(row.pricePerYear),
    },
    {
      header: 'RT/ngày',
      render: (row) => formatQuotaValue(row.liveTryonPerDay),
    },
    {
      header: 'Giây/lượt',
      render: (row) => formatQuotaValue(row.liveTryonMaxSeconds),
    },
    {
      header: 'Phối đồ/ngày',
      render: (row) => formatQuotaValue(row.aiTryonPerDay),
    },
    {
      header: 'Nổi bật',
      render: (row) => (
        <Badge variant={row.featuredListing ? 'success' : 'default'} size="sm">
          {row.featuredListing ? 'Có' : 'Không'}
        </Badge>
      ),
    },
    {
      header: 'Form ký gửi',
      render: (row) => formatQuotaValue(row.maxPendingConsignmentForms),
    },
    {
      header: 'Đang bán',
      render: (row) =>
        row.tier === 'FREE' ? (
          '—'
        ) : (
          <Badge variant={row.active ? 'success' : 'default'} size="sm">
            {row.active ? 'Đang bán' : 'Ngưng bán'}
          </Badge>
        ),
    },
    {
      header: 'Đang dùng',
      render: (row) => (
        <Link
          to={`/admin/membership-subscriptions?tier=${row.tier}`}
          className="font-semibold text-[#006B2C] hover:underline"
        >
          {row.activeSubscriberCount ?? 0}
        </Link>
      ),
    },
    {
      header: 'Thao tác',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditingPlan(row)}
          aria-label={`Sửa gói ${row.tier}`}
        >
          ✏️ Sửa
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="p-6 bg-white rounded-xl border border-[#E2E8E0] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#191C19]">Cấu hình gói thành viên VIP</h2>
            <p className="text-xs text-[#5B6776] mt-0.5">
              Quản lý giá và hạn mức quyền lợi cho 4 hạng thành viên cố định.
            </p>
          </div>
          <Link
            to="/admin/voucher-templates"
            className="text-sm font-semibold text-[#006B2C] hover:underline"
          >
            Cấu hình voucher của các hạng →
          </Link>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#D92D20]/30 bg-[#FFF5F5] px-4 py-3 text-sm text-[#D92D20]">
            <span>{error}</span>
            <Button variant="secondary" size="sm" onClick={loadPlans}>
              Thử lại
            </Button>
          </div>
        )}

        <Table
          columns={columns}
          data={plans}
          loading={loading}
          keyExtractor={(row) => row.id || row.tier}
          emptyMessage="Chưa có dữ liệu gói thành viên."
        />
      </div>

      <PlanEditModal
        isOpen={Boolean(editingPlan)}
        plan={editingPlan}
        onClose={() => setEditingPlan(null)}
        onSuccess={loadPlans}
      />
    </div>
  );
}
