import React, { useRef, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { counterService } from "../services/warehouseApi.js";
import { usePhase2, useResource } from "./warehouseHooks.jsx";
import { listItems, lookupParams, normalizeMemberTasks, Phase2Error } from "../models/warehouseModel.js";
import { useRecentServed } from './useRecentServed.jsx';

export function detectLookupKind(value) {
  const trimmed = String(value || '').trim();
  // Nếu toàn chữ số bắt đầu bằng 0 thì coi là phone, ngược lại memberCode
  return /^0\d+$/.test(trimmed) ? 'phone' : 'memberCode';
}

export function useCounter() {
  const { identity, setIdentity, scope } = usePhase2();
  const [searchParams] = useSearchParams();
  const urlMemberCode = searchParams.get('memberCode')?.trim();
  const urlPhone = searchParams.get('phone')?.trim();
  const urlAccountId = searchParams.get('accountId')?.trim();
  const urlRefId = searchParams.get('refId')?.trim();

  const [kind, setKind] = useState('memberCode');
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [selected, setSelected] = useState(null);
  const [scanner, setScanner] = useState(false);
  const [confirmHandover, setConfirmHandover] = useState(null);
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [handoverFeedback, setHandoverFeedback] = useState(null);
  const { recentServed, rememberServed } = useRecentServed(scope);
  const lookupRequestRef = useRef(null);
  const selectionVersionRef = useRef(0);

  const memberCodeInputRef = useRef(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    // API 25 accepts memberCode, phone or qrPayload, not accountId.
    const lookupVal = urlMemberCode || urlPhone;
    if (lookupVal && !selectedRef.current && !submitted) {
      const detectedKind = urlMemberCode ? 'memberCode' : 'phone';
      setKind(detectedKind);
      setQuery(lookupVal);
      const request = { params: lookupParams(detectedKind, lookupVal), reopen: true };
      lookupRequestRef.current = request;
      setSubmitted(request);
    }
  }, [urlMemberCode, urlPhone, urlAccountId]);

  useEffect(() => {
    if (!selected) {
      memberCodeInputRef.current?.focus();
    }
  }, [selected]);

  const results = useResource(async (options) => {
    const members = await counterService.lookup(submitted.params, options);
    if (submitted.reopen && !options.signal.aborted && lookupRequestRef.current === submitted) {
      const items = listItems(members);
      const member = items.find((item) => {
        if (submitted.params.memberCode && item.memberCode === submitted.params.memberCode) return true;
        if (submitted.params.phone && item.phone === submitted.params.phone) return true;
        if (submitted.params.accountId && (item.memberId === submitted.params.accountId || item.id === submitted.params.accountId)) return true;
        return false;
      }) || (items.length === 1 ? items[0] : null);
      if (!member) throw new Phase2Error('Không tìm thấy Member phù hợp với thông tin đã nhập.', 404);
      choose(member);
    }
    return members;
  }, [submitted], { enabled: !!submitted });

  const tasks = useResource(
    (options) => counterService.tasks(selected.memberId, options),
    [selected?.memberId, identity?.identityToken],
    { enabled: !!selected && identity?.memberId === selected.memberId },
  );

  const reset = () => {
    selectionVersionRef.current += 1;
    lookupRequestRef.current = null;
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
    const request = { params: lookupParams(lookupKind, value), reopen: false };
    lookupRequestRef.current = request;
    setSubmitted(request);
  };

  const reopen = (member) => {
    if (results.loading) return;
    reset();
    const request = { params: lookupParams('memberCode', member.memberCode), reopen: true };
    lookupRequestRef.current = request;
    setSubmitted(request);
    setKind('memberCode');
    setQuery(member.memberCode);
  };

  const handleFormSubmit = (event) => {
    event?.preventDefault?.();
    const trimmed = query.trim();
    if (trimmed) {
      const detectedKind = detectLookupKind(trimmed);
      setKind(detectedKind);
      executeLookup(detectedKind, trimmed);
    }
  };

  const choose = (member) => {
    selectionVersionRef.current += 1;
    lookupRequestRef.current = null;
    selectedRef.current = member;
    setIdentity(null);
    setSelected(member);
    setConfirmHandover(null);
    setHandoverFeedback(null);
    results.clearActionError();
  };

  const confirmIdentity = () => {
    const member = selectedRef.current;
    const version = selectionVersionRef.current;
    if (!member?.memberId) return;
    return results.mutate((options) => counterService.confirm(member.memberId, options), {
      onSuccess: (proof) => {
        if (selectionVersionRef.current !== version || proof?.memberId !== member.memberId) return;
        setIdentity(proof);
        rememberServed(member);
      },
    });
  };

  const executeHandover = async (item, context) => {
    setHandoverLoading(true);
    setHandoverFeedback(null);
    try {
      await counterService.handover({
        accountId: selected.memberId,
        refId: item.refId || item.productId || item.returnId || item.id,
        context,
      });
      setHandoverFeedback({
        type: 'success',
        message: `Đã bàn giao thành công. Đã hoàn tất bàn giao "${item.productName || item.productId}" cho khách hàng!`,
      });
      rememberServed(selected, `Bàn giao hàng · ${new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}`);
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
    needsMemberLookup: Boolean(urlAccountId && !urlMemberCode && !urlPhone && !selected && !submitted),
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
    reopen,
    scanner,
    executeLookup,
    confirmHandover,
    handoverLoading,
    executeHandover,
      activeRefId: urlRefId,
    sections: {
      CounterLookupForm: { handleFormSubmit, kind, setKind, memberCodeInputRef, query, setQuery, setScanner },
      CounterIdentityPanel: { selected, results, confirmed, confirmIdentity, reset },
      CounterMemberResults: { submitted, results, resultList, selected, choose },
      CounterHandoverDialog: { confirmHandover, selected, handoverLoading, setConfirmHandover, executeHandover },
    },
  };
}
