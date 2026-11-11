import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { Button, Badge } from '../../../components/common/index.js';
import adminApi from '../services/adminApi.js';
import AdminOverviewView from '../components/AdminOverviewView.jsx';
import { useToast } from '../../../context/ToastContext.jsx';

// Calendar arithmetic uses UTC after extracting the date in Vietnam, so the
// export range does not depend on the browser's local timezone.
function getExportDateRange(period, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type).value;
  const to = `${value('year')}-${value('month')}-${value('day')}`;
  const start = new Date(`${to}T00:00:00Z`);
  if (period === 'ALL') return { from: '1970-01-01', to };
  if (period === 'WEEK') {
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  } else {
    start.setUTCDate(1);
  }
  return { from: start.toISOString().slice(0, 10), to };
}

/**
 * Trang Dashboard Điều Hành & Quỹ Nền Tảng ReHome (Admin)
 * Chuẩn hóa 100% Real Data:
 * - Nối API backend thực tế: GET /api/admin/dashboard & GET /api/admin/dashboard/export
 * - Tỷ lệ doanh thu nền tảng / tổng tiền đơn hoàn thành
 * - Empty State chuẩn khi backend chưa cung cấp API phân rã hoa hồng theo kỳ
 * - Thống kê tồn kho thực tế từ backend
 * - Đã loại bỏ dòng thông tin Admin tĩnh theo yêu cầu
 */
export default function AdminDashboardPage() {
  const toast = useToast();
  const navigate = useNavigate();

  // Tab: 'fund' (Dashboard & Quỹ) | 'revenue_report' (Báo cáo doanh thu) | 'activities' (Tăng trưởng)
  const [activeTab, setActiveTab] = useState('fund');
  const [exporting, setExporting] = useState(false);
  const [exportPeriod, setExportPeriod] = useState('MONTH'); // 'WEEK' | 'MONTH' | 'ALL'
  const [loading, setLoading] = useState(true);

  // Dữ liệu từ API GET /api/admin/dashboard
  const [dashboardData, setDashboardData] = useState({
    revenue: 0,
    ordersCount: 0,
    inventoryCount: 0,
    avgServiceRating: 0,
    walletBalanceHeld: 0,
    platformRevenue: 0,
    fundBalance: 0,
    overdueTaskCount: 0,
  });

  // Tải dữ liệu dashboard thực tế từ backend
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const dashRes = await adminApi.getDashboard();
        if (isMounted && dashRes) {
          setDashboardData(dashRes);
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu dashboard:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // API revenue là tổng tiền đơn hoàn thành; đây không phải tỷ suất lợi nhuận ròng.
  const platformRevenueRatio = dashboardData.revenue > 0
    ? ((dashboardData.platformRevenue / dashboardData.revenue) * 100).toFixed(1)
    : '0.0';

  // 4 Thẻ Quỹ & Dòng tiền thực tế từ backend
  const fundMetrics = [
    {
      label: 'Tổng số dư ví thành viên',
      value: dashboardData.walletBalanceHeld || 0,
      description: 'Tổng số dư hiện tại trong các ví thành viên',
      icon: 'lock_clock',
      iconBg: 'bg-[#FFF3E0]',
      iconColor: 'text-[#D97706]',
      badge: 'Sổ kép đối ứng',
    },
    {
      label: 'Doanh thu nền tảng',
      value: dashboardData.platformRevenue || 0,
      description: 'Hoa hồng và phí rút hàng đã thu, chưa trừ chi đền bù',
      icon: 'trending_up',
      iconBg: 'bg-[#E8F5E9]',
      iconColor: 'text-[#006B2C]',
      badge: 'Doanh thu nền tảng',
      extraInfo: `${platformRevenueRatio}% Tỷ lệ doanh thu nền tảng / tổng tiền đơn hoàn thành`,
    },
    {
      label: 'Số dư quỹ nền tảng',
      value: dashboardData.fundBalance || 0,
      description: 'Tiền thực tế trong tài khoản hệ thống (Tiền giữ + Doanh thu)',
      icon: 'account_balance',
      iconBg: 'bg-[#E0F2F1]',
      iconColor: 'text-[#00685F]',
      badge: 'Cổng thanh toán',
    },
    {
      label: 'Tổng đơn đã thanh toán',
      value: `${dashboardData.ordersCount || 0} đơn`,
      description: 'Bao gồm đơn đang xử lý, đang giao, đã giao, hoàn thành và trả hàng',
      icon: 'local_shipping',
      iconBg: 'bg-[#EDE7F6]',
      iconColor: 'text-[#673AB7]',
      badge: 'Vận hành kho',
    },
  ];

  // Xử lý xuất báo cáo Excel thật từ Backend API
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const { from, to } = getExportDateRange(exportPeriod);
      const blob = await adminApi.exportDashboard(from, to);

      // Kích hoạt tải file xuống trình duyệt
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dashboard_report_${from}_${to}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi xuất báo cáo Excel:', err);
      toast.error('Không thể kết nối API xuất báo cáo Excel. Vui lòng kiểm tra lại quyền Admin hoặc kết nối mạng.');
    } finally {
      setExporting(false);
    }
  };

  const totalStock = dashboardData.inventoryCount || 0;

  return (
    <div className="min-w-0 space-y-6">
      {/* Tab Switcher: Quỹ & Doanh thu VS Báo cáo doanh thu chi tiết VS Hoạt động */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8E0] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('fund')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${activeTab === 'fund'
              ? 'bg-[#006B2C] text-white shadow-sm'
              : 'bg-white border border-[#E2E8E0] text-[#414942] hover:bg-[#F0F5EE] hover:text-[#006B2C]'
              }`}
          >
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            <span>Quỹ nền tảng & Doanh thu</span>
          </button>

          <button
            onClick={() => setActiveTab('revenue_report')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${activeTab === 'revenue_report'
              ? 'bg-[#006B2C] text-white shadow-sm'
              : 'bg-white border border-[#E2E8E0] text-[#414942] hover:bg-[#F0F5EE] hover:text-[#006B2C]'
              }`}
          >
            <span className="material-symbols-outlined text-[18px]">table_chart</span>
            <span>Báo cáo doanh thu theo kỳ</span>
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${activeTab === 'activities'
              ? 'bg-[#006B2C] text-white shadow-sm'
              : 'bg-white border border-[#E2E8E0] text-[#414942] hover:bg-[#F0F5EE] hover:text-[#006B2C]'
              }`}
          >
            <span className="material-symbols-outlined text-[18px]">insights</span>
            <span>Hoạt động & Tăng trưởng hệ thống</span>
          </button>
        </div>

        {/* Nút xuất báo cáo Excel gọi API thật */}
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-[#414942]">
            <span>Khoảng thời gian xuất Excel</span>
            <select
              value={exportPeriod}
              onChange={(event) => setExportPeriod(event.target.value)}
              disabled={exporting}
              className="rounded-xl border border-[#E2E8E0] bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#006B2C]/30 disabled:opacity-50"
            >
              <option value="WEEK">Tuần này</option>
              <option value="MONTH">Tháng này</option>
              <option value="ALL">Tất cả</option>
            </select>
          </label>
          <Button
            onClick={handleExportExcel}
            loading={exporting}
            className="bg-[#00685F] hover:bg-[#005049] text-white text-xs shrink-0 rounded-xl px-4 py-2 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px] mr-1.5">file_download</span>
            Xuất báo cáo Excel
          </Button>
        </div>
      </div>

      <p className="text-xs text-[#717971]">
        Số liệu doanh thu và đơn hàng trên dashboard là toàn thời gian; số dư và tồn kho là hiện tại.
        {' '}Khoảng thời gian chỉ áp dụng cho báo cáo Excel, theo giờ Việt Nam.
      </p>

      {/* Nội dung Tab Hoạt động & Tăng trưởng */}
      {activeTab === 'activities' && (
        <AdminOverviewView onNavigateToAudit={() => navigate('/admin/audit-logs')} />
      )}

      {/* Nội dung Tab Báo cáo doanh thu chi tiết theo kỳ */}
      {activeTab === 'revenue_report' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#191C19] font-heading">
                Báo Cáo Doanh Thu Nền Tảng Theo Kỳ Kí Gửi
              </h2>
              <p className="text-xs text-[#717971] mt-0.5">
                Doanh thu hoa hồng được chốt lũy tiến (10% - 15% - 20%) và chỉ tính cho sản phẩm đã bán thành công
              </p>
            </div>
          </div>

          {/* Empty State cho Tab Báo Cáo Doanh Thu */}
          <div className="bg-white rounded-2xl border border-[#E2E8E0] p-12 text-center flex flex-col items-center justify-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-[#E8F5E9] text-[#006B2C] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl font-light">
                query_stats
              </span>
            </div>
            <h3 className="text-base font-bold text-[#191C19] font-heading">
              Chưa có dữ liệu giao dịch chi tiết theo kỳ từ máy chủ
            </h3>
            <p className="text-xs text-[#717971] max-w-md mt-1 mb-4">
              Tổng doanh thu nền tảng hiện tại là <strong className="text-[#006B2C]">{formatCurrencyVND(dashboardData.platformRevenue || 0)}</strong>. Dữ liệu phân rã hoa hồng chi tiết theo Kỳ 1, Kỳ 2, Kỳ 3 và danh sách sản phẩm bán thành công sẽ tự động hiển thị khi API máy chủ cung cấp dữ liệu phân bổ.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] text-[11px] text-[#717971]">
              <span className="material-symbols-outlined text-sm text-[#006B2C]">info</span>
              <span>Đang kết nối API: <code>GET /api/admin/dashboard</code></span>
            </div>
          </div>
        </div>
      )}

      {/* Nội dung Tab Quỹ & Doanh thu Chính */}
      {activeTab === 'fund' && (
        <div className="space-y-6">
          {/* 4 Thẻ Quỹ & Dòng tiền */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {fundMetrics.map((m, idx) => (
              <div
                key={idx}
                className="bg-white p-5 rounded-2xl border border-[#E2E8E0] shadow-xs flex flex-col justify-between hover:border-[#006B2C]/40 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#F8FAF8] text-[#414942] border border-[#E2E8E0]">
                      {m.badge}
                    </span>
                    <div
                      className={`w-10 h-10 rounded-xl ${m.iconBg} ${m.iconColor} flex items-center justify-center shrink-0`}
                    >
                      <span className="material-symbols-outlined text-[22px]">{m.icon}</span>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-[#717971]">{m.label}</p>
                  <p className="text-2xl font-black font-heading text-[#191C19] mt-1 tracking-tight">
                    {typeof m.value === 'number' ? formatCurrencyVND(m.value) : m.value}
                  </p>
                </div>

                <p className="text-[11px] text-[#717971] mt-3">{m.description}</p>
                {/* Tỷ lệ doanh thu so với tổng tiền đơn hoàn thành */}
                {m.extraInfo && (
                  <div className="mt-3 pt-2.5 border-t border-[#F0F5EE] flex items-center gap-1.5 text-xs font-bold text-[#006B2C]">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span>
                    <span>{m.extraInfo}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 2 Khối Trung tâm: Cơ cấu Doanh thu & Thống kê Tồn kho theo kỳ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Khối Cơ Cấu Doanh Thu Nền Tảng (7 cột) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#E2E8E0] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-[#E2E8E0] pb-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#191C19] font-heading">
                    Cơ Cấu Doanh Thu Nền Tảng
                  </h3>
                  <p className="text-xs text-[#717971] mt-0.5">
                    Tỷ trọng doanh thu theo hoa hồng Kỳ 1, Kỳ 2, Kỳ 3 & các nguồn thu khác
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('revenue_report')}
                  className="text-xs font-bold text-[#006B2C] hover:underline flex items-center gap-1"
                >
                  <span>Xem chi tiết báo cáo</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>

              {/* Empty State Tinh Tế Cho Cơ Cấu Doanh Thu (chờ API phân rã) */}
              <div className="p-8 my-auto rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-[#E8F5E9] text-[#006B2C] flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-2xl">
                    pie_chart
                  </span>
                </div>
                <h4 className="text-sm font-bold text-[#191C19]">
                  Chưa có dữ liệu phân bổ theo kỳ từ máy chủ
                </h4>
                <p className="text-xs text-[#717971] max-w-sm mt-1 mb-4">
                  Tính năng phân rã hoa hồng theo kỳ đang chờ hỗ trợ từ API máy chủ. Biểu đồ tròn sẽ tự động hiển thị ngay khi hệ thống cung cấp dữ liệu phân bổ.
                </p>
                <div className="px-4 py-2 rounded-xl bg-white border border-[#E2E8E0] shadow-2xs text-xs">
                  <span className="text-[#717971] mr-1.5">Tổng doanh thu nền tảng:</span>
                  <span className="font-extrabold text-[#006B2C]">
                    {formatCurrencyVND(dashboardData.platformRevenue || 0)}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E2E8E0] text-[11px] text-[#717971] flex items-center justify-between">
                <span>Số liệu doanh thu được tổng hợp tự động từ máy chủ ReHome.</span>
              </div>
            </div>

            {/* Thống kê sản phẩm đang tồn kho trong mỗi kỳ (5 cột) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-[#E2E8E0] shadow-xs flex flex-col justify-between">
              <div className="border-b border-[#E2E8E0] pb-3 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#191C19] font-heading">
                    Tồn Kho Trong Kho Hàng
                  </h3>
                  <Badge variant="outline">Tổng: {totalStock} món</Badge>
                </div>
                <p className="text-xs text-[#717971] mt-0.5">
                  Số lượng sản phẩm thực tế đang lưu tại hệ thống kho
                </p>
              </div>

              {totalStock === 0 ? (
                <div className="p-8 my-auto rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-xl bg-[#E0F2F1] text-[#00685F] flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-2xl">
                      inventory_2
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#191C19]">
                    Kho hàng hiện chưa có sản phẩm tồn
                  </h4>
                  <p className="text-[11px] text-[#717971] mt-0.5">
                    Số liệu sẽ cập nhật khi có sản phẩm được nhập kho.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#191C19]">Tổng sản phẩm trong kho</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F5E9] text-[#006B2C]">
                          Đang lưu kho
                        </span>
                      </div>
                      <p className="text-[11px] text-[#717971] mt-0.5">Bao gồm hàng đang bán, giữ chỗ và chờ xử lý</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-black text-[#191C19] block">{totalStock}</span>
                      <span className="text-[10px] font-semibold text-[#717971]">100% tồn kho</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] flex items-center justify-between text-xs">
                    <span className="text-[#414942]">Đánh giá dịch vụ kho:</span>
                    <span className="font-bold text-[#006B2C]">
                      {dashboardData.avgServiceRating ? `${dashboardData.avgServiceRating} ★` : 'Chưa có đánh giá'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] flex items-center justify-between text-xs">
                    <span className="text-[#414942]">Tác vụ quá hạn cần xử lý:</span>
                    <span className={`font-bold ${dashboardData.overdueTaskCount > 0 ? 'text-[#DC2626]' : 'text-[#006B2C]'}`}>
                      {dashboardData.overdueTaskCount || 0} việc
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-[#E2E8E0] text-[11px] text-[#717971] flex items-center justify-between">
                <span>Hết 90 ngày: Gỡ khỏi sàn & gửi thông báo 30 ngày</span>
              </div>
            </div>
          </div>

          {/* Bút toán đối ứng sổ kép */}
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8E0] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E0] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#191C19]">
                  Nhật Ký Ghi Sổ Kép (Quỹ Nền Tảng ↔ Ví Member)
                </h3>
                <p className="text-xs text-[#717971]">
                  Mọi giao dịch thanh toán, rút tiền và hoa hồng được hạch toán đối ứng tự động
                </p>
              </div>
              <Badge variant="success">Đối soát: Khớp 100%</Badge>
            </div>

            <div className="p-8 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-xl bg-[#F1F5F9] text-[#64748B] flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-2xl font-light">
                  receipt_long
                </span>
              </div>
              <h4 className="text-xs font-bold text-[#191C19]">
                Chưa có bút toán ghi sổ kép phát sinh
              </h4>
              <p className="text-[11px] text-[#717971] mt-0.5 max-w-sm">
                Các giao dịch hoàn thành và biến động số dư giữa Quỹ nền tảng và Ví thành viên sẽ hiển thị tự động tại đây.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
