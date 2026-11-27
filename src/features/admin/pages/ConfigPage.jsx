import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { Button, Spinner } from '../../../components/common/index.js';
import {
  DEFAULT_SYSTEM_CONFIGS,
  SYSTEM_CONFIG_FIELDS,
  saveEffectiveConsignmentConfig,
} from '../../../configs/systemParams.config.js';
import adminApi from '../services/adminApi';
import {
  STATIC_STALE_TIME_MS,
  useAdminCache,
  useAdminCacheActions,
} from '../hooks/useAdminQuery.jsx';

const CONFIG_CACHE_KEY = 'admin:config:all';

/**
 * Trang Cấu Hình Tham Số Hệ Thống ReHome
 * GET /api/admin/config is the source of effective values and validation limits.
 * Only fields present in the backend catalog can be saved with PUT /{key}.
 *
 * UI: mỗi tham số là một thẻ. Bấm "Sửa" để mở ô nhập, bấm "Xong" để đóng.
 * Mọi thay đổi chưa lưu được gom lại và cảnh báo ở đầu trang cho tới khi Admin bấm Lưu.
 */

const TABS = [
  {
    id: 'consignment',
    label: '1. Kỳ ký gửi',
    icon: 'timelapse',
    title: 'Quy định Vòng Đời & Kỳ Ký Gửi',
    description: 'Các quy định về thời gian hiệu lực và quyền hạn gia hạn ký gửi của Member.',
    fields: [
      { group: 'consignment', field: 'termDays', label: 'Độ dài một kỳ (ngày)' },
      { group: 'consignment', field: 'maxRenewals', label: 'Số lần gia hạn tối đa' },
      { group: 'consignment', field: 'freeWithdrawalDays', label: 'Cửa sổ rút hàng miễn phí (ngày)' },
      { group: 'consignment', field: 'unclaimedDeadlineDays', label: 'Hạn chọn xử lý cuối kỳ (ngày)' },
      { group: 'consignment', field: 'reConsignConfirmDays', label: 'Hạn Member xác nhận giá ký gửi lại (ngày)' },
      { group: 'consignment', field: 'reConsignMaxCounterRounds', label: 'Số lượt trả giá tối đa khi ký gửi lại' },
      { group: 'consignment', field: 'reConsignModeratorResponseDays', label: 'Hạn Moderator phản hồi trả giá (ngày)' },
      { group: 'consignment', field: 'bringItemDeadlineDays', label: 'Hạn mang đồ đến địa điểm ký gửi sau duyệt (ngày)' },
      { group: 'consignment', field: 'maxPendingFormsPerMember', label: 'Số form đang chờ tối đa / Member' },
    ],
  },
  {
    id: 'pricing',
    label: '2. Giá & Hoa hồng',
    icon: 'payments',
    title: 'Tỷ lệ Hoa Hồng Tăng Dần & Giá Sàn',
    description: 'Chính sách hoa hồng nền tảng và tỷ lệ bảo vệ giá bán tối thiểu.',
    fields: [
      { group: 'pricingAndCommission', field: 'commissionTerm1', label: 'Hoa hồng kỳ 1 (%)' },
      { group: 'pricingAndCommission', field: 'commissionTerm2', label: 'Hoa hồng kỳ 2 (%)' },
      { group: 'pricingAndCommission', field: 'commissionTerm3', label: 'Hoa hồng kỳ 3 (%)' },
      { group: 'pricingAndCommission', field: 'floorPricePercent', label: 'Tỷ lệ Giá sàn (% giá chốt)' },
      { group: 'pricingAndCommission', field: 'maxPriceChangesPerDay', label: 'Số lần đổi giá tối đa / ngày' },
      { group: 'pricingAndCommission', field: 'withdrawalFee', label: 'Phí rút lại hàng cố định (VNĐ)' },
      { group: 'pricingAndCommission', field: 'degradedCompensationRate', label: 'Tỷ lệ đền hàng xuống cấp (%)' },
      { group: 'pricingAndCommission', field: 'voucherMaxRatioOfCommission', label: 'Tỷ lệ giảm giá voucher tối đa / hoa hồng (%)' },
    ],
  },
  {
    id: 'wallet',
    label: '3. Ví & Rút tiền',
    icon: 'account_balance_wallet',
    title: 'Tham Số Ví Member & Rút Tiền Tự Động',
    description: 'Các hạn mức giao dịch chuyển khoản về tài khoản ngân hàng của thành viên.',
    fields: [
      { group: 'walletAndPayout', field: 'minWithdrawalAmount', label: 'Số tiền rút tối thiểu (VNĐ)' },
      { group: 'walletAndPayout', field: 'maxWithdrawalsPerDay', label: 'Số lần rút tối đa mỗi ngày' },
    ],
  },
  {
    id: 'orders',
    label: '4. Đơn & Trả hàng',
    icon: 'local_shipping',
    title: 'Thời Hạn Đơn Hàng & Xử Lý Trả Hàng',
    description: 'Hạn chót thanh toán, tự động đối soát và cửa sổ đổi trả hàng hóa.',
    fields: [
      { group: 'ordersAndReturns', field: 'paymentTimeoutMinutes', label: 'Thời hạn thanh toán đơn (phút)' },
      { group: 'ordersAndReturns', field: 'autoCompleteDeliveredDays', label: 'Thời hạn tự hoàn thành sau giao (ngày)' },
      { group: 'ordersAndReturns', field: 'returnRequestWindowDays', label: 'Thời hạn gửi yêu cầu trả hàng (ngày)' },
      { group: 'ordersAndReturns', field: 'returnHandoverCarrierDays', label: 'Thời hạn bàn giao hàng trả cho GHN (ngày)' },
      { group: 'ordersAndReturns', field: 'counterPickupDays', label: 'Thời hạn đến địa điểm ký gửi nhận hàng trả / rút (ngày)' },
      { group: 'ordersAndReturns', field: 'returnShipBackPaymentTimeoutMinutes', label: 'Hạn trả phí gửi lại (phút)' },
      { group: 'ordersAndReturns', field: 'returnShipBackDispatchDays', label: 'Hạn Moderator gửi hàng (ngày)' },
    ],
  },
  {
    id: 'operations',
    label: '5. Vận hành & Cộng đồng',
    icon: 'warehouse',
    title: 'Vận Hành Điểm Kí Gửi, Tổ Chức & Cộng Đồng',
    description: 'Hạn mức chiến dịch gây quỹ và lưu trữ hồ sơ pháp lý.',
    fields: [
      { group: 'operationsAndCommunity', field: 'taskAutoReleaseHours', label: 'Thời gian cảnh báo quá hạn việc (giờ)' },
      { group: 'operationsAndCommunity', field: 'maxConcurrentCampaignsPerOrg', label: 'Số chiến dịch đồng thời / Tổ chức' },
      { group: 'operationsAndCommunity', field: 'legalDocsRetentionDays', label: 'Số ngày giữ ảnh giấy tờ CCCD sau duyệt (ngày)' },
      { group: 'operationsAndCommunity', field: 'membershipExpiryReminderDays', label: 'Số ngày nhắc trước khi hết hạn gói VIP (ngày)' },
    ],
  },
  {
    id: 'points',
    label: '6. Điểm tích lũy',
    icon: 'stars',
    title: 'Chương Trình Điểm Tích Lũy',
    description: 'Quy tắc Member tích điểm khi mua hàng và đổi điểm lấy lượt thử đồ AI. Đặt 0 để tắt từng chức năng.',
    fields: [
      {
        group: 'points',
        field: 'vndPerPoint',
        label: 'Số tiền đơn hàng để được 1 điểm (VNĐ)',
        hint: 'Tính trên số tiền khách thực trả (đã trừ voucher). Đặt 0 để tắt tích điểm.',
      },
      {
        group: 'points',
        field: 'costPerAiTryon',
        label: 'Số điểm đổi 1 lượt phối đồ AI',
        hint: 'Phối đồ AI bằng ảnh tĩnh. Đặt 0 để đóng quy đổi loại này.',
      },
      {
        group: 'points',
        field: 'costPerLiveTryon',
        label: 'Số điểm đổi 1 lượt thử đồ AI real-time',
        hint: 'Thử đồ qua camera, chi phí thật cao hơn. Đặt 0 để đóng quy đổi loại này.',
      },
    ],
  },
];

const formatNumber = (value) => {
  if (value === '' || value == null || !Number.isFinite(Number(value))) return '—';
  return Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 4 });
};

export default function ConfigPage() {
  const { user } = useAuth();
  const { onLogAction } = useOutletContext() || {};
  const toast = useToast();
  const cache = useAdminCache();
  const cacheActions = useAdminCacheActions();
  const initialCached = cache?.read(CONFIG_CACHE_KEY)?.data || null;

  const [activeTab, setActiveTab] = useState('consignment');
  const [configs, setConfigs] = useState(() =>
    initialCached?.configs ? JSON.parse(JSON.stringify(initialCached.configs)) : DEFAULT_SYSTEM_CONFIGS
  );
  const [savedConfigs, setSavedConfigs] = useState(() =>
    initialCached?.configs ? JSON.parse(JSON.stringify(initialCached.configs)) : DEFAULT_SYSTEM_CONFIGS
  );
  const [specs, setSpecs] = useState(() => initialCached?.specs || {});
  const [loading, setLoading] = useState(() => !initialCached);
  const [loaded, setLoaded] = useState(() => Boolean(initialCached));
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingKeys, setEditingKeys] = useState(() => new Set());

  const hasDirtyRef = useRef(false);
  const reqSeqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!savedSuccess) return;
    const timer = setTimeout(() => setSavedSuccess(false), 4000);
    return () => clearTimeout(timer);
  }, [savedSuccess]);

  const fetchBackendConfigs = useCallback(async ({ applyDraft = true } = {}) => {
    const reqId = ++reqSeqRef.current;
    const data = await adminApi.getConfigs();
    if (!mountedRef.current || reqId !== reqSeqRef.current) return;
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
    cache?.write(CONFIG_CACHE_KEY, { configs: updated, specs: nextSpecs });
    setSavedConfigs(JSON.parse(JSON.stringify(updated)));
    setSpecs(nextSpecs);
    setLoaded(true);
    saveEffectiveConsignmentConfig(updated);
    if (applyDraft && !hasDirtyRef.current) {
      setConfigs(updated);
      setEditingKeys(new Set());
    } else if (applyDraft === 'force') {
      setConfigs(updated);
      setEditingKeys(new Set());
    }
  }, [cache]);

  const loadBackendConfigs = useCallback(async ({ force = false } = {}) => {
    const cachedEntry = cache?.read(CONFIG_CACHE_KEY) || null;
    if (!force && cachedEntry && cache.isFresh(cachedEntry, STATIC_STALE_TIME_MS)) {
      const { configs: cachedConfigs, specs: cachedSpecs } = cachedEntry.data;
      setSavedConfigs(JSON.parse(JSON.stringify(cachedConfigs)));
      setSpecs(cachedSpecs);
      setLoaded(true);
      setLoading(false);
      setErrorMessage('');
      if (!hasDirtyRef.current) {
        setConfigs(JSON.parse(JSON.stringify(cachedConfigs)));
      }
      return;
    }

    const hasCached = Boolean(cachedEntry?.data);
    if (hasCached && !force) {
      const { configs: cachedConfigs, specs: cachedSpecs } = cachedEntry.data;
      setSavedConfigs(JSON.parse(JSON.stringify(cachedConfigs)));
      setSpecs(cachedSpecs);
      setLoaded(true);
      setLoading(false);
      setErrorMessage('');
      if (!hasDirtyRef.current) {
        setConfigs(JSON.parse(JSON.stringify(cachedConfigs)));
      }
      try {
        await fetchBackendConfigs({ applyDraft: true });
      } catch (err) {
        console.warn('Background refresh config thất bại, giữ bản cache:', err);
      }
      return;
    }

    setLoading(true);
    setLoaded(false);
    setSavedSuccess(false);
    setErrorMessage('');
    try {
      await fetchBackendConfigs({ applyDraft: 'force' });
    } catch (err) {
      if (mountedRef.current) {
        setErrorMessage(err.response?.data?.message || err.message || 'Không thể tải cấu hình từ máy chủ.');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [cache, fetchBackendConfigs]);

  useEffect(() => {
    loadBackendConfigs();
  }, [loadBackendConfigs]);

  const getMapping = (group, field) =>
    SYSTEM_CONFIG_FIELDS.find(item => item.group === group && item.field === field);

  // Danh sách tham số đã sửa nhưng chưa lưu (so với giá trị máy chủ đang áp dụng)
  const dirtyFields = useMemo(() => {
    if (!loaded) return [];
    const result = [];
    for (const tab of TABS) {
      for (const f of tab.fields) {
        const current = String(configs[f.group]?.[f.field] ?? '');
        const saved = String(savedConfigs[f.group]?.[f.field] ?? '');
        if (current !== saved) result.push({ ...f, tabId: tab.id, tabLabel: tab.label });
      }
    }
    return result;
  }, [configs, savedConfigs, loaded]);
  hasDirtyRef.current = dirtyFields.length > 0;

  const isDirty = (group, field) =>
    dirtyFields.some(d => d.group === group && d.field === field);

  const dirtyCountByTab = useMemo(() => {
    const map = {};
    for (const d of dirtyFields) map[d.tabId] = (map[d.tabId] || 0) + 1;
    return map;
  }, [dirtyFields]);

  const toggleEditing = (key) => {
    setEditingKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleFieldChange = (group, field, value) => {
    setConfigs(prev => ({
      ...prev,
      [group]: { ...prev[group], [field]: value },
    }));
  };

  const handleRevertField = (group, field) => {
    setConfigs(prev => ({
      ...prev,
      [group]: { ...prev[group], [field]: savedConfigs[group][field] },
    }));
  };

  const handleRevertAll = () => {
    setConfigs(JSON.parse(JSON.stringify(savedConfigs)));
    setEditingKeys(new Set());
    setErrorMessage('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (loading || saving || !loaded) return;
    setSaving(true);
    setSavedSuccess(false);
    setErrorMessage('');

    try {
      const dirtySet = new Set(dirtyFields.map((d) => `${d.group}.${d.field}`));
      const targetItems = SYSTEM_CONFIG_FIELDS.filter(
        item => specs[item.key] && dirtySet.has(`${item.group}.${item.field}`)
      );
      if (targetItems.length === 0) {
        return;
      }
      const configKeyMap = targetItems.map(({ key, group, field, percent }) => {
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
      cacheActions?.invalidate(['admin:config:', 'admin:audit-logs:']);
      await fetchBackendConfigs({ applyDraft: 'force' });
      setSavedSuccess(true);
      toast.success('Đã lưu cấu hình tham số hệ thống thành công!');

      if (onLogAction) {
        onLogAction({
          time: new Date().toLocaleString('vi-VN'),
          user: user?.fullName || user?.name || 'Admin',
          role: 'Admin',
          action: 'Cập nhật cấu hình tham số hệ thống (API 146 - PUT /api/admin/config/{key})',
        });
      }

    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Lỗi khi cập nhật cấu hình tham số.';
      setErrorMessage(errMsg);
      toast.error(`Cập nhật cấu hình thất bại: ${errMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const currentTab = TABS.find(t => t.id === activeTab) || TABS[0];
  const hasChanges = dirtyFields.length > 0;

  /** Thẻ hiển thị một tham số: xem giá trị, bấm Sửa để chỉnh */
  const renderField = ({ group, field, label, hint }) => {
    const mapping = getMapping(group, field);
    const spec = mapping && specs[mapping.key];
    const scale = mapping?.percent ? 100 : 1;
    const inputId = `config-${group}-${field}`;
    const editKey = `${group}.${field}`;
    const editing = editingKeys.has(editKey);
    const dirty = isDirty(group, field);
    const unavailable = !mapping || (loaded && !spec);
    const disabled = loading || saving || !loaded || !spec;
    const value = loaded && spec ? configs[group][field] : '';
    const savedValue = loaded && spec ? savedConfigs[group][field] : '';
    const min = spec ? Number((Number(spec.min) * scale).toPrecision(15)) : undefined;
    const max = spec ? Number((Number(spec.max) * scale).toPrecision(15)) : undefined;
    const step = spec?.type === 'INT' ? 1 : 'any';
    const unavailableText = !mapping
      ? 'Chưa áp dụng: backend chưa hỗ trợ chỉnh tham số này.'
      : loaded && !spec ? 'Chưa áp dụng: máy chủ chưa cung cấp tham số này.' : null;

    return (
      <div
        key={editKey}
        className={`rounded-2xl border p-4 flex flex-col gap-2.5 transition-colors ${
          dirty
            ? 'border-[#F59E0B] bg-[#FFFBEB]/60'
            : editing
            ? 'border-[#006B2C] bg-white shadow-sm'
            : 'border-[#DDE5D9] bg-[#FBFDFB]'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <label htmlFor={inputId} className="text-xs font-semibold text-[#1F2A37] leading-snug">
            {label}
          </label>
          <div className="flex items-center gap-1 shrink-0">
            {dirty && !editing && (
              <button
                type="button"
                onClick={() => handleRevertField(group, field)}
                title="Hoàn tác về giá trị đang áp dụng"
                className="w-7 h-7 rounded-lg text-[#92400E] hover:bg-[#FDE68A]/60 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[16px]">undo</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => toggleEditing(editKey)}
              disabled={disabled}
              aria-label={editing ? `Xong: ${label}` : `Sửa: ${label}`}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                editing
                  ? 'bg-[#006B2C] text-white hover:bg-[#005523]'
                  : 'text-[#006B2C] border border-[#006B2C]/30 hover:bg-[#E8F5E9]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{editing ? 'check' : 'edit'}</span>
              <span>{editing ? 'Xong' : 'Sửa'}</span>
            </button>
          </div>
        </div>

        <input
          id={inputId}
          type="number"
          value={value}
          readOnly={!editing}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          onChange={(e) => handleFieldChange(group, field, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (editing) toggleEditing(editKey);
            }
          }}
          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold font-mono outline-none transition-all ${
            editing
              ? 'border-[#006B2C] bg-white text-[#1F2A37] focus:ring-2 focus:ring-[#006B2C]/15'
              : 'border-transparent bg-[#F0F4EE] text-[#1F2A37] cursor-default'
          } disabled:bg-[#F5F5F5] disabled:text-[#9E9E9E]`}
        />

        {(unavailableText || dirty) && (
          <div className="flex items-center justify-between gap-2 text-[11px] text-[#5B6776] min-h-[16px]">
            <span>
              {unavailableText && <span className="text-[#B45309]">{unavailableText}</span>}
            </span>
            {dirty && (
              <span className="font-semibold text-[#92400E] whitespace-nowrap">
                Đang áp dụng: {formatNumber(savedValue)}
              </span>
            )}
          </div>
        )}
        {hint && !unavailableText && (
          <p className="text-[11px] text-[#5B6776] -mt-1">{hint}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-[#5B6776] mt-0.5">
            Bấm "Sửa" trên tham số cần thay đổi, chỉnh xong bấm "Lưu thay đổi tham số" để áp dụng.
          </p>
        </div>
        <Button
          type="submit"
          form="config-form"
          loading={saving}
          disabled={loading || !loaded || !hasChanges}
          className={`shrink-0 shadow-sm rounded-xl text-white ${
            hasChanges ? 'bg-[#006B2C] hover:bg-[#005523]' : 'bg-[#006B2C]/70'
          }`}
        >
          <span className="material-symbols-outlined text-sm mr-1.5">save</span>
          Lưu thay đổi tham số
          {hasChanges && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-white/25 text-[10px] font-bold">
              {dirtyFields.length}
            </span>
          )}
        </Button>
      </div>

      {loading && (
        <p role="status" className="flex items-center gap-2 text-sm text-[#5B6776]">
          <Spinner size="sm" />
          <span>Đang tải cấu hình từ máy chủ...</span>
        </p>
      )}

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
          {!loaded && !loading && <Button size="sm" variant="outline" className="rounded-xl" onClick={() => loadBackendConfigs({ force: true })}>Thử lại</Button>}
        </div>
      )}

      {/* Cảnh báo thay đổi chưa lưu */}
      {hasChanges && !saving && (
        <div className="sticky top-2 z-20 p-3.5 bg-[#FFFBEB] border border-[#F59E0B] text-[#92400E] rounded-2xl text-xs shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-lg shrink-0">warning</span>
            <div>
              <p className="font-bold">
                Bạn có {dirtyFields.length} tham số đã sửa nhưng chưa lưu.
              </p>
              <p className="text-[11px] mt-0.5">
                {dirtyFields.slice(0, 4).map(d => d.label).join(' · ')}
                {dirtyFields.length > 4 ? ` · +${dirtyFields.length - 4} tham số khác` : ''}
                . Bấm "Lưu thay đổi tham số" để áp dụng lên hệ thống.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRevertAll}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#F59E0B]/50 bg-white text-[11px] font-bold text-[#92400E] hover:bg-[#FDE68A]/40 self-start sm:self-auto shrink-0"
          >
            <span className="material-symbols-outlined text-[14px]">undo</span>
            <span>Hoàn tác tất cả</span>
          </button>
        </div>
      )}

      {/* Tab selection */}
      <div className="flex border-b border-[#DDE5D9] space-x-2 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const tabDirty = dirtyCountByTab[tab.id] || 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-[#006B2C] text-[#006B2C] bg-[#006B2C]/5'
                  : 'border-transparent text-[#5B6776] hover:text-[#1F2A37] hover:bg-[#F6F9F4]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span>{tab.label}</span>
              {tabDirty > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#F59E0B] text-white text-[10px] font-bold">
                  {tabDirty}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Form container */}
      <form id="config-form" noValidate onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-2xl border border-[#DDE5D9] shadow-sm space-y-6">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#1F2A37]">{currentTab.title}</h3>
              <p className="text-xs text-[#5B6776] mt-0.5">{currentTab.description}</p>
            </div>
            <span className="text-[11px] text-[#5B6776] whitespace-nowrap shrink-0 pt-1">
              {currentTab.fields.length} tham số
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {currentTab.fields.map(renderField)}
          </div>
        </div>
      </form>
    </div>
  );
}
