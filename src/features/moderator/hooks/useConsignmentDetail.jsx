import {
  CHECKLIST_ITEMS,
  DEFAULT_TERM_OPTIONS,
  DEFAULT_RETURN_REASONS,
} from "../pages/ConsignmentDetailPage.config.js";

import React, { useState } from "react";
import { useParams, useLocation } from "react-router-dom";

import { consignmentService } from "../services/warehouseApi.js";
import { phase2Contract, isFixtureMode } from "../config/warehouseContract.js";
import { usePhase2, useResource } from "./warehouseHooks.jsx";
import { ownsClaim, normalizeConsignmentForm } from "../models/warehouseModel.js";

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
  const receiptStep = !!receiptId || ['WAITING_CONFIRMATION', 'STOCK_IN', 'PRINT'].includes(form?.resumeStep);
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
  const termOptions =
    options?.termLengthDays && options.termLengthDays.length > 0
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
      ConsignmentInspectionPanel: { allChecked, checkedCount, checklist, toggleCheck, price, term, conditionNote, resource, formId, proof, setFeedback, setReceiptId: receiptCreated, setCondition, errors, setPrice, setTerm, termOptions },
      ConsignmentReturnPanel: { resource, formId, proof, returnReason, returnNote, setFeedback, setReturnReason, returnReasons, setReturnNote, errors },
    },
  };
}
