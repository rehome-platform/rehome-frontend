export const RECONSIGN_STATUS = {
  AWAITING_PRICE: 'AWAITING_PRICE',
  PROPOSED: 'PROPOSED',
  COUNTER_OFFERED: 'COUNTER_OFFERED',
  CONFIRMED: 'CONFIRMED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED',
};

export const MODERATOR_RESPONSE_OVERDUE_DAYS = 2;

export const RECONSIGN_STATUS_META = {
  AWAITING_PRICE: {
    label: 'Chờ chốt giá',
    badgeClass: 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]',
  },
  PROPOSED: {
    label: 'Chờ Member xác nhận',
    badgeClass: 'bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]',
  },
  PROPOSAL_SENT: {
    label: 'Chờ Member xác nhận',
    badgeClass: 'bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]',
  },
  COUNTER_OFFERED: {
    label: 'Member trả giá',
    badgeClass: 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]',
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    badgeClass: 'bg-[#ECFDF3] text-[#067647] border border-[#ABEFC6]',
  },
  DECLINED: {
    label: 'Member từ chối',
    badgeClass: 'bg-[#F2F4F7] text-[#344054] border border-[#D0D5DD]',
  },
  EXPIRED: {
    label: 'Quá hạn xác nhận',
    badgeClass: 'bg-[#F2F4F7] text-[#667085] border border-[#D0D5DD]',
  },
};

export const RECONSIGN_HISTORY_ACTION_LABELS = {
  PROPOSE: 'Moderator đề xuất giá',
  COUNTER: 'Member trả giá',
  ACCEPT: 'Moderator chấp nhận giá Member',
  REPROPOSE: 'Moderator đề xuất giá khác',
  KEEP: 'Moderator giữ nguyên giá cũ',
  DECLINE: 'Member không đồng ý',
  CONFIRM: 'Member xác nhận biên nhận',
  EXPIRE: 'Quá hạn xác nhận',
};

export const RECONSIGN_ACTOR_LABELS = {
  MODERATOR: 'Moderator',
  MEMBER: 'Member',
  SYSTEM: 'Hệ thống',
};

export function normalizeReConsignStatus(rawStatus, fallback = {}) {
  const norm = typeof rawStatus === 'string' ? rawStatus.trim().toUpperCase() : '';
  if (norm === 'PROPOSAL_SENT') return RECONSIGN_STATUS.PROPOSED;
  if (RECONSIGN_STATUS[norm]) return RECONSIGN_STATUS[norm];

  const productStatus = typeof fallback.productStatus === 'string' ? fallback.productStatus.trim().toUpperCase() : '';
  if (productStatus === 'ON_SALE' && Number(fallback.currentTerm) === 1 && (fallback.hasProposal || fallback.hasReceipt)) {
    return RECONSIGN_STATUS.CONFIRMED;
  }
  if (fallback.hasProposal || fallback.hasReceipt) {
    return RECONSIGN_STATUS.PROPOSED;
  }
  if (fallback.hasDecision) {
    return RECONSIGN_STATUS.AWAITING_PRICE;
  }
  return null;
}

export function counterResponseTimestamp(row) {
  return row?.counteredAt || row?.counterOfferedAt || row?.updatedAt || row?.decidedAt || null;
}

export function isCounterResponseOverdue(row, now = Date.now(), thresholdDays = MODERATOR_RESPONSE_OVERDUE_DAYS) {
  const status = normalizeReConsignStatus(row?.reConsignStatus);
  if (status !== RECONSIGN_STATUS.COUNTER_OFFERED) return false;
  const rawTs = counterResponseTimestamp(row);
  if (!rawTs) return false;
  const ms = Date.parse(rawTs);
  if (!Number.isFinite(ms)) return false;
  return now - ms > thresholdDays * 24 * 3600 * 1000;
}

function statusPriority(status) {
  if (status === RECONSIGN_STATUS.COUNTER_OFFERED) return 0;
  if (status === RECONSIGN_STATUS.AWAITING_PRICE) return 1;
  if (status === RECONSIGN_STATUS.PROPOSED) return 2;
  return 3;
}

function parseMs(raw) {
  if (!raw) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

export function sortPendingPricingRows(rows, now = Date.now()) {
  if (!Array.isArray(rows)) return [];
  return [...rows].sort((a, b) => {
    const statusA = normalizeReConsignStatus(a?.reConsignStatus, { hasDecision: Boolean(a?.decisionId) });
    const statusB = normalizeReConsignStatus(b?.reConsignStatus, { hasDecision: Boolean(b?.decisionId) });
    const prioDiff = statusPriority(statusA) - statusPriority(statusB);
    if (prioDiff !== 0) return prioDiff;

    if (statusA === RECONSIGN_STATUS.COUNTER_OFFERED) {
      const overdueA = isCounterResponseOverdue(a, now) ? 0 : 1;
      const overdueB = isCounterResponseOverdue(b, now) ? 0 : 1;
      if (overdueA !== overdueB) return overdueA - overdueB;
      return parseMs(counterResponseTimestamp(a)) - parseMs(counterResponseTimestamp(b));
    }

    return parseMs(a?.decidedAt || a?.createdAt) - parseMs(b?.decidedAt || b?.createdAt);
  });
}

export function formatReConsignError(error) {
  const code = String(error?.code || '').trim().toUpperCase();
  if (code === 'RE_CONSIGN_NOT_COUNTERED') {
    return 'Yêu cầu hiện không còn ở trạng thái Member trả giá. Vui lòng tải lại để xem trạng thái mới nhất.';
  }
  if (code === 'INVALID_FLOOR_PRICE') {
    return 'Giá sàn không hợp lệ: phải lớn hơn 0 và không vượt quá giá thỏa thuận.';
  }
  return error?.message || 'Không thể xử lý yêu cầu ký gửi lại.';
}
