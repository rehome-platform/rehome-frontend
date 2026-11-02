import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { formatCurrencyVND } from "../../../utils/formatters.js";
import { returnService } from "../services/returnApi.js";

export function useReturnProcessing() {
  const [searchParams] = useSearchParams();
  const [returnRequests, setReturnRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('PENDING_APPROVAL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Navigation states: 'QUEUE' | 'REVIEW' (TH-02) | 'INSPECT' (TH-03)
  const [viewMode, setViewMode] = useState('QUEUE');
  const [selectedItem, setSelectedItem] = useState(null);

  // TH-02 Reject Modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // TH-03 Inspection states
  const [scannedSku, setScannedSku] = useState('');
  const [skuMatched, setSkuMatched] = useState(false);
  const [checklist, setChecklist] = useState({
    skuCorrect: false,
    labelIntact: false,
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

  // Handle URL params (?id=...&tab=...)
  useEffect(() => {
    const paramId = searchParams.get('id');
    const paramTab = searchParams.get('tab');

    if (!loading && returnRequests.length > 0 && paramId) {
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
      r.code.toLowerCase().includes(q) ||
      (r.orderId && r.orderId.toLowerCase().includes(q)) ||
      (r.sku && r.sku.toLowerCase().includes(q)) ||
      (r.buyerName && r.buyerName.toLowerCase().includes(q))
    );
  });

  const handleOpenReview = (item) => {
    setSelectedItem(item);
    setViewMode('REVIEW');
  };

  const handleOpenInspect = (item) => {
    setSelectedItem(item);
    setScannedSku(item.sku || '');
    setSkuMatched(true);
    setChecklist({
      skuCorrect: true,
      labelIntact: true,
      noNewDamage: false,
      noUsageSign: false,
      accessoriesComplete: true,
    });
    setInspectionVerdict('');
    setInvalidReason('');
    setViewMode('INSPECT');
  };

  const handleApproveAndCreateWaybill = async () => {
    if (!selectedItem) return;
    try {
      await returnService.approveReturnAndCreateWaybill(selectedItem.id);
      await fetchReturns();
      alert(`Đã duyệt yêu cầu trả hàng ${selectedItem.code}! Vận đơn thu hồi GHN đã được tự động tạo và gửi tới người mua.`);
      setViewMode('QUEUE');
      setSelectedItem(null);
    } catch (err) {
      alert('Có lỗi xảy ra khi duyệt yêu cầu: ' + (err.message || ''));
    }
  };

  const handleConfirmRejectRequest = async () => {
    if (!rejectReason.trim() || !selectedItem) return;
    try {
      await returnService.rejectReturn(selectedItem.id, rejectReason);
      await fetchReturns();
      setIsRejectModalOpen(false);
      setRejectReason('');
      setViewMode('QUEUE');
      setSelectedItem(null);
      alert(`Đã từ chối yêu cầu trả hàng ${selectedItem.code}. Thông báo kèm lý do đã gửi tới người mua.`);
    } catch (err) {
      alert('Có lỗi xảy ra khi từ chối yêu cầu: ' + (err.message || ''));
    }
  };

  const handleSaveInspection = async () => {
    if (!selectedItem || !inspectionVerdict) return;
    if (inspectionVerdict === 'INVALID') {
      if (!invalidReason.trim()) {
        alert('Vui lòng nhập lý do kết luận không hợp lệ.');
        return;
      }
      try {
        await returnService.resolveInvalid(selectedItem.id, invalidReason);
        await fetchReturns();
        alert('Đã lưu kết luận: TRẢ HÀNG KHÔNG HỢP LỆ. Hàng được lưu kho 7 ngày để người mua tự đến nhận lại hoặc thanh toán phí ship.');
        setViewMode('QUEUE');
        setSelectedItem(null);
      } catch (err) {
        alert('Có lỗi xảy ra khi lưu kết luận: ' + (err.message || ''));
      }
    } else {
      // Hợp lệ -> mở modal TH-04 để chọn Relist hay Return Seller
      setIsOutcomeModalOpen(true);
    }
  };

  const handleConfirmOutcome = async (outcome) => {
    if (!selectedItem) return;
    try {
      await returnService.resolveValid(selectedItem.id, outcome);
      await fetchReturns();
      setIsOutcomeModalOpen(false);
      setViewMode('QUEUE');
      setSelectedItem(null);
      alert(
        `Đã hoàn tất xử lý trả hàng! Hệ thống tự động hoàn ${formatCurrencyVND(
          (selectedItem.amount || 0) + (selectedItem.shippingFee || 0)
        )} vào ví người mua ReHome và chuyển hàng sang trạng thái: ${
          outcome === 'RELIST' ? 'Đăng bán lại' : 'Trả người ký gửi'
        }.`
      );
    } catch (err) {
      alert('Có lỗi xảy ra khi xác nhận phương án: ' + (err.message || ''));
    }
  };

  // 2-Moderator Counterfeit Verdict Handlers (F-134, F-135)
  const handleFlagCounterfeit = async () => {
    if (!selectedItem) return;
    try {
      await returnService.flagCounterfeit(selectedItem.id);
      setIsCounterfeitModalOpen(true);
    } catch (err) {
      alert('Có lỗi khi báo nghi hàng giả: ' + (err.message || ''));
    }
  };

  const handleConfirmCounterfeitVerdict = async (verdictPayload) => {
    if (!selectedItem) return;
    try {
      await returnService.counterfeitConclusion(selectedItem.id, verdictPayload);
      await fetchReturns();
      setIsCounterfeitModalOpen(false);
      setViewMode('QUEUE');
      setSelectedItem(null);
      alert('Đã hoàn tất hội chẩn 2 Moderator và lưu kết luận hàng nghi giả!');
    } catch (err) {
      alert('Có lỗi khi lưu kết luận hội chẩn: ' + (err.message || ''));
    }
  };

  // Degraded Item Handlers (TH-04-XuongCap, KG-16)
  const handleOpenDegradedCase = () => {
    setDegradedConditionRate(60);
    setDegradedNotes(`Hàng trả về có dấu hiệu xuống cấp so với thời điểm xuất kho. Tình trạng thực tế ước tính 60%.`);
    setIsDegradedModalOpen(true);
  };

  const handleCreateDegradedCase = async () => {
    if (!selectedItem) return;
    try {
      await returnService.createDegradedCase({
        returnRequestId: selectedItem.id,
        currentConditionRate: degradedConditionRate,
        originalConditionRate: 90,
        moderatorNotes: degradedNotes,
      });
      await fetchReturns();
      setIsDegradedModalOpen(false);
      setViewMode('QUEUE');
      setSelectedItem(null);
      alert('Đã lập hồ sơ hàng xuống cấp thành công. Người ký gửi sẽ nhận thông báo chọn phương án đền bù (KG-16).');
    } catch (err) {
      alert('Có lỗi khi lập hồ sơ hàng xuống cấp: ' + (err.message || ''));
    }
  };

  // Mark Lost Parcel (TH-08)
  const handleMarkLost = async (targetItem) => {
    const target = targetItem || selectedItem;
    if (!target) return;
    const confirmed = window.confirm(
      `Xác nhận bưu kiện trả hàng ${target.code} đã thất lạc bởi bên vận chuyển? Hệ thống sẽ hoàn tiền cho người mua và tạo khiếu nại bảo hiểm với đơn vị giao vận.`
    );
    if (!confirmed) return;
    try {
      await returnService.markLost(target.id, 'Thất lạc trong quá trình vận chuyển bởi bưu tá GHN');
      await fetchReturns();
      if (viewMode !== 'QUEUE') {
        setViewMode('QUEUE');
        setSelectedItem(null);
      }
      alert(`Đã ghi nhận bưu kiện ${target.code} thất lạc. Người mua đã được tự động hoàn tiền.`);
    } catch (err) {
      alert('Có lỗi khi báo thất lạc: ' + (err.message || ''));
    }
  };

  return {
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
    scannedSku,
    setScannedSku,
    setSkuMatched,
    skuMatched,
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
        selectedItem,
        scannedSku,
        setScannedSku,
        setSkuMatched,
        skuMatched,
        checklist,
        setChecklist,
      },
      ReturnInspectionVerdict: {
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
