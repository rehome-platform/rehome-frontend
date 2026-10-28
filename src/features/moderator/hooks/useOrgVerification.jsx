import React, { useState, useEffect } from "react";

import { orgVerificationService } from "../services/orgVerificationApi.js";

export function useOrgVerification() {
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

    return {
    viewMode,
    setActiveMainTab,
    activeMainTab,
    orgsQueue,
    legalChanges,
    setActiveQueueTab,
    activeQueueTab,
    loading,
    handleOpenDetail,
    handleApproveLegalChange,
    selectedOrg,
    setViewMode,
    setViewingDoc,
    checklist,
    setChecklist,
    isEnterprise,
    auditNote,
    setAuditNote,
    isChecklistComplete,
    handleApproveOrg,
    setIsRejectModalOpen,
    mandatoryItemsLeft,
    viewingDoc,
    isRejectModalOpen,
    rejectReason,
    setRejectReason,
    handleConfirmReject,
      sections: {
      VerificationQueueTabs: { setActiveQueueTab, activeQueueTab, orgsQueue },
      VerificationQueueTable: { loading, orgsQueue, handleOpenDetail },
      VerificationChecklist: { checklist, setChecklist, isEnterprise },
      VerificationRejectDialog: { isRejectModalOpen, setIsRejectModalOpen, rejectReason, setRejectReason, handleConfirmReject },
    },
  };
}
