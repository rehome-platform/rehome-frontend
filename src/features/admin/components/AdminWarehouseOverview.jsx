import React, { useState, useEffect, useCallback, useRef } from 'react';
import adminApi from '../services/adminApi.js';
import AdminDonutChart from './AdminDonutChart.jsx';
import { Spinner } from '../../../components/common/index.js';

// Mọi trạng thái sản phẩm còn nằm trong kho (cùng định nghĩa "tồn kho" của dashboard BE), chia 2 nhóm.
// Nhóm "Đang kinh doanh" dùng tông xanh, nhóm "Cần xử lý" dùng tông ấm để nhìn biểu đồ là thấy ngay hàng nào đang kẹt.
const STOCK_GROUPS = [
  {
    key: 'trading',
    title: 'Đang kinh doanh',
    statuses: [
      { code: 'ON_SALE', label: 'Đang bán', color: '#006B2C' },
      { code: 'RESERVED', label: 'Đang giữ chỗ', color: '#5BBF86' },
    ],
  },
  {
    key: 'attention',
    title: 'Cần xử lý',
    statuses: [
      { code: 'WAREHOUSE', label: 'Chờ Member quyết định', color: '#FEA619' },
      { code: 'UNCLAIMED', label: 'Không ai nhận', color: '#E4572E' },
      { code: 'RETURNED', label: 'Hàng trả về', color: '#7B61C9' },
      { code: 'PLATFORM_OWNED', label: 'Thuộc nền tảng', color: '#5B6776' },
    ],
  },
];

const KNOWN_STATUS_CODES = new Set(STOCK_GROUPS.flatMap((g) => g.statuses.map((s) => s.code)));
const UNKNOWN_STATUS_COLOR = '#9AA79A';

const TERM_COLORS = ['#006B2C', '#00685F', '#FEA619'];

function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Biểu đồ cột tồn kho theo kỳ ký gửi (3 cột), có số trên đầu cột và hiệu ứng cột mọc lên.
 */
function TermColumns({ terms }) {
  const max = Math.max(1, ...terms.map((t) => t.count));
  const left = 16;
  const right = 284;
  const top = 26;
  const bottom = 150;
  const slot = (right - left) / terms.length;
  const barWidth = Math.min(54, slot * 0.58);

  return (
    <svg className="w-full h-auto" viewBox="0 0 300 180" role="img" aria-label="Biểu đồ hàng ký gửi theo kỳ">
      <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#C9D3C5" strokeWidth="1" />
      {terms.map((t, idx) => {
        const h = (t.count / max) * (bottom - top);
        const cx = left + slot * idx + slot / 2;
        return (
          <g key={t.label}>
            {h > 0 && (
              <rect
                className="chart-bar"
                style={{ '--i': idx * 2 }}
                x={cx - barWidth / 2}
                y={bottom - h}
                width={barWidth}
                height={h}
                rx="4"
                fill={t.color}
              />
            )}
            <text
              className="chart-fade-in"
              style={{ '--i': idx * 2 }}
              x={cx}
              y={bottom - h - 7}
              fontSize="13"
              fontWeight="700"
              fill="#191C19"
              textAnchor="middle"
            >
              {t.count}
            </text>
            <text x={cx} y={bottom + 20} fontSize="12" fontWeight="600" fill="#414942" textAnchor="middle">
              {t.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Tab Kho của trang Tổng quan Admin: tồn kho theo trạng thái / kỳ, số điểm kho,
 * tác vụ quá hạn, điểm đánh giá dịch vụ kho. Toàn bộ là số liệu hiện tại (không theo bộ lọc thời gian).
 */
export default function AdminWarehouseOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [warehouseCount, setWarehouseCount] = useState(0);
  const reqSeqRef = useRef(0);

  const load = useCallback(async () => {
    const reqId = ++reqSeqRef.current;
    try {
      setLoading(true);
      setError(null);
      const [dashRes, whRes] = await Promise.allSettled([adminApi.getDashboard(), adminApi.getWarehouses()]);
      if (reqId !== reqSeqRef.current) return;
      if (dashRes.status !== 'fulfilled' || !dashRes.value) {
        throw dashRes.reason || new Error('Dashboard rỗng');
      }
      setDashboard(dashRes.value);
      if (whRes.status === 'fulfilled') {
        const list = Array.isArray(whRes.value) ? whRes.value : whRes.value?.content || [];
        setWarehouseCount(list.length);
      }
    } catch (err) {
      if (reqId === reqSeqRef.current) {
        console.error('Lỗi tải dữ liệu kho hàng:', err);
        setError('Không thể tải số liệu hàng ký gửi.');
      }
    } finally {
      if (reqId === reqSeqRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const data = dashboard || {};
  const stockByStatus = data.stockByStatus && typeof data.stockByStatus === 'object' ? data.stockByStatus : null;
  const extraCodes = stockByStatus ? Object.keys(stockByStatus).filter((c) => !KNOWN_STATUS_CODES.has(c)) : [];
  const statusTotal = stockByStatus
    ? Object.values(stockByStatus).reduce((sum, v) => sum + toCount(v), 0)
    : 0;
  const totalStock = stockByStatus ? statusTotal : toCount(data.inventoryCount);

  // Mỗi nhóm gồm các dòng trạng thái (kể cả trạng thái lạ BE thêm sau này, xếp vào "Cần xử lý")
  const groups = STOCK_GROUPS.map((group) => {
    const rows = group.statuses.map((s) => ({ ...s }));
    if (group.key === 'attention') {
      extraCodes.forEach((code) => rows.push({ code, label: code, color: UNKNOWN_STATUS_COLOR }));
    }
    const subtotal = stockByStatus ? rows.reduce((sum, r) => sum + toCount(stockByStatus[r.code]), 0) : 0;
    return { ...group, rows, subtotal };
  });
  const donutSegments = groups.flatMap((g) =>
    g.rows.map((r) => ({ key: r.code, label: r.label, value: toCount(stockByStatus?.[r.code]), color: r.color }))
  );

  const termStocks = [
    { label: 'Kỳ 1', count: toCount(data.term1StockCount), color: TERM_COLORS[0] },
    { label: 'Kỳ 2', count: toCount(data.term2StockCount), color: TERM_COLORS[1] },
    { label: 'Kỳ 3', count: toCount(data.term3StockCount), color: TERM_COLORS[2] },
  ];
  const termTotal = termStocks.reduce((sum, t) => sum + t.count, 0);

  const overdue = toCount(data.overdueTaskCount);
  const rating = Number(data.avgServiceRating) || 0;

  const statCards = [
    {
      title: 'Tổng hàng ký gửi',
      value: `${toCount(data.inventoryCount).toLocaleString('vi-VN')} món`,
      icon: 'inventory_2',
      iconBg: 'bg-[#E0F2F1]',
      iconColor: 'text-[#00685F]',
    },
    {
      title: 'Địa điểm ký gửi',
      value: warehouseCount.toLocaleString('vi-VN'),
      icon: 'warehouse',
      iconBg: 'bg-[#FFF3E0]',
      iconColor: 'text-[#FEA619]',
    },
    {
      title: 'Tác vụ quá hạn cần xử lý',
      value: `${overdue.toLocaleString('vi-VN')} việc`,
      valueClass: overdue > 0 ? 'text-[#DC2626]' : 'text-[#191C19]',
      icon: 'pending_actions',
      iconBg: overdue > 0 ? 'bg-[#FEF2F2]' : 'bg-[#E8F5E9]',
      iconColor: overdue > 0 ? 'text-[#DC2626]' : 'text-[#006B2C]',
    },
    {
      title: 'Đánh giá dịch vụ ký gửi',
      value: rating ? `${rating} ★` : 'Chưa có đánh giá',
      icon: 'star',
      iconBg: 'bg-[#E8F5E9]',
      iconColor: 'text-[#006B2C]',
    },
  ];

  const renderStatusRow = (row) => {
    const count = toCount(stockByStatus?.[row.code]);
    const pct = totalStock > 0 ? Math.round((count / totalStock) * 100) : 0;
    return (
      <div
        key={row.code}
        className="flex items-center justify-between gap-3 text-xs"
        data-testid={`stock-status-${row.code}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }}></span>
          <span className="font-semibold text-[#191C19] truncate">{row.label}</span>
        </span>
        <span className="font-bold text-[#191C19] whitespace-nowrap">
          {count.toLocaleString('vi-VN')} món <span className="font-medium text-[#717971]">({pct}%)</span>
        </span>
      </div>
    );
  };

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-center space-y-2">
        <p className="text-xs font-semibold text-[#B91C1C]">{error}</p>
        <button
          type="button"
          onClick={load}
          className="px-3 py-1.5 rounded-lg bg-[#006B2C] text-white text-xs font-semibold"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 4 thẻ chỉ số vận hành kho */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <div
            key={card.title}
            className="chart-fade-up bg-white p-5 rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between hover:border-[#006B2C]/40 transition-all duration-200"
            style={{ '--i': idx }}
          >
            <div>
              <p className="text-xs font-medium text-[#717971]">{card.title}</p>
              <p className={`text-2xl font-extrabold mt-1 font-heading tracking-tight ${card.valueClass || 'text-[#191C19]'}`}>
                {loading ? '...' : card.value}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-2xl ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0 shadow-inner`}
            >
              <span className="material-symbols-outlined text-2xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tồn kho theo trạng thái: biểu đồ tròn + danh sách (màu chấm trùng màu lát) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#E2E8E0] shadow-xs space-y-4">
          <div className="border-b border-[#E2E8E0] pb-3">
            <h3 className="text-base font-bold text-[#191C19] font-heading">Hàng ký gửi theo trạng thái</h3>
            <p className="text-xs text-[#717971] mt-0.5">
              Tổng <strong className="text-[#191C19]">{loading ? '...' : totalStock.toLocaleString('vi-VN')}</strong> món đang được ký gửi
            </p>
          </div>

          {loading ? (
            <div className="p-8 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] text-center flex flex-col items-center justify-center gap-3 text-xs text-[#717971]">
              <Spinner size="lg" />
              <span>Đang tải hàng ký gửi theo trạng thái...</span>
            </div>
          ) : !stockByStatus ? (
            <div className="p-8 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] text-center text-xs text-[#717971]">
              Máy chủ chưa trả số liệu hàng ký gửi theo trạng thái.
            </div>
          ) : totalStock === 0 ? (
            <div className="p-8 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-[#E0F2F1] text-[#00685F] flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-2xl">inventory_2</span>
              </div>
              <h4 className="text-xs font-bold text-[#191C19]">Hiện chưa có sản phẩm ký gửi</h4>
              <p className="text-[11px] text-[#717971] mt-0.5">Số liệu sẽ cập nhật khi có sản phẩm được tiếp nhận.</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <AdminDonutChart
                className="w-48 h-48"
                segments={donutSegments}
                centerValue={totalStock.toLocaleString('vi-VN')}
                centerLabel="món ký gửi"
                ariaLabel="Biểu đồ hàng ký gửi theo trạng thái"
              />

              <div className="flex-1 w-full space-y-4">
                {groups.map((group) => (
                  <div key={group.key} className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold text-[#191C19]">{group.title}</p>
                      <span className="text-xs font-extrabold text-[#006B2C] whitespace-nowrap">
                        {group.subtotal.toLocaleString('vi-VN')} món
                      </span>
                    </div>
                    <div className="space-y-2.5">{group.rows.map(renderStatusRow)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tồn kho theo kỳ ký gửi */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-[#E2E8E0] shadow-xs space-y-4">
          <div className="border-b border-[#E2E8E0] pb-3">
            <h3 className="text-base font-bold text-[#191C19] font-heading">Hàng ký gửi theo kỳ</h3>
            <p className="text-xs text-[#717971] mt-0.5">Số món đang ký gửi theo kỳ hiện tại của sản phẩm</p>
          </div>

          {loading ? (
            <div className="p-8 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] text-center flex flex-col items-center justify-center gap-3 text-xs text-[#717971]">
              <Spinner size="lg" />
              <span>Đang tải hàng ký gửi theo kỳ...</span>
            </div>
          ) : termTotal === 0 ? (
            <div className="p-8 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] text-center text-xs text-[#717971]">
              Chưa có sản phẩm tồn thuộc các kỳ ký gửi.
            </div>
          ) : (
            <div className="space-y-3">
              <TermColumns terms={termStocks} />
              <div className="grid grid-cols-3 gap-2">
                {termStocks.map((t) => (
                  <div key={t.label} className="rounded-lg bg-[#F8FAF8] border border-[#E2E8E0] px-2 py-2 text-center">
                    <p className="text-[11px] font-semibold text-[#414942]">
                      {t.label}: {t.count} món
                    </p>
                    <p className="text-[10px] text-[#717971]">{Math.round((t.count / termTotal) * 100)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
