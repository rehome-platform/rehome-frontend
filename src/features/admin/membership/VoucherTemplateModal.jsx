import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, Modal } from '../../../components/common/index.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { membershipAdminApi } from '../services/membershipAdminApi.js';
import {
  PAID_TIERS,
  TIER_LABELS,
  VOUCHER_TYPE_LABELS,
} from './membershipConstants.js';

const ORDER_DISCOUNT_NOTE =
  'Voucher giảm đơn hàng bắt buộc theo phần trăm; phần giảm giá do nền tảng chịu (không trừ vào tiền người ký gửi) và bị chặn trần theo hoa hồng kỳ ký gửi.';

/**
 * Convert API ratio (e.g. 0.10) to UI percentage (e.g. 10) without float artifacts.
 */
function toDisplayPercent(ratio) {
  if (ratio === null || ratio === undefined || ratio === '') return '';
  const num = Number(ratio);
  if (Number.isNaN(num)) return '';
  return String(Number((num * 100).toPrecision(12)));
}

/**
 * Convert UI percentage (e.g. 10) to API ratio (e.g. 0.10) without float artifacts.
 */
function toApiRatio(percent) {
  return Number((Number(percent) / 100).toPrecision(12));
}

// Thẻ 1 trường số, có nút Sửa/Xong (chỉ xem tới khi bấm Sửa) + tô vàng khi khác giá trị đã lưu —
// cùng kiểu với trang Cấu hình tham số hệ thống và modal Chỉnh sửa gói thành viên.
function NumberFieldCard({ id, label, value, onChange, error, editing, dirty, onToggleEdit, ...inputProps }) {
  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col gap-2.5 transition-colors ${
        dirty
          ? 'border-[#F59E0B] bg-[#FFFBEB]/60'
          : editing
          ? 'border-[#006B2C] bg-white shadow-sm'
          : 'border-[#DDE5D9] bg-[#FBFDFB]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <label htmlFor={id} className="text-xs font-semibold text-[#191C19] leading-snug">
          {label}
        </label>
        <button
          type="button"
          onClick={onToggleEdit}
          aria-label={editing ? `Xong: ${label}` : `Sửa: ${label}`}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0 ${
            editing
              ? 'bg-[#006B2C] text-white hover:bg-[#005523]'
              : 'text-[#006B2C] border border-[#006B2C]/30 hover:bg-[#E8F5E9]'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">{editing ? 'check' : 'edit'}</span>
          <span>{editing ? 'Xong' : 'Sửa'}</span>
        </button>
      </div>

      <input
        id={id}
        type="number"
        readOnly={!editing}
        value={value}
        onChange={onChange}
        {...inputProps}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold font-mono outline-none transition-all ${
          editing
            ? 'border-[#006B2C] bg-white text-[#191C19] focus:ring-2 focus:ring-[#006B2C]/15'
            : 'border-transparent bg-[#F0F4EE] text-[#191C19] cursor-default'
        }`}
      />
      {error && <p className="text-[11px] text-[#D92D20] font-medium">{error}</p>}
    </div>
  );
}

function buildInitialTierState(tierRules = []) {
  const map = {};
  for (const tier of PAID_TIERS) {
    map[tier] = { enabled: false, quantityPerMonth: '1' };
  }
  if (Array.isArray(tierRules)) {
    for (const rule of tierRules) {
      if (PAID_TIERS.includes(rule?.tier)) {
        map[rule.tier] = {
          enabled: true,
          quantityPerMonth: String(rule.quantityPerMonth ?? 1),
        };
      }
    }
  }
  return map;
}

export default function VoucherTemplateModal({
  isOpen,
  onClose,
  template = null,
  onSuccess,
}) {
  const toast = useToast();
  const isEdit = Boolean(template?.id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('SHIPPING');
  const [discountKind, setDiscountKind] = useState('FIXED');
  const [discountValue, setDiscountValue] = useState('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [validDays, setValidDays] = useState('30');
  const [active, setActive] = useState(true);
  const [tierState, setTierState] = useState(() => buildInitialTierState());

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [editingKeys, setEditingKeys] = useState(() => new Set());
  const originalRef = useRef({});

  const toggleEditing = (key) => {
    setEditingKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isDirty = (key, currentValue) =>
    isEdit && String(originalRef.current[key] ?? '') !== String(currentValue ?? '');

  useEffect(() => {
    if (!isOpen) return;
    if (template) {
      const nextType = template.type || 'SHIPPING';
      const nextKind =
        nextType === 'ORDER_DISCOUNT'
          ? 'PERCENT'
          : template.discountKind || 'FIXED';

      setName(template.name || '');
      setDescription(template.description || '');
      setType(nextType);
      setDiscountKind(nextKind);
      setDiscountValue(
        nextKind === 'PERCENT'
          ? toDisplayPercent(template.discountValue)
          : template.discountValue != null
            ? String(template.discountValue)
            : ''
      );
      setMaxDiscountAmount(
        template.maxDiscountAmount != null ? String(template.maxDiscountAmount) : ''
      );
      setMinOrderAmount(
        template.minOrderAmount != null ? String(template.minOrderAmount) : '0'
      );
      setValidDays(template.validDays != null ? String(template.validDays) : '30');
      setActive(template.active !== undefined ? Boolean(template.active) : true);
      setTierState(buildInitialTierState(template.tierRules));

      // Ảnh chụp giá trị gốc để tô vàng ô nào đang sửa khác giá trị đã lưu, giống ConfigPage
      originalRef.current = {
        discountValue:
          nextKind === 'PERCENT'
            ? toDisplayPercent(template.discountValue)
            : template.discountValue != null
              ? String(template.discountValue)
              : '',
        maxDiscountAmount:
          template.maxDiscountAmount != null ? String(template.maxDiscountAmount) : '',
        minOrderAmount: template.minOrderAmount != null ? String(template.minOrderAmount) : '0',
        validDays: template.validDays != null ? String(template.validDays) : '30',
      };
    } else {
      setName('');
      setDescription('');
      setType('SHIPPING');
      setDiscountKind('FIXED');
      setDiscountValue('');
      setMaxDiscountAmount('');
      setMinOrderAmount('0');
      setValidDays('30');
      setActive(true);
      setTierState(buildInitialTierState());
      originalRef.current = {};
    }
    setEditingKeys(new Set());
    setErrors({});
    setSubmitError('');
    submittingRef.current = false;
    setSubmitting(false);
  }, [isOpen, template]);

  const handleTypeChange = (nextType) => {
    setType(nextType);
    if (nextType === 'ORDER_DISCOUNT') {
      setDiscountKind('PERCENT');
    }
    setErrors((prev) => ({ ...prev, discountKind: undefined, maxDiscountAmount: undefined }));
  };

  const handleTierToggle = (tier) => {
    setTierState((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        enabled: !prev[tier].enabled,
      },
    }));
  };

  const handleTierQtyChange = (tier, value) => {
    setTierState((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        quantityPerMonth: value,
      },
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!name.trim()) {
      nextErrors.name = 'Tên mẫu voucher là bắt buộc.';
    }

    const effectiveKind = type === 'ORDER_DISCOUNT' ? 'PERCENT' : discountKind;
    const rawDiscount = Number(discountValue);
    if (discountValue === '' || Number.isNaN(rawDiscount)) {
      nextErrors.discountValue = 'Mức giảm không hợp lệ.';
    } else if (effectiveKind === 'PERCENT') {
      if (rawDiscount <= 0 || rawDiscount > 100) {
        nextErrors.discountValue = 'Phần trăm giảm phải lớn hơn 0 và tối đa 100%.';
      }
    } else if (rawDiscount <= 0) {
      nextErrors.discountValue = 'Mức giảm cố định phải lớn hơn 0.';
    }

    if (effectiveKind === 'PERCENT') {
      const rawMax = Number(maxDiscountAmount);
      if (maxDiscountAmount === '' || Number.isNaN(rawMax) || rawMax <= 0) {
        nextErrors.maxDiscountAmount = 'Giảm tối đa phải lớn hơn 0 đối với voucher phần trăm.';
      }
    }

    const rawMinOrder = Number(minOrderAmount);
    if (minOrderAmount === '' || Number.isNaN(rawMinOrder) || rawMinOrder < 0) {
      nextErrors.minOrderAmount = 'Đơn tối thiểu phải lớn hơn hoặc bằng 0.';
    }

    const rawValidDays = Number(validDays);
    if (
      validDays === '' ||
      !Number.isInteger(rawValidDays) ||
      rawValidDays < 1 ||
      rawValidDays > 365
    ) {
      nextErrors.validDays = 'Hiệu lực phải là số nguyên từ 1 đến 365 ngày.';
    }

    for (const tier of PAID_TIERS) {
      const rule = tierState[tier];
      if (!rule.enabled) continue;
      const qty = Number(rule.quantityPerMonth);
      if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
        nextErrors.tierRules = `Số lượng / tháng của hạng ${tier} phải là số nguyên từ 1 đến 10.`;
        break;
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setSubmitError('');

    if (!validate()) return;

    const effectiveKind = type === 'ORDER_DISCOUNT' ? 'PERCENT' : discountKind;
    const payload = {
      name: name.trim(),
      description: description.trim(),
      type,
      discountKind: effectiveKind,
      discountValue:
        effectiveKind === 'PERCENT'
          ? toApiRatio(discountValue)
          : Number(discountValue),
      maxDiscountAmount:
        effectiveKind === 'PERCENT' ? Number(maxDiscountAmount) : null,
      minOrderAmount: Number(minOrderAmount),
      validDays: Number(validDays),
      active: Boolean(active),
      tierRules: PAID_TIERS.filter((tier) => tierState[tier]?.enabled).map((tier) => ({
        tier,
        quantityPerMonth: Number(tierState[tier].quantityPerMonth),
      })),
    };

    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (isEdit) {
        await membershipAdminApi.updateVoucherTemplate(template.id, payload);
        toast.success(`Cập nhật mẫu voucher "${payload.name}" thành công!`);
      } else {
        await membershipAdminApi.createVoucherTemplate(payload);
        toast.success(`Tạo mới mẫu voucher "${payload.name}" thành công!`);
      }
      await onSuccess?.();
      onClose?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể lưu mẫu voucher. Vui lòng thử lại.';
      setSubmitError(msg);
      toast.error(`Lưu mẫu voucher thất bại: ${msg}`);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const isOrderDiscount = type === 'ORDER_DISCOUNT';
  const effectiveKind = isOrderDiscount ? 'PERCENT' : discountKind;

  const numberFields = [
    { key: 'discountValue', label: effectiveKind === 'PERCENT' ? 'Mức giảm (%)' : 'Mức giảm (đ)', value: discountValue },
    ...(effectiveKind === 'PERCENT'
      ? [{ key: 'maxDiscountAmount', label: 'Giảm tối đa (đ)', value: maxDiscountAmount }]
      : []),
    { key: 'minOrderAmount', label: 'Đơn tối thiểu (đ)', value: minOrderAmount },
    { key: 'validDays', label: 'Hiệu lực (ngày)', value: validDays },
  ];
  const dirtyFields = numberFields.filter((f) => isDirty(f.key, f.value));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa mẫu voucher' : 'Tạo mẫu voucher'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError ? (
          <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/30 text-xs text-[#D92D20]">
            {submitError}
          </div>
        ) : null}

        <Input
          id="voucher-name"
          label="Tên mẫu voucher"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          placeholder="Ví dụ: Freeship Thành viên Bạc"
        />

        <div className="w-full">
          <label
            htmlFor="voucher-description"
            className="block text-xs font-semibold text-[#1F2A37] mb-1.5"
          >
            Mô tả
          </label>
          <textarea
            id="voucher-description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả ngắn về điều kiện áp dụng..."
            className="w-full px-3.5 py-2 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:border-[#006B2C] focus:ring-[#006B2C]/15 text-[#1F2A37]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="voucher-type"
              className="block text-xs font-semibold text-[#1F2A37] mb-1.5"
            >
              Loại voucher <span className="text-[#D92D20]">*</span>
            </label>
            <select
              id="voucher-type"
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:border-[#006B2C] focus:ring-[#006B2C]/15 text-[#1F2A37]"
            >
              {Object.entries(VOUCHER_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="voucher-discount-kind"
              className="block text-xs font-semibold text-[#1F2A37] mb-1.5"
            >
              Hình thức giảm <span className="text-[#D92D20]">*</span>
            </label>
            <select
              id="voucher-discount-kind"
              value={effectiveKind}
              disabled={isOrderDiscount}
              onChange={(e) => setDiscountKind(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:border-[#006B2C] focus:ring-[#006B2C]/15 text-[#1F2A37] disabled:bg-[#F6F9F4] disabled:text-[#5B6776]"
            >
              <option value="FIXED">Số tiền cố định (đ)</option>
              <option value="PERCENT">Phần trăm (%)</option>
            </select>
          </div>
        </div>

        {isOrderDiscount ? (
          <div className="p-3 rounded-xl bg-[#F6F9F4] border border-[#006B2C]/20 text-xs text-[#1F2A37]">
            {ORDER_DISCOUNT_NOTE}
          </div>
        ) : null}

        {/* Cảnh báo thay đổi chưa lưu (cùng kiểu với trang Cấu hình tham số hệ thống) */}
        {dirtyFields.length > 0 && (
          <div className="p-3.5 bg-[#FFFBEB] border border-[#F59E0B] text-[#92400E] rounded-2xl text-xs shadow-sm flex items-start gap-2">
            <span className="material-symbols-outlined text-lg shrink-0">warning</span>
            <div>
              <p className="font-bold">Bạn có {dirtyFields.length} trường đã sửa nhưng chưa lưu.</p>
              <p className="text-[11px] mt-0.5">
                {dirtyFields.map((f) => f.label).join(' · ')}. Bấm "Lưu mẫu voucher" bên dưới để áp dụng.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberFieldCard
            id="voucher-discount-value"
            label={effectiveKind === 'PERCENT' ? 'Mức giảm (%)' : 'Mức giảm (đ)'}
            step={effectiveKind === 'PERCENT' ? 'any' : '1000'}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            error={errors.discountValue}
            placeholder={effectiveKind === 'PERCENT' ? 'Ví dụ: 10' : 'Ví dụ: 15000'}
            editing={editingKeys.has('discountValue')}
            dirty={isDirty('discountValue', discountValue)}
            onToggleEdit={() => toggleEditing('discountValue')}
          />

          {effectiveKind === 'PERCENT' ? (
            <NumberFieldCard
              id="voucher-max-discount"
              label="Giảm tối đa (đ)"
              value={maxDiscountAmount}
              onChange={(e) => setMaxDiscountAmount(e.target.value)}
              error={errors.maxDiscountAmount}
              placeholder="Ví dụ: 50000"
              editing={editingKeys.has('maxDiscountAmount')}
              dirty={isDirty('maxDiscountAmount', maxDiscountAmount)}
              onToggleEdit={() => toggleEditing('maxDiscountAmount')}
            />
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberFieldCard
            id="voucher-min-order"
            label="Đơn tối thiểu (đ)"
            value={minOrderAmount}
            onChange={(e) => setMinOrderAmount(e.target.value)}
            error={errors.minOrderAmount}
            editing={editingKeys.has('minOrderAmount')}
            dirty={isDirty('minOrderAmount', minOrderAmount)}
            onToggleEdit={() => toggleEditing('minOrderAmount')}
          />

          <NumberFieldCard
            id="voucher-valid-days"
            label="Hiệu lực (ngày)"
            min={1}
            max={365}
            value={validDays}
            onChange={(e) => setValidDays(e.target.value)}
            error={errors.validDays}
            editing={editingKeys.has('validDays')}
            dirty={isDirty('validDays', validDays)}
            onToggleEdit={() => toggleEditing('validDays')}
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            id="voucher-active"
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4 accent-[#006B2C] rounded"
          />
          <label htmlFor="voucher-active" className="text-sm font-medium text-[#1F2A37]">
            Đang phát (kích hoạt ngay)
          </label>
        </div>

        <div className="border-t border-[#E2E8E0] pt-4">
          <p className="text-xs font-semibold text-[#1F2A37] mb-2">
            Phát cho hạng thành viên (chọn hạng và số lượng / tháng từ 1–10)
          </p>
          <div className="space-y-2">
            {PAID_TIERS.map((tier) => {
              const rule = tierState[tier] || { enabled: false, quantityPerMonth: '1' };
              return (
                <div
                  key={tier}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-[#E2E8E0] bg-[#F6F9F4]/60"
                >
                  <label
                    htmlFor={`tier-check-${tier}`}
                    className="flex items-center gap-2 text-sm font-medium text-[#1F2A37] cursor-pointer"
                  >
                    <input
                      id={`tier-check-${tier}`}
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => handleTierToggle(tier)}
                      className="w-4 h-4 accent-[#006B2C] rounded"
                    />
                    <span>
                      {tier} — {TIER_LABELS[tier]}
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#5B6776]">Số lượng / tháng:</span>
                    <input
                      id={`tier-qty-${tier}`}
                      type="number"
                      min={1}
                      max={10}
                      disabled={!rule.enabled}
                      aria-label={`Số lượng / tháng cho ${tier}`}
                      value={rule.quantityPerMonth}
                      onChange={(e) => handleTierQtyChange(tier, e.target.value)}
                      className="w-20 px-2.5 py-1.5 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:border-[#006B2C] disabled:bg-[#F6F9F4] disabled:text-[#5B6776]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {errors.tierRules ? (
            <p className="mt-1.5 text-xs text-[#D92D20] font-medium">{errors.tierRules}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8E0]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={submitting}>
            Lưu mẫu voucher
          </Button>
        </div>
      </form>
    </Modal>
  );
}
