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
    withdrawalFee: 50000, // Phí rút lại hàng ngoài cửa sổ miễn phí (VNĐ)
    degradedCompensationRate: 50, // Tỷ lệ đền bù khi Member lấy hàng xuống cấp về (%)
    vatRate: 8, // Tỷ lệ thuế khấu trừ (%)
  },

  // 3. Ví và rút tiền
  walletAndPayout: {
    minWithdrawalAmount: 10000, // Số tiền rút tối thiểu (VNĐ)
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
  },
};
