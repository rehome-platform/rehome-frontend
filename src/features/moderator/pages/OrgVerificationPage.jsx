import React, { useState, useEffect } from 'react';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { Button, Badge, Modal } from '../../../components/common/index.js';
import { orgVerificationService } from '../services/moderatorMockData.js';

/**
 * Trang Quản Lý & Xác Minh Hồ Sơ Tổ Chức Từ Thiện
 * Chuẩn hóa 100% theo các wireframe:
 * - TC-01: Hàng đợi hồ sơ tổ chức chờ xác minh
 * - TC-02: Quy trình kiểm chứng 8 bước (chưa đủ nút khóa / đủ nút mở)
 * - TC-03: Modal xem phóng to giấy tờ pháp lý
 * - TC-04: Modal từ chối hồ sơ kèm lý do
 * - TC-05: Hàng đợi yêu cầu đổi thông tin pháp lý
 * - TC-06: Chi tiết đối chiếu & duyệt đổi pháp lý
 */
export default function OrgVerificationPage() {
  const [activeMainTab, setActiveMainTab] = useState('NEW_ORGS'); // 'NEW_ORGS' | 'LEGAL_CHANGES'
  const [activeQueueTab, setActiveQueueTab] = useState('PENDING'); // 'PENDING' | 'WAITING_DOCS' | 'APPROVED' | 'REJECTED'

  const [orgsQueue, setOrgsQueue] = useState([]);
  const [legalChanges, setLegalChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View state: 'LIST' | 'DETAIL' (TC-02) | 'LEGAL_DETAIL' (TC-06)
  const [viewMode, setViewMode] = useState('LIST');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selectedChange, setSelectedChange] = useState(null);

  // Checklist 7 bước kiểm chứng TC-02
  const [checklist, setChecklist] = useState({
    taxChecked: false, // Bước 1: Tra mã số thuế (tracuunnt.gdt.gov.vn)
    businessChecked: false, // Bước 2: Cổng ĐKKD (không bắt buộc trừ khi DNXH)
    docsValid: false, // Bước 3: Kiểm ảnh giấy phép thành lập còn hiệu lực, có con dấu
    cccdMatched: false, // Bước 4: Đối chiếu CCCD người đại diện khớp giấy phép
    phoneConfirmed: false, // Bước 5: Gọi điện thoại / email xác nhận
    authorityChecked: false, // Bước 6: Kiểm tra cơ quan cấp phép (không bắt buộc)
    reputationChecked: false, // Bước 7: Rà soát báo chí & mạng xã hội
  });
  const [auditNote, setAuditNote] = useState('');

  // Modals
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [viewingDoc, setViewingDoc] = useState(null); // TC-03 viewer

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [orgsRes, changesRes] = await Promise.all([
        orgVerificationService.getQueue(),
        orgVerificationService.getLegalChanges(),
      ]);
      setOrgsQueue(orgsRes.data);
      setLegalChanges(changesRes.data);
    } catch (err) {
      setError('Không thể tải dữ liệu hồ sơ tổ chức.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDetail = (org) => {
    setSelectedOrg(org);
    const hasTax = org.taxCode && org.taxCode !== 'không có';
    const isEnterprise = org.type?.includes('Doanh nghiệp');
    setChecklist({
      taxChecked: false,
      businessChecked: false,
      docsValid: false,
      cccdMatched: false,
      phoneConfirmed: false,
      authorityChecked: false,
      reputationChecked: false,
    });
    setAuditNote(
      org.taxCode && org.taxCode !== 'không có'
        ? `Đã liên hệ số ${org.phone}, người đại diện xác nhận hồ sơ do chính tổ chức nộp.`
        : ''
    );
    setViewMode('DETAIL');
  };

  // Required checks logic
  const hasTax = selectedOrg?.taxCode && selectedOrg.taxCode !== 'không có';
  const isEnterprise = selectedOrg?.type?.includes('Doanh nghiệp');
  const mandatoryItemsLeft = [
    hasTax && !checklist.taxChecked,
    isEnterprise && !checklist.businessChecked,
    !checklist.docsValid,
    !checklist.cccdMatched,
    !checklist.phoneConfirmed,
    !checklist.reputationChecked,
  ].filter(Boolean).length;

  const isChecklistComplete = mandatoryItemsLeft === 0;

  const handleApproveOrg = async () => {
    if (!selectedOrg || !isChecklistComplete) return;
    try {
      await orgVerificationService.approveOrg(selectedOrg.id, auditNote);
      await loadData();
      alert(`Đã xác thực tổ chức ${selectedOrg.name} thành công! Tổ chức đã được cấp quyền tạo chiến dịch tiếp nhận quyên góp.`);
      setViewMode('LIST');
      setSelectedOrg(null);
    } catch (err) {
      alert('Có lỗi xảy ra khi xác thực tổ chức.');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim() || !selectedOrg) return;
    try {
      await orgVerificationService.rejectOrg(selectedOrg.id, rejectReason);
      await loadData();
      setIsRejectModalOpen(false);
      setRejectReason('');
      setViewMode('LIST');
      setSelectedOrg(null);
      alert('Đã từ chối hồ sơ kèm hướng dẫn bổ sung giấy tờ!');
    } catch (err) {
      alert('Có lỗi xảy ra khi từ chối hồ sơ.');
    }
  };

  const handleApproveLegalChange = async (changeId) => {
    try {
      await orgVerificationService.approveLegalChange(changeId);
      await loadData();
      alert('Đã duyệt yêu cầu đổi thông tin pháp lý thành công! Ghi nhận vào Audit Log hệ thống.');
      setViewMode('LIST');
      setSelectedChange(null);
    } catch (err) {
      alert('Có lỗi xảy ra khi duyệt đổi pháp lý.');
    }
  };

  return (
    <ModeratorLayout>
      <div className="space-y-6">
        {/* VIEW 1: QUEUE LIST (TC-01 & TC-05) */}
        {viewMode === 'LIST' && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#E2E8E0] pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold font-heading text-[#191C19]">
                    Hồ sơ tổ chức chờ xác minh
                  </h1>
                </div>
                <p className="text-xs text-[#5f5f5f] mt-1">
                  Xác minh sai một hồ sơ là một tổ chức giả được phép kêu gọi quyên góp. Không có hạn gấp — làm kỹ hơn làm nhanh.
                </p>
              </div>
              <div className="text-xs text-[#5f5f5f] font-medium">
                Cam kết phản hồi trong 5 ngày làm việc
              </div>
            </div>

            {/* Main Tabs: Hồ sơ mới vs Đổi pháp lý */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveMainTab('NEW_ORGS')}
                className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                  activeMainTab === 'NEW_ORGS'
                    ? 'bg-[#006B2C] text-white shadow-sm'
                    : 'bg-white text-[#4a4a4a] border border-[#a8a8a8]'
                }`}
              >
                Hồ sơ tổ chức ({orgsQueue.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveMainTab('LEGAL_CHANGES')}
                className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                  activeMainTab === 'LEGAL_CHANGES'
                    ? 'bg-[#006B2C] text-white shadow-sm'
                    : 'bg-white text-[#4a4a4a] border border-[#a8a8a8]'
                }`}
              >
                Yêu cầu đổi pháp lý ({legalChanges.filter((c) => c.status === 'PENDING').length})
              </button>
            </div>

            {/* Sub-tabs for NEW_ORGS (TC-01) */}
            {activeMainTab === 'NEW_ORGS' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveQueueTab('PENDING')}
                    className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg ${
                      activeQueueTab === 'PENDING'
                        ? 'bg-[#2b2b2b] text-white'
                        : 'bg-white text-[#4a4a4a] border border-[#a8a8a8]'
                    }`}
                  >
                    Chờ xác minh · {orgsQueue.filter((o) => o.status === 'PENDING').length}
                  </button>
                  <button
                    onClick={() => setActiveQueueTab('WAITING_DOCS')}
                    className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg ${
                      activeQueueTab === 'WAITING_DOCS'
                        ? 'bg-[#2b2b2b] text-white'
                        : 'bg-white text-[#4a4a4a] border border-[#a8a8a8]'
                    }`}
                  >
                    Đang chờ bổ sung · 2
                  </button>
                  <button
                    onClick={() => setActiveQueueTab('APPROVED')}
                    className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg ${
                      activeQueueTab === 'APPROVED'
                        ? 'bg-[#2b2b2b] text-white'
                        : 'bg-white text-[#4a4a4a] border border-[#a8a8a8]'
                    }`}
                  >
                    Đã xác thực · 37
                  </button>
                  <button
                    onClick={() => setActiveQueueTab('REJECTED')}
                    className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg ${
                      activeQueueTab === 'REJECTED'
                        ? 'bg-[#2b2b2b] text-white'
                        : 'bg-white text-[#4a4a4a] border border-[#a8a8a8]'
                    }`}
                  >
                    Đã từ chối · 9
                  </button>
                </div>

                {/* Bảng TC-01 */}
                <div className="bg-white border border-[#8a8a8a] rounded-lg overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#f4f4f4] border-b border-[#8a8a8a] text-[10px] uppercase font-bold text-[#5f5f5f] tracking-wider">
                          <th className="py-2.5 px-3">Mã hồ sơ</th>
                          <th className="py-2.5 px-3">Tên tổ chức</th>
                          <th className="py-2.5 px-3">Loại hình</th>
                          <th className="py-2.5 px-3">Mã số thuế</th>
                          <th className="py-2.5 px-3">Nộp lúc</th>
                          <th className="py-2.5 px-3">Đã chờ</th>
                          <th className="py-2.5 px-3">Lần nộp</th>
                          <th className="py-2.5 px-3 text-right">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e0e0e0]">
                        {loading && (
                          <tr>
                            <td colSpan="8" className="py-8 text-center text-[#717971]">
                              Đang tải danh sách hồ sơ tổ chức...
                            </td>
                          </tr>
                        )}
                        {!loading &&
                          orgsQueue.map((org, idx) => (
                            <tr
                              key={org.id}
                              className={`hover:bg-[#F8FAF8] transition-colors ${
                                idx === 0 ? 'border-l-4 border-l-[#2b2b2b] bg-[#fcfcfc]' : ''
                              }`}
                            >
                              <td className="py-3 px-3 font-bold text-[#191C19]">{org.id}</td>
                              <td className="py-3 px-3 font-semibold text-[#191C19]">{org.name}</td>
                              <td className="py-3 px-3 text-[#4a4a4a]">{org.type}</td>
                              <td className="py-3 px-3 font-mono">
                                {org.taxCode !== 'không có' ? (
                                  <span className="font-bold text-[#006B2C]">{org.taxCode}</span>
                                ) : (
                                  <span className="text-[#7a7a7a]">không có</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-[#5f5f5f]">{org.submittedAt}</td>
                              <td className="py-3 px-3 font-semibold text-[#191C19]">{org.waitTime}</td>
                              <td className="py-3 px-3">
                                <span
                                  className={
                                    org.submissionCount.includes('lại')
                                      ? 'font-bold text-[#BA1A1A]'
                                      : 'text-[#5f5f5f]'
                                  }
                                >
                                  {org.submissionCount}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(org)}
                                  className={`text-[10px] font-bold px-3 py-1.5 rounded transition-colors ${
                                    idx === 0
                                      ? 'bg-[#2b2b2b] text-white hover:bg-black'
                                      : 'border border-[#8a8a8a] text-[#2b2b2b] hover:bg-[#f4f4f4]'
                                  }`}
                                >
                                  Xác minh
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ghi chú TC-01 */}
                <div className="p-3 border border-dashed border-[#9a9a9a] rounded-lg text-xs leading-relaxed text-[#4a4a4a] bg-[#fafafa]">
                  Cột <strong className="font-semibold text-[#191C19]">Mã số thuế</strong> nằm ngay ở bảng vì nó quyết định cách xác minh: có mã số thuế thì tra được trên cổng thuế nhà nước (bước bắt buộc); không có — câu lạc bộ trường học, chi hội cấp xã — thì phải gọi điện và hỏi cơ quan cấp phép, mất nhiều thời gian hơn.
                </div>
              </div>
            )}

            {/* TAB LEGAL_CHANGES (TC-05) */}
            {activeMainTab === 'LEGAL_CHANGES' && (
              <div className="space-y-4">
                <div className="text-xs text-[#5f5f5f]">
                  Tổ chức đã xác minh muốn đổi tên, địa chỉ trụ sở hoặc người đại diện pháp lý
                </div>
                <div className="bg-white border border-[#8a8a8a] rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#f4f4f4] border-b border-[#8a8a8a] text-[10px] uppercase font-bold text-[#5f5f5f]">
                        <th className="py-2.5 px-3">Tổ chức</th>
                        <th className="py-2.5 px-3">Trường thay đổi</th>
                        <th className="py-2.5 px-3">Nội dung cũ → mới</th>
                        <th className="py-2.5 px-3">Ngày gửi</th>
                        <th className="py-2.5 px-3">Trạng thái</th>
                        <th className="py-2.5 px-3 text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0e0e0]">
                      {legalChanges.map((chg) => (
                        <tr key={chg.id} className="hover:bg-[#F8FAF8]">
                          <td className="py-3 px-3 font-bold text-[#191C19]">{chg.orgName}</td>
                          <td className="py-3 px-3 font-semibold text-[#006B2C]">{chg.fieldChanged}</td>
                          <td className="py-3 px-3">
                            <span className="text-[#717971] line-through mr-2">{chg.oldValue}</span>
                            <span className="font-bold text-[#191C19]">→ {chg.newValue}</span>
                          </td>
                          <td className="py-3 px-3 text-[#5f5f5f]">{chg.submittedAt}</td>
                          <td className="py-3 px-3 font-semibold">
                            {chg.status === 'PENDING' ? (
                              <Badge variant="warning">Chờ duyệt</Badge>
                            ) : (
                              <Badge variant="success">Đã duyệt</Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {chg.status === 'PENDING' && (
                              <button
                                type="button"
                                onClick={() => handleApproveLegalChange(chg.id)}
                                className="text-[10px] font-bold px-3 py-1.5 rounded bg-[#2b2b2b] text-white hover:bg-black"
                              >
                                Duyệt đổi pháp lý
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: CHI TIẾT XÁC MINH 8 BƯỚC (TC-02) */}
        {viewMode === 'DETAIL' && selectedOrg && (
          <div className="space-y-4">
            {/* Header TC-02 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E0] pb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode('LIST')}
                  className="w-8 h-8 flex items-center justify-center rounded border border-[#8a8a8a] text-sm hover:bg-[#f4f4f4]"
                  title="Quay lại danh sách"
                >
                  ←
                </button>
                <div>
                  <span className="text-xs text-[#5f5f5f]">Hồ sơ tổ chức · </span>
                  <span className="text-sm font-bold text-[#191C19]">
                    {selectedOrg.id} · {selectedOrg.name}
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 border border-[#2b2b2b] rounded bg-white">
                {selectedOrg.type.toUpperCase()}
              </span>
            </div>

            {/* Bố cục 2 cột TC-02 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Cột trái (5.5 cols): Thông tin tổ chức khai & Tệp đính kèm */}
              <div className="lg:col-span-6 space-y-4 border-r border-[#E2E8E0] pr-0 lg:pr-5">
                <div>
                  <h2 className="text-base font-bold text-[#191C19]">Thông tin tổ chức khai</h2>
                </div>

                <div className="border border-[#c4c4c4] rounded-lg divide-y divide-[#e0e0e0] bg-white text-xs">
                  <div className="p-2.5 flex gap-3">
                    <span className="w-28 text-[#5f5f5f] shrink-0">Tên theo giấy tờ</span>
                    <span className="font-bold text-[#191C19]">{selectedOrg.name}</span>
                  </div>
                  <div className="p-2.5 flex gap-3">
                    <span className="w-28 text-[#5f5f5f] shrink-0">Tên hiển thị</span>
                    <span>{selectedOrg.displayName}</span>
                  </div>
                  <div className="p-2.5 flex gap-3">
                    <span className="w-28 text-[#5f5f5f] shrink-0">Mã số thuế</span>
                    <span className="font-bold font-mono">{selectedOrg.taxCode}</span>
                  </div>
                  <div className="p-2.5 flex gap-3">
                    <span className="w-28 text-[#5f5f5f] shrink-0">Phạm vi</span>
                    <span>{selectedOrg.scope}</span>
                  </div>
                  <div className="p-2.5 flex gap-3">
                    <span className="w-28 text-[#5f5f5f] shrink-0">Trụ sở</span>
                    <span className="leading-relaxed">{selectedOrg.address}</span>
                  </div>
                  <div className="p-2.5 flex gap-3">
                    <span className="w-28 text-[#5f5f5f] shrink-0">Liên hệ</span>
                    <span>{selectedOrg.phone} · {selectedOrg.email}</span>
                  </div>
                  <div className="p-2.5 flex gap-3">
                    <span className="w-28 text-[#5f5f5f] shrink-0">Người đại diện</span>
                    <span className="font-semibold text-[#191C19]">{selectedOrg.representative}</span>
                  </div>
                </div>

                {/* Tệp đính kèm */}
                <div className="space-y-2">
                  <h2 className="text-base font-bold text-[#191C19]">Tệp đính kèm</h2>
                  <p className="text-[11px] text-[#5f5f5f]">
                    Hai nhóm bắt buộc cho mọi loại tổ chức. Bấm "Xem ảnh" để kiểm tra con dấu và hiệu lực pháp lý.
                  </p>
                </div>

                <div className="border border-[#8a8a8a] rounded-lg overflow-hidden bg-white text-xs divide-y divide-[#e0e0e0]">
                  {selectedOrg.documents && selectedOrg.documents.length > 0 ? (
                    selectedOrg.documents.map((doc, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-[#fafafa]">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-4 h-4 rounded bg-[#2b2b2b] text-white flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-[#191C19] truncate">{doc.title}</div>
                            <div className="text-[10px] text-[#7a7a7a] truncate">{doc.info}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setViewingDoc(doc)}
                          className="shrink-0 text-[10px] font-semibold px-2.5 py-1.5 border border-[#8a8a8a] rounded bg-white hover:bg-[#f4f4f4]"
                        >
                          Xem ảnh
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-[#717971]">Chưa có tệp đính kèm.</div>
                  )}
                </div>
              </div>

              {/* Cột phải (6 cols): Quy trình kiểm chứng & Hành động */}
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-[#191C19]">Quy trình kiểm chứng</h2>
                  <p className="text-xs text-[#5f5f5f]">
                    Tích đủ các bước bắt buộc mới bấm Xác thực được.
                  </p>
                </div>

                {/* Checklist TC-02 */}
                <div className="border border-[#8a8a8a] rounded-lg divide-y divide-[#e0e0e0] bg-white text-xs">
                  {/* Bước 1: Tra MST */}
                  <label className="p-3 flex items-start gap-3 cursor-pointer hover:bg-[#fafafa]">
                    <input
                      type="checkbox"
                      checked={checklist.taxChecked}
                      onChange={(e) => setChecklist({ ...checklist, taxChecked: e.target.checked })}
                      className="mt-0.5 rounded border-[#8a8a8a]"
                    />
                    <div>
                      <span className="font-semibold text-[#191C19]">
                        Tra mã số thuế trên cổng thuế, đối chiếu tên, địa chỉ, tình trạng hoạt động
                      </span>
                      <span className="block text-[10px] text-[#7a7a7a] mt-0.5">
                        tracuunnt.gdt.gov.vn · bắt buộc vì tổ chức có MST
                      </span>
                    </div>
                  </label>

                  {/* Bước 2: Cổng ĐKKD (cho DNXH) */}
                  <label
                    className={`p-3 flex items-start gap-3 ${
                      !isEnterprise ? 'opacity-60 bg-[#fafafa]' : 'cursor-pointer hover:bg-[#fafafa]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checklist.businessChecked}
                      onChange={(e) => setChecklist({ ...checklist, businessChecked: e.target.checked })}
                      className="mt-0.5 rounded border-[#8a8a8a]"
                    />
                    <div>
                      <span className="font-semibold text-[#191C19]">
                        Đối chiếu trên cổng đăng ký doanh nghiệp
                      </span>
                      <span className="block text-[10px] text-[#7a7a7a] mt-0.5">
                        {isEnterprise
                          ? 'dangkykinhdoanh.gov.vn · bắt buộc cho Doanh nghiệp xã hội'
                          : 'Chỉ áp dụng cho doanh nghiệp xã hội — hồ sơ này không bắt buộc'}
                      </span>
                    </div>
                    {!isEnterprise && (
                      <span className="text-[9px] px-2 py-0.5 border border-[#c4c4c4] text-[#7a7a7a] rounded ml-auto">
                        không bắt buộc
                      </span>
                    )}
                  </label>

                  {/* Bước 3: Kiểm ảnh giấy tờ */}
                  <label className="p-3 flex items-start gap-3 cursor-pointer hover:bg-[#fafafa]">
                    <input
                      type="checkbox"
                      checked={checklist.docsValid}
                      onChange={(e) => setChecklist({ ...checklist, docsValid: e.target.checked })}
                      className="mt-0.5 rounded border-[#8a8a8a]"
                    />
                    <div>
                      <span className="font-semibold text-[#191C19]">
                        Kiểm ảnh giấy tờ: còn hiệu lực, rõ nét, có ngày cấp và dấu, tên khớp thông tin khai
                      </span>
                    </div>
                  </label>

                  {/* Bước 4: Đối chiếu CCCD */}
                  <label className="p-3 flex items-start gap-3 cursor-pointer hover:bg-[#fafafa]">
                    <input
                      type="checkbox"
                      checked={checklist.cccdMatched}
                      onChange={(e) => setChecklist({ ...checklist, cccdMatched: e.target.checked })}
                      className="mt-0.5 rounded border-[#8a8a8a]"
                    />
                    <div>
                      <span className="font-semibold text-[#191C19]">
                        Đối chiếu tên trên CCCD với tên người đại diện ghi trên giấy phép
                      </span>
                    </div>
                  </label>

                  {/* Bước 5: Gọi điện xác nhận */}
                  <label className="p-3 flex items-start gap-3 cursor-pointer hover:bg-[#fafafa]">
                    <input
                      type="checkbox"
                      checked={checklist.phoneConfirmed}
                      onChange={(e) => setChecklist({ ...checklist, phoneConfirmed: e.target.checked })}
                      className="mt-0.5 rounded border-[#8a8a8a]"
                    />
                    <div>
                      <span className="font-semibold text-[#191C19]">
                        Gọi điện hoặc email tới số công khai của tổ chức, xác nhận đúng họ nộp hồ sơ
                      </span>
                    </div>
                  </label>

                  {/* Bước 6: Cơ quan cấp phép */}
                  <label className="p-3 flex items-start gap-3 opacity-60 bg-[#fafafa]">
                    <input
                      type="checkbox"
                      checked={checklist.authorityChecked}
                      onChange={(e) => setChecklist({ ...checklist, authorityChecked: e.target.checked })}
                      className="mt-0.5 rounded border-[#8a8a8a]"
                    />
                    <div>
                      <span className="font-semibold text-[#191C19]">
                        Gửi văn bản hỏi cơ quan đã cấp phép
                      </span>
                      <span className="block text-[10px] text-[#7a7a7a] mt-0.5">
                        Chỉ làm khi nghi ngờ — không bắt buộc
                      </span>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 border border-[#c4c4c4] text-[#7a7a7a] rounded ml-auto">
                      không bắt buộc
                    </span>
                  </label>

                  {/* Bước 7: Báo chí & MXH */}
                  <label className="p-3 flex items-start gap-3 cursor-pointer hover:bg-[#fafafa]">
                    <input
                      type="checkbox"
                      checked={checklist.reputationChecked}
                      onChange={(e) => setChecklist({ ...checklist, reputationChecked: e.target.checked })}
                      className="mt-0.5 rounded border-[#8a8a8a]"
                    />
                    <div>
                      <span className="font-semibold text-[#191C19]">
                        Tìm tên tổ chức trên báo chí và mạng xã hội xem có dấu hiệu lừa đảo
                      </span>
                    </div>
                  </label>
                </div>

                {/* Audit Log Note */}
                <div className="border border-[#c4c4c4] rounded-lg p-3.5 bg-white text-xs space-y-2">
                  <div className="text-[10px] uppercase font-bold text-[#6b6b6b] tracking-wider">
                    Ghi chú xác minh · lưu vào audit log
                  </div>
                  <textarea
                    rows="2"
                    value={auditNote}
                    onChange={(e) => setAuditNote(e.target.value)}
                    placeholder="Ghi chú chi tiết cuộc gọi, người tiếp chuyện..."
                    className="w-full text-xs p-2 border border-[#8a8a8a] rounded"
                  />
                </div>

                {/* Footer Buttons TC-02 */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    disabled={!isChecklistComplete}
                    onClick={handleApproveOrg}
                    className={`py-2.5 px-6 rounded text-xs font-bold transition-all ${
                      isChecklistComplete
                        ? 'bg-[#2b2b2b] text-white hover:bg-black cursor-pointer'
                        : 'bg-[#efefef] text-[#9a9a9a] border border-[#c4c4c4] cursor-not-allowed'
                    }`}
                  >
                    Xác thực tổ chức
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRejectModalOpen(true)}
                    className="py-2.5 px-4 rounded border border-[#8a8a8a] text-xs font-semibold hover:bg-[#f4f4f4]"
                  >
                    Từ chối kèm lý do
                  </button>
                  {!isChecklistComplete && (
                    <span className="text-[11px] text-[#BA1A1A]">
                      Còn {mandatoryItemsLeft} bước bắt buộc chưa tích — nút Xác thực đang khóa
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL TC-03: Xem ảnh phóng to giấy tờ */}
        <Modal
          isOpen={!!viewingDoc}
          onClose={() => setViewingDoc(null)}
          title={viewingDoc ? viewingDoc.title : 'Xem tài liệu'}
        >
          {viewingDoc && (
            <div className="space-y-3">
              <div className="text-xs text-[#5f5f5f]">{viewingDoc.info}</div>
              <img
                src={viewingDoc.url}
                alt={viewingDoc.title}
                className="w-full max-h-[480px] object-contain rounded border border-[#c4c4c4] bg-[#f9f9f9]"
              />
              <div className="text-right pt-2">
                <Button size="sm" variant="outline" onClick={() => setViewingDoc(null)}>
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* MODAL TC-04: Từ chối hồ sơ kèm lý do */}
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title="Từ chối hồ sơ tổ chức"
        >
          <div className="space-y-4 text-xs">
            <p className="text-[#4a4a4a]">
              Lý do từ chối sẽ được gửi trực tiếp tới email và thông báo của tổ chức để họ bổ sung nộp lại:
            </p>
            <div>
              <label className="block font-bold text-[#191C19] mb-1">Lý do từ chối *</label>
              <textarea
                rows="3"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ví dụ: Giấy phép hết hiệu lực, ảnh CCCD bị mờ không đọc được số, con dấu không rõ..."
                className="w-full p-2.5 border border-[#8a8a8a] rounded"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setIsRejectModalOpen(false)}>
                Hủy
              </Button>
              <Button size="sm" variant="danger" onClick={handleConfirmReject}>
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ModeratorLayout>
  );
}
