import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Modal, Table, TableActionButton } from '../../../components/common/index.js';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { membershipAdminApi } from '../services/membershipAdminApi.js';
import { TIER_LABELS, TIER_ORDER, formatQuotaValue } from './membershipConstants.js';
import PlanEditModal from './PlanEditModal.jsx';
import TierBadge from './TierBadge.jsx';
import {
  STATIC_STALE_TIME_MS,
  useAdminCache,
  useAdminCacheActions,
} from '../hooks/useAdminQuery.jsx';

const PLANS_CACHE_KEY = 'admin:membership:plans';

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
  const cache = useAdminCache();
  const cacheActions = useAdminCacheActions();
  const initialCached = cache?.read(PLANS_CACHE_KEY)?.data || null;

  const [plans, setPlans] = useState(() => (initialCached ? sortPlansByTierOrder(initialCached) : []));
  const [loading, setLoading] = useState(() => !initialCached);
  const [error, setError] = useState('');
  const [editingPlan, setEditingPlan] = useState(null);
  const [detailPlan, setDetailPlan] = useState(null);

  const seqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadPlans = useCallback(async ({ force = false } = {}) => {
    const cachedEntry = cache?.read(PLANS_CACHE_KEY) || null;
    if (!force && cachedEntry && cache.isFresh(cachedEntry, STATIC_STALE_TIME_MS)) {
      setPlans(sortPlansByTierOrder(cachedEntry.data));
      setError('');
      setLoading(false);
      return;
    }

    const reqId = ++seqRef.current;
    const hasCached = Boolean(cachedEntry?.data);
    if (hasCached) {
      setPlans(sortPlansByTierOrder(cachedEntry.data));
      setError('');
      setLoading(false);
    } else {
      setLoading(true);
      setError('');
    }

    try {
      const data = await membershipAdminApi.getPlans();
      if (!mountedRef.current || reqId !== seqRef.current) return;
      const sorted = sortPlansByTierOrder(data);
      cache?.write(PLANS_CACHE_KEY, sorted);
      setPlans(sorted);
    } catch (err) {
      if (!mountedRef.current || reqId !== seqRef.current) return;
      if (!hasCached || force) {
        setError(err?.response?.data?.message || 'Không thể tải danh sách gói thành viên.');
      }
    } finally {
      if (mountedRef.current && reqId === seqRef.current) {
        setLoading(false);
      }
    }
  }, [cache]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const columns = [
    {
      header: 'Hạng',
      className: 'w-[24%]',
      render: (row) => <TierBadge tier={row.tier} label={TIER_LABELS[row.tier] || row.tier} />,
    },
    {
      header: 'Giá/tháng',
      className: 'w-[15%] text-right',
      cellClassName: 'text-right tabular-nums whitespace-nowrap text-[#1F2A37]',
      render: (row) =>
        row.tier === 'FREE' || row.pricePerMonth === null || row.pricePerMonth === undefined
          ? '—'
          : formatCurrencyVND(row.pricePerMonth),
    },
    {
      header: 'Giá/năm',
      className: 'w-[15%] text-right',
      cellClassName: 'text-right tabular-nums whitespace-nowrap text-[#1F2A37]',
      render: (row) =>
        row.tier === 'FREE' || row.pricePerYear === null || row.pricePerYear === undefined
          ? '—'
          : formatCurrencyVND(row.pricePerYear),
    },
    {
      header: 'Đang bán',
      className: 'w-[14%]',
      cellClassName: 'whitespace-nowrap',
      render: (row) =>
        row.tier === 'FREE' ? (
          <span className="text-[#98A2B3]">—</span>
        ) : (
          <Badge variant={row.active ? 'success' : 'default'} size="sm">
            {row.active ? 'Đang bán' : 'Ngưng bán'}
          </Badge>
        ),
    },
    {
      header: 'Đang dùng',
      className: 'w-[12%] text-right',
      cellClassName: 'text-right tabular-nums whitespace-nowrap',
      render: (row) => {
        const count = Number(row.activeSubscriberCount ?? 0);
        return (
          <Link
            to={`/admin/membership-subscriptions?tier=${row.tier}`}
            title="Xem danh sách thành viên thuộc hạng này"
            className={`hover:underline transition-colors ${
              count > 0
                ? 'font-semibold text-[#1F2A37] hover:text-[#006B2C]'
                : 'font-medium text-[#5B6776] hover:text-[#1F2A37]'
            }`}
          >
            {count}
          </Link>
        );
      },
    },
    {
      header: 'Thao tác',
      className: 'w-[20%] text-right',
      cellClassName: 'text-right whitespace-nowrap',
      render: (row) => (
        <div className="inline-flex items-center justify-end gap-2">
          <TableActionButton
            action="view"
            onClick={() => setDetailPlan(row)}
            aria-label={`Xem chi tiết gói ${row.tier}`}
          />
          <TableActionButton
            action="edit"
            onClick={() => setEditingPlan(row)}
            aria-label={`Sửa gói ${row.tier}`}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="p-5 bg-white rounded-xl border border-[#DDE5D9] space-y-4">
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#D92D20]/30 bg-[#FFF5F5] px-4 py-3 text-sm text-[#D92D20]">
            <span>{error}</span>
            <Button variant="secondary" size="sm" onClick={() => loadPlans({ force: true })}>
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

        <div
          role="note"
          className="flex items-start gap-2.5 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4] px-4 py-3 text-xs text-[#1F2A37]"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-[18px] text-[#006B2C] shrink-0 mt-0.5"
          >
            info
          </span>
          <p className="leading-relaxed">
            <strong className="font-semibold text-[#1F2A37]">Lưu ý hiển thị trên sàn:</strong>{' '}
            <span className="text-[#475467]">
              Sản phẩm của thành viên có tin nổi bật được ưu tiên đầu danh sách, hạng cao hơn được xếp trên.
            </span>
          </p>
        </div>
      </div>

      <PlanEditModal
        isOpen={Boolean(editingPlan)}
        plan={editingPlan}
        onClose={() => setEditingPlan(null)}
        onSuccess={() => {
          cacheActions?.invalidate(['admin:membership:plans', 'admin:dashboard:membership-stats:', 'admin:audit-logs:']);
          loadPlans({ force: true });
        }}
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
