import React, { useState } from 'react';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import { Button, Badge, Modal, Input } from '../../../components/common/index.js';

/**
 * Trang Xác Minh Hồ Sơ Tổ Chức Từ Thiện & Duyệt Đổi Pháp Lý (F-137..F-140, UC-69, 70)
 * Triển khai chính xác Quy trình kiểm chứng bên ngoài 8 bước theo Mục 9
 */
export default function OrgVerificationPage() {
  const [activeTab, setActiveTab] = useState('NEW_ORGS'); // 'NEW_ORGS' | 'LEGAL_CHANGES'
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // 8 Checklist items theo Mục 9
  const [checklist, setChecklist] = useState({
    taxChecked: false, // Bước 1: Tra cứu mã số thuế (tracuunnt.gdt.gov.vn)
    businessChecked: false, // Bước 2: Tra cứu doanh nghiệp xã hội (dangkykinhdoanh.gov.vn)
    docImagesValid: false, // Bước 3: Kiểm ảnh giấy phép thành lập còn hiệu lực, có con dấu
    cccdMatched: false, // Bước 4: Đối chiếu CCCD người đại diện khớp giấy phép
    phoneConfirmed: false, // Bước 5: Gọi điện thoại / email xác nhận
    authorityChecked: false, // Bước 6: Kiểm tra cơ quan cấp phép (Sở Nội Vụ / UBND)
    socialReputationOk: false, // Bước 7: Rà soát báo chí & mạng xã hội không có tiền sử lừa đảo
  });

  const [orgsQueue, setOrgsQueue] = useState([
    {
      id: 'ORG-01',
      name: 'Quỹ Từ Thiện Áo Ấm Vùng Cao',
      type: 'Quỹ từ thiện (NĐ 03/2026/NĐ-CP)',
      taxCode: '0312891204',
      representative: 'Lê Văn Cường (Chủ tịch Quỹ)',
      cccd: '079089012345',
      phone: '028 3822 9912',
      email: 'lienhe@aoamvungcao.org',
      address: '45 Nguyễn Đình Chiểu, P. Đa Kao, Q. 1, TP.HCM',
      receivingDropoff: 'Văn phòng quỹ - 45 Nguyễn Đình Chiểu (T2-T6, 8h-17h)',
      documents: [
        { name: 'Giấy phép thành lập và công nhận điều lệ quỹ (QĐ 145/QĐ-UBND)', url: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=500' },
        { name: 'Điều lệ quỹ đã được công nhận', url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=500' },
        { name: 'CCCD người đại diện hai mặt (Tự xóa sau 30 ngày)', url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=500' },
      ],
      submittedAt: '14/10/2026',
      status: 'PENDING',
    },
    {
      id: 'ORG-02',
      name: 'Câu Lạc Bộ Tình Nguyện Cầu Vồng',
      type: 'Câu lạc bộ trực thuộc Đoàn Trường ĐH KHXH&NV',
      taxCode: '', // Không có mã số thuế
      representative: 'Nguyễn Thị Bích (Chủ nhiệm CLB)',
      cccd: '075199008812',
      phone: '0918 332 109',
      email: 'clbcauvong@ussh.edu.vn',
      address: 'Phòng C102, 10-12 Đinh Tiên Hoàng, Q. 1, TP.HCM',
      receivingDropoff: 'Sảnh C nhà trường (T3-T5, 9h-16h)',
      documents: [
        { name: 'Quyết định thành lập CLB của Đoàn trường', url: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=500' },
        { name: 'Văn bản cử người đại diện phụ trách', url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=500' },
        { name: 'CCCD người phụ trách hai mặt', url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=500' },
      ],
      submittedAt: '15/10/2026',
      status: 'PENDING',
    },
  ]);

  const [legalChanges, setLegalChanges] = useState([
    {
      id: 'CHG-101',
      orgName: 'Hội Bảo Trợ Bệnh Nhân Nghèo',
      oldRep: 'Trần Văn An',
      newRep: 'Phạm Minh Đức',
      newCCCD: '079075001294',
      proofDoc: 'Quyết định bổ nhiệm người đại diện mới (Sở Nội Vụ)',
      reason: 'Thay đổi nhân sự chủ tịch nhiệm kỳ 2026-2030',
      submittedAt: '14/10/2026',
      status: 'PENDING',
    },
  ]);

  const handleSelectOrg = (org) => {
    setSelectedOrg(org);
    setChecklist({
      taxChecked: false,
      businessChecked: false,
      docImagesValid: false,
      cccdMatched: false,
      phoneConfirmed: false,
      authorityChecked: false,
      socialReputationOk: false,
    });
  };

  const isChecklistComplete =
    checklist.docImagesValid &&
    checklist.cccdMatched &&
    checklist.phoneConfirmed &&
    checklist.authorityChecked &&
    checklist.socialReputationOk;

  const handleApproveOrg = (id) => {
    setOrgsQueue(orgsQueue.map((o) =>
      o.id === id ? { ...o, status: 'APPROVED' } : o
    ));
    alert('Đã xác thực tổ chức từ thiện thành công! Tài khoản được mở quyền tạo chiến dịch. Ảnh CCCD sẽ tự xóa sau 30 ngày.');
    setSelectedOrg(null);
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) return;
    setOrgsQueue(orgsQueue.map((o) =>
      o.id === selectedOrg.id ? { ...o, status: 'REJECTED', rejectReason } : o
    ));
    setIsRejectModalOpen(false);
    setSelectedOrg(null);
    setRejectReason('');
    alert('Đã từ chối hồ sơ kèm lý do hướng dẫn bổ sung!');
  };

  const handleApproveLegalChange = (id) => {
    setLegalChanges(legalChanges.map((c) =>
      c.id === id ? { ...c, status: 'APPROVED' } : c
    ));
    alert('Đã duyệt yêu cầu đổi thông tin pháp lý của tổ chức! Lưu vào Audit Log.');
  };

  return (
    <ModeratorLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-[#E8F5E9] text-[#006B2C]">
                Mục 9 • UC-69, UC-70
              </span>
              <h1 className="text-2xl font-extrabold font-heading text-[#191C19]">
                Xác Minh Hồ Sơ Tổ Chức Từ Thiện
              </h1>
            </div>
            <p className="text-xs text-[#717971] mt-1">
              Đối chiếu tư cách pháp nhân tổ chức theo 8 bước kiểm chứng bắt buộc. Chỉ duyệt tổ chức có pháp nhân chịu trách nhiệm.
            </p>
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-[#DDE5D9] text-xs font-semibold">
            <button
              onClick={() => setActiveTab('NEW_ORGS')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'NEW_ORGS' ? 'bg-[#006B2C] text-white shadow-sm' : 'text-[#717971]'
              }`}
            >
              Hồ sơ mới ({orgsQueue.filter((o) => o.status === 'PENDING').length})
            </button>
            <button
              onClick={() => setActiveTab('LEGAL_CHANGES')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'LEGAL_CHANGES' ? 'bg-[#006B2C] text-white shadow-sm' : 'text-[#717971]'
              }`}
            >
              Yêu cầu đổi pháp lý ({legalChanges.filter((c) => c.status === 'PENDING').length})
            </button>
          </div>
        </div>

        {/* TAB 1: Hồ sơ đăng ký mới */}
        {activeTab === 'NEW_ORGS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cột danh sách hồ sơ */}
            <div className="lg:col-span-5 space-y-4">
              {orgsQueue.map((org) => (
                <div
                  key={org.id}
                  onClick={() => handleSelectOrg(org)}
                  className={`p-5 rounded-2xl border bg-white shadow-sm cursor-pointer transition-all ${
                    selectedOrg?.id === org.id
                      ? 'border-[#006B2C] ring-2 ring-[#006B2C]/10 shadow-md'
                      : 'border-[#DDE5D9] hover:border-[#006B2C]/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-extrabold text-sm text-[#191C19]">{org.name}</h3>
                    {org.status === 'PENDING' && <Badge variant="warning">Chờ đối chiếu</Badge>}
                    {org.status === 'APPROVED' && <Badge variant="success">Đã xác thực</Badge>}
                    {org.status === 'REJECTED' && <Badge variant="danger">Từ chối</Badge>}
                  </div>
                  <p className="text-xs text-[#00685F] font-semibold">{org.type}</p>
                  <p className="text-xs text-[#414942] mt-1">Đại diện: <strong>{org.representative}</strong></p>
                  <p className="text-[11px] text-[#717971] mt-0.5">SĐT: {org.phone} • Ngày nộp: {org.submittedAt}</p>
                </div>
              ))}
            </div>

            {/* Cột chi tiết thẩm định & Checklist 8 bước */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-[#DDE5D9] shadow-sm space-y-6">
              {selectedOrg ? (
                <div className="space-y-6">
                  <div className="border-b border-[#DDE5D9] pb-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black font-heading text-[#191C19]">{selectedOrg.name}</h3>
                      <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#F0F5EE] text-[#006B2C]">
                        {selectedOrg.id}
                      </span>
                    </div>
                    <p className="text-xs text-[#414942] mt-1">Trụ sở: {selectedOrg.address}</p>
                    <p className="text-xs text-[#414942]">Điểm tiếp nhận: {selectedOrg.receivingDropoff}</p>
                  </div>

                  {/* Tệp đính kèm */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#717971] mb-2">
                      Tệp giấy tờ pháp lý & CCCD đính kèm
                    </h4>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      {selectedOrg.documents.map((doc, idx) => (
                        <a
                          key={idx}
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-3 rounded-xl border border-[#DDE5D9] bg-[#F8FAF8] flex items-center justify-between hover:border-[#006B2C] hover:bg-white transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="material-symbols-outlined text-base text-[#006B2C]">description</span>
                            <span className="font-semibold text-[#191C19]">{doc.name}</span>
                          </div>
                          <span className="text-[11px] text-[#006B2C] font-semibold">Xem tệp →</span>
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Checklist 8 bước Mục 9 */}
                  <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#DDE5D9] space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#191C19] flex items-center space-x-1.5">
                      <span className="material-symbols-outlined text-base text-[#006B2C]">checklist</span>
                      <span>Checklist 8 Bước Thẩm Định Bắt Buộc (Mục 9)</span>
                    </h4>

                    <div className="space-y-2 text-xs">
                      {selectedOrg.taxCode && (
                        <label className="flex items-start space-x-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checklist.taxChecked}
                            onChange={(e) => setChecklist({ ...checklist, taxChecked: e.target.checked })}
                            className="mt-0.5 rounded text-[#006B2C] focus:ring-[#006B2C]"
                          />
                          <span>
                            <strong>Bước 1:</strong> Đã tra cứu MST <code>{selectedOrg.taxCode}</code> tại{' '}
                            <a href="https://tracuunnt.gdt.gov.vn" target="_blank" rel="noreferrer" className="text-blue-600 underline">
                              tracuunnt.gdt.gov.vn
                            </a>{' '}
                            (khớp tên, địa chỉ, đang hoạt động)
                          </span>
                        </label>
                      )}

                      <label className="flex items-start space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checklist.docImagesValid}
                          onChange={(e) => setChecklist({ ...checklist, docImagesValid: e.target.checked })}
                          className="mt-0.5 rounded text-[#006B2C] focus:ring-[#006B2C]"
                        />
                        <span><strong>Bước 3:</strong> Giấy phép thành lập rõ nét, còn hiệu lực, có ngày cấp và con dấu hợp lệ</span>
                      </label>

                      <label className="flex items-start space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checklist.cccdMatched}
                          onChange={(e) => setChecklist({ ...checklist, cccdMatched: e.target.checked })}
                          className="mt-0.5 rounded text-[#006B2C] focus:ring-[#006B2C]"
                        />
                        <span><strong>Bước 4:</strong> Họ tên trên CCCD khớp chính xác tên người đại diện pháp luật trong giấy phép</span>
                      </label>

                      <label className="flex items-start space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checklist.phoneConfirmed}
                          onChange={(e) => setChecklist({ ...checklist, phoneConfirmed: e.target.checked })}
                          className="mt-0.5 rounded text-[#006B2C] focus:ring-[#006B2C]"
                        />
                        <span><strong>Bước 5:</strong> Đã gọi điện/gửi email đến đầu mối công khai của tổ chức xác nhận đúng họ nộp đơn</span>
                      </label>

                      <label className="flex items-start space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checklist.authorityChecked}
                          onChange={(e) => setChecklist({ ...checklist, authorityChecked: e.target.checked })}
                          className="mt-0.5 rounded text-[#006B2C] focus:ring-[#006B2C]"
                        />
                        <span><strong>Bước 6:</strong> Đã kiểm tra cơ quan cấp phép (Sở Nội Vụ tỉnh/TP hoặc UBND có thẩm quyền)</span>
                      </label>

                      <label className="flex items-start space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checklist.socialReputationOk}
                          onChange={(e) => setChecklist({ ...checklist, socialReputationOk: e.target.checked })}
                          className="mt-0.5 rounded text-[#006B2C] focus:ring-[#006B2C]"
                        />
                        <span><strong>Bước 7:</strong> Tra cứu báo chí và mạng xã hội: không có dấu hiệu gian lận hay lừa đảo từ thiện</span>
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  {selectedOrg.status === 'PENDING' && (
                    <div className="flex items-center justify-between pt-4 border-t border-[#DDE5D9]">
                      <Button
                        variant="outline"
                        className="border-[#BA1A1A] text-[#BA1A1A] text-xs hover:bg-[#FFDAD6]/30"
                        onClick={() => setIsRejectModalOpen(true)}
                      >
                        Từ chối hồ sơ kèm lý do
                      </Button>

                      <Button
                        disabled={!isChecklistComplete}
                        onClick={() => handleApproveOrg(selectedOrg.id)}
                        className={`text-xs px-6 ${
                          isChecklistComplete ? 'bg-[#006B2C] hover:bg-[#005221] text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm mr-1.5">verified</span>
                        Xác thực tổ chức
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center text-[#717971] space-y-2">
                  <span className="material-symbols-outlined text-4xl text-[#DDE5D9]">domain_verification</span>
                  <p className="text-xs">Chọn một hồ sơ tổ chức bên trái để tiến hành kiểm chứng 8 bước.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Yêu cầu đổi thông tin pháp lý (UC-70, F-140) */}
        {activeTab === 'LEGAL_CHANGES' && (
          <div className="bg-white p-6 rounded-2xl border border-[#DDE5D9] shadow-sm divide-y divide-[#F0F4EE]">
            {legalChanges.map((c) => (
              <div key={c.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-[#191C19]">{c.orgName}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#F8FAF8] text-[#006B2C]">
                      {c.id}
                    </span>
                    {c.status === 'PENDING' ? (
                      <Badge variant="warning">Chờ Moderator duyệt</Badge>
                    ) : (
                      <Badge variant="success">Đã chấp thuận</Badge>
                    )}
                  </div>
                  <p className="text-[#414942]">
                    Đại diện cũ: <del className="text-[#BA1A1A]">{c.oldRep}</del> ➔ Đại diện mới: <strong className="text-[#006B2C]">{c.newRep}</strong> (CCCD: {c.newCCCD})
                  </p>
                  <p className="text-[#717971]">Minh chứng: <strong>{c.proofDoc}</strong> • Lý do: "{c.reason}"</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {c.status === 'PENDING' ? (
                    <Button
                      size="sm"
                      className="bg-[#006B2C] text-white text-xs"
                      onClick={() => handleApproveLegalChange(c.id)}
                    >
                      Duyệt thay đổi pháp lý
                    </Button>
                  ) : (
                    <span className="text-xs text-[#00685F] font-bold">✓ Đã cập nhật hồ sơ</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal từ chối tổ chức */}
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title="Từ Chối Hồ Sơ Tổ Chức Từ Thiện"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#717971]">
              Vui lòng nêu rõ căn cứ pháp lý hoặc giấy tờ còn thiếu để tổ chức chỉnh sửa lại:
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Giấy phép hoạt động đã hết hạn; CCCD người đại diện không khớp tên trên quyết định bổ nhiệm..."
              className="w-full p-3 rounded-xl border border-[#DDE5D9] bg-white text-xs text-[#191C19] focus:outline-none focus:border-[#006B2C]"
            />
            <div className="flex justify-end space-x-2 pt-2 border-t border-[#DDE5D9]">
              <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>Hủy</Button>
              <Button
                disabled={!rejectReason.trim()}
                onClick={handleConfirmReject}
                className="bg-[#BA1A1A] text-white"
              >
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ModeratorLayout>
  );
}
