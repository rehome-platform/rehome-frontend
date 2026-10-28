import { Phase2Error } from './warehouseTransportModel.js';

export function listItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return taskGroups(data).flat();
}

function taskGroups(data) {
  return [data?.pendingForms || [], data?.pendingWithdrawals || [], data?.pendingEndOfTerm || []];
}

function normalizeLegacyForm(item) {
  return {
    ...item,
    id: item.id || item.formId,
    formId: item.formId || item.id,
    productName: item.productName || item.name || '',
    name: item.name || item.productName || '',
  };
}

function normalizeTaskForm(f) {
  return {
    ...f,
    id: f.id || f.formId,
    formId: f.id || f.formId,
    name: f.productName || f.name || '',
    productName: f.productName || f.name || '',
  };
}

function normalizeReferencedTask(task) {
  const id = task.id || task.refId;
  return { ...task, id, refId: id };
}

export function normalizeMemberTasks(data) {
  const [forms, withdrawals, endOfTerm] = taskGroups(data);
  const pendingForms = Array.isArray(data) ? data.map(normalizeLegacyForm) : forms.map(normalizeTaskForm);
  const pendingWithdrawals = withdrawals.map(normalizeReferencedTask);
  const pendingEndOfTerm = endOfTerm.map(normalizeReferencedTask);
  return {
    pendingForms,
    pendingWithdrawals,
    pendingEndOfTerm,
    totalCount: pendingForms.length + pendingWithdrawals.length + pendingEndOfTerm.length,
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
