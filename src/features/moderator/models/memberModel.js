import { Phase2Error } from './warehouseTransportModel.js';

export function listItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return taskGroups(data).flat();
}

function taskGroups(data) {
  return [
    data?.pendingForms || [],
    data?.pendingWithdrawals || [],
    data?.pendingEndOfTerm || [],
    data?.pendingInvalidReturns || [],
    data?.pendingDegradedItems || [],
  ];
}

const RESUME_STEP_TO_STATUS = {
  REVIEW_FORM: 'PENDING',
  START_INSPECTION: 'APPROVED',
  INSPECTION: 'INSPECTING',
  AWAIT_MEMBER_CONFIRM: 'WAITING_CONFIRMATION',
  WAITING_CONFIRMATION: 'WAITING_CONFIRMATION',
  STOCK_IN: 'WAITING_STOCK_IN',
};

export function resolveCounterFormStatus(item) {
  if (!item) return 'PENDING';
  const productStatus = item.productStatus || item.product?.status || null;
  if (productStatus) return productStatus;

  const hasProduct = Boolean(
    item.productSku ||
    item.product?.sku ||
    item.sku ||
    item.resumeStep === 'COMPLETED' ||
    item.displayStatus === 'COMPLETED' ||
    item.status === 'STOCKED'
  );
  if (hasProduct) return 'ON_SALE';

  if (item.displayStatus) {
    if (item.displayStatus === 'NONE') return item.status || 'PENDING';
    if (RESUME_STEP_TO_STATUS[item.displayStatus]) {
      return RESUME_STEP_TO_STATUS[item.displayStatus];
    }
    return item.displayStatus;
  }

  if (item.resumeStep && RESUME_STEP_TO_STATUS[item.resumeStep]) {
    return RESUME_STEP_TO_STATUS[item.resumeStep];
  }

  const hasReceipt = Boolean(item.receiptId || item.receipt?.id);
  const isConfirmed = Boolean(
    item.receiptConfirmed ||
    item.confirmedAt ||
    item.receipt?.confirmedAt
  );
  if (isConfirmed) return 'WAITING_STOCK_IN';
  if (hasReceipt) return 'WAITING_CONFIRMATION';

  return item.status || 'PENDING';
}

function normalizeLegacyForm(item) {
  const effectiveStatus = resolveCounterFormStatus(item);
  return {
    ...item,
    id: item.id || item.formId,
    formId: item.formId || item.id,
    productName: item.productName || item.name || '',
    name: item.name || item.productName || '',
    status: effectiveStatus,
  };
}

function normalizeTaskForm(f) {
  const effectiveStatus = resolveCounterFormStatus(f);
  return {
    ...f,
    id: f.id || f.formId,
    formId: f.id || f.formId,
    name: f.productName || f.name || '',
    productName: f.productName || f.name || '',
    formStatus: f.status || 'PENDING',
    status: effectiveStatus,
    ...(f.confirmedAt || f.receipt?.confirmedAt ? { receiptConfirmed: true } : {}),
  };
}

function normalizeReferencedTask(task) {
  const id = task.id || task.refId || task.productId || task.returnId;
  return { ...task, id, refId: id };
}

export function normalizeMemberTasks(data) {
  const [forms, withdrawals, endOfTerm, invalidReturns = [], degradedItems = []] = taskGroups(data);
  const pendingForms = Array.isArray(data) ? data.map(normalizeLegacyForm) : forms.map(normalizeTaskForm);
  const pendingWithdrawals = withdrawals.map(normalizeReferencedTask);
  const pendingEndOfTerm = endOfTerm.map(normalizeReferencedTask);
  const pendingInvalidReturns = invalidReturns.map(normalizeReferencedTask);
  const pendingDegradedItems = degradedItems.map(normalizeReferencedTask);
  return {
    pendingForms,
    pendingWithdrawals,
    pendingEndOfTerm,
    pendingInvalidReturns,
    pendingDegradedItems,
    totalCount:
      pendingForms.length +
      pendingWithdrawals.length +
      pendingEndOfTerm.length +
      pendingInvalidReturns.length +
      pendingDegradedItems.length,
  };
}

export function ownsClaim(item, userId) {
  if (!userId || !item) return false;
  const claimed =
    typeof item.claimedBy === 'object' && item.claimedBy !== null
      ? item.claimedBy.id || item.claimedBy.accountId
      : item.claimedBy;
  if (!claimed) return false;
  return String(claimed).trim().toLowerCase() === String(userId).trim().toLowerCase();
}

export function lookupParams(kind, value) {
  if (!['memberCode', 'phone', 'qrPayload'].includes(kind) || !value?.trim())
    throw new Phase2Error('Nhập thông tin tra cứu hợp lệ.', 422);
  return { [kind]: value.trim() };
}

export function safeDocumentUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function warehouseOf(user) {
  return {
    id: user?.warehouseId ?? user?.warehouse?.id ?? null,
    name: user?.warehouseName ?? user?.warehouse?.name ?? '',
  };
}
