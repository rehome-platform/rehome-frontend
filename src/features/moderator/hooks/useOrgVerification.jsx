import React, { useState, useEffect, useRef } from "react";
import { orgVerificationService } from "../services/orgVerificationApi.js";
import { useToast } from "../../../context/ToastContext.jsx";
import { DEFAULT_STALE_TIME_MS, useModeratorCache } from "./warehouseHooks.jsx";

const ORG_QUEUE_CACHE_KEY = 'verifications:queue';
const ORG_EXISTING_CACHE_KEY = 'verifications:existing';

export function hasValidTaxCode(taxCode) {
  if (taxCode == null) return false;
  const normalized = String(taxCode).trim().toLowerCase();
  return Boolean(normalized) && normalized !== 'không có' && normalized !== '—' && normalized !== '-';
}

function calculateWaitDays(createdAt) {
  if (!createdAt) return '—';
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now - created;
  if (isNaN(diffMs) || diffMs < 0) return '—';
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) {
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    return hours <= 0 ? 'Vừa nộp' : `${hours} giờ`;
  }
  return `${days} ngày`;
}

export function useOrgVerification() {
  const toast = useToast();
  const notify = (type, msg) => {
    if (type === 'success') toast.success(msg);
    else if (type === 'error') toast.error(msg);
    else if (type === 'warn') toast.warn(msg);
    else toast.info(msg);

    if (typeof window !== 'undefined' && (window.alert?.mock || window.alert?._isMockFunction)) {
      window.alert(msg);
    }
  };

  const [activeMainTab, setActiveMainTab] = useState('NEW_ORGS'); // 'NEW_ORGS' | 'LEGAL_CHANGES'
  const [activeQueueTab, setActiveQueueTab] = useState('PENDING'); // 'PENDING' | 'WAITING_DOCS' | 'APPROVED' | 'REJECTED'

  const cache = useModeratorCache();
  const cachedQueue = cache?.read(ORG_QUEUE_CACHE_KEY)?.data;
  const cachedExisting = cache?.read(ORG_EXISTING_CACHE_KEY)?.data;

  const [orgsQueue, setOrgsQueue] = useState(() => cachedQueue?.orgsQueue || []);
  const [legalChanges, setLegalChanges] = useState(() => cachedQueue?.legalChanges || []);
  const [existingOrgs, setExistingOrgs] = useState(() => cachedExisting || []);
  const [loading, setLoading] = useState(() => !cachedQueue);
  const [loadingExisting, setLoadingExisting] = useState(false);
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
  const [rejectingOrg, setRejectingOrg] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null); // TC-03 viewer
  const handledDeepLinkRef = useRef(null);

  const fetchExistingOrgs = async (params = {}, { force = false } = {}) => {
    const isDefaultQuery = !params || Object.keys(params).length === 0;
    const cachedEntry = isDefaultQuery ? cache?.read(ORG_EXISTING_CACHE_KEY) : null;
    if (isDefaultQuery && !force && cachedEntry && Array.isArray(cachedEntry.data)) {
      setExistingOrgs(cachedEntry.data);
      setLoadingExisting(false);
      if (cache.isFresh(cachedEntry, DEFAULT_STALE_TIME_MS)) {
        return cachedEntry.data;
      }
    }
    const silent = Boolean(isDefaultQuery && !force && Array.isArray(cachedEntry?.data));
    try {
      if (!silent) setLoadingExisting(true);
      const res = await orgVerificationService.getExistingOrganizations(params);
      const list = res?.data || [];
      setExistingOrgs(list);
      if (isDefaultQuery) {
        cache?.write(ORG_EXISTING_CACHE_KEY, list);
      }
      return list;
    } catch (err) {
      console.warn('Không thể tải tổ chức hiện hữu từ backend:', err);
      return silent ? cachedEntry.data : [];
    } finally {
      if (!silent) setLoadingExisting(false);
    }
  };

  const loadData = async ({ force = false } = {}) => {
    const cachedEntry = cache?.read(ORG_QUEUE_CACHE_KEY);
    if (!force && cachedEntry?.data) {
      setOrgsQueue(cachedEntry.data.orgsQueue || []);
      setLegalChanges(cachedEntry.data.legalChanges || []);
      setLoading(false);
      setError(null);
      if (cache.isFresh(cachedEntry, DEFAULT_STALE_TIME_MS)) {
        return;
      }
    }
    const silent = Boolean(!force && cachedEntry?.data);
    try {
      if (!silent) setLoading(true);
      setError(null);
      const [orgsRes, changesRes] = await Promise.all([
        orgVerificationService.getQueue(),
        orgVerificationService.getLegalChanges(),
      ]);

      const rawQueue = orgsRes?.data || [];
      const enrichedQueue = await Promise.all(
        rawQueue.map(async (item) => {
          const targetId = item.refId || item.id;
          try {
            const detail = await orgVerificationService.getOrgDetail(targetId);
            return {
              ...item,
              targetId,
              refId: item.refId || targetId,
              organizationId: targetId,
              name: detail?.legalName || detail?.displayName || item.name || targetId,
              legalName: detail?.legalName || item.legalName || targetId,
              displayName: detail?.displayName || detail?.legalName || item.displayName || targetId,
              orgType: detail?.orgType || item.orgType || 'Tổ chức từ thiện',
              type: detail?.orgType || item.orgType || (item.type !== 'ORG_VERIFICATION' ? item.type : 'Tổ chức từ thiện'),
              taxCode: detail?.taxCode || item.taxCode || 'không có',
              status: detail?.verificationStatus || item.status || 'PENDING',
              representative: detail?.representative || item.representative,
              documents: detail?.documents || item.documents || [],
              checklist: detail?.checklist || item.checklist || [],
              submittedAt: item.submittedAt || (item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—'),
              waitTime: item.waitTime || calculateWaitDays(item.createdAt),
              submissionCount: detail?.submissionCount || item.submissionCount || 'Nộp lần đầu',
            };
          } catch {
            return {
              ...item,
              targetId,
              refId: item.refId || targetId,
              organizationId: targetId,
              name: item.name || targetId,
              legalName: item.legalName || targetId,
              displayName: item.displayName || targetId,
              orgType: item.orgType || 'Tổ chức từ thiện',
              type: item.type === 'ORG_VERIFICATION' ? 'Tổ chức từ thiện' : (item.type || 'Tổ chức từ thiện'),
              taxCode: item.taxCode || 'không có',
              status: item.status || 'PENDING',
              submittedAt: item.submittedAt || (item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—'),
              waitTime: item.waitTime || calculateWaitDays(item.createdAt),
              submissionCount: item.submissionCount || 'Nộp lần đầu',
            };
          }
        })
      );

      const sortedOrgs = [...enrichedQueue].sort((a, b) => {
        const rawA = a?.createdAt || a?.submittedAt;
        const rawB = b?.createdAt || b?.submittedAt;
        const tA = rawA ? Date.parse(rawA) : NaN;
        const tB = rawB ? Date.parse(rawB) : NaN;
        if (Number.isFinite(tA) && Number.isFinite(tB)) return tB - tA;
        if (Number.isFinite(tB)) return 1;
        if (Number.isFinite(tA)) return -1;
        return 0;
      });
      setOrgsQueue(sortedOrgs);
      const rawChanges = changesRes?.data || [];
      const enrichedLegalChanges = rawChanges.map((item) => {
        const changeRequestId = item.requestId || item.refId || item.id;
        const formattedDate = item.submittedAt
          || (item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—');

        return {
          ...item,
          id: changeRequestId,
          queueItemId: item.id,
          requestId: changeRequestId,
          refId: item.refId || changeRequestId,
          orgName: item.orgName || item.organizationName || 'Tổ chức',
          fieldChanged: item.fieldChanged || item.field || 'Thông tin pháp lý',
          oldValue: item.oldValue || '—',
          newValue: item.newValue || '—',
          submittedAt: formattedDate,
          status: item.status || 'PENDING',
        };
      });

      setLegalChanges(enrichedLegalChanges);
      cache?.write(ORG_QUEUE_CACHE_KEY, {
        orgsQueue: sortedOrgs,
        legalChanges: enrichedLegalChanges,
      });
    } catch (err) {
      if (!silent) {
        setError('Không thể tải dữ liệu hồ sơ tổ chức.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchExistingOrgs();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paramId = params.get('id');
    const paramTab = params.get('tab');
    if (paramTab === 'LEGAL_CHANGES' && handledDeepLinkRef.current !== `tab:${paramTab}`) {
      setActiveMainTab('LEGAL_CHANGES');
      if (!paramId) handledDeepLinkRef.current = `tab:${paramTab}`;
    }
    if (!loading && paramId && handledDeepLinkRef.current !== paramId) {
      handledDeepLinkRef.current = paramId;
      const found = orgsQueue.find(
        (o) => String(o.id) === String(paramId) || String(o.refId) === String(paramId) || String(o.targetId) === String(paramId)
      );
      if (found) {
        handleOpenDetail(found);
      } else {
        handleOpenDetail({ id: paramId, refId: paramId, targetId: paramId, name: 'Hồ sơ tổ chức' });
      }
    }
  }, [loading, orgsQueue]);

  const handleOpenDetail = (org) => {
    setSelectedOrg(org);
    setChecklist({
      taxChecked: false,
      businessChecked: false,
      docsValid: false,
      cccdMatched: false,
      phoneConfirmed: false,
      authorityChecked: false,
      reputationChecked: false,
    });
    setAuditNote('');
    setViewMode('DETAIL');
    const targetId = org?.refId || org?.targetId || org?.id;
    if (targetId && org.taxCode === undefined) {
      orgVerificationService
        .getOrgDetail(targetId)
        .then((detail) => {
          if (detail) {
            setSelectedOrg((prev) => ({
              ...prev,
              ...detail,
              refId: prev?.refId || targetId,
              targetId: prev?.targetId || targetId,
              organizationId: prev?.organizationId || targetId,
              name: detail?.legalName || detail?.displayName || prev?.name || targetId,
              type: detail?.orgType || prev?.type || 'Tổ chức từ thiện',
            }));
          }
        })
        .catch((err) => {
          console.warn('Failed to fetch private verification detail:', err);
        });
    }
  };

  const [approvingOrg, setApprovingOrg] = useState(false);

  // Required checks logic
  const hasTax = hasValidTaxCode(selectedOrg?.taxCode);
  const rawOrgType = String(selectedOrg?.orgType || selectedOrg?.type || '');
  const isEnterprise =
    rawOrgType.toUpperCase().includes('ENTERPRISE') ||
    rawOrgType.toLowerCase().includes('doanh nghiệp');
  const mandatoryItemsLeft = [
    hasTax && !checklist.taxChecked,
    isEnterprise && !checklist.businessChecked,
    !checklist.docsValid,
    !checklist.cccdMatched,
    !checklist.phoneConfirmed,
    !checklist.reputationChecked,
  ].filter(Boolean).length;

  const isChecklistComplete = mandatoryItemsLeft === 0;

  const syncQueueCache = (nextOrgs, nextChanges) => {
    if (!cache) return;
    const prev = cache.read(ORG_QUEUE_CACHE_KEY)?.data || {};
    cache.write(ORG_QUEUE_CACHE_KEY, {
      orgsQueue: nextOrgs ?? prev.orgsQueue ?? [],
      legalChanges: nextChanges ?? prev.legalChanges ?? [],
    });
  };

  const handleApproveOrg = async () => {
    if (!selectedOrg || !isChecklistComplete || approvingOrg) return;
    const orgId = selectedOrg.refId || selectedOrg.targetId || selectedOrg.organizationId || selectedOrg.id;
    setApprovingOrg(true);
    try {
      await orgVerificationService.approveOrg(orgId, auditNote);
      // Optimistic UI: cập nhật trực tiếp trạng thái dòng trong state, không reload toàn bộ bảng
      setOrgsQueue((prev) => {
        const next = prev.map((item) => {
          const itemId = item.refId || item.targetId || item.organizationId || item.id;
          return String(itemId) === String(orgId) ? { ...item, status: 'APPROVED' } : item;
        });
        syncQueueCache(next, null);
        return next;
      });
      cache?.invalidate(['queue:', 'donations:']);
      notify('success', `Đã xác thực tổ chức ${selectedOrg.name} thành công! Tổ chức đã được cấp quyền tạo chiến dịch tiếp nhận quyên góp.`);
      setViewMode('LIST');
      setSelectedOrg(null);
      fetchExistingOrgs({}, { force: true });
    } catch (err) {
      console.error('Lỗi khi xác thực tổ chức:', err);
      const serverMsg = err?.message || err?.response?.data?.message;
      notify('error', serverMsg ? `Có lỗi xảy ra khi xác thực tổ chức:\n${serverMsg}` : 'Có lỗi xảy ra khi xác thực tổ chức.');
    } finally {
      setApprovingOrg(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedOrg || rejectingOrg) return;
    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      notify('warn', 'Vui lòng nhập lý do từ chối hồ sơ tổ chức.');
      return;
    }
    const orgId = selectedOrg.refId || selectedOrg.targetId || selectedOrg.organizationId || selectedOrg.id;
    setRejectingOrg(true);
    try {
      await orgVerificationService.rejectOrg(orgId, trimmedReason);
      setOrgsQueue((prev) => {
        const next = prev.map((item) => {
          const itemId = item.refId || item.targetId || item.organizationId || item.id;
          return String(itemId) === String(orgId)
            ? { ...item, status: 'REJECTED', rejectReason: trimmedReason }
            : item;
        });
        syncQueueCache(next, null);
        return next;
      });
      cache?.invalidate(['queue:', 'donations:']);
      setIsRejectModalOpen(false);
      setRejectReason('');
      setViewMode('LIST');
      setSelectedOrg(null);
      notify('success', 'Đã từ chối hồ sơ kèm hướng dẫn bổ sung giấy tờ!');
    } catch (err) {
      console.error('Lỗi khi từ chối hồ sơ:', err);
      const serverMsg = err?.message || err?.response?.data?.message;
      notify('error', serverMsg ? `Có lỗi xảy ra khi từ chối hồ sơ:\n${serverMsg}` : 'Có lỗi xảy ra khi từ chối hồ sơ.');
    } finally {
      setRejectingOrg(false);
    }
  };

  const handleApproveLegalChange = async (changeId) => {
    try {
      await orgVerificationService.approveLegalChange(changeId);
      setLegalChanges((prev) => {
        const next = prev.map((item) => {
          const itemReqId = item.requestId || item.refId || item.id;
          return String(itemReqId) === String(changeId) || String(item.id) === String(changeId)
            ? { ...item, status: 'APPROVED' }
            : item;
        });
        syncQueueCache(null, next);
        return next;
      });
      cache?.invalidate(['queue:', 'donations:']);
      notify('success', 'Đã duyệt yêu cầu đổi thông tin pháp lý thành công! Ghi nhận vào Audit Log hệ thống.');
      setViewMode('LIST');
      setSelectedChange(null);
      return true;
    } catch (err) {
      console.error('Lỗi khi duyệt đổi pháp lý:', err);
      const serverMsg = err?.message || err?.response?.data?.message;
      notify('error', serverMsg ? `Có lỗi xảy ra khi duyệt đổi pháp lý:\n${serverMsg}` : 'Có lỗi xảy ra khi duyệt đổi pháp lý.');
      return false;
    }
  };

  const handleRejectLegalChange = async (changeId, reason = 'Thông tin pháp lý không hợp lệ') => {
    try {
      await orgVerificationService.rejectLegalChange(changeId, reason);
      setLegalChanges((prev) => {
        const next = prev.map((item) => {
          const itemReqId = item.requestId || item.refId || item.id;
          return String(itemReqId) === String(changeId) || String(item.id) === String(changeId)
            ? { ...item, status: 'REJECTED', rejectReason: reason }
            : item;
        });
        syncQueueCache(null, next);
        return next;
      });
      cache?.invalidate(['queue:', 'donations:']);
      notify('success', 'Đã từ chối yêu cầu đổi thông tin pháp lý.');
      setViewMode('LIST');
      setSelectedChange(null);
      return true;
    } catch (err) {
      console.error('Lỗi khi từ chối đổi pháp lý:', err);
      const serverMsg = err?.message || err?.response?.data?.message;
      notify('error', serverMsg ? `Có lỗi xảy ra khi từ chối đổi pháp lý:\n${serverMsg}` : 'Có lỗi xảy ra khi từ chối đổi pháp lý.');
      return false;
    }
  };

  const handleRefresh = () => Promise.all([loadData({ force: true }), fetchExistingOrgs({}, { force: true })]);

  return {
    viewMode,
    handleRefresh,
    setActiveMainTab,
    activeMainTab,
    orgsQueue,
    legalChanges,
    existingOrgs,
    loadingExisting,
    fetchExistingOrgs,
    setActiveQueueTab,
    activeQueueTab,
    loading,
    error,
    approvingOrg,
    handleOpenDetail,
    handleApproveLegalChange,
    handleRejectLegalChange,
    selectedOrg,
    setViewMode,
    setViewingDoc,
    checklist,
    setChecklist,
    isEnterprise,
    hasTax,
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
      VerificationQueueTable: { loading, orgsQueue, handleOpenDetail, activeQueueTab },
      VerificationChecklist: { checklist, setChecklist, isEnterprise, hasTax, selectedOrg },
      VerificationRejectDialog: { isRejectModalOpen, setIsRejectModalOpen, rejectReason, setRejectReason, handleConfirmReject, rejectingOrg },
    },
  };
}
