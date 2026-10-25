import React, { useState } from 'react';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { Button, Badge, Modal } from '../../../components/common/index.js';

import { violationReportService } from '../services/moderatorMockData.js';

/**
 * Trang Xử Lý Báo Cáo Vi Phạm Cộng Đồng (F-141, UC-71)
 * Chuẩn hóa theo Mục 13: "Vi phạm và hình thức xử lý":
 * Moderator xử lý nội dung ngay: Gỡ bài viết, xóa bình luận công kích, ẩn chiến dịch ma.
 * Quyết định khóa tài khoản thuộc thẩm quyền Admin dựa trên lịch sử vi phạm trong audit log.
 */
export default function ViolationReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await violationReportService.list();
      setReports(res.data);
    } catch (err) {
      setError('Không thể tải danh sách báo cáo vi phạm.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchReports();
  }, []);

  const handleTakeDown = async (report, actionName) => {
    try {
      await violationReportService.takeAction(report.id, actionName);
      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id ? { ...r, status: 'RESOLVED', actionTaken: actionName } : r
        )
      );
      alert(`Đã thực thi [${actionName}] thành công theo Mục 13! Hành động được ghi nhận vào Audit Log để Admin theo dõi lịch sử vi phạm.`);
      setSelectedReport(null);
    } catch (err) {
      alert('Có lỗi xảy ra khi thực thi xử lý vi phạm.');
    }
  };

  const handleDismissReport = async (report) => {
    try {
      await violationReportService.dismiss(report.id);
      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id
            ? { ...r, status: 'RESOLVED', actionTaken: 'Bác bỏ báo cáo (Nội dung hợp lệ)' }
            : r
        )
      );
      alert('Đã bác bỏ báo cáo vi phạm (Mục 13). Nội dung được giữ nguyên.');
      setSelectedReport(null);
    } catch (err) {
      alert('Có lỗi xảy ra khi bác bỏ báo cáo.');
    }
  };

  return (
    <ModeratorLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-[#E8F5E9] text-[#006B2C]">
              Mục 13
            </span>
            <h1 className="text-2xl font-extrabold font-heading text-[#191C19]">
              Báo Cáo Vi Phạm & Kiểm Duyệt Nội Dung
            </h1>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Moderator xử lý nội dung vi phạm ngay (gỡ bài, xóa bình luận, ẩn chiến dịch). Admin sẽ quyết định khóa tài khoản nếu tái phạm.
          </p>
        </div>

        {/* Trạng thái tải / Lỗi / Rỗng */}
        {loading && (
          <div className="p-8 text-center bg-white rounded-2xl border border-[#DDE5D9] text-[#717971] text-sm">
            <span className="material-symbols-outlined animate-spin text-2xl mb-2 block">progress_activity</span>
            Đang tải danh sách báo cáo vi phạm...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-[#FFDAD6]/40 border border-[#BA1A1A]/30 text-[#BA1A1A] text-xs flex justify-between items-center">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={fetchReports}>Thử lại</Button>
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-[#DDE5D9] text-[#717971]">
            <span className="material-symbols-outlined text-4xl mb-2 text-[#717971]">verified_user</span>
            <p className="font-bold text-sm text-[#191C19]">Không có báo cáo vi phạm nào cần xử lý</p>
            <p className="text-xs mt-1">Cộng đồng đang an toàn và không có nội dung bị khiếu nại.</p>
          </div>
        )}

        {/* Danh sách báo cáo vi phạm */}
        {!loading && reports.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#DDE5D9] shadow-sm divide-y divide-[#F0F4EE]">
          {reports.map((r) => (
            <div key={r.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-sm text-[#191C19]">{r.targetTitle}</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#F8FAF8] text-[#006B2C] border border-[#DDE5D9]">
                    {r.type}
                  </span>
                  {r.status === 'PENDING' ? (
                    <Badge variant="warning">Chờ xử lý</Badge>
                  ) : (
                    <Badge variant="success">{r.actionTaken}</Badge>
                  )}
                </div>

                <p className="text-[#414942]">
                  Tác giả vi phạm: <strong>{r.authorName}</strong> ({r.authorRole}) • Người gửi tố cáo: {r.reporterName}
                </p>

                <p className="text-[#BA1A1A] font-medium bg-[#FFDAD6]/30 p-2 rounded-lg inline-block">
                  Nội dung phản ánh: "{r.reason}"
                </p>

                <p className="text-[10px] text-[#717971]">Thời gian gửi: {r.submittedAt}</p>
              </div>

              {r.status === 'PENDING' && (
                <div className="flex items-center space-x-2 shrink-0">
                  {r.type === 'POST' && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleTakeDown(r, 'Gỡ bài viết vi phạm')}
                    >
                      Gỡ bài viết ngay (Mục 13)
                    </Button>
                  )}
                  {r.type === 'CAMPAIGN' && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleTakeDown(r, 'Ẩn chiến dịch quyên góp')}
                    >
                      Ẩn chiến dịch ma (Mục 13)
                    </Button>
                  )}
                  {r.type === 'COMMENT' && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleTakeDown(r, 'Xóa bình luận công kích')}
                    >
                      Xóa bình luận
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDismissReport(r)}
                  >
                    Bác bỏ báo cáo
                  </Button>
                </div>
              )}
            </div>
          ))}
          </div>
        )}

        {/* Bảng phân cấp xử lý Mục 13 */}
        <div className="bg-white p-5 rounded-2xl border border-[#DDE5D9] shadow-sm space-y-2 text-xs text-[#414942]">
          <h4 className="font-bold text-[#191C19] flex items-center space-x-1.5">
            <span className="material-symbols-outlined text-sm text-[#006B2C]">gavel</span>
            <span>Thang xử lý vi phạm tăng dần (Mục 13):</span>
          </h4>
          <p>• <strong>Mức 1 (Moderator):</strong> Gỡ bài viết, xóa bình luận, ẩn chiến dịch vi phạm.</p>
          <p>• <strong>Mức 2 (Moderator):</strong> Từ chối hồ sơ pháp lý, từ chối nhận hàng giả tại chỗ, loại hàng khỏi sàn.</p>
          <p>• <strong>Mức 3 & 4 (Admin):</strong> Khóa và mở khóa tài khoản vi phạm. Moderator không có thẩm quyền khóa tài khoản.</p>
        </div>
      </div>
    </ModeratorLayout>
  );
}
