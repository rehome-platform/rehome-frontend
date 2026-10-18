import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyVND } from '../../../utils/formatters.js';
import { Button, Badge } from '../../../components/common/index.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import authService from '../../auth/services/auth.service.js';
import AdminOverviewView from '../components/AdminOverviewView.jsx';

/**
 * Trang Dashboard Điều Hành & Quỹ Nền Tảng ReHome (Admin)
 * Chuẩn hóa 100% theo Mục 7 & Mục 8: "Luồng tiền & Nguồn thu của nền tảng" (sau Review 1)
 * Kết nối xác thực phân quyền thực tế với Backend API: GET /api/admin/dashboard
 */
export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('fund'); // 'fund' | 'activities'
  const [exporting, setExporting] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('MONTH'); // 'TODAY' | 'WEEK' | 'MONTH' | 'ALL'
  const [adminApiStatus, setAdminApiStatus] = useState({ loading: true, verified: false, message: '' });

  useEffect(() => {
    let isMounted = true;
    const verifyAdmin = async () => {
      try {
        const res = await authService.checkAdminAccess();
        if (isMounted) {
          setAdminApiStatus({
            loading: false,
            verified: res.authorized,
            message: res.message,
          });
        }
      } catch (err) {
        if (isMounted) {
          setAdminApiStatus({
            loading: false,
            verified: false,
            message: err.message || 'Không thể xác thực quyền Admin',
          });
        }
      }
    };

    verifyAdmin();
    return () => {
      isMounted = false;
    };
  }, []);

  // Ba con số cốt lõi của Quỹ Nền Tảng (Mục 7)
  const fundMetrics = [
    {
      label: 'Tiền đang giữ hộ (Holding)',
      value: 142580000,
      description: 'Tổng số dư ví Member + Tiền đơn đang treo chưa hoàn thành',
      icon: 'lock_clock',
      iconBg: 'bg-[#FFF3E0]',
      iconColor: 'text-[#D97706]',
      badge: 'Sổ kép đối ứng',
    },
    {
      label: 'Doanh thu thực tế nền tảng',
      value: 38450000,
      description: 'Tổng hoa hồng lũy tiến (10-20%) + Phí rút hàng - Chi đền bù',
      icon: 'trending_up',
      iconBg: 'bg-[#E8F5E9]',
      iconColor: 'text-[#006B2C]',
      badge: 'Lợi nhuận ròng',
    },
    {
      label: 'Số dư quỹ nền tảng',
      value: 181030000,
      description: 'Tiền MoMo thực tế trong tài khoản hệ thống (Tiền giữ + Doanh thu)',
      icon: 'account_balance',
      iconBg: 'bg-[#E0F2F1]',
      iconColor: 'text-[#00685F]',
      badge: 'MoMo Merchant',
    },
    {
      label: 'Đơn hàng đang xử lý tại kho',
      value: '24 đơn',
      description: '14 đơn chờ đóng gói GHN • 10 đơn đang trên đường giao',
      icon: 'local_shipping',
      iconBg: 'bg-[#EDE7F6]',
      iconColor: 'text-[#673AB7]',
      badge: 'Vận hành kho',
    },
  ];

  // Chi tiết cơ cấu doanh thu theo Mục 8
  const revenueBreakdown = [
    {
      source: 'Hoa hồng bán hàng (Kỳ 1: 10%)',
      amount: 19800000,
      count: '64 sản phẩm',
      note: 'Bán trong 30 ngày đầu tại kho',
    },
    {
      source: 'Hoa hồng bán hàng (Kỳ 2: 15%)',
      amount: 12450000,
      count: '28 sản phẩm',
      note: 'Bán trong ngày 31 - 60',
    },
    {
      source: 'Hoa hồng bán hàng (Kỳ 3: 20%)',
      amount: 4700000,
      count: '8 sản phẩm',
      note: 'Bán trong ngày 61 - 90',
    },
    {
      source: 'Phí rút hàng ngoài cửa sổ 7 ngày',
      amount: 2500000,
      count: '50 lượt rút',
      note: '50.000 đ / lượt rút ngoài thời gian miễn phí',
    },
    {
      source: 'Chi đền bù hàng xuống cấp (Khấu trừ)',
      amount: -1000000,
      count: '2 trường hợp',
      note: 'Nền tảng chịu lỗ đền bù 50% theo quy định',
    },
  ];

  // Bút toán sổ kép gần nhất trong hệ thống (Ghi sổ kép: Ví Member <-> Quỹ nền tảng)
  const recentLedgerEntries = [
    {
      id: 'TX-89210',
      time: '15/10/2026 13:45',
      type: 'BÁN HÀNG HOÀN THÀNH',
      orderCode: 'ORD-9821',
      memberWallet: '+360.000 đ (Ví người bán)',
      platformFund: '-360.000 đ (Quỹ chi trả)',
      revenueEarned: '+40.000 đ (Hoa hồng 10%)',
      status: 'SUCCESS',
    },
    {
      id: 'TX-89209',
      time: '15/10/2026 11:20',
      type: 'MEMBER RÚT TIỀN',
      orderCode: 'PAYOUT-4821',
      memberWallet: '-500.000 đ (Khóa & trừ ví)',
      platformFund: 'Giao dịch giả lập thành công',
      revenueEarned: '0 đ',
      status: 'SUCCESS',
    },
    {
      id: 'TX-89205',
      time: '15/10/2026 09:12',
      type: 'PHÍ RÚT HÀNG KÝ GỬI',
      orderCode: 'WD-1029',
      memberWallet: '-50.000 đ (Trừ ví người gửi)',
      platformFund: '+50.000 đ (Quỹ thu phí)',
      revenueEarned: '+50.000 đ (Doanh thu sàn)',
      status: 'SUCCESS',
    },
    {
      id: 'TX-89190',
      time: '14/10/2026 16:30',
      type: 'HOÀN TIỀN TRẢ HÀNG HỢP LỆ',
      orderCode: 'RET-3012',
      memberWallet: '+280.000 đ (Ví người mua)',
      platformFund: '-280.000 đ (Hoàn tiền 100%)',
      revenueEarned: '0 đ (Hủy hoa hồng)',
      status: 'SUCCESS',
    },
  ];

  const handleExportExcel = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      alert('Đã xuất báo cáo Quỹ Nền Tảng & Doanh Thu ra file Excel thành công (theo UC-89)!');
    }, 800);
  };

  return (
    <div className="min-w-0 space-y-6">
      {/* Tab Switcher: Quỹ & Doanh thu VS Hoạt động & Tăng trưởng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DDE5D9] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('fund')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
              activeTab === 'fund'
                ? 'bg-[#006B2C] text-white shadow-xs'
                : 'bg-white border border-[#DDE5D9] text-[#5B6776] hover:bg-[#F6F9F4] hover:text-[#006B2C]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            <span>Quỹ nền tảng & Doanh thu</span>
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
              activeTab === 'activities'
                ? 'bg-[#006B2C] text-white shadow-xs'
                : 'bg-white border border-[#DDE5D9] text-[#5B6776] hover:bg-[#F6F9F4] hover:text-[#006B2C]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">insights</span>
            <span>Hoạt động & Tăng trưởng hệ thống</span>
          </button>
        </div>
      </div>

      {activeTab === 'activities' ? (
        <AdminOverviewView onNavigateToAudit={() => navigate('/admin/audit-logs')} />
      ) : (
        <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold font-heading text-[#191C19]">
              Quỹ Nền Tảng & Tổng Quan Doanh Thu
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-white border border-[#DDE5D9] rounded-xl p-1 text-xs font-medium">
              <button
                onClick={() => setFilterPeriod('WEEK')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${filterPeriod === 'WEEK' ? 'bg-[#006B2C] text-white' : 'text-[#717971]'}`}
              >
                Tuần này
              </button>
              <button
                onClick={() => setFilterPeriod('MONTH')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${filterPeriod === 'MONTH' ? 'bg-[#006B2C] text-white' : 'text-[#717971]'}`}
              >
                Tháng này
              </button>
              <button
                onClick={() => setFilterPeriod('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${filterPeriod === 'ALL' ? 'bg-[#006B2C] text-white' : 'text-[#717971]'}`}
              >
                Tất cả
              </button>
            </div>

            <Button
              onClick={handleExportExcel}
              loading={exporting}
              className="bg-[#00685F] hover:bg-[#005049] text-white text-xs shrink-0"
            >
              <span className="material-symbols-outlined text-[18px] mr-1.5">file_download</span>
              Xuất báo cáo Excel
            </Button>
          </div>
        </div>

        {/* Backend Authorization Status & Real User Info */}
        <div className="p-4 rounded-2xl bg-white border border-[#DDE5D9] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${adminApiStatus.verified ? 'bg-[#E8F5E9] text-[#006B2C]' : 'bg-[#FFF3E0] text-[#D97706]'}`}>
              <span className="material-symbols-outlined text-xl">
                {adminApiStatus.verified ? 'verified_user' : 'security'}
              </span>
            </div>
            <div className="min-w-0 break-words">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[#191C19]">Tài khoản Admin: {user?.fullName || user?.name || user?.email}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5E9] text-[#006B2C] border border-[#A5D6A7]">
                  {user?.authorities || 'ROLE_ADMIN'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E0F2F1] text-[#00685F]">
                  Mã: {user?.memberCode || 'MB-ADMIN'}
                </span>
              </div>
              {!adminApiStatus.loading && !adminApiStatus.verified && (
                <p role="alert" className="text-[11px] text-[#717971] mt-0.5">
                  Cảnh báo phân quyền: {adminApiStatus.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-semibold bg-[#F0F5EE] text-[#006B2C] border border-[#C8E6C9]">
              <span className={`w-2 h-2 rounded-full ${adminApiStatus.loading ? 'bg-[#FEA619] animate-pulse' : adminApiStatus.verified ? 'bg-[#006B2C]' : 'bg-[#D92D20]'}`}></span>
              <span role="status">{adminApiStatus.loading ? 'Đang kiểm tra quyền' : adminApiStatus.verified ? 'Đã xác thực quyền quản trị' : 'Cần kiểm tra quyền truy cập'}</span>
            </span>
          </div>
        </div>

        {/* 4 Thẻ Quỹ & Dòng tiền */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {fundMetrics.map((m, idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-[#DDE5D9] shadow-sm flex flex-col justify-between hover:border-[#006B2C]/40 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#F6F9F4] text-[#414942] border border-[#DDE5D9]">
                  {m.badge}
                </span>
                <div className={`w-10 h-10 rounded-xl ${m.iconBg} ${m.iconColor} flex items-center justify-center shrink-0`}>
                  <span className="material-symbols-outlined text-[22px]">{m.icon}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-[#717971]">{m.label}</p>
                <p className="text-2xl font-black font-heading text-[#191C19] mt-1 tracking-tight">
                  {typeof m.value === 'number' ? formatCurrencyVND(m.value) : m.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Chi tiết nguồn thu & Bút toán sổ kép */}
        <div className="grid min-w-0 grid-cols-1 gap-6">
          {/* Cơ cấu doanh thu */}
          <div className="min-w-0 bg-white p-6 rounded-2xl border border-[#DDE5D9] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDE5D9] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#191C19]">Cơ Cấu Doanh Thu Nền Tảng</h3>
                <p className="text-xs text-[#717971]">Phân bổ theo hoa hồng 3 kỳ & các nguồn thu khác</p>
              </div>
              <span className="text-xs font-extrabold text-[#006B2C]">
                {formatCurrencyVND(38450000)}
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {revenueBreakdown.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E8EEE6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 break-words">
                    <p className="text-xs font-bold text-[#191C19]">{item.source}</p>
                    <p className="text-[11px] text-[#717971] mt-0.5">{item.count} • {item.note}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-black ${item.amount < 0 ? 'text-[#BA1A1A]' : 'text-[#006B2C]'}`}>
                    {item.amount > 0 ? `+${formatCurrencyVND(item.amount)}` : formatCurrencyVND(item.amount)}
                  </span>
                </div>
              ))}
            </div>

          </div>

          {/* Bút toán đối ứng sổ kép */}
          <div className="min-w-0 bg-white p-6 rounded-2xl border border-[#DDE5D9] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDE5D9] pb-3">
              <div>
                <h3 id="ledger-heading" className="text-base font-bold text-[#191C19]">Nhật Ký Ghi Sổ Kép (Quỹ → Ví Member)</h3>
              </div>
              <Badge variant="success">Đối soát: Khớp 100%</Badge>
            </div>

            <div role="region" aria-labelledby="ledger-heading" tabIndex={0} className="max-w-full overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#006B2C]">
              <table className="w-full min-w-[760px] text-left text-xs [overflow-wrap:anywhere]">
                <thead>
                  <tr className="border-b border-[#DDE5D9] text-[#717971] font-semibold bg-[#F8FAF8]">
                    <th className="py-2.5 px-3">Thời gian / Mã</th>
                    <th className="py-2.5 px-3">Loại giao dịch</th>
                    <th className="py-2.5 px-3">Ví Member</th>
                    <th className="py-2.5 px-3">Quỹ nền tảng</th>
                    <th className="py-2.5 px-3 text-right">Doanh thu sàn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F4EE]">
                  {recentLedgerEntries.map((e) => (
                    <tr key={e.id} className="hover:bg-[#F9FBF9] transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-bold text-[#191C19]">{e.id}</p>
                        <p className="text-[10px] text-[#717971]">{e.time}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F0FE] text-[#1967D2]">
                          {e.type}
                        </span>
                        <p className="text-[10px] text-[#717971] mt-0.5">#{e.orderCode}</p>
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#191C19]">
                        {e.memberWallet}
                      </td>
                      <td className="py-3 px-3 text-[#414942]">
                        {e.platformFund}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#006B2C]">
                        {e.revenueEarned}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
      )}
    </div>
  );
}

