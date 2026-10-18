import React, { useState } from 'react';

/**
 * View Tổng quan Dashboard Quản trị ReHome
 * Thiết kế chính xác theo Google Stitch (Figma) Prototype:
 * - 4 Thẻ số liệu thống kê chuẩn xác (Member 2.480, Tổ chức 12, Chiến dịch 18, Báo cáo vi phạm 5)
 * - Biểu đồ SVG đường mượt "Tài khoản mới theo tuần" (đỉnh 91)
 * - Biểu đồ tròn Donut "Tài khoản theo vai trò" (tổng 2.498)
 * - Bảng "Hoạt động gần đây" với dữ liệu thực tế năm 2026
 */
export default function AdminOverviewView({ onNavigateToAudit }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // 4 thẻ thống kê chuẩn Stitch
  const statCards = [
    {
      title: 'Tổng số Member',
      value: '2.480',
      icon: 'group',
      iconBg: 'bg-[#E8F5E9]',
      iconColor: 'text-[#006B2C]',
    },
    {
      title: 'Tổ chức đã xác minh',
      value: '12',
      icon: 'verified',
      iconBg: 'bg-[#E0F2F1]',
      iconColor: 'text-[#00685F]',
    },
    {
      title: 'Chiến dịch đang diễn ra',
      value: '18',
      icon: 'campaign',
      iconBg: 'bg-[#E8F8F5]',
      iconColor: 'text-[#00873A]',
    },
    {
      title: 'Báo cáo vi phạm đang chờ',
      value: '5',
      icon: 'flag',
      iconBg: 'bg-[#FFF3E0]',
      iconColor: 'text-[#FEA619]',
    },
  ];

  // Dữ liệu biểu đồ đường tuần
  const weeklyTrend = [
    { date: '10/08', count: 35, x: 50, y: 150 },
    { date: '17/08', count: 52, x: 120, y: 115 },
    { date: '24/08', count: 58, x: 190, y: 105 },
    { date: '31/08', count: 49, x: 260, y: 122 },
    { date: '07/09', count: 72, x: 330, y: 78 },
    { date: '14/09', count: 76, x: 400, y: 70 },
    { date: '21/09', count: 68, x: 470, y: 86 },
    { date: '28/09', count: 91, x: 540, y: 40 },
  ];

  // Dữ liệu Hoạt động gần đây
  const recentActivities = [
    {
      time: '02/10/2026 14:20',
      user: 'Trần Minh Quân',
      role: 'Admin',
      roleColor: 'bg-[#E8F5E9] text-[#006B2C]',
      action: 'Khóa tài khoản Member "Lê Hoàng Nam"',
    },
    {
      time: '02/10/2026 11:05',
      user: 'Phạm Thu Hà',
      role: 'Moderator',
      roleColor: 'bg-[#E0F2F1] text-[#00685F]',
      action: 'Gỡ bài viết vi phạm của "Mái Ấm Hướng Dương"',
    },
    {
      time: '01/10/2026 16:42',
      user: 'Trần Minh Quân',
      role: 'Admin',
      roleColor: 'bg-[#E8F5E9] text-[#006B2C]',
      action: 'Tạo tài khoản Moderator "Đỗ Quang Huy"',
    },
    {
      time: '01/10/2026 09:15',
      user: 'Phạm Thu Hà',
      role: 'Moderator',
      roleColor: 'bg-[#E0F2F1] text-[#00685F]',
      action: 'Bỏ qua báo cáo vi phạm đối với chiến dịch "Áo ấm mùa đông vùng cao Tây Bắc"',
    },
    {
      time: '30/09/2026 17:30',
      user: 'Trần Minh Quân',
      role: 'Admin',
      roleColor: 'bg-[#E8F5E9] text-[#006B2C]',
      action: 'Mở khóa tài khoản Member "Nguyễn Thị Mai"',
    },
  ];

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
                {card.value}
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

      {/* 2 Biểu đồ thống kê trung tâm */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Biểu đồ Tài khoản mới theo tuần (8 cột / 12) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-bold text-[#191C19] font-heading">
                Tài khoản mới theo tuần
              </h3>
              <p className="text-xs text-[#717971] mt-0.5">
                Số lượng người dùng gia nhập nền tảng ReHome
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4] text-xs font-medium text-[#414942]">
              <span className="material-symbols-outlined text-sm text-[#006B2C]">calendar_today</span>
              <span>10/08/2026 - 04/10/2026</span>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="relative w-full h-56 pt-2">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 600 200"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="greenAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#006B2C" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#006B2C" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[40, 80, 120, 160].map((yVal, i) => (
                <g key={i}>
                  <line
                    x1="40"
                    y1={yVal}
                    x2="560"
                    y2={yVal}
                    stroke="#E9F0E5"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x="25"
                    y={yVal + 4}
                    fontSize="10"
                    fill="#8E998D"
                    textAnchor="end"
                  >
                    {100 - i * 25}
                  </text>
                </g>
              ))}

              {/* Shaded Area */}
              <path
                d="M 50 150 L 120 115 L 190 105 L 260 122 L 330 78 L 400 70 L 470 86 L 540 40 L 540 180 L 50 180 Z"
                fill="url(#greenAreaGrad)"
              />

              {/* Line path */}
              <path
                d="M 50 150 L 120 115 L 190 105 L 260 122 L 330 78 L 400 70 L 470 86 L 540 40"
                fill="none"
                stroke="#006B2C"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {weeklyTrend.map((pt, idx) => (
                <g
                  key={idx}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={pt.count === 91 ? '6' : '4.5'}
                    fill={pt.count === 91 ? '#006B2C' : '#FFFFFF'}
                    stroke="#006B2C"
                    strokeWidth="2.5"
                    className="transition-all duration-150 hover:r-7"
                  />
                  {pt.count === 91 && (
                    <text
                      x={pt.x}
                      y={pt.y - 12}
                      fontSize="11"
                      fontWeight="bold"
                      fill="#006B2C"
                      textAnchor="middle"
                    >
                      91
                    </text>
                  )}
                  {/* X-axis date labels */}
                  <text
                    x={pt.x}
                    y="195"
                    fontSize="10"
                    fill="#717971"
                    textAnchor="middle"
                  >
                    {pt.date}
                  </text>
                </g>
              ))}
            </svg>

            {/* Hover Tooltip */}
            {hoveredPoint && (
              <div
                className="absolute -top-3 bg-[#191C19] text-white text-[11px] font-medium py-1 px-2.5 rounded-lg shadow-lg pointer-events-none -translate-x-1/2 transition-all"
                style={{ left: `${(hoveredPoint.x / 600) * 100}%` }}
              >
                Tuần {hoveredPoint.date}:{' '}
                <span className="font-bold text-emerald-300">
                  {hoveredPoint.count} tài khoản
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Biểu đồ Tròn Donut: Tài khoản theo vai trò (5 cột / 12) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#191C19] font-heading">
              Tài khoản theo vai trò
            </h3>
            <p className="text-xs text-[#717971] mt-0.5">
              Phân bổ người dùng trong toàn hệ thống
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
                {/* Member: 2480 (~98%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#006B2C"
                  strokeWidth="12"
                  strokeDasharray="235 240"
                  strokeDashoffset="0"
                />
                {/* Organizer: 12 (~1.2%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#FEA619"
                  strokeWidth="12"
                  strokeDasharray="4 240"
                  strokeDashoffset="-235"
                />
                {/* Moderator: 6 (~0.8%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#00685F"
                  strokeWidth="12"
                  strokeDasharray="2.5 240"
                  strokeDashoffset="-239"
                />
              </svg>
              {/* Center Total Count */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-black text-[#191C19] font-heading leading-tight">
                  2.498
                </span>
                <span className="text-[10px] text-[#717971] font-medium leading-none">
                  tài khoản
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
                <span className="font-bold text-[#191C19]">2.480</span>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-3">
                <span className="flex items-center gap-2 text-[#414942]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FEA619]"></span>
                  <span className="font-medium">Organizer</span>
                </span>
                <span className="font-bold text-[#191C19]">12</span>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-3">
                <span className="flex items-center gap-2 text-[#414942]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00685F]"></span>
                  <span className="font-medium">Moderator</span>
                </span>
                <span className="font-bold text-[#191C19]">6</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#DDE5D9] text-[11px] text-[#717971] text-center">
            Tất cả dữ liệu phân loại được kiểm soát bởi ban điều hành ReHome.
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
              Ghi nhận các thao tác kiểm duyệt và quản trị mới nhất
            </p>
          </div>
          <button
            onClick={onNavigateToAudit}
            className="text-xs font-semibold text-[#006B2C] hover:text-[#005523] hover:underline flex items-center gap-1"
          >
            <span>Xem nhật ký hệ thống</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F9F4] text-[#717971] uppercase tracking-wider font-semibold border-b border-[#DDE5D9]">
              <tr>
                <th className="py-3 px-6">Thời gian</th>
                <th className="py-3 px-6">Người thực hiện</th>
                <th className="py-3 px-6">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE5D9]">
              {recentActivities.map((act, i) => (
                <tr
                  key={i}
                  className="hover:bg-[#F6F9F4]/70 transition-colors duration-100"
                >
                  <td className="py-3.5 px-6 font-mono text-[#717971] whitespace-nowrap">
                    {act.time}
                  </td>
                  <td className="py-3.5 px-6 whitespace-nowrap">
                    <span className="font-semibold text-[#191C19] mr-2">
                      {act.user}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${act.roleColor}`}
                    >
                      [{act.role}]
                    </span>
                  </td>
                  <td className="py-3.5 px-6 font-medium text-[#191C19]">
                    {act.action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
