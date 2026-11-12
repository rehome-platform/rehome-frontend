import React, { useState, useEffect } from 'react';
import adminApi from '../services/adminApi';
import AdminAccountGrowthChart from './AdminAccountGrowthChart.jsx';

/**
 * View Tổng quan Dashboard Quản trị ReHome
 * Kết nối Real Data với backend Spring Boot:
 * - Thống kê số lượng thực tế: Member, Tổ chức, Moderator, Kho hàng
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
    warehouseCount: 0,
    totalAccounts: 0,
  });

  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    try {
      setIsLoading(true);

      const [membersRes, orgsRes, modsRes, whRes, auditRes] = await Promise.allSettled([
        adminApi.getAccounts({ role: 'MEMBER', size: 1 }),
        adminApi.getAccounts({ role: 'ORGANIZATION', size: 1 }),
        adminApi.getModerators({ size: 1 }),
        adminApi.getWarehouses(),
        adminApi.getAuditLogs({ size: 6 }),
      ]);

      const memberCount = membersRes.status === 'fulfilled' ? (membersRes.value?.totalElements ?? (Array.isArray(membersRes.value) ? membersRes.value.length : 0)) : 0;
      const orgCount = orgsRes.status === 'fulfilled' ? (orgsRes.value?.totalElements ?? (Array.isArray(orgsRes.value) ? orgsRes.value.length : 0)) : 0;
      const moderatorCount = modsRes.status === 'fulfilled' ? (modsRes.value?.totalElements ?? (Array.isArray(modsRes.value) ? modsRes.value.length : 0)) : 0;
      const warehouseList = whRes.status === 'fulfilled' ? (Array.isArray(whRes.value) ? whRes.value : whRes.value?.content || []) : [];
      const warehouseCount = warehouseList.length;

      const totalAccounts = memberCount + orgCount + moderatorCount;

      setStats({
        memberCount,
        orgCount,
        moderatorCount,
        warehouseCount,
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
      title: 'Tổng số Member',
      value: stats.memberCount.toLocaleString('vi-VN'),
      icon: 'group',
      iconBg: 'bg-[#E8F5E9]',
      iconColor: 'text-[#006B2C]',
    },
    {
      title: 'Tổ chức đối tác',
      value: stats.orgCount.toLocaleString('vi-VN'),
      icon: 'verified',
      iconBg: 'bg-[#E0F2F1]',
      iconColor: 'text-[#00685F]',
    },
    {
      title: 'Nhân viên Moderator',
      value: stats.moderatorCount.toLocaleString('vi-VN'),
      icon: 'badge',
      iconBg: 'bg-[#E8F8F5]',
      iconColor: 'text-[#00873A]',
    },
    {
      title: 'Điểm kho ký gửi',
      value: stats.warehouseCount.toLocaleString('vi-VN'),
      icon: 'warehouse',
      iconBg: 'bg-[#FFF3E0]',
      iconColor: 'text-[#FEA619]',
    },
  ];

  // Tính toán tỷ lệ Donut Chart động
  const total = Math.max(stats.totalAccounts, 1);
  const memberPct = stats.memberCount / total;
  const orgPct = stats.orgCount / total;
  const modPct = stats.moderatorCount / total;

  const circumference = 2 * Math.PI * 38; // ~238.76
  const memberDash = (memberPct * circumference).toFixed(1);
  const orgDash = (orgPct * circumference).toFixed(1);
  const modDash = (modPct * circumference).toFixed(1);

  const orgOffset = -(memberPct * circumference);
  const modOffset = -((memberPct + orgPct) * circumference);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Admin', color: 'bg-[#E8F5E9] text-[#006B2C]' };
      case 'MODERATOR':
        return { label: 'Moderator', color: 'bg-[#E0F2F1] text-[#00685F]' };
      case 'ORGANIZATION':
        return { label: 'Tổ chức', color: 'bg-[#FFF3E0] text-[#D97706]' };
      default:
        return { label: 'Member', color: 'bg-[#F1F5F9] text-[#475569]' };
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 Thẻ chỉ số tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <div
            key={idx}
            className="bg-white p-5 rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between hover:border-[#006B2C]/40 transition-all duration-200"
          >
            <div>
              <p className="text-xs font-medium text-[#717971]">{card.title}</p>
              <p className="text-2xl font-extrabold text-[#191C19] mt-1 font-heading tracking-tight">
                {isLoading ? '...' : card.value}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-2xl ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0 shadow-inner`}
            >
              <span className="material-symbols-outlined text-2xl">
                {card.icon}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 2 Khối trực quan trung tâm */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Biểu đồ Tài khoản mới theo chu kỳ (7 cột / 12) */}
        <AdminAccountGrowthChart
          footerNote={`Tổng cộng ${stats.totalAccounts} tài khoản thuộc ba nhóm Member, tổ chức và Moderator.`}
        />

        {/* Biểu đồ Tròn Donut: Tài khoản theo vai trò (5 cột / 12) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#191C19] font-heading">
              Tài khoản theo vai trò
            </h3>
            <p className="text-xs text-[#717971] mt-0.5">
              Phân bổ ba nhóm Member, tổ chức và Moderator
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-4">
            {/* Donut Chart SVG */}
            <div className="relative w-36 h-36 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#E9F0E5"
                  strokeWidth="12"
                />
                {/* Member */}
                {stats.memberCount > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#006B2C"
                    strokeWidth="12"
                    strokeDasharray={`${memberDash} ${circumference}`}
                    strokeDashoffset="0"
                  />
                )}
                {/* Organization */}
                {stats.orgCount > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#FEA619"
                    strokeWidth="12"
                    strokeDasharray={`${orgDash} ${circumference}`}
                    strokeDashoffset={orgOffset}
                  />
                )}
                {/* Moderator */}
                {stats.moderatorCount > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#00685F"
                    strokeWidth="12"
                    strokeDasharray={`${modDash} ${circumference}`}
                    strokeDashoffset={modOffset}
                  />
                )}
              </svg>
              {/* Center Total Count */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-black text-[#191C19] font-heading leading-tight">
                  {stats.totalAccounts}
                </span>
                <span className="text-[10px] text-[#717971] font-medium leading-tight max-w-24">
                  Member, tổ chức và Moderator
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-3 text-xs w-full sm:w-auto">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <span className="flex items-center gap-2 text-[#414942]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#006B2C]"></span>
                  <span className="font-medium">Member</span>
                </span>
                <span className="font-bold text-[#191C19]">{stats.memberCount}</span>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-3">
                <span className="flex items-center gap-2 text-[#414942]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FEA619]"></span>
                  <span className="font-medium">Tổ chức</span>
                </span>
                <span className="font-bold text-[#191C19]">{stats.orgCount}</span>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-3">
                <span className="flex items-center gap-2 text-[#414942]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00685F]"></span>
                  <span className="font-medium">Moderator</span>
                </span>
                <span className="font-bold text-[#191C19]">{stats.moderatorCount}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#DDE5D9] text-[11px] text-[#717971] text-center">
            Tổng số gồm Member, tổ chức và Moderator, không bao gồm Admin.
          </div>
        </div>
      </div>

      {/* Bảng Hoạt động gần đây */}
      <div className="bg-white rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-[#DDE5D9] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#191C19] font-heading">
              Hoạt động gần đây
            </h3>
            <p className="text-xs text-[#717971] mt-0.5">
              Ghi nhận các thao tác kiểm duyệt và quản trị mới nhất từ Audit Log
            </p>
          </div>
          <button
            onClick={onNavigateToAudit}
            className="text-xs font-semibold text-[#006B2C] hover:text-[#005523] hover:underline flex items-center gap-1"
          >
            <span>Xem toàn bộ nhật ký</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>

        {recentActivities.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#717971]">
            Chưa có ghi nhận hoạt động nào gần đây trong hệ thống.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F9F4] text-[#717971] uppercase tracking-wider font-semibold border-b border-[#DDE5D9]">
                <tr>
                  <th className="py-3 px-6">Thời gian</th>
                  <th className="py-3 px-6">Người thực hiện</th>
                  <th className="py-3 px-6">Hành động & Đối tượng</th>
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
                      <td className="py-3.5 px-6 font-mono text-[#717971] whitespace-nowrap">
                        {timeDisplay}
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <span className="font-semibold text-[#191C19] mr-2">
                          {actorDisplay}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${roleBadge.color}`}
                        >
                          [{roleBadge.label}]
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-medium text-[#191C19]">
                        <span className="font-bold text-[#006B2C]">{act.actionType}</span>
                        {act.targetType && (
                          <span className="text-[#717971] ml-2">
                            (Đối tượng: {act.targetType} {act.targetId ? `#${act.targetId}` : ''})
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
