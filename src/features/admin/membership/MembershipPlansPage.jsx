import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Modal, Table } from '../../../components/common/index.js';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { membershipAdminApi } from '../services/membershipAdminApi.js';
import { TIER_LABELS, TIER_ORDER, formatQuotaValue } from './membershipConstants.js';
import PlanEditModal from './PlanEditModal.jsx';
import TierBadge from './TierBadge.jsx';

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
  const [detailPlan, setDetailPlan] = useState(null);

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
      render: (row) => <TierBadge tier={row.tier} label={TIER_LABELS[row.tier] || row.tier} />,
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDetailPlan(row)}
            aria-label={`Xem chi tiết gói ${row.tier}`}
            className="gap-1"
          >
            <span className="material-symbols-outlined text-sm">visibility</span>
            <span>Xem chi tiết</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingPlan(row)}
            aria-label={`Sửa gói ${row.tier}`}
            className="gap-1"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            <span>Sửa</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="p-6 bg-white rounded-xl border border-[#DDE5D9] space-y-4">
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

        <p className="text-xs text-[#5B6776]">
          Lưu ý hiển thị trên sàn: sản phẩm của thành viên có tin nổi bật được ưu tiên đầu danh sách, hạng cao hơn được xếp trên.
        </p>
      </div>

      <PlanEditModal
        isOpen={Boolean(editingPlan)}
        plan={editingPlan}
        onClose={() => setEditingPlan(null)}
        onSuccess={loadPlans}
      />

      <Modal
        isOpen={Boolean(detailPlan)}
        onClose={() => setDetailPlan(null)}
        title={detailPlan ? `Chi tiết gói ${TIER_LABELS[detailPlan.tier] || detailPlan.tier}` : 'Chi tiết gói'}
        size="md"
      >
        {detailPlan && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {[
              { label: 'Tên gói', value: detailPlan.name || '—' },
              {
                label: 'Giá/tháng',
                value:
                  detailPlan.tier === 'FREE' || detailPlan.pricePerMonth == null
                    ? '—'
                    : formatCurrencyVND(detailPlan.pricePerMonth),
              },
              {
                label: 'Giá/năm',
                value:
                  detailPlan.tier === 'FREE' || detailPlan.pricePerYear == null
                    ? '—'
                    : formatCurrencyVND(detailPlan.pricePerYear),
              },
              { label: 'Live try-on / ngày', value: formatQuotaValue(detailPlan.liveTryonPerDay) },
              { label: 'Giây / lượt live try-on', value: formatQuotaValue(detailPlan.liveTryonMaxSeconds) },
              { label: 'Phối đồ AI / ngày', value: formatQuotaValue(detailPlan.aiTryonPerDay) },
              { label: 'Form ký gửi chờ duyệt tối đa', value: formatQuotaValue(detailPlan.maxPendingConsignmentForms) },
              { label: 'Tin nổi bật', value: detailPlan.featuredListing ? 'Có' : 'Không' },
              {
                label: 'Trạng thái bán',
                value: detailPlan.tier === 'FREE' ? '—' : detailPlan.active ? 'Đang bán' : 'Ngưng bán',
              },
              { label: 'Đang sử dụng', value: `${detailPlan.activeSubscriberCount ?? 0} thành viên` },
            ].map((r) => (
              <div key={r.label} className="px-3 py-2.5 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]/40">
                <dt className="text-[10px] uppercase tracking-wide text-[#5B6776] font-semibold mb-0.5">
                  {r.label}
                </dt>
                <dd className="text-[#1F2A37] font-semibold">{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
    </div>
  );
}
