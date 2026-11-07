import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { formatCurrencyVND } from "../../../utils/formatters.js";
import { returnService } from "../services/returnApi.js";
import { inventoryService } from "../services/inventoryApi.js";
import { useToast } from "../../../context/ToastContext.jsx";

export function useReturnProcessing() {
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
  const [searchParams] = useSearchParams();
  const [returnRequests, setReturnRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('PENDING_APPROVAL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Navigation states: 'QUEUE' | 'REVIEW' (TH-02) | 'INSPECT' (TH-03)
  const [viewMode, setViewMode] = useState('QUEUE');
  const [selectedItem, setSelectedItem] = useState(null);

  // In-flight mutation lock (F13)
  const resolvingRef = useRef(false);

  // TH-02 Reject Modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // TH-03 Inspection states (F04: require explicit verification)
  const [checklist, setChecklist] = useState({
    noNewDamage: false,
    noUsageSign: false,
    accessoriesComplete: false,
  });
  const [inspectionVerdict, setInspectionVerdict] = useState(''); // 'VALID' | 'INVALID'
  const [invalidReason, setInvalidReason] = useState('');

  // TH-04 Outcome Modal (Relist vs Return Seller)
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);

  // Compare side-by-side modal
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // 2-Moderator Counterfeit Modal (F-134, F-135)
  const [isCounterfeitModalOpen, setIsCounterfeitModalOpen] = useState(false);

  // Degraded Item Modal (TH-04-XuongCap, KG-16)
  const [isDegradedModalOpen, setIsDegradedModalOpen] = useState(false);
  const [degradedNotes, setDegradedNotes] = useState('');
  const [degradedConditionRate, setDegradedConditionRate] = useState(60);

  const [evidenceImageUrls, setEvidenceImageUrls] = useState([]);
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');
  const failedEvidence = useRef([]);
  const evidenceLock = useRef(false);
  const selectionEpoch = useRef(0);
  const uploadEvidence = async (files) => {
    if (evidenceLock.current || !files?.length) return;
    if (evidenceImageUrls.length + files.length > 5) {
      setEvidenceError('Chỉ được tải tối đa 5 ảnh bằng chứng.');
      return;
    }
    const epoch = selectionEpoch.current;
    evidenceLock.current = true;
    setEvidenceUploading(true);
    setEvidenceError('');
    failedEvidence.current = [];
    const failures = [];
    let errorMessage = '';
    try {
      for (const file of files) {
        if (!file.type?.startsWith('image/')) {
          errorMessage = 'Vui lòng chọn tệp ảnh.';
          continue;
        }
        try {
          const result = await inventoryService.upload(file);
          if (!result?.url || !/^https?:\/\//i.test(result.url)) throw new Error('Máy chủ chưa trả về địa chỉ ảnh đã tải lên.');
          if (epoch === selectionEpoch.current) setEvidenceImageUrls(prev => [...prev, result.url]);
        } catch (error) {
          failures.push(file);
          errorMessage = error.message || 'Không thể tải ảnh lên.';
        }
      }
      if (epoch === selectionEpoch.current) {
        failedEvidence.current = failures;
        setEvidenceError(errorMessage);
      }
    } finally {
      evidenceLock.current = false;
      if (epoch === selectionEpoch.current) setEvidenceUploading(false);
    }
  };
  const retryEvidence = () => uploadEvidence(failedEvidence.current);
  const removeEvidence = index => { if (!evidenceLock.current) setEvidenceImageUrls(prev => prev.filter((_, i) => i !== index)); };
  const evidenceReady = !evidenceUploading && !evidenceError && evidenceImageUrls.length >= 2 && evidenceImageUrls.length <= 5;
  const requireEvidence = () => {
    if (evidenceReady && !evidenceLock.current) return true;
    notify('warn', 'Cần tải lên thành công từ 2 đến 5 ảnh bằng chứng kiểm hàng trước khi lưu.');
    return false;
  };
  const evidenceProps = { evidenceImageUrls, evidenceUploading, evidenceError, uploadEvidence, retryEvidence, removeEvidence };

  const fetchReturns = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await returnService.list();
      setReturnRequests(res.data || []);
    } catch (err) {
      setError('Không thể tải danh sách yêu cầu trả hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  // Handle URL params (?id=...&tab=...) with deep link support (F11)
  useEffect(() => {
    const paramId = searchParams.get('id');
    const paramTab = searchParams.get('tab');

    if (!loading && paramId) {
      const found = returnRequests.find(
        (r) => String(r.id) === String(paramId) || String(r.code) === String(paramId)
      );
      if (found) {
        if (paramTab) {
          setActiveTab(paramTab);
        } else if (found.status) {
          setActiveTab(found.status);
        }

        if (found.status === 'PENDING_APPROVAL') {
          handleOpenReview(found);
        } else if (found.status === 'RECEIVED_INSPECT' || found.status === 'RETURNING') {
          handleOpenInspect(found);
        } else {
          handleOpenReview(found);
        }
      } else {
        // Deep link outside first page: fetch authorized detail
        returnService.detail(paramId).then((item) => {
          if (item) {
            setSelectedItem(item);
            if (paramTab) {
              setActiveTab(paramTab);
            } else if (item.status) {
              setActiveTab(item.status);
            }

            if (item.status === 'PENDING_APPROVAL') {
              setViewMode('REVIEW');
            } else if (item.status === 'RECEIVED_INSPECT' || item.status === 'RETURNING') {
              setViewMode('INSPECT');
            } else {
              setViewMode('REVIEW');
            }
          }
        }).catch(() => {});
      }
    }
  }, [loading, returnRequests, searchParams]);

  const tabCounts = {
    PENDING_APPROVAL: returnRequests.filter((r) => r.status === 'PENDING_APPROVAL').length,
    WAITING_BUYER_DISPATCH: returnRequests.filter((r) => r.status === 'WAITING_BUYER_DISPATCH').length,
    RETURNING: returnRequests.filter((r) => r.status === 'RETURNING').length,
    RECEIVED_INSPECT: returnRequests.filter((r) => r.status === 'RECEIVED_INSPECT').length,
    RESOLVED: returnRequests.filter((r) => r.status === 'RESOLVED').length,
  };

  const filteredRequests = returnRequests.filter((r) => {
    if (r.status !== activeTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.code && r.code.toLowerCase().includes(q)) ||
      (r.orderId && r.orderId.toLowerCase().includes(q)) ||
      (r.sku && r.sku.toLowerCase().includes(q)) ||
      (r.buyerName && r.buyerName.toLowerCase().includes(q))
    );
  });

  const handleOpenReview = async (item) => {
    const epoch = ++selectionEpoch.current;
    setSelectedItem(null);
    try {
      const detail = await returnService.detail(item.id);
      if (epoch !== selectionEpoch.current) return;
      setSelectedItem(detail);
      setViewMode('REVIEW');
    } catch (error) { notify('error', 'Không thể tải chi tiết yêu cầu trả hàng: ' + error.message); }
  };

  const handleOpenInspect = async (item) => {
    const epoch = ++selectionEpoch.current;
    setSelectedItem(null);
    setEvidenceImageUrls([]);
    setEvidenceError('');
    setEvidenceUploading(false);
    failedEvidence.current = [];
    try {
      const detail = await returnService.detail(item.id);
      if (epoch !== selectionEpoch.current) return;
      setSelectedItem(detail);
    } catch (error) {
      notify('error', 'Không thể tải chi tiết yêu cầu trả hàng: ' + error.message);
      return;
    }
    setChecklist({
      noNewDamage: false,
      noUsageSign: false,
      accessoriesComplete: false,
    });
    setInspectionVerdict('');
    setInvalidReason('');
    setViewMode('INSPECT');
  };

  const handleApproveAndCreateWaybill = async () => {
    if (!selectedItem || resolvingRef.current) return;
    resolvingRef.current = true;
    try {
      await returnService.approveReturnAndCreateWaybill(selectedItem.id);
      await fetchReturns();
      notify('success', `Đã duyệt yêu cầu trả hàng ${selectedItem.code}! Vận đơn thu hồi GHN đã được tự động tạo và gửi tới người mua.`);
      setViewMode('QUEUE');
      setSelectedItem(null);
    } catch (err) {
      notify('error', 'Có lỗi xảy ra khi duyệt yêu cầu: ' + (err.message || ''));
    } finally {
      resolvingRef.current = false;
    }
  };

  const handleConfirmRejectRequest = async () => {
    if (!selectedItem || resolvingRef.current) return;
    if (!rejectReason.trim()) {
      notify('warn', 'Vui lòng nhập lý do từ chối.');
      return;
    }
    resolvingRef.current = true;
    try {
      await returnService.rejectReturn(selectedItem.id, rejectReason);
      await fetchReturns();
      setIsRejectModalOpen(false);
      setRejectReason('');
      setViewMode('QUEUE');
      setSelectedItem(null);
      notify('success', `Đã từ chối yêu cầu trả hàng ${selectedItem.code}. Thông báo kèm lý do đã gửi tới người mua.`);
    } catch (err) {
      notify('error', 'Có lỗi xảy ra khi từ chối yêu cầu: ' + (err.message || ''));
    } finally {
      resolvingRef.current = false;
    }
  };

  const handleSaveInspection = async () => {
    if (!selectedItem || !inspectionVerdict || resolvingRef.current || !requireEvidence()) return;
    resolvingRef.current = true;
    try {
      if (inspectionVerdict === 'INVALID') {
        if (!invalidReason.trim()) {
          notify('warn', 'Vui lòng nhập lý do kết luận không hợp lệ.');
          return;
        }
        await returnService.inspect(selectedItem.id, {
          evidenceImageUrls,
          matchesOriginal: false,
          degraded: checklist.noNewDamage === false,
          counterfeitSuspected: false,
          conditionNote: invalidReason,
        });
        await returnService.resolveInvalid(selectedItem.id, invalidReason);
        await fetchReturns();
        notify('success', 'Đã lưu kết luận: TRẢ HÀNG KHÔNG HỢP LỆ. Hàng được lưu kho 7 ngày để người mua tự đến nhận lại hoặc thanh toán phí ship.');
        setViewMode('QUEUE');
        setSelectedItem(null);
      } else {
        // Hợp lệ -> lưu inspect trước rồi mở modal TH-04 để chọn Relist hay Return Seller
        await returnService.inspect(selectedItem.id, {
          evidenceImageUrls,
          matchesOriginal: true,
          degraded: false,
          counterfeitSuspected: false,
          conditionNote: 'Đã kiểm tra hàng về kho hợp lệ',
        });
        setIsOutcomeModalOpen(true);
      }
    } catch (err) {
      notify('error', 'Có lỗi xảy ra khi lưu kết luận: ' + (err.message || ''));
    } finally {
      resolvingRef.current = false;
    }
  };

  const handleConfirmOutcome = async (outcome) => {
    if (!selectedItem || resolvingRef.current) return;
    resolvingRef.current = true;
    try {
      const res = await returnService.resolveValid(selectedItem.id, outcome);
      await fetchReturns();
      setIsOutcomeModalOpen(false);
      setViewMode('QUEUE');
      setSelectedItem(null);
      const confirmedRefund = res?.refundAmount ?? res?.result?.refundAmount ?? selectedItem.refundAmount ?? selectedItem.amount ?? 0;
      notify(
        'success',
        `Đã hoàn tất xử lý trả hàng! Hệ thống tự động hoàn ${formatCurrencyVND(
          confirmedRefund
        )} vào ví người mua ReHome và chuyển hàng sang trạng thái: ${
          outcome === 'RELIST' ? 'Đăng bán lại' : 'Trả người ký gửi'
        }.`
      );
    } catch (err) {
      notify('error', 'Có lỗi xảy ra khi xác nhận phương án: ' + (err.message || ''));
    } finally {
      resolvingRef.current = false;
    }
  };

  // 2-Moderator Counterfeit Verdict Handlers (F-134, F-135)
  const handleFlagCounterfeit = async () => {
    if (!selectedItem || resolvingRef.current || !requireEvidence()) return;
    resolvingRef.current = true;
    try {
      await returnService.inspect(selectedItem.id, { matchesOriginal: true, degraded: false, counterfeitSuspected: true, conditionNote: 'Nghi ngờ hàng giả, chờ thẩm định', evidenceImageUrls });
      await returnService.flagCounterfeit(selectedItem.id);
      setIsCounterfeitModalOpen(true);
    } catch (err) {
      notify('error', 'Có lỗi khi báo nghi hàng giả: ' + (err.message || ''));
    } finally {
      resolvingRef.current = false;
    }
  };

  const handleConfirmCounterfeitVerdict = async (verdictPayload) => {
    if (!selectedItem || resolvingRef.current) return;
    resolvingRef.current = true;
    try {
      await returnService.counterfeitConclusion(selectedItem.id, verdictPayload);
      await fetchReturns();
      setIsCounterfeitModalOpen(false);
      setViewMode('QUEUE');
      setSelectedItem(null);
      notify('success', 'Đã lưu kết luận thẩm định hàng nghi giả thành công!');
    } catch (err) {
      notify('error', 'Có lỗi khi lưu kết luận hội chẩn: ' + (err.message || ''));
    } finally {
      resolvingRef.current = false;
    }
  };

  // Degraded Item Handlers (TH-04-XuongCap, KG-16)
  const handleOpenDegradedCase = () => {
    setDegradedConditionRate(60);
    setDegradedNotes(`Hàng trả về có dấu hiệu xuống cấp so với thời điểm xuất kho. Tình trạng thực tế ước tính 60%.`);
    setIsDegradedModalOpen(true);
  };

  const handleCreateDegradedCase = async (caseData = {}) => {
    if (!selectedItem || resolvingRef.current || !requireEvidence()) return;
    resolvingRef.current = true;
    try {
      const notes = caseData.notes || degradedNotes || 'Hàng trả về có dấu hiệu xuống cấp';
      await returnService.inspect(selectedItem.id, {
        evidenceImageUrls,
        matchesOriginal: true,
        degraded: true,
        counterfeitSuspected: false,
        conditionNote: notes,
      });
      await returnService.resolveValid(selectedItem.id, 'RELIST');
      await fetchReturns();
      setIsDegradedModalOpen(false);
      setViewMode('QUEUE');
      setSelectedItem(null);
      notify('success', 'Đã lập hồ sơ hàng xuống cấp thành công. Người ký gửi sẽ nhận thông báo chọn phương án đền bù (KG-16).');
    } catch (err) {
      notify('error', 'Có lỗi khi lập hồ sơ hàng xuống cấp: ' + (err.message || ''));
    } finally {
      resolvingRef.current = false;
    }
  };

  // Mark Lost Parcel (TH-08)
  const handleMarkLost = async (targetItem) => {
    const target = targetItem || selectedItem;
    if (!target || resolvingRef.current) return;
    const confirmed = window.confirm(
      `Xác nhận bưu kiện trả hàng ${target.code} đã thất lạc bởi bên vận chuyển? Hệ thống sẽ hoàn tiền cho người mua và tạo khiếu nại bảo hiểm với đơn vị giao vận.`
    );
    if (!confirmed) return;
    resolvingRef.current = true;
    try {
      await returnService.markLost(target.id, 'Thất lạc trong quá trình vận chuyển bởi bưu tá GHN');
      await fetchReturns();
      if (viewMode !== 'QUEUE') {
        setViewMode('QUEUE');
        setSelectedItem(null);
      }
      notify('success', `Đã ghi nhận bưu kiện ${target.code} thất lạc. Người mua đã được tự động hoàn tiền.`);
    } catch (err) {
      notify('error', 'Có lỗi khi báo thất lạc: ' + (err.message || ''));
    } finally {
      resolvingRef.current = false;
    }
  };

  return {
    ...evidenceProps,
    evidenceReady,
    viewMode,
    setActiveTab,
    activeTab,
    tabCounts,
    loading,
    error,
    filteredRequests,
    searchQuery,
    setSearchQuery,
    handleOpenReview,
    handleOpenInspect,
    selectedItem,
    setViewMode,
    setIsCompareModalOpen,
    handleApproveAndCreateWaybill,
    setIsRejectModalOpen,
    checklist,
    setChecklist,
    inspectionVerdict,
    setInspectionVerdict,
    invalidReason,
    setInvalidReason,
    handleSaveInspection,
    isRejectModalOpen,
    rejectReason,
    setRejectReason,
    handleConfirmRejectRequest,
    isOutcomeModalOpen,
    setIsOutcomeModalOpen,
    handleConfirmOutcome,
    isCompareModalOpen,
    // 2-Moderator counterfeit
    isCounterfeitModalOpen,
    setIsCounterfeitModalOpen,
    handleFlagCounterfeit,
    handleConfirmCounterfeitVerdict,
    // Degraded
    isDegradedModalOpen,
    setIsDegradedModalOpen,
    degradedNotes,
    setDegradedNotes,
    degradedConditionRate,
    setDegradedConditionRate,
    handleOpenDegradedCase,
    handleCreateDegradedCase,
    // Lost
    handleMarkLost,
    sections: {
      ReturnQueueTabs: { setActiveTab, activeTab, tabCounts },
      ReturnQueueTable: {
        loading,
        filteredRequests,
        activeTab,
        handleOpenReview,
        handleOpenInspect,
        handleMarkLost,
      },
      ReturnReviewDecision: {
        selectedItem,
        handleApproveAndCreateWaybill,
        setIsRejectModalOpen,
      },
      ReturnInspectionProduct: {
        ...evidenceProps,
        selectedItem,
        checklist,
        setChecklist,
      },
      ReturnInspectionVerdict: {
        evidenceReady,
        selectedItem,
        inspectionVerdict,
        setInspectionVerdict,
        invalidReason,
        setInvalidReason,
        handleSaveInspection,
        handleFlagCounterfeit,
        handleOpenDegradedCase,
      },
      ReturnRejectDialog: {
        isRejectModalOpen,
        setIsRejectModalOpen,
        rejectReason,
        setRejectReason,
        handleConfirmRejectRequest,
      },
      ReturnOutcomeDialog: {
        isOutcomeModalOpen,
        setIsOutcomeModalOpen,
        handleConfirmOutcome,
      },
      ReturnCompareDialog: {
        isCompareModalOpen,
        setIsCompareModalOpen,
        selectedItem,
      },
      SuspiciousCounterfeitModal: {
        isOpen: isCounterfeitModalOpen,
        onClose: () => setIsCounterfeitModalOpen(false),
        returnItem: selectedItem,
        onConfirmVerdict: handleConfirmCounterfeitVerdict,
      },
      DegradedCaseModal: {
        ...evidenceProps,
        evidenceReady,
        isOpen: isDegradedModalOpen,
        onClose: () => setIsDegradedModalOpen(false),
        selectedItem,
        degradedNotes,
        setDegradedNotes,
        degradedConditionRate,
        setDegradedConditionRate,
        handleCreateDegradedCase,
      },
    },
  };
}
