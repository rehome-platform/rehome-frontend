import React, { useState, useEffect } from 'react';
import adminApi from '../services/adminApi';
import AdminAccountGrowthChart from './AdminAccountGrowthChart.jsx';
import AdminDonutChart from './AdminDonutChart.jsx';
import { getRoleLabel, getRoleBadgeStyle } from '../../../constants/roleLabels.js';
import { formatAuditActionLabel, formatAuditTargetTypeLabel } from '../../../constants/auditLogLabels.js';
import { DASHBOARD_TONES, DASHBOARD_CARD_CLASS } from '../../../constants/dashboardTheme.js';

/**
 * View Tổng quan Dashboard Quản trị ReHome
 * Kết nối Real Data với backend Spring Boot:
 * - Thống kê số lượng thực tế: Member, Tổ chức, Moderator (số điểm kho nằm ở tab Kho)
 * - Biểu đồ tăng trưởng tài khoản từ GET /api/admin/accounts/growth
 * - Biểu đồ tròn Donut động theo tỷ lệ thực tế
 * - Bảng "Hoạt động gần đây" kết nối trực tiếp với Nhật ký kiểm soát (Audit Log - API 149)
 */
export default function AdminOverviewView({ onNavigateToAudit }) {
  const [isLoading, setIsLoading] = useState(true);

  // Thống kê thực tế
  const [stats, setStats] = useState({
    memberCount: 0,
    orgCount: 0,
    moderatorCount: 0,
    totalAccounts: 0,
  });

  const [recentActivities, setRecentActivities] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    try {
      setIsLoading(true);
      setLoadError('');

      const [membersRes, orgsRes, modsRes, auditRes] = await Promise.allSettled([
        adminApi.getAccounts({ role: 'MEMBER', size: 1 }),
        adminApi.getAccounts({ role: 'ORGANIZATION', size: 1 }),
        adminApi.getModerators({ size: 1 }),
        adminApi.getAuditLogs({ size: 6 }),
      ]);

      const failedCount = [membersRes, orgsRes, modsRes, auditRes].filter(
        (r) => r.status === 'rejected'
      ).length;
      if (failedCount > 0) {
        setLoadError('Không thể tải đầy đủ dữ liệu tổng quan từ máy chủ. Vui lòng thử lại.');
      }

      const memberCount = membersRes.status === 'fulfilled' ? (membersRes.value?.totalElements ?? (Array.isArray(membersRes.value) ? membersRes.value.length : 0)) : 0;
      const orgCount = orgsRes.status === 'fulfilled' ? (orgsRes.value?.totalElements ?? (Array.isArray(orgsRes.value) ? orgsRes.value.length : 0)) : 0;
      const moderatorCount = modsRes.status === 'fulfilled' ? (modsRes.value?.totalElements ?? (Array.isArray(modsRes.value) ? modsRes.value.length : 0)) : 0;

      const totalAccounts = memberCount + orgCount + moderatorCount;

      setStats({
        memberCount,
        orgCount,
        moderatorCount,
        totalAccounts,
      });

      if (auditRes.status === 'fulfilled' && auditRes.value) {
        const logs = Array.isArray(auditRes.value) ? auditRes.value : auditRes.value?.content || [];
        setRecentActivities(logs);
      }
    } catch (err) {
      console.error('Lỗi khi nạp dữ liệu Tổng quan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Tổng số thành viên',
      value: stats.memberCount.toLocaleString('vi-VN'),
      icon: 'group',
      iconBox: DASHBOARD_TONES.primary.iconBox,
    },
    {
      title: 'Tổ chức đối tác',
      value: stats.orgCount.toLocaleString('vi-VN'),
      icon: 'verified',
      iconBox: DASHBOARD_TONES.accent.iconBox,
    },
    {
      title: 'Nhân viên điểm kí gửi',
      value: stats.moderatorCount.toLocaleString('vi-VN'),
      icon: 'badge',
      iconBox: DASHBOARD_TONES.warning.iconBox,
    },
  ];

  // Các lát của biểu đồ tròn "Tài khoản theo vai trò"
  const roleSegments = [
    { key: 'member', label: 'Thành viên', value: stats.memberCount, color: '#006B2C' },
    { key: 'organization', label: 'Tổ chức', value: stats.orgCount, color: '#FEA619' },
    { key: 'moderator', label: 'Nhân viên', value: stats.moderatorCount, color: '#00685F' },
  ];
  const totalForPct = Math.max(stats.totalAccounts, 1);

  const getRoleBadge = (role) => ({
    label: getRoleLabel(role),
    color: getRoleBadgeStyle(role),
  });

  return (
    <div className="space-y-6">
      {loadError && (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#B91C1C] flex items-center justify-between gap-3"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={loadOverviewData}
            className="px-3 py-1.5 rounded-lg border border-[#FECACA] bg-white hover:bg-[#FEF2F2] text-xs font-bold text-[#991B1B]"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 3 Thẻ chỉ số tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card, idx) => (
          <div
            key={idx}
            className={`chart-fade-up ${DASHBOARD_CARD_CLASS} p-5 hover:-translate-y-0.5 flex items-center justify-between`}
            style={{ '--i': idx }}
          >
            <div>
              <p className="text-xs font-semibold text-[#5B6776]">{card.title}</p>
              <p className="text-3xl font-extrabold text-[#1F2A37] mt-1 font-heading tracking-tight">
                {isLoading ? '...' : card.value}
              </p>
            </div>
            <div
              className={`w-11 h-11 rounded-xl ${card.iconBox} flex items-center justify-center shrink-0`}
            >
              <span className="material-symbols-outlined text-[22px]">
                {card.icon}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 2 Khối trực quan trung tâm */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Biểu đồ Tài khoản mới theo chu kỳ (7 cột / 12) */}
        <AdminAccountGrowthChart />

        {/* Biểu đồ Tròn Donut: Tài khoản theo vai trò (5 cột / 12) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col">
          <h3 className="text-base font-bold text-[#1F2A37] font-heading">
            Tài khoản theo vai trò
          </h3>

          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-4">
            <AdminDonutChart
              className="w-56 h-56 sm:w-64 sm:h-64"
              segments={roleSegments}
              centerValue={stats.totalAccounts}
              centerLabel="Tổng tài khoản"
              ariaLabel="Biểu đồ tài khoản theo vai trò"
            />

            {/* Chú giải */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
              {roleSegments.map((seg) => (
                <div
                  key={seg.key}
                  className="rounded-xl border border-[#DDE5D9] bg-[#F6F9F4] px-2 py-2.5 text-center"
                >
                  <span className="flex items-center justify-center gap-1.5 text-xs font-medium text-[#5B6776]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }}></span>
                    {seg.label}
                  </span>
                  <span className="block mt-1 text-lg font-extrabold text-[#1F2A37] font-heading leading-none">
                    {seg.value}
                  </span>
                  <span className="block mt-0.5 text-[11px] text-[#5B6776]">
                    {Math.round((seg.value / totalForPct) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bảng Hoạt động gần đây */}
      <div className="bg-white rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-[#DDE5D9] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#1F2A37] font-heading">
              Hoạt động gần đây
            </h3>
          </div>
          <button
            onClick={onNavigateToAudit}
            className="text-xs font-semibold text-[#006B2C] hover:text-[#005523] hover:underline flex items-center gap-1"
          >
            <span>Xem toàn bộ nhật ký</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>

        {isLoading && recentActivities.length === 0 ? (
          <div role="status" className="p-10 text-center text-xs text-[#5B6776]">
            Đang tải hoạt động gần đây...
          </div>
        ) : recentActivities.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#5B6776]">
            Chưa có ghi nhận hoạt động nào gần đây trong hệ thống.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F9F4] text-[#5B6776] tracking-wider font-semibold border-b border-[#DDE5D9]">
                <tr>
                  <th className="py-3 px-6 whitespace-nowrap">Thời gian</th>
                  <th className="py-3 px-6 whitespace-nowrap">Người thực hiện</th>
                  <th className="py-3 px-6 whitespace-nowrap">Hành động & Đối tượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE5D9]">
                {recentActivities.map((act) => {
                  const roleBadge = getRoleBadge(act.actorRole);
                  const actorDisplay = act.actorName || act.actorEmail || 'Hệ thống';
                  const timeDisplay = act.createdAt
                    ? new Date(act.createdAt).toLocaleString('vi-VN')
                    : '---';

                  return (
                    <tr
                      key={act.id}
                      className="hover:bg-[#F6F9F4]/70 transition-colors duration-100"
                    >
                      <td className="py-3.5 px-6 font-mono text-[#5B6776] whitespace-nowrap">
                        {timeDisplay}
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <span className="font-semibold text-[#1F2A37] mr-2">
                          {actorDisplay}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${roleBadge.color}`}
                        >
                          {roleBadge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-medium text-[#1F2A37]">
                        <span className="font-bold text-[#006B2C]">
                          {formatAuditActionLabel(act.actionType)}
                        </span>
                        {act.targetType && (
                          <span className="text-[#5B6776] ml-2">
                            (Đối tượng: {formatAuditTargetTypeLabel(act.targetType)} {act.targetId ? `#${act.targetId}` : ''})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
