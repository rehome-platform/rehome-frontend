import { queueItemMeta, matchesQueueFilter, queueActionError } from '../models/queueModel.js';

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { queueService } from "../services/warehouseApi.js";
import { usePhase2, useResource } from "./warehouseHooks.jsx";
import { listItems } from "../models/warehouseModel.js";

export function useConsignmentQueue() {
  const { scope } = usePhase2();
  const [search, setSearch] = useSearchParams();

  const typeParam = search.get('type') || 'ALL';
  const claimParam = search.get('claim') || '';
  const statusFilter = search.get('status') || '';
  const overdueOnly = search.get('overdue') === '1';
  const page = Math.max(0, Number(search.get('page')) || 0);

  // Modal nhả việc (HQ-02-NhaViec)
  const [releaseTarget, setReleaseTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
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
      setFeedback({ type: 'error', message: queueActionError(resource.actionError) });
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

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredItems.map((i) => i.queueId));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectRow = (queueId) => {
    setSelectedIds((prev) =>
      prev.includes(queueId) ? prev.filter((id) => id !== queueId) : [...prev, queueId],
    );
  };

  const mutateTask = (item, release) => {
    setFeedback(null);
    const action = release ? queueService.release : queueService.claim;
    resource.mutate(options => action(item.queueId, options), {
      onSuccess: () => {
        if (release) setReleaseTarget(null);
        setFeedback({ type: 'success', message: release ? `Đã nhả việc "${item.typeLabel}" (${item.formId || item.orderId || item.queueId}) về hàng đợi thành công.` : `Đã nhận việc "${item.typeLabel}" (${item.formId || item.orderId || item.queueId}) thành công! Bạn có thể bấm "Mở" để xử lý ngay.` });
      },
    });
  };
  const handleClaim = item => mutateTask(item, false);
  const handleRelease = item => mutateTask(item, true);

    return {
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
    selectedIds,
    toggleSelectAll,
    scope,
    toggleSelectRow,
    handleClaim,
    setReleaseTarget,
    page,
    releaseTarget,
    handleRelease,
      sections: {
      QueueFilters: { statusFilter, changeFilter, claimParam, toggleOverdue, overdueOnly, filteredItems, rawItems },
      QueueReleaseDialog: { releaseTarget, resource, setReleaseTarget, handleRelease },
    },
  };
}
