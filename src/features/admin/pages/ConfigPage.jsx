import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { Input, Button } from '../../../components/common/index.js';
import { DEFAULT_SYSTEM_CONFIGS } from '../../../configs/systemParams.config.js';

/**
 * Trang Cấu Hình Tham Số Hệ Thống ReHome
 * Triển khai chính xác theo Mục 11: "Tham số Admin cấu hình" (sau Review 1)
 * Mọi thay đổi đều được lưu vào Audit Log hệ thống.
 */
export default function ConfigPage() {
  const { user } = useAuth();
  const { onLogAction } = useOutletContext() || {};
  const [activeTab, setActiveTab] = useState('consignment');
  const [configs, setConfigs] = useState(DEFAULT_SYSTEM_CONFIGS);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const tabs = [
    { id: 'consignment', label: '1. Kỳ ký gửi', icon: 'timelapse' },
    { id: 'pricing', label: '2. Giá & Hoa hồng', icon: 'payments' },
    { id: 'wallet', label: '3. Ví & Rút tiền', icon: 'account_balance_wallet' },
    { id: 'orders', label: '4. Đơn & Trả hàng', icon: 'local_shipping' },
    { id: 'operations', label: '5. Vận hành & Cộng đồng', icon: 'warehouse' },
  ];

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSavedSuccess(true);
      if (onLogAction) {
        onLogAction({
          time: new Date().toLocaleString('vi-VN'),
          user: user?.fullName || user?.name || 'Trần Minh Quân',
          role: 'Admin',
          action: 'Cập nhật cấu hình tham số hệ thống (Mục 11)',
        });
      }
      setTimeout(() => setSavedSuccess(false), 3500);
    }, 600);
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-[#E8F5E9] text-[#006B2C]">
                Mục 11 • Review 1
              </span>
              <h1 className="text-2xl font-extrabold font-heading text-[#191C19]">
                Cấu Hình Tham Số Hệ Thống ReHome
              </h1>
            </div>
            <p className="text-xs text-[#717971] mt-1">
              Mọi con số đều thay đổi được mà không cần sửa code. Thay đổi chỉ áp dụng cho giao dịch phát sinh sau đó.
            </p>
          </div>
          <Button
            type="submit"
            form="config-form"
            loading={saving}
            className="bg-[#006B2C] hover:bg-[#005221] text-white shrink-0"
          >
            <span className="material-symbols-outlined text-sm mr-1.5">save</span>
            Lưu thay đổi tham số
          </Button>
        </div>

        {savedSuccess && (
          <div className="p-4 bg-[#E8F5E9] border border-[#C8E6C9] text-[#006B2C] rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span>Đã cập nhật tham số hệ thống thành công và ghi nhận vào Audit Log!</span>
            </div>
            <span className="text-[11px] text-[#00685F]">Áp dụng ngay lập tức</span>
          </div>
        )}

        {/* Tab selection */}
        <div className="flex border-b border-[#DDE5D9] space-x-2 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-[#006B2C] text-[#006B2C] bg-[#006B2C]/5'
                    : 'border-transparent text-[#717971] hover:text-[#191C19] hover:bg-[#F6F9F4]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form container */}
        <form id="config-form" onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-2xl border border-[#DDE5D9] shadow-sm space-y-6">
          {/* TAB 1: Kỳ ký gửi */}
          {activeTab === 'consignment' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#191C19]">Quy định Vòng Đời & Kỳ Ký Gửi</h3>
                <p className="text-xs text-[#717971]">Chu kỳ bán hàng tại kho tập trung ReHome (Mặc định 3 kỳ = 90 ngày)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Độ dài một kỳ (ngày)"
                  type="number"
                  value={configs.consignment.termDays}
                  helperText="Áp dụng tự gia hạn kỳ và tính ngày hết kỳ (Mặc định: 30 ngày)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    consignment: { ...configs.consignment, termDays: Number(e.target.value) }
                  })}
                  required
                />

                <Input
                  label="Số lần gia hạn tối đa"
                  type="number"
                  value={configs.consignment.maxRenewals}
                  helperText="Tổng 90 ngày trên sàn (30 ngày x 3), hết thì chuyển Chờ xử lý cuối kỳ"
                  onChange={(e) => setConfigs({
                    ...configs,
                    consignment: { ...configs.consignment, maxRenewals: Number(e.target.value) }
                  })}
                  required
                />

                <Input
                  label="Cửa sổ rút hàng miễn phí (ngày)"
                  type="number"
                  value={configs.consignment.freeWithdrawalDays}
                  helperText="Số ngày đầu mỗi kỳ người bán được quyền rút hàng miễn phí (Mặc định: 7 ngày)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    consignment: { ...configs.consignment, freeWithdrawalDays: Number(e.target.value) }
                  })}
                  required
                />

                <Input
                  label="Hạn chọn xử lý cuối kỳ (ngày)"
                  type="number"
                  value={configs.consignment.unclaimedDeadlineDays}
                  helperText="Hết 30 ngày không phản hồi -> Hàng thành vô thừa nhận chuyển từ thiện"
                  onChange={(e) => setConfigs({
                    ...configs,
                    consignment: { ...configs.consignment, unclaimedDeadlineDays: Number(e.target.value) }
                  })}
                  required
                />

                <Input
                  label="Hạn mang đồ đến kho sau duyệt (ngày)"
                  type="number"
                  value={configs.consignment.bringItemDeadlineDays}
                  helperText="Hết hạn thì form online tự hủy để giải phóng chỗ kho (Mặc định: 7 ngày)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    consignment: { ...configs.consignment, bringItemDeadlineDays: Number(e.target.value) }
                  })}
                  required
                />

                <Input
                  label="Số form đang chờ tối đa / Member"
                  type="number"
                  value={configs.consignment.maxPendingFormsPerMember}
                  helperText="Chặn Member tạo form mới nếu đã đạt trần (Mặc định: 5 form)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    consignment: { ...configs.consignment, maxPendingFormsPerMember: Number(e.target.value) }
                  })}
                  required
                />
              </div>
            </div>
          )}

          {/* TAB 2: Giá & Hoa hồng */}
          {activeTab === 'pricing' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#191C19]">Tỷ lệ Hoa Hồng Tăng Dần & Giá Sàn</h3>
                <p className="text-xs text-[#717971]">Hoa hồng chốt theo kỳ lúc đơn được đặt. Giá sàn chống hạ giá quá thấp.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Hoa hồng kỳ 1 (%)"
                  type="number"
                  value={configs.pricingAndCommission.commissionTerm1}
                  helperText="Ngày 0 - 30 (Mặc định: 10%)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    pricingAndCommission: { ...configs.pricingAndCommission, commissionTerm1: Number(e.target.value) }
                  })}
                  required
                />
                <Input
                  label="Hoa hồng kỳ 2 (%)"
                  type="number"
                  value={configs.pricingAndCommission.commissionTerm2}
                  helperText="Ngày 31 - 60 (Mặc định: 15%)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    pricingAndCommission: { ...configs.pricingAndCommission, commissionTerm2: Number(e.target.value) }
                  })}
                  required
                />
                <Input
                  label="Hoa hồng kỳ 3 (%)"
                  type="number"
                  value={configs.pricingAndCommission.commissionTerm3}
                  helperText="Ngày 61 - 90 (Mặc định: 20%)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    pricingAndCommission: { ...configs.pricingAndCommission, commissionTerm3: Number(e.target.value) }
                  })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <Input
                  label="Tỷ lệ Giá sàn (% giá chốt)"
                  type="number"
                  value={configs.pricingAndCommission.floorPricePercent}
                  helperText="Chặn Member hạ giá thấp hơn mức này (Mặc định: 50% giá chốt)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    pricingAndCommission: { ...configs.pricingAndCommission, floorPricePercent: Number(e.target.value) }
                  })}
                  required
                />

                <Input
                  label="Số lần đổi giá tối đa / ngày"
                  type="number"
                  value={configs.pricingAndCommission.maxPriceChangesPerDay}
                  helperText="Chống spam đổi giá liên tục (Mặc định: 1 lần/ngày)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    pricingAndCommission: { ...configs.pricingAndCommission, maxPriceChangesPerDay: Number(e.target.value) }
                  })}
                  required
                />

                <Input
                  label="Phí rút lại hàng cố định (VNĐ)"
                  type="number"
                  value={configs.pricingAndCommission.withdrawalFee}
                  helperText="Thu khi Member rút hàng ngoài cửa sổ 7 ngày miễn phí (Mặc định: 50.000 đ)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    pricingAndCommission: { ...configs.pricingAndCommission, withdrawalFee: Number(e.target.value) }
                  })}
                  required
                />

                <Input
                  label="Tỷ lệ đền hàng xuống cấp (%)"
                  type="number"
                  value={configs.pricingAndCommission.degradedCompensationRate}
                  helperText="Đền một phần khi người bán lấy hàng xuống cấp về (Mặc định: 50%)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    pricingAndCommission: { ...configs.pricingAndCommission, degradedCompensationRate: Number(e.target.value) }
                  })}
                  required
                />
              </div>
            </div>
          )}

          {/* TAB 3: Ví & Rút tiền */}
          {activeTab === 'wallet' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#191C19]">Tham Số Ví Member & Rút Tiền Tự Động</h3>
                <p className="text-xs text-[#717971]">Rút tiền không qua người duyệt; kiểm soát bằng số tiền tối thiểu và số lần mỗi ngày.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Số tiền rút tối thiểu (VNĐ)"
                  type="number"
                  value={configs.walletAndPayout.minWithdrawalAmount}
                  helperText="Chặn yêu cầu rút quá nhỏ (Mặc định: 10.000 đ)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    walletAndPayout: { ...configs.walletAndPayout, minWithdrawalAmount: Number(e.target.value) }
                  })}
                  required
                />

                <Input
                  label="Số lần rút tối đa mỗi ngày"
                  type="number"
                  value={configs.walletAndPayout.maxWithdrawalsPerDay}
                  helperText="Chống spam giao dịch chi tiền giả lập (Mặc định: 3 lần/ngày)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    walletAndPayout: { ...configs.walletAndPayout, maxWithdrawalsPerDay: Number(e.target.value) }
                  })}
                  required
                />
              </div>
            </div>
          )}

          {/* TAB 4: Đơn hàng & Trả hàng */}
          {activeTab === 'orders' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#191C19]">Thời Hạn Đơn Hàng & Xử Lý Trả Hàng</h3>
                <p className="text-xs text-[#717971]">Đồng bộ GHN, tự động hóa hủy đơn quá hạn và tự hoàn thành đơn.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Thời hạn thanh toán đơn (phút)"
                  type="number"
                  value={configs.ordersAndReturns.paymentTimeoutMinutes}
                  helperText="Hết hạn thì tự hủy đơn, nhả sản phẩm về sàn (Mặc định: 15 phút)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    ordersAndReturns: { ...configs.ordersAndReturns, paymentTimeoutMinutes: Number(e.target.value) }
                  })}
                  required
                />

                <Input
                  label="Thời hạn tự hoàn thành sau giao (ngày)"
                  type="number"
                  value={configs.ordersAndReturns.autoCompleteDeliveredDays}
                  helperText="Member không bấm xác nhận thì hệ thống tự chốt và cộng tiền ví seller (Mặc định: 3 ngày)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    ordersAndReturns: { ...configs.ordersAndReturns, autoCompleteDeliveredDays: Number(e.target.value) }
                  })}
                  required
                />

                <Input
                  label="Thời hạn gửi yêu cầu trả hàng (ngày)"
                  type="number"
                  value={configs.ordersAndReturns.returnRequestWindowDays}
                  helperText="Tính từ khi người mua nhận hàng; quá hạn không được trả (Mặc định: 3 ngày)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    ordersAndReturns: { ...configs.ordersAndReturns, returnRequestWindowDays: Number(e.target.value) }
                  })}
                  required
                />

                <Input
                  label="Thời hạn bàn giao hàng trả cho GHN (ngày)"
                  type="number"
                  value={configs.ordersAndReturns.returnHandoverCarrierDays}
                  helperText="Không bàn giao thì hủy yêu cầu trả, đóng đơn (Mặc định: 3 ngày)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    ordersAndReturns: { ...configs.ordersAndReturns, returnHandoverCarrierDays: Number(e.target.value) }
                  })}
                  required
                />

                <Input
                  label="Thời hạn đến kho nhận hàng trả / rút (ngày)"
                  type="number"
                  value={configs.ordersAndReturns.counterPickupDays}
                  helperText="Áp dụng cho hàng rút về và hàng trả không hợp lệ (Mặc định: 7 ngày)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    ordersAndReturns: { ...configs.ordersAndReturns, counterPickupDays: Number(e.target.value) }
                  })}
                  required
                />
              </div>
            </div>
          )}

          {/* TAB 5: Vận hành & Cộng đồng */}
          {activeTab === 'operations' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#191C19]">Vận Hành Kho, Tổ Chức & Cộng Đồng</h3>
                <p className="text-xs text-[#717971]">Hàng đợi Moderator, giới hạn chiến dịch và lưu trữ tài liệu nhạy cảm.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Thời gian tự nhả việc đã nhận (giờ)"
                  type="number"
                  value={configs.operationsAndCommunity.taskAutoReleaseHours}
                  helperText="Sau 48h Moderator không xử lý -> Tự nhả về hàng đợi kho và báo Admin (Mặc định: 48h)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    operationsAndCommunity: { ...configs.operationsAndCommunity, taskAutoReleaseHours: Number(e.target.value) }
                  })}
                  required
                />

                <Input
                  label="Số chiến dịch đồng thời / Tổ chức"
                  type="number"
                  value={configs.operationsAndCommunity.maxConcurrentCampaignsPerOrg}
                  helperText="Chặn tạo chiến dịch mới nếu đã đạt giới hạn (Mặc định: 3 chiến dịch)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    operationsAndCommunity: { ...configs.operationsAndCommunity, maxConcurrentCampaignsPerOrg: Number(e.target.value) }
                  })}
                  required
                />

                <Input
                  label="Số ngày giữ ảnh giấy tờ CCCD sau duyệt (ngày)"
                  type="number"
                  value={configs.operationsAndCommunity.legalDocsRetentionDays}
                  helperText="Hết hạn thì hệ thống tự xóa ảnh CCCD để bảo vệ riêng tư (Mặc định: 30 ngày)"
                  onChange={(e) => setConfigs({
                    ...configs,
                    operationsAndCommunity: { ...configs.operationsAndCommunity, legalDocsRetentionDays: Number(e.target.value) }
                  })}
                  required
                />
              </div>
            </div>
          )}
        </form>
    </div>
  );
}

