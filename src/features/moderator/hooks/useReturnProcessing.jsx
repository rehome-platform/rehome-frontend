import React, { useState, useEffect } from "react";

import { formatCurrencyVND } from "../../../utils/formatters.js";
import { returnService } from "../services/moderatorMockData.js";

export function useReturnProcessing() {
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

  const fetchReturns = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await returnService.list();
      setReturnRequests(res.data);
    } catch (err) {
      setError('Không thể tải danh sách yêu cầu trả hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

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
      r.orderId.toLowerCase().includes(q) ||
      r.sku.toLowerCase().includes(q) ||
      r.buyerName.toLowerCase().includes(q)
    );
  });

  const handleOpenReview = (item) => {
    setSelectedItem(item);
    setViewMode('REVIEW');
  };

  const handleOpenInspect = (item) => {
    setSelectedItem(item);
    setScannedSku(item.sku);
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
      alert('Có lỗi xảy ra khi duyệt yêu cầu.');
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
      alert('Có lỗi xảy ra khi từ chối yêu cầu.');
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
        alert('Có lỗi xảy ra khi lưu kết luận.');
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
          selectedItem.amount + selectedItem.shippingFee
        )} vào ví người mua ReHome và chuyển hàng sang trạng thái: ${
          outcome === 'RELIST' ? 'Đăng bán lại' : 'Trả người ký gửi'
        }.`
      );
    } catch (err) {
      alert('Có lỗi xảy ra khi xác nhận phương án.');
    }
  };

    return {
    viewMode,
    setActiveTab,
    activeTab,
    tabCounts,
    loading,
    filteredRequests,
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
      sections: {
      ReturnQueueTabs: { setActiveTab, activeTab, tabCounts },
      ReturnQueueTable: { loading, filteredRequests, activeTab, handleOpenReview, handleOpenInspect },
      ReturnReviewDecision: { selectedItem, handleApproveAndCreateWaybill, setIsRejectModalOpen },
      ReturnInspectionProduct: { selectedItem, scannedSku, setScannedSku, setSkuMatched, skuMatched, checklist, setChecklist },
      ReturnInspectionVerdict: { selectedItem, inspectionVerdict, setInspectionVerdict, invalidReason, setInvalidReason, handleSaveInspection },
      ReturnRejectDialog: { isRejectModalOpen, setIsRejectModalOpen, rejectReason, setRejectReason, handleConfirmRejectRequest },
      ReturnOutcomeDialog: { isOutcomeModalOpen, setIsOutcomeModalOpen, handleConfirmOutcome },
      ReturnCompareDialog: { isCompareModalOpen, setIsCompareModalOpen, selectedItem },
    },
  };
}
