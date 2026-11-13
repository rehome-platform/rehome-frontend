/**
 * ReHome System Configuration Parameters
 * Dựa trên Mục 11: "Tham số Admin cấu hình" trong Tài liệu tổng quan hệ thống ReHome (sau Review 1)
 */

export const DEFAULT_SYSTEM_CONFIGS = {
  // 1. Kỳ ký gửi
  consignment: {
    termDays: 30, // Độ dài một kỳ (ngày)
    maxRenewals: 2, // Số lần gia hạn tối đa (tổng tối đa 90 ngày trên sàn)
    freeWithdrawalDays: 7, // Cửa sổ rút hàng miễn phí (ngày đầu mỗi kỳ)
    unclaimedDeadlineDays: 30, // Hạn chọn cách xử lý cuối kỳ (ngày) - quá hạn thành vô thừa nhận
    bringItemDeadlineDays: 7, // Hạn mang đồ đến kho sau khi duyệt form (ngày)
    maxPendingFormsPerMember: 5, // Số form đang chờ tối đa mỗi Member
  },

  // 2. Giá và hoa hồng
  pricingAndCommission: {
    commissionTerm1: 10, // Hoa hồng kỳ 1 (%) - Ngày 0-30
    commissionTerm2: 15, // Hoa hồng kỳ 2 (%) - Ngày 31-60
    commissionTerm3: 20, // Hoa hồng kỳ 3 (%) - Ngày 61-90
    floorPricePercent: 50, // Giá sàn (% giá chốt) - Chặn Member hạ giá quá thấp
    maxPriceChangesPerDay: 1, // Số lần đổi giá tối đa mỗi ngày
    withdrawalFee: 0, // Phí rút lại hàng ngoài cửa sổ miễn phí (VNĐ)
    degradedCompensationRate: 50, // Tỷ lệ đền bù khi Member lấy hàng xuống cấp về (%)
    vatRate: 8, // Tỷ lệ thuế khấu trừ (%)
    voucherMaxRatioOfCommission: 100, // Tỷ lệ giảm giá voucher tối đa trên hoa hồng (%)
  },

  // 3. Ví và rút tiền
  walletAndPayout: {
    minWithdrawalAmount: 50000, // Số tiền rút tối thiểu (VNĐ)
    maxWithdrawalsPerDay: 3, // Số lần rút tối đa mỗi ngày
  },

  // 4. Đơn hàng và trả hàng
  ordersAndReturns: {
    paymentTimeoutMinutes: 15, // Thời hạn thanh toán đơn (phút)
    autoCompleteDeliveredDays: 3, // Thời hạn tự hoàn thành đơn sau khi giao (ngày)
    returnRequestWindowDays: 3, // Thời hạn gửi yêu cầu trả hàng (ngày sau khi nhận)
    returnHandoverCarrierDays: 3, // Thời hạn bàn giao hàng trả cho GHN (ngày)
    counterPickupDays: 7, // Thời hạn đến kho nhận hàng trả/rút về (ngày)
  },

  // 5. Vận hành kho, tổ chức và cộng đồng
  operationsAndCommunity: {
    taskAutoReleaseHours: 48, // Thời gian tự nhả việc đã nhận của Moderator về hàng đợi (giờ)
    maxConcurrentCampaignsPerOrg: 3, // Số chiến dịch chạy đồng thời mỗi tổ chức
    legalDocsRetentionDays: 30, // Số ngày giữ ảnh giấy tờ CCCD sau khi duyệt (ngày)
    membershipExpiryReminderDays: 3, // Số ngày nhắc trước khi hết hạn gói VIP (ngày)
  },
};

// All 25 UI fields mapped to keys in Backend SystemConfigCatalog.
// Ratios are displayed as percentages but stored as fractions by the API.
export const SYSTEM_CONFIG_FIELDS = [
  { key: 'term_length_days', group: 'consignment', field: 'termDays' },
  { key: 'max_renewals', group: 'consignment', field: 'maxRenewals' },
  { key: 'free_withdrawal_window_days', group: 'consignment', field: 'freeWithdrawalDays' },
  { key: 'end_of_term_decision_days', group: 'consignment', field: 'unclaimedDeadlineDays' },
  { key: 'bring_in_deadline_days', group: 'consignment', field: 'bringItemDeadlineDays' },
  { key: 'max_pending_forms_per_member', group: 'consignment', field: 'maxPendingFormsPerMember' },
  { key: 'commission_rate_term1', group: 'pricingAndCommission', field: 'commissionTerm1', percent: true },
  { key: 'commission_rate_term2', group: 'pricingAndCommission', field: 'commissionTerm2', percent: true },
  { key: 'commission_rate_term3', group: 'pricingAndCommission', field: 'commissionTerm3', percent: true },
  { key: 'floor_price_ratio', group: 'pricingAndCommission', field: 'floorPricePercent', percent: true },
  { key: 'max_price_changes_per_day', group: 'pricingAndCommission', field: 'maxPriceChangesPerDay' },
  { key: 'withdrawal_fee', group: 'pricingAndCommission', field: 'withdrawalFee' },
  { key: 'degraded_compensation_rate', group: 'pricingAndCommission', field: 'degradedCompensationRate', percent: true },
  { key: 'min_payout_amount', group: 'walletAndPayout', field: 'minWithdrawalAmount' },
  { key: 'max_payout_requests_per_day', group: 'walletAndPayout', field: 'maxWithdrawalsPerDay' },
  { key: 'order_payment_timeout_minutes', group: 'ordersAndReturns', field: 'paymentTimeoutMinutes' },
  { key: 'order_auto_complete_days', group: 'ordersAndReturns', field: 'autoCompleteDeliveredDays' },
  { key: 'return_request_window_days', group: 'ordersAndReturns', field: 'returnRequestWindowDays' },
  { key: 'return_handover_carrier_days', group: 'ordersAndReturns', field: 'returnHandoverCarrierDays' },
  { key: 'counter_pickup_days', group: 'ordersAndReturns', field: 'counterPickupDays' },
  { key: 'max_concurrent_campaigns', group: 'operationsAndCommunity', field: 'maxConcurrentCampaignsPerOrg' },
  { key: 'legal_image_retention_days', group: 'operationsAndCommunity', field: 'legalDocsRetentionDays' },
  { key: 'overdue_task_hours', group: 'operationsAndCommunity', field: 'taskAutoReleaseHours' },
  { key: 'membership_expiry_reminder_days', group: 'operationsAndCommunity', field: 'membershipExpiryReminderDays' },
  { key: 'voucher_max_ratio_of_commission', group: 'pricingAndCommission', field: 'voucherMaxRatioOfCommission', percent: true },
];

const EFFECTIVE_CONSIGNMENT_CONFIG_KEY = 'rehome_effective_consignment_config';

export function saveEffectiveConsignmentConfig(configs) {
  if (!configs?.consignment && !configs?.pricingAndCommission) return;
  try {
    const payload = {
      termLengthDays: Number(configs.consignment?.termDays) || DEFAULT_SYSTEM_CONFIGS.consignment.termDays,
      maxRenewals:
        configs.consignment?.maxRenewals != null && configs.consignment?.maxRenewals !== ''
          ? Number(configs.consignment.maxRenewals)
          : DEFAULT_SYSTEM_CONFIGS.consignment.maxRenewals,
      freeWithdrawalWindowDays:
        configs.consignment?.freeWithdrawalDays != null && configs.consignment?.freeWithdrawalDays !== ''
          ? Number(configs.consignment.freeWithdrawalDays)
          : DEFAULT_SYSTEM_CONFIGS.consignment.freeWithdrawalDays,
      floorPricePercent:
        configs.pricingAndCommission?.floorPricePercent != null && configs.pricingAndCommission?.floorPricePercent !== ''
          ? Number(configs.pricingAndCommission.floorPricePercent)
          : DEFAULT_SYSTEM_CONFIGS.pricingAndCommission.floorPricePercent,
      commissionTerm1:
        configs.pricingAndCommission?.commissionTerm1 != null && configs.pricingAndCommission?.commissionTerm1 !== ''
          ? Number(configs.pricingAndCommission.commissionTerm1)
          : DEFAULT_SYSTEM_CONFIGS.pricingAndCommission.commissionTerm1,
      commissionTerm2:
        configs.pricingAndCommission?.commissionTerm2 != null && configs.pricingAndCommission?.commissionTerm2 !== ''
          ? Number(configs.pricingAndCommission.commissionTerm2)
          : DEFAULT_SYSTEM_CONFIGS.pricingAndCommission.commissionTerm2,
      commissionTerm3:
        configs.pricingAndCommission?.commissionTerm3 != null && configs.pricingAndCommission?.commissionTerm3 !== ''
          ? Number(configs.pricingAndCommission.commissionTerm3)
          : DEFAULT_SYSTEM_CONFIGS.pricingAndCommission.commissionTerm3,
    };
    localStorage.setItem(EFFECTIVE_CONSIGNMENT_CONFIG_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors in restricted environments
  }
}

export function readEffectiveConsignmentConfig() {
  try {
    const raw = localStorage.getItem(EFFECTIVE_CONSIGNMENT_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

