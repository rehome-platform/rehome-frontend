import React, { useState, useEffect } from 'react';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { Button, Badge } from '../../../components/common/index.js';
import { violationReportService } from '../services/violationReportApi.js';

/**
 * Trang Xử Lý Báo Cáo Vi Phạm & Kiểm Duyệt Nội Dung
 * Chuẩn hóa 100% theo các wireframe:
 * - VP-01: Hàng đợi báo cáo vi phạm (gộp nhiều báo cáo cùng 1 đối tượng, số lượng nổi bật)
 * - VP-02: Chi tiết báo cáo & xử lý (xem nội dung, danh sách báo cáo, chọn hành động xử lý)
 */
export default function ViolationReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View state: 'QUEUE' | 'DETAIL' (VP-02)
  const [viewMode, setViewMode] = useState('QUEUE');
  const [selectedReport, setSelectedReport] = useState(null);

  // Actions in VP-02
  const [selectedAction, setSelectedAction] = useState('TAKE_DOWN'); // 'TAKE_DOWN' | 'HIDE_CAMPAIGN' | 'DISMISS' | 'LOCK_ACCOUNT'
  const [actionReason, setActionReason] = useState('');

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

  useEffect(() => {
    fetchReports();
  }, []);

  const handleOpenDetail = (rep) => {
    setSelectedReport(rep);
    setSelectedAction(rep.actionTaken ? 'DISMISS' : 'TAKE_DOWN');
    setActionReason(rep.resolveReason || '');
    setViewMode('DETAIL');
  };

  const handleConfirmAction = async () => {
    if (!selectedReport) return;
    if (selectedAction !== 'DISMISS' && !actionReason.trim()) {
      alert('Vui lòng nhập lý do xử lý vi phạm.');
      return;
    }

    const actionLabels = {
      TAKE_DOWN: 'Gỡ nội dung',
      HIDE_CAMPAIGN: 'Ẩn chiến dịch liên quan',
      DISMISS: 'Bác bỏ báo cáo — nội dung không vi phạm',
      LOCK_ACCOUNT: 'Đề xuất Admin khóa tài khoản',
    };

    try {
      await violationReportService.resolveViolation(
        selectedReport.id,
        actionLabels[selectedAction],
        actionReason
      );
      await fetchReports();
      alert(`Đã thực thi [${actionLabels[selectedAction]}] thành công! Kết quả được ghi nhận vào Audit Log.`);
      setViewMode('QUEUE');
      setSelectedReport(null);
    } catch (err) {
      alert('Có lỗi xảy ra khi xử lý báo cáo.');
    }
  };

  return (
    <ModeratorLayout>
      <div className="space-y-6">
        {/* VIEW 1: HÀNG ĐỢI BÁO CÁO (VP-01) */}
        {viewMode === 'QUEUE' && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#E2E8E0] pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold font-heading text-[#191C19]">
                    Báo cáo vi phạm · {reports.length}
                  </h1>
                </div>
                <p className="text-xs text-[#5f5f5f] mt-1">
                  Bài viết, bình luận, chiến dịch bị Member hoặc tổ chức khác báo cáo
                </p>
              </div>
            </div>

            {/* Bảng VP-01 */}
            <div className="bg-white border border-[#8a8a8a] rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f4f4f4] border-b border-[#8a8a8a] text-[10px] uppercase font-bold text-[#5f5f5f] tracking-wider">
                      <th className="py-2.5 px-3">Đối tượng bị báo cáo</th>
                      <th className="py-2.5 px-3">Loại</th>
                      <th className="py-2.5 px-3">Số báo cáo</th>
                      <th className="py-2.5 px-3">Lý do phổ biến nhất</th>
                      <th className="py-2.5 px-3">Gần nhất</th>
                      <th className="py-2.5 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {loading && (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-[#717971]">
                          Đang tải danh sách báo cáo vi phạm...
                        </td>
                      </tr>
                    )}
                    {!loading && reports.length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-[#717971]">
                          Không có báo cáo vi phạm nào cần xử lý.
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      reports.map((rep) => {
                        const isHighPriority = rep.reportCount >= 3;
                        return (
                          <tr
                            key={rep.id}
                            onClick={() => handleOpenDetail(rep)}
                            className={`cursor-pointer hover:bg-[#F8FAF8] transition-colors ${
                              isHighPriority ? 'border-l-4 border-l-[#2b2b2b] bg-[#fafafa]' : ''
                            }`}
                          >
                            <td className="py-3 px-3 font-semibold text-[#191C19]">
                              {rep.targetTitle}
                            </td>
                            <td className="py-3 px-3 text-[#5f5f5f]">{rep.targetType}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center justify-center font-bold px-2.5 py-0.5 rounded text-xs ${
                                  isHighPriority
                                    ? 'bg-[#2b2b2b] text-white'
                                    : 'border border-[#8a8a8a] text-[#2b2b2b]'
                                }`}
                              >
                                {rep.reportCount}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-[#5f5f5f]">{rep.topReason}</td>
                            <td className="py-3 px-3 text-[#7a7a7a]">{rep.lastReportAt}</td>
                            <td className="py-3 px-3 text-right">
                              {rep.status === 'RESOLVED' ? (
                                <Badge variant="success">Đã xử lý</Badge>
                              ) : (
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded border border-[#2b2b2b] text-[#2b2b2b] hover:bg-[#2b2b2b] hover:text-white">
                                  Xử lý
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Note box VP-01 */}
            <div className="p-3 border border-dashed border-[#9a9a9a] rounded-lg text-xs leading-relaxed text-[#4a4a4a] bg-[#fafafa]">
              Nhiều báo cáo trên <strong className="font-semibold text-[#191C19]">cùng một đối tượng</strong> gộp thành 1 dòng, số báo cáo nổi bật kèm viền đậm — ưu tiên xử lý trước vì khả năng vi phạm thật cao hơn.
            </div>
          </div>
        )}

        {/* VIEW 2: CHI TIẾT BÁO CÁO & XỬ LÝ (VP-02) */}
        {viewMode === 'DETAIL' && selectedReport && (
          <div className="space-y-4">
            {/* Header VP-02 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E0] pb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode('QUEUE')}
                  className="w-8 h-8 flex items-center justify-center rounded border border-[#8a8a8a] text-sm hover:bg-[#f4f4f4]"
                  title="Quay lại hàng đợi"
                >
                  ←
                </button>
                <div>
                  <span className="text-xs text-[#5f5f5f]">Báo cáo vi phạm · </span>
                  <span className="text-sm font-bold text-[#191C19]">Chi tiết báo cáo & xử lý</span>
                </div>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded ${
                  selectedReport.status === 'RESOLVED'
                    ? 'bg-[#E8F5E9] text-[#006B2C]'
                    : 'bg-[#2b2b2b] text-white'
                }`}
              >
                {selectedReport.status === 'RESOLVED' ? 'ĐÃ XỬ LÝ' : 'CHỜ XỬ LÝ'}
              </span>
            </div>

            {/* Bố cục 2 cột VP-02 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Cột trái (7 cols): Nội dung bị báo cáo & Lượt báo cáo */}
              <div className="lg:col-span-7 space-y-4">
                {/* Box nội dung */}
                <div className="border border-[#8a8a8a] rounded-lg p-4 bg-white">
                  <div className="text-xs font-bold text-[#191C19] mb-3">Nội dung bị báo cáo</div>
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded border border-[#c4c4c4] bg-[#f4f4f4] flex items-center justify-center text-xl shrink-0">
                      {selectedReport.targetType === 'Bình luận' ? '💬' : '📄'}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#191C19] mb-1">
                        {selectedReport.targetTitle}
                      </div>
                      <div className="text-xs text-[#5f5f5f]">
                        {selectedReport.targetType} · {selectedReport.authorName} · đăng {selectedReport.postedAt}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Box các lượt báo cáo */}
                <div className="border border-[#8a8a8a] rounded-lg overflow-hidden bg-white text-xs">
                  <div className="p-3 bg-[#f4f4f4] border-b border-[#8a8a8a] font-bold text-[#191C19]">
                    {selectedReport.reportCount} lượt báo cáo
                  </div>
                  <div className="divide-y divide-[#e0e0e0]">
                    {selectedReport.reports && selectedReport.reports.length > 0 ? (
                      selectedReport.reports.map((item, idx) => (
                        <div key={idx} className="p-3 leading-relaxed">
                          <strong className="font-semibold text-[#191C19]">
                            {item.reporterCode} · {item.reporterName}
                          </strong>{' '}
                          — "{item.reason}"{' '}
                          <span className="text-[#7a7a7a]">· {item.time}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-[#7a7a7a]">Chưa có chi tiết lượt báo cáo.</div>
                    )}
                  </div>
                </div>

                {selectedReport.status === 'RESOLVED' && (
                  <div className="border border-[#006B2C] bg-[#E8F5E9]/30 rounded-lg p-4 text-xs space-y-1.5">
                    <div className="font-bold text-[#006B2C]">Kết quả đã xử lý:</div>
                    <div>Hành động: <strong>{selectedReport.actionTaken}</strong></div>
                    <div>Lý do: <em>{selectedReport.resolveReason || 'Không có ghi chú thêm'}</em></div>
                  </div>
                )}
              </div>

              {/* Cột phải (5 cols): Chọn hành động xử lý */}
              <div className="lg:col-span-5">
                <div className="border-2 border-[#2b2b2b] rounded-lg p-4 bg-white space-y-4">
                  <div className="text-xs font-bold text-[#191C19]">Chọn hành động xử lý</div>

                  <div className="space-y-2.5 text-xs">
                    <label className="flex items-center gap-2.5 cursor-pointer font-semibold">
                      <input
                        type="radio"
                        name="action"
                        value="TAKE_DOWN"
                        checked={selectedAction === 'TAKE_DOWN'}
                        onChange={() => setSelectedAction('TAKE_DOWN')}
                      />
                      <span>Gỡ nội dung</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="action"
                        value="HIDE_CAMPAIGN"
                        checked={selectedAction === 'HIDE_CAMPAIGN'}
                        onChange={() => setSelectedAction('HIDE_CAMPAIGN')}
                      />
                      <span>Ẩn chiến dịch liên quan</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="action"
                        value="DISMISS"
                        checked={selectedAction === 'DISMISS'}
                        onChange={() => setSelectedAction('DISMISS')}
                      />
                      <span>Bác bỏ báo cáo — nội dung không vi phạm</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="action"
                        value="LOCK_ACCOUNT"
                        checked={selectedAction === 'LOCK_ACCOUNT'}
                        onChange={() => setSelectedAction('LOCK_ACCOUNT')}
                      />
                      <span>Đề xuất Admin khóa tài khoản</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#191C19] mb-1.5">
                      Lý do xử lý · bắt buộc trừ khi bác bỏ
                    </label>
                    <textarea
                      rows="3"
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Nhập căn cứ xử lý vi phạm..."
                      className="w-full text-xs p-2.5 border border-[#8a8a8a] rounded"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmAction}
                    className="w-full py-3 px-4 rounded bg-[#2b2b2b] text-white text-xs font-bold hover:bg-black transition-colors"
                  >
                    Xác nhận xử lý
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModeratorLayout>
  );
}
