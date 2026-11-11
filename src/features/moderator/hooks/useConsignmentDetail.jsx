import {
  CHECKLIST_ITEMS,
  DEFAULT_TERM_OPTIONS,
  DEFAULT_MAX_RENEWALS,
  DEFAULT_RETURN_REASONS,
} from "../pages/ConsignmentDetailPage.config.js";

import React, { useState } from "react";
import { useParams, useLocation } from "react-router-dom";

import { consignmentService } from "../services/warehouseApi.js";
import { phase2Contract, isFixtureMode } from "../config/warehouseContract.js";
import { usePhase2, useResource } from "./warehouseHooks.jsx";
import { ownsClaim, normalizeConsignmentForm } from "../models/warehouseModel.js";
import {
  DEFAULT_SYSTEM_CONFIGS,
  readEffectiveConsignmentConfig,
} from "../../../configs/systemParams.config.js";

export function useConsignmentDetail() {
  const { formId } = useParams();
  const location = useLocation();
  const { identity, scope, user } = usePhase2();
  const resource = useResource((options) => consignmentService.read(formId, options), [formId]);

  const passedForm = location.state?.form
    ? normalizeConsignmentForm(location.state.form, scope.userId)
    : null;
  const rawForm = resource.data || (resource.error ? null : passedForm);

  const form = React.useMemo(() => {
    if (!rawForm) return null;
    if (!rawForm.member && identity) {
      return {
        ...rawForm,
        member: {
          id: identity.memberId || identity.accountId,
          memberId: identity.memberId || identity.accountId,
          memberCode: identity.memberCode,
          fullName: identity.fullName || identity.name,
          phone: identity.phone,
        },
      };
    }
    return rawForm;
  }, [rawForm, identity]);

  // Banner phản hồi người dùng
  const [feedback, setFeedback] = useState(null);

  // Trạng thái duyệt form
  const [decision, setDecision] = useState('APPROVE'); // 'APPROVE' | 'REJECT'
  const [rejectReason, setRejectReason] = useState('');

  // Trạng thái kiểm định & chốt giá
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [checklist, setChecklist] = useState({});
  const [inspectionResult, setInspectionResult] = useState('PASS'); // 'PASS' | 'FAIL'
  const [conditionNote, setCondition] = useState('');
  const [price, setPrice] = useState('');
  const [term, setTerm] = useState('');

  // Trả đồ tại chỗ
  const [returnReason, setReturnReason] = useState('');
  const [returnNote, setReturnNote] = useState('');
  const [resultReceiptId, setReceiptId] = useState(null);
  const completedForm = React.useRef(null);
  const receiptId = resultReceiptId || form?.receiptId;
  const receiptStep = !!receiptId || ['WAITING_CONFIRMATION', 'AWAIT_MEMBER_CONFIRM', 'STOCK_IN', 'PRINT', 'COMPLETED'].includes(form?.resumeStep);
  const receiptCreated = (id) => {
    completedForm.current = form;
    setReceiptId(id);
  };
  React.useEffect(() => {
    if (receiptStep) window.scrollTo?.({ top: 0, behavior: 'smooth' });
  }, [receiptStep]);

  const optionsResource = useResource(
    async () =>
      isFixtureMode
        ? (await import('../fixtures/warehouseFixtures.js')).fixtureOptions
        : phase2Contract.options,
    [],
  );
  const options = optionsResource.data || phase2Contract.options;
  const cachedSystemConfig = React.useMemo(() => readEffectiveConsignmentConfig(), [form]);
  const formConsignmentConfig = form?.consignmentConfig || null;

  const consignmentConfig = React.useMemo(() => {
    const normalizePct = (val, fallback) => {
      if (val == null || val === '') return fallback;
      const num = Number(val);
      if (!Number.isFinite(num)) return fallback;
      return num <= 1 ? Number((num * 100).toPrecision(15)) : num;
    };
    const configuredTermDays =
      formConsignmentConfig?.termLengthDays ??
      form?.termLengthDays ??
      form?.receipt?.termLengthDays ??
      cachedSystemConfig?.termLengthDays ??
      options?.termLengthDays?.[0] ??
      DEFAULT_TERM_OPTIONS[0];
    const maxRenewals =
      formConsignmentConfig?.maxRenewals ??
      form?.maxRenewals ??
      form?.receipt?.maxRenewals ??
      cachedSystemConfig?.maxRenewals ??
      options?.maxRenewals ??
      DEFAULT_MAX_RENEWALS;
    const freeWithdrawalWindowDays =
      formConsignmentConfig?.freeWithdrawalWindowDays ??
      form?.freeWithdrawalWindowDays ??
      cachedSystemConfig?.freeWithdrawalWindowDays ??
      DEFAULT_SYSTEM_CONFIGS.consignment.freeWithdrawalDays;
    const floorPricePercent = normalizePct(
      formConsignmentConfig?.floorPricePercent ??
        formConsignmentConfig?.floorPriceRatio ??
        form?.floorPriceRatio ??
        cachedSystemConfig?.floorPricePercent,
      DEFAULT_SYSTEM_CONFIGS.pricingAndCommission.floorPricePercent,
    );
    const commissionTerm1 = normalizePct(
      formConsignmentConfig?.commissionTerm1 ??
        formConsignmentConfig?.commissionRateTerm1 ??
        form?.commissionRateTerm1 ??
        cachedSystemConfig?.commissionTerm1,
      DEFAULT_SYSTEM_CONFIGS.pricingAndCommission.commissionTerm1,
    );
    const commissionTerm2 = normalizePct(
      formConsignmentConfig?.commissionTerm2 ??
        formConsignmentConfig?.commissionRateTerm2 ??
        form?.commissionRateTerm2 ??
        cachedSystemConfig?.commissionTerm2,
      DEFAULT_SYSTEM_CONFIGS.pricingAndCommission.commissionTerm2,
    );
    const commissionTerm3 = normalizePct(
      formConsignmentConfig?.commissionTerm3 ??
        formConsignmentConfig?.commissionRateTerm3 ??
        form?.commissionRateTerm3 ??
        cachedSystemConfig?.commissionTerm3,
      DEFAULT_SYSTEM_CONFIGS.pricingAndCommission.commissionTerm3,
    );

    return {
      termLengthDays: Number(configuredTermDays) || DEFAULT_TERM_OPTIONS[0],
      maxRenewals: Number.isFinite(Number(maxRenewals)) ? Number(maxRenewals) : DEFAULT_MAX_RENEWALS,
      freeWithdrawalWindowDays: Number(freeWithdrawalWindowDays) || 7,
      floorPricePercent,
      commissionTerm1,
      commissionTerm2,
      commissionTerm3,
    };
  }, [formConsignmentConfig, form, cachedSystemConfig, options]);

  const hasDynamicTermDays =
    formConsignmentConfig?.termLengthDays != null ||
    form?.termLengthDays != null ||
    form?.receipt?.termLengthDays != null ||
    cachedSystemConfig?.termLengthDays != null;

  const termOptions = hasDynamicTermDays
    ? [consignmentConfig.termLengthDays]
    : options?.termLengthDays && options.termLengthDays.length > 0
      ? options.termLengthDays
      : DEFAULT_TERM_OPTIONS;
  const returnReasons =
    options?.inspectionReturnReasons && options.inspectionReturnReasons.length > 0
      ? options.inspectionReturnReasons
      : DEFAULT_RETURN_REASONS;

  const owned =
    !form?.claimedBy ||
    ownsClaim(form, scope.userId) ||
    ownsClaim(form, user?.accountId) ||
    ownsClaim(form, user?.id) ||
    ownsClaim(form, user?.email);

  const memberId = form?.memberId || form?.member?.id || form?.member?.memberId;
  const identified = Boolean(
    identity &&
      (!memberId ||
        identity.memberId === memberId ||
        identity.accountId === memberId ||
        (form?.member?.memberCode && identity.memberCode === form.member.memberCode)),
  );
  const allowed = (action) => owned && form?.allowedActions?.includes(action);
  const proof = { identityToken: identified ? identity.identityToken : null };
  const errors = resource.error?.fields || {};

  const photos = form?.photos || [];
  const currentPhoto = photos[activePhotoIdx] || photos[0];
  const photoUrl = typeof currentPhoto === 'string' ? currentPhoto : currentPhoto?.url;

  const checkedCount = Object.values(checklist).filter(Boolean).length;
  const allChecked = checkedCount === CHECKLIST_ITEMS.length;

  const toggleCheck = (idx) => {
    setChecklist((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  React.useEffect(() => {
    if (resource.actionError) {
      setFeedback({
        type: 'error',
        message: resource.actionError.message || 'Thao tác không thành công. Vui lòng thử lại.',
      });
    }
  }, [resource.actionError]);

  return {
    form,
    formId,
    receiptId,
    receiptStep,
    receiptForm: form || completedForm.current,
    setFeedback,
    resource,
    feedback,
    identified,
    owned,
    photos,
    activePhotoIdx,
    photoUrl,
    setActivePhotoIdx,
    allowed,
    decision,
    setDecision,
    setRejectReason,
    rejectReason,
    errors,
    proof,
    allChecked,
    checkedCount,
    checklist,
    toggleCheck,
    price,
    term,
    conditionNote,
    setReceiptId,
    setCondition,
    setPrice,
    setTerm,
    termOptions,
    consignmentConfig,
    returnReason,
    returnNote,
    setReturnReason,
    returnReasons,
    setReturnNote,
    resultReceiptId,
    sections: {
      ConsignmentClaimBanner: { form, owned, resource },
      ConsignmentPhotoViewer: { photos, activePhotoIdx, photoUrl, setActivePhotoIdx },
      ConsignmentReviewPanel: { decision, setDecision, setRejectReason, rejectReason, errors, resource, formId, setFeedback },
      ConsignmentStartPanel: { resource, formId, proof, setFeedback },
      ConsignmentInspectionPanel: { allChecked, checkedCount, checklist, toggleCheck, price, term, conditionNote, resource, formId, proof, setFeedback, setReceiptId: receiptCreated, setCondition, errors, setPrice, setTerm, termOptions, consignmentConfig },
      ConsignmentReturnPanel: { resource, formId, proof, returnReason, returnNote, setFeedback, setReturnReason, returnReasons, setReturnNote, errors },
    },
  };
}
