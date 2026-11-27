import React from "react";

export function PackingAccessNotice({  }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 space-y-3">
      <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500"></span>
        Thông báo giới hạn phân quyền đọc chi tiết đơn hàng (API 63)
      </div>
      <p className="text-xs text-amber-800 leading-relaxed">
        Backend hiện tại giới hạn quyền gọi <code>GET /orders/{'{'}id{'}'}</code> chỉ dành cho tài khoản Người mua (Role: MEMBER). Nhân viên vận hành điểm kí gửi (Role: MODERATOR) chưa được cấp quyền đọc chi tiết đơn hàng này.
      </p>
      <p className="text-xs text-amber-700">
        Hệ thống frontend đã tích hợp sẵn sàng contract Phase 4 (Quét Mã hàng hóa và Tạo vận đơn GHN). Bạn có thể quay lại danh sách hàng đợi để tiếp tục các công việc khác.
      </p>
    </div>
  );
}
