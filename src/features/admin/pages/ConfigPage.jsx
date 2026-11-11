import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { Input, Button } from '../../../components/common/index.js';
import { DEFAULT_SYSTEM_CONFIGS, SYSTEM_CONFIG_FIELDS } from '../../../configs/systemParams.config.js';
import adminApi from '../services/adminApi';

/**
 * Trang Cấu Hình Tham Số Hệ Thống ReHome
 * GET /api/admin/config is the source of effective values and validation limits.
 * Only fields present in the backend catalog can be saved with PUT /{key}.
 */
export default function ConfigPage() {
  const { user } = useAuth();
  const { onLogAction } = useOutletContext() || {};
  const [activeTab, setActiveTab] = useState('consignment');
  const [configs, setConfigs] = useState(DEFAULT_SYSTEM_CONFIGS);
  const [specs, setSpecs] = useState({});
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!savedSuccess) return;
    const timer = setTimeout(() => setSavedSuccess(false), 4000);
    return () => clearTimeout(timer);
  }, [savedSuccess]);

  const tabs = [
    { id: 'consignment', label: '1. Kỳ ký gửi', icon: 'timelapse' },
    { id: 'pricing', label: '2. Giá & Hoa hồng', icon: 'payments' },
    { id: 'wallet', label: '3. Ví & Rút tiền', icon: 'account_balance_wallet' },
    { id: 'orders', label: '4. Đơn & Trả hàng', icon: 'local_shipping' },
    { id: 'operations', label: '5. Vận hành & Cộng đồng', icon: 'warehouse' },
  ];

  useEffect(() => {
    loadBackendConfigs();
  }, []);

  const fetchBackendConfigs = async () => {
    const data = await adminApi.getConfigs();
    if (!Array.isArray(data)) throw new Error('Dữ liệu cấu hình từ máy chủ không hợp lệ.');
    const updated = JSON.parse(JSON.stringify(DEFAULT_SYSTEM_CONFIGS));
    const nextSpecs = {};
    for (const mapping of SYSTEM_CONFIG_FIELDS) {
      const spec = data.find(item => item.key === mapping.key);
      if (!spec) continue;
      if (spec.value == null || String(spec.value).trim() === '' || !Number.isFinite(Number(spec.value))
          || !['INT', 'DECIMAL'].includes(spec.type)
          || spec.min == null || spec.max == null
          || !Number.isFinite(Number(spec.min)) || !Number.isFinite(Number(spec.max))) {
        throw new Error(`Dữ liệu cấu hình [${mapping.key}] không hợp lệ.`);
      }
      updated[mapping.group][mapping.field] = mapping.percent
        ? Number((Number(spec.value) * 100).toPrecision(15)) : Number(spec.value);
      nextSpecs[mapping.key] = spec;
    }
    if (!Object.keys(nextSpecs).length) throw new Error('Máy chủ chưa trả về tham số cấu hình được hỗ trợ.');
    setConfigs(updated);
    setSpecs(nextSpecs);
    setLoaded(true);
  };

  const loadBackendConfigs = async () => {
    setLoading(true);
    setLoaded(false);
    setSavedSuccess(false);
    setErrorMessage('');
    try {
      await fetchBackendConfigs();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Không thể tải cấu hình từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const getFieldProps = (group, field) => {
    const mapping = SYSTEM_CONFIG_FIELDS.find(item => item.group === group && item.field === field);
    const spec = mapping && specs[mapping.key];
    const scale = mapping?.percent ? 100 : 1;
    return {
      value: loaded && spec ? configs[group][field] : '',
      disabled: loading || saving || !loaded || !spec,
      required: Boolean(spec),
      min: spec ? Number((Number(spec.min) * scale).toPrecision(15)) : undefined,
      max: spec ? Number((Number(spec.max) * scale).toPrecision(15)) : undefined,
      step: spec?.type === 'INT' ? 1 : 'any',
      helperText: !mapping ? 'Chưa áp dụng: backend chưa hỗ trợ chỉnh tham số này.'
        : loaded && !spec ? 'Chưa áp dụng: máy chủ chưa cung cấp tham số này.' : undefined,
    };
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (loading || saving || !loaded) return;
    setSaving(true);
    setSavedSuccess(false);
    setErrorMessage('');

    try {
      const configKeyMap = SYSTEM_CONFIG_FIELDS.filter(item => specs[item.key]).map(({ key, group, field, percent }) => {
        const raw = configs[group][field];
        const value = percent ? Number((Number(raw) / 100).toPrecision(15)) : Number(raw);
        const spec = specs[key];
        if (String(raw).trim() === '' || !Number.isFinite(value)
            || value < Number(spec.min) || value > Number(spec.max)
            || (spec.type === 'INT' && !Number.isInteger(value))) {
          throw new Error(`Tham số [${key}] phải ${spec.type === 'INT' ? 'là số nguyên và ' : ''}nằm trong khoảng ${Number(spec.min) * (percent ? 100 : 1)} – ${Number(spec.max) * (percent ? 100 : 1)}${percent ? '%' : ''}.`);
        }
        return { key, value: String(value) };
      });
      // Wait for every request: PUTs are independent, so a failure can be partial.
      const results = await Promise.allSettled(configKeyMap.map(({ key, value }) => adminApi.updateConfig(key, value)));
      const failures = results.flatMap((result, index) => result.status === 'rejected'
        ? [`${configKeyMap[index].key}: ${result.reason?.response?.data?.message || result.reason?.message || 'Lỗi máy chủ'}`] : []);
      if (failures.length) {
        throw new Error(`Chưa lưu đầy đủ cấu hình. Một số tham số có thể đã được cập nhật. Vui lòng kiểm tra và thử lưu lại. ${failures.join('; ')}`);
      }
      // Confirm effective values instead of persisting a browser-only snapshot.
      await fetchBackendConfigs();
      setSavedSuccess(true);

      if (onLogAction) {
        onLogAction({
          time: new Date().toLocaleString('vi-VN'),
          user: user?.fullName || user?.name || 'Admin',
          role: 'Admin',
          action: 'Cập nhật cấu hình tham số hệ thống (API 146 - PUT /api/admin/config/{key})',
        });
      }

    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Lỗi khi cập nhật cấu hình tham số.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-heading text-[#191C19]">
            Cấu Hình Tham Số Hệ Thống ReHome
          </h1>
          <p className="text-xs text-[#717971] mt-0.5">
            Quy định các tham số cốt lõi về vòng đời ký gửi, tỷ lệ hoa hồng, giá sàn và thời hạn xử lý.
          </p>
        </div>
        <Button
          type="submit"
          form="config-form"
          loading={saving}
          disabled={loading || !loaded}
          className="bg-[#006B2C] hover:bg-[#005221] text-white shrink-0 shadow-sm"
        >
          <span className="material-symbols-outlined text-sm mr-1.5">save</span>
          Lưu thay đổi tham số
        </Button>
      </div>

      {loading && <p role="status" className="text-sm text-[#717971]">Đang tải cấu hình từ máy chủ...</p>}

      {savedSuccess && (
        <div className="p-4 bg-[#E8F5E9] border border-[#C8E6C9] text-[#006B2C] rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            <span>Đã đồng bộ tham số hệ thống tới máy chủ thành công và ghi nhận vào Audit Log!</span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="p-4 bg-[#FFF5F5] border border-[#DC2626]/20 text-[#DC2626] rounded-2xl text-xs font-semibold flex items-center space-x-2 shadow-sm animate-fade-in">
          <span className="material-symbols-outlined text-lg">error</span>
          <span>{errorMessage}</span>
          {!loaded && !loading && <Button size="sm" variant="outline" onClick={loadBackendConfigs}>Thử lại</Button>}
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
      <form id="config-form" noValidate onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-2xl border border-[#DDE5D9] shadow-sm space-y-6">
        {/* TAB 1: Kỳ ký gửi */}
        {activeTab === 'consignment' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#191C19]">Quy định Vòng Đời & Kỳ Ký Gửi</h3>
              <p className="text-xs text-[#717971] mt-0.5">
                Các quy định về thời gian hiệu lực và quyền hạn gia hạn ký gửi của Member.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Độ dài một kỳ (ngày)"
                type="number"
                {...getFieldProps('consignment', 'termDays')}
                onChange={(e) => setConfigs({
                  ...configs,
                  consignment: { ...configs.consignment, termDays: e.target.value }
                })}
              />

              <Input
                label="Số lần gia hạn tối đa"
                type="number"
                {...getFieldProps('consignment', 'maxRenewals')}
                onChange={(e) => setConfigs({
                  ...configs,
                  consignment: { ...configs.consignment, maxRenewals: e.target.value }
                })}
              />

              <Input
                label="Cửa sổ rút hàng miễn phí (ngày)"
                type="number"
                {...getFieldProps('consignment', 'freeWithdrawalDays')}
                onChange={(e) => setConfigs({
                  ...configs,
                  consignment: { ...configs.consignment, freeWithdrawalDays: e.target.value }
                })}
              />

              <Input
                label="Hạn chọn xử lý cuối kỳ (ngày)"
                type="number"
                {...getFieldProps('consignment', 'unclaimedDeadlineDays')}
                onChange={(e) => setConfigs({
                  ...configs,
                  consignment: { ...configs.consignment, unclaimedDeadlineDays: e.target.value }
                })}
              />

              <Input
                label="Hạn mang đồ đến kho sau duyệt (ngày)"
                type="number"
                {...getFieldProps('consignment', 'bringItemDeadlineDays')}
                onChange={(e) => setConfigs({
                  ...configs,
                  consignment: { ...configs.consignment, bringItemDeadlineDays: e.target.value }
                })}
              />

              <Input
                label="Số form đang chờ tối đa / Member"
                type="number"
                {...getFieldProps('consignment', 'maxPendingFormsPerMember')}
                onChange={(e) => setConfigs({
                  ...configs,
                  consignment: { ...configs.consignment, maxPendingFormsPerMember: e.target.value }
                })}
              />
            </div>
          </div>
        )}

        {/* TAB 2: Giá & Hoa hồng */}
        {activeTab === 'pricing' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#191C19]">Tỷ lệ Hoa Hồng Tăng Dần & Giá Sàn</h3>
              <p className="text-xs text-[#717971] mt-0.5">
                Chính sách hoa hồng nền tảng và tỷ lệ bảo vệ giá bán tối thiểu.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Hoa hồng kỳ 1 (%)"
                type="number"
                {...getFieldProps('pricingAndCommission', 'commissionTerm1')}
                onChange={(e) => setConfigs({
                  ...configs,
                  pricingAndCommission: { ...configs.pricingAndCommission, commissionTerm1: e.target.value }
                })}
              />
              <Input
                label="Hoa hồng kỳ 2 (%)"
                type="number"
                {...getFieldProps('pricingAndCommission', 'commissionTerm2')}
                onChange={(e) => setConfigs({
                  ...configs,
                  pricingAndCommission: { ...configs.pricingAndCommission, commissionTerm2: e.target.value }
                })}
              />
              <Input
                label="Hoa hồng kỳ 3 (%)"
                type="number"
                {...getFieldProps('pricingAndCommission', 'commissionTerm3')}
                onChange={(e) => setConfigs({
                  ...configs,
                  pricingAndCommission: { ...configs.pricingAndCommission, commissionTerm3: e.target.value }
                })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <Input
                label="Tỷ lệ Giá sàn (% giá chốt)"
                type="number"
                {...getFieldProps('pricingAndCommission', 'floorPricePercent')}
                onChange={(e) => setConfigs({
                  ...configs,
                  pricingAndCommission: { ...configs.pricingAndCommission, floorPricePercent: e.target.value }
                })}
              />

              <Input
                label="Số lần đổi giá tối đa / ngày"
                type="number"
                {...getFieldProps('pricingAndCommission', 'maxPriceChangesPerDay')}
                onChange={(e) => setConfigs({
                  ...configs,
                  pricingAndCommission: { ...configs.pricingAndCommission, maxPriceChangesPerDay: e.target.value }
                })}
              />

              <Input
                label="Phí rút lại hàng cố định (VNĐ)"
                type="number"
                {...getFieldProps('pricingAndCommission', 'withdrawalFee')}
                onChange={(e) => setConfigs({
                  ...configs,
                  pricingAndCommission: { ...configs.pricingAndCommission, withdrawalFee: e.target.value }
                })}
              />

              <Input
                label="Tỷ lệ đền hàng xuống cấp (%)"
                type="number"
                {...getFieldProps('pricingAndCommission', 'degradedCompensationRate')}
                onChange={(e) => setConfigs({
                  ...configs,
                  pricingAndCommission: { ...configs.pricingAndCommission, degradedCompensationRate: e.target.value }
                })}
              />
            </div>
          </div>
        )}

        {/* TAB 3: Ví & Rút tiền */}
        {activeTab === 'wallet' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#191C19]">Tham Số Ví Member & Rút Tiền Tự Động</h3>
              <p className="text-xs text-[#717971] mt-0.5">
                Các hạn mức giao dịch chuyển khoản về tài khoản ngân hàng của thành viên.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Số tiền rút tối thiểu (VNĐ)"
                type="number"
                {...getFieldProps('walletAndPayout', 'minWithdrawalAmount')}
                onChange={(e) => setConfigs({
                  ...configs,
                  walletAndPayout: { ...configs.walletAndPayout, minWithdrawalAmount: e.target.value }
                })}
              />

              <Input
                label="Số lần rút tối đa mỗi ngày"
                type="number"
                {...getFieldProps('walletAndPayout', 'maxWithdrawalsPerDay')}
                onChange={(e) => setConfigs({
                  ...configs,
                  walletAndPayout: { ...configs.walletAndPayout, maxWithdrawalsPerDay: e.target.value }
                })}
              />
            </div>
          </div>
        )}

        {/* TAB 4: Đơn hàng & Trả hàng */}
        {activeTab === 'orders' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#191C19]">Thời Hạn Đơn Hàng & Xử Lý Trả Hàng</h3>
              <p className="text-xs text-[#717971] mt-0.5">
                Hạn chót thanh toán, tự động đối soát và cửa sổ đổi trả hàng hóa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Thời hạn thanh toán đơn (phút)"
                type="number"
                {...getFieldProps('ordersAndReturns', 'paymentTimeoutMinutes')}
                onChange={(e) => setConfigs({
                  ...configs,
                  ordersAndReturns: { ...configs.ordersAndReturns, paymentTimeoutMinutes: e.target.value }
                })}
              />

              <Input
                label="Thời hạn tự hoàn thành sau giao (ngày)"
                type="number"
                {...getFieldProps('ordersAndReturns', 'autoCompleteDeliveredDays')}
                onChange={(e) => setConfigs({
                  ...configs,
                  ordersAndReturns: { ...configs.ordersAndReturns, autoCompleteDeliveredDays: e.target.value }
                })}
              />

              <Input
                label="Thời hạn gửi yêu cầu trả hàng (ngày)"
                type="number"
                {...getFieldProps('ordersAndReturns', 'returnRequestWindowDays')}
                onChange={(e) => setConfigs({
                  ...configs,
                  ordersAndReturns: { ...configs.ordersAndReturns, returnRequestWindowDays: e.target.value }
                })}
              />

              <Input
                label="Thời hạn bàn giao hàng trả cho GHN (ngày)"
                type="number"
                {...getFieldProps('ordersAndReturns', 'returnHandoverCarrierDays')}
                onChange={(e) => setConfigs({
                  ...configs,
                  ordersAndReturns: { ...configs.ordersAndReturns, returnHandoverCarrierDays: e.target.value }
                })}
              />

              <Input
                label="Thời hạn đến kho nhận hàng trả / rút (ngày)"
                type="number"
                {...getFieldProps('ordersAndReturns', 'counterPickupDays')}
                onChange={(e) => setConfigs({
                  ...configs,
                  ordersAndReturns: { ...configs.ordersAndReturns, counterPickupDays: e.target.value }
                })}
              />
            </div>
          </div>
        )}

        {/* TAB 5: Vận hành & Cộng đồng */}
        {activeTab === 'operations' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#191C19]">Vận Hành Điểm Kí Gửi, Tổ Chức & Cộng Đồng</h3>
              <p className="text-xs text-[#717971] mt-0.5">
                Hạn mức chiến dịch gây quỹ và lưu trữ hồ sơ pháp lý.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Thời gian cảnh báo quá hạn việc (giờ)"
                type="number"
                {...getFieldProps('operationsAndCommunity', 'taskAutoReleaseHours')}
                onChange={(e) => setConfigs({
                  ...configs,
                  operationsAndCommunity: { ...configs.operationsAndCommunity, taskAutoReleaseHours: e.target.value }
                })}
              />

              <Input
                label="Số chiến dịch đồng thời / Tổ chức"
                type="number"
                {...getFieldProps('operationsAndCommunity', 'maxConcurrentCampaignsPerOrg')}
                onChange={(e) => setConfigs({
                  ...configs,
                  operationsAndCommunity: { ...configs.operationsAndCommunity, maxConcurrentCampaignsPerOrg: e.target.value }
                })}
              />

              <Input
                label="Số ngày giữ ảnh giấy tờ CCCD sau duyệt (ngày)"
                type="number"
                {...getFieldProps('operationsAndCommunity', 'legalDocsRetentionDays')}
                onChange={(e) => setConfigs({
                  ...configs,
                  operationsAndCommunity: { ...configs.operationsAndCommunity, legalDocsRetentionDays: e.target.value }
                })}
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
