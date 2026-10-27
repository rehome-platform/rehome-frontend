import React, { useRef, useState, useEffect } from "react";

import { counterService } from "../services/warehouseApi.js";
import { usePhase2, useResource } from "./warehouseHooks.jsx";
import { listItems, lookupParams, normalizeMemberTasks } from "../models/warehouseModel.js";

export function useCounter() {
  const { identity, setIdentity } = usePhase2();
  const [kind, setKind] = useState('memberCode');
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [selected, setSelected] = useState(null);
  const [scanner, setScanner] = useState(false);
  const [confirmHandover, setConfirmHandover] = useState(null);
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [handoverFeedback, setHandoverFeedback] = useState(null);
  const [recentServed, setRecentServed] = useState([
    { name: 'Trần Thị Seller 1', memberCode: 'MB000903', memberId: 'a0000000-0000-0000-0000-000000000903', phone: '0911111103', taskNote: 'Kiểm định ký gửi · 08:05' },
    { name: 'Lê Văn Seller 2', memberCode: 'MB000904', memberId: 'a0000000-0000-0000-0000-000000000904', phone: '0911111104', taskNote: 'Bàn giao hàng rút về · 07:40' },
    { name: 'Nguyễn Văn Buyer 1', memberCode: 'MB000901', memberId: 'a0000000-0000-0000-0000-000000000901', phone: '0911111101', taskNote: 'Nhận lại hàng cuối kỳ · hôm qua 16:20' },
  ]);

  const memberCodeInputRef = useRef(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    if (!selected) {
      memberCodeInputRef.current?.focus();
    }
  }, [selected]);

  const results = useResource((options) => counterService.lookup(submitted, options), [submitted], {
    enabled: !!submitted,
  });

  const tasks = useResource(
    (options) => counterService.tasks(selected.memberId, options),
    [selected?.memberId, identity?.identityToken],
    { enabled: !!selected && identity?.memberId === selected.memberId },
  );

  const reset = () => {
    selectedRef.current = null;
    setSelected(null);
    setIdentity(null);
    setSubmitted(null);
    setConfirmHandover(null);
    setHandoverFeedback(null);
    results.clearActionError();
  };

  const executeLookup = (lookupKind, value) => {
    reset();
    setSubmitted(lookupParams(lookupKind, value));
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    if (query.trim()) {
      executeLookup(kind, query.trim());
    }
  };

  const choose = (member) => {
    selectedRef.current = member;
    setIdentity(null);
    setSelected(member);
    setConfirmHandover(null);
    setHandoverFeedback(null);
    if (member?.fullName || member?.name) {
      setRecentServed((prev) => {
        const next = prev.filter((p) => p.memberCode !== member.memberCode);
        return [
          {
            name: member.fullName || member.name,
            memberCode: member.memberCode,
            memberId: member.memberId || member.accountId,
            phone: member.phone || '',
            taskNote: 'Vừa phục vụ tại quầy',
          },
          ...next.slice(0, 4),
        ];
      });
    }
  };

  const executeHandover = async (item, context) => {
    setHandoverLoading(true);
    setHandoverFeedback(null);
    try {
      await counterService.handover({
        accountId: selected.memberId,
        refId: item.refId || item.id,
        context,
      });
      setHandoverFeedback({
        type: 'success',
        message: `Đã bàn giao thành công "${item.productName || item.productId}" cho khách hàng!`,
      });
      setRecentServed((prev) => {
        const next = prev.filter((p) => p.memberCode !== selected.memberCode);
        return [
          {
            name: selected.fullName || selected.name,
            memberCode: selected.memberCode,
            memberId: selected.memberId,
            phone: selected.phone || '',
            taskNote: `Bàn giao hàng · ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
          },
          ...next.slice(0, 4),
        ];
      });
      setConfirmHandover(null);
      tasks.refresh();
    } catch (err) {
      setHandoverFeedback({
        type: 'error',
        message:
          err.code === 'COUNTER_IDENTITY_NOT_CONFIRMED'
            ? 'Phiên xác nhận danh tính đã hết hạn hoặc chưa được xác nhận. Vui lòng đối chiếu lại danh tính khách hàng.'
            : (err.message || 'Không thể thực hiện bàn giao.'),
      });
      setConfirmHandover(null);
    } finally {
      setHandoverLoading(false);
    }
  };

  const confirmed = !!selected && identity?.memberId === selected.memberId;
  const resultList = listItems(results.data);
  const taskGroups = normalizeMemberTasks(tasks.data);

    return {
    selected,
    confirmed,
    reset,
    results,
    handleFormSubmit,
    kind,
    setKind,
    memberCodeInputRef,
    query,
    setQuery,
    setScanner,
    selectedRef,
    setIdentity,
    handoverFeedback,
    setHandoverFeedback,
    taskGroups,
    tasks,
    setConfirmHandover,
    submitted,
    resultList,
    choose,
    recentServed,
    scanner,
    executeLookup,
    confirmHandover,
    handoverLoading,
    executeHandover,
      sections: {
      CounterLookupForm: { handleFormSubmit, kind, setKind, memberCodeInputRef, query, setQuery, setScanner },
      CounterIdentityPanel: { selected, results, confirmed, selectedRef, setIdentity, reset },
      CounterMemberResults: { submitted, results, resultList, selected, choose },
      CounterHandoverDialog: { confirmHandover, selected, handoverLoading, setConfirmHandover, executeHandover },
    },
  };
}
