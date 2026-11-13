import { queueItemMeta, matchesQueueFilter, queueActionError } from '../models/queueModel.js';

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { queueService } from "../services/warehouseApi.js";
import { usePhase2, useResource } from "./warehouseHooks.jsx";
import { listItems } from "../models/warehouseModel.js";
import { useToast } from "../../../context/ToastContext.jsx";

export function useConsignmentQueue() {
  const toast = useToast();
  const phase2 = usePhase2();
  const scope = phase2?.scope || 'warehouse';
  const [search, setSearch] = useSearchParams();

  const typeParam = search.get('type') || 'ALL';
  const focusedQueueId = search.get('queueId');
  const claimParam = search.get('claim') || '';
  const statusFilter = search.get('status') || '';
  const overdueOnly = search.get('overdue') === '1';
  const page = Math.max(0, Number(search.get('page')) || 0);

  // Modal nhận việc & nhả việc (HQ-02-NhanViec & HQ-02-NhaViec)
  const [claimTarget, setClaimTarget] = useState(null);
  const [releaseTarget, setReleaseTarget] = useState(null);
  const [withdrawalCheckTarget, setWithdrawalCheckTarget] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Gọi API lấy dữ liệu hàng đợi
  const queryType = typeParam === 'ALL' ? undefined : typeParam;
  const resource = useResource(
    (options) => queueService.list({ type: queryType, claim: claimParam, page }, options),
    [queryType, claimParam, page],
  );

  // Tự động bắt lỗi mutation (409 xung đột nhận việc, 403 không có quyền nhả việc)
  useEffect(() => {
    if (resource.actionError) {
      const msg = queueActionError(resource.actionError);
      setClaimTarget(null);
      setReleaseTarget(null);
      setFeedback({ type: 'error', message: msg });
      toast.error(msg);
      resource.clearActionError();
    }
  }, [resource.actionError]);

  const rawItems = listItems(resource.data);

  // Tính số giờ đã chờ
  const itemsWithMeta = rawItems.map(item => queueItemMeta(item, typeParam));
  const filteredItems = itemsWithMeta.filter(item => matchesQueueFilter(item, {
    overdueOnly, statusFilter, claimParam, userId: scope.userId,
  }));

  const changeFilter = (key, value) => {
    setFeedback(null);
    setSearch((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      if (key !== 'page') next.set('page', '0');
      return next;
    });
  };

  const toggleOverdue = () => {
    changeFilter('overdue', overdueOnly ? '' : '1');
  };

  const mutateTask = (item, release) => {
    setFeedback(null);
    const action = release ? queueService.release : queueService.claim;
    resource.mutate(options => action(item.queueId, options), {
      onSuccess: () => {
        if (release) {
          setReleaseTarget(null);
        } else {
          setClaimTarget(null);
        }
        const isWithdrawal = item.type === 'WITHDRAWAL' || item.type === 'ITEM_WITHDRAWAL';
        const isViolationReport = item.type === 'VIOLATION_REPORT';
        const isReturn = item.type === 'RETURN';
        const msg = release
          ? `Đã nhả việc "${item.typeLabel}" (${item.formId || item.orderId || item.queueId}) về hàng đợi thành công.`
          : isWithdrawal
            ? item.status === 'PENDING_APPROVAL'
              ? `Đã nhận việc "${item.typeLabel}" (${item.refId || item.queueId}) thành công! Vui lòng mở yêu cầu để duyệt hoặc từ chối.`
              : `Đã nhận việc "${item.typeLabel}" (${item.formId || item.orderId || item.refId || item.queueId}) thành công! Bạn có thể mở Quầy tiếp nhận (BG-01) để bàn giao cho khách khi khách đến quầy.`
            : isReturn
              ? `Đã nhận việc "${item.typeLabel}" (${item.returnId || item.refId || item.queueId}) thành công! Bạn có thể mở trang "Trả hàng" để duyệt và xử lý yêu cầu.`
            : isViolationReport
              ? `Đã nhận việc "${item.typeLabel}" (${item.formId || item.orderId || item.refId || item.queueId}) thành công! Bạn có thể chuyển sang trang "Báo cáo vi phạm" để kiểm duyệt và xử lý.`
              : `Đã nhận việc "${item.typeLabel}" (${item.formId || item.orderId || item.queueId}) thành công! Bạn có thể chuyển sang tab "Kiểm định & nhập kho" để mở duyệt.`;
        setFeedback({
          type: 'success',
          message: msg,
        });
        toast.success(msg);
      },
    });
  };
  const handleClaim = item => mutateTask(item, false);
  const handleRelease = item => mutateTask(item, true);

  const handleApproveWithdrawal = async (item) => {
    const withdrawalId = item?.refId || item?.id;
    if (!withdrawalId) return;
    setFeedback(null);
    await resource.mutate((options) => queueService.approveWithdrawal(withdrawalId, options), {
      onSuccess: (updated) => {
        const msg = 'Đã duyệt yêu cầu rút hàng. Yêu cầu đã chuyển sang bước bàn giao tại quầy.';
        setFeedback({ type: 'success', message: msg });
        toast.success(msg);
        setWithdrawalCheckTarget((prev) => (prev ? {
          ...prev,
          status: updated?.status || 'PENDING_PICKUP',
          pickupDeadline: updated?.pickupDeadline ?? prev.pickupDeadline,
          feeCharged: updated?.feeCharged ?? prev.feeCharged,
        } : null));
      },
    });
  };

  const handleRejectWithdrawal = async (item, reason) => {
    const withdrawalId = item?.refId || item?.id;
    if (!withdrawalId) return;
    setFeedback(null);
    await resource.mutate((options) => queueService.rejectWithdrawal(withdrawalId, reason, options), {
      onSuccess: () => {
        const msg = 'Đã từ chối yêu cầu rút hàng.';
        setFeedback({ type: 'success', message: msg });
        toast.success(msg);
        setWithdrawalCheckTarget(null);
      },
    });
  };

  return {
    focusedQueueId,
    setFeedback,
    resource,
    typeParam,
    changeFilter,
    statusFilter,
    claimParam,
    toggleOverdue,
    overdueOnly,
    filteredItems,
    rawItems,
    feedback,
    scope,
    handleClaim,
    claimTarget,
    setClaimTarget,
    setReleaseTarget,
    page,
    releaseTarget,
    handleRelease,
    withdrawalCheckTarget,
    setWithdrawalCheckTarget,
    handleApproveWithdrawal,
    handleRejectWithdrawal,
    sections: {
      QueueFilters: { statusFilter, changeFilter, claimParam, toggleOverdue, overdueOnly, filteredItems, rawItems },
      QueueClaimDialog: { claimTarget, resource, setClaimTarget, handleClaim },
      QueueReleaseDialog: { releaseTarget, resource, setReleaseTarget, handleRelease },
    },
  };
}
