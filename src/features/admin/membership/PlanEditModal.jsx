import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Modal } from '../../../components/common/index.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { membershipAdminApi } from '../services/membershipAdminApi.js';
import { TIER_LABELS } from './membershipConstants.js';

const QUOTA_FIELDS = [
  { key: 'liveTryonPerDay', label: 'RT / ngày' },
  { key: 'liveTryonPerMonth', label: 'RT / tháng' },
  { key: 'aiTryonPerDay', label: 'Phối đồ / ngày' },
  { key: 'aiTryonPerMonth', label: 'Phối đồ / tháng' },
];

const ALL_QUOTA_KEYS = [
  'liveTryonPerDay',
  'liveTryonPerMonth',
  'liveTryonMaxSeconds',
  'aiTryonPerDay',
  'aiTryonPerMonth',
  'maxPendingConsignmentForms',
];

function isQuotaReduced(originalVal, nextVal) {
  if (originalVal === null || originalVal === undefined) {
    return nextVal !== null && nextVal !== undefined;
  }
  if (nextVal === null || nextVal === undefined) {
    return false;
  }
  return Number(nextVal) < Number(originalVal);
}

function buildInitialForm(plan) {
  if (!plan) return null;
  return {
    name: plan.name ?? '',
    description: plan.description ?? '',
    pricePerMonth: plan.pricePerMonth ?? 0,
    pricePerYear: plan.pricePerYear ?? null,
    liveTryonPerDay: plan.liveTryonPerDay ?? null,
    liveTryonPerMonth: plan.liveTryonPerMonth ?? null,
    liveTryonMaxSeconds: plan.liveTryonMaxSeconds ?? 30,
    aiTryonPerDay: plan.aiTryonPerDay ?? null,
    aiTryonPerMonth: plan.aiTryonPerMonth ?? null,
    featuredListing: Boolean(plan.featuredListing),
    maxPendingConsignmentForms: plan.maxPendingConsignmentForms ?? 1,
    active: plan.active !== false,
    sortOrder: plan.sortOrder ?? 0,
  };
}

export default function PlanEditModal({ isOpen, plan, onClose, onSuccess }) {
  const toast = useToast();
  const [form, setForm] = useState(() => buildInitialForm(plan));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const previousNumbersRef = useRef({});

  useEffect(() => {
    if (isOpen && plan) {
      setForm(buildInitialForm(plan));
      setErrors({});
      setSubmitError('');
      setSubmitting(false);
      previousNumbersRef.current = {
        pricePerYear: plan.pricePerYear ?? 0,
        liveTryonPerDay: plan.liveTryonPerDay ?? 0,
        liveTryonPerMonth: plan.liveTryonPerMonth ?? 0,
        aiTryonPerDay: plan.aiTryonPerDay ?? 0,
        aiTryonPerMonth: plan.aiTryonPerMonth ?? 0,
      };
    }
  }, [isOpen, plan]);

  const isFree = plan?.tier === 'FREE';

  const hasQuotaReduction = useMemo(() => {
    if (!plan || !form) return false;
    return ALL_QUOTA_KEYS.some((key) => isQuotaReduced(plan[key], form[key]));
  }, [plan, form]);

  if (!isOpen || !plan || !form) {
    return null;
  }

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitError('');
  };

  const handleNumberChange = (field, rawValue) => {
    if (rawValue === '') {
      handleFieldChange(field, '');
      return;
    }
    const parsed = Number(rawValue);
    if (!Number.isNaN(parsed)) {
      previousNumbersRef.current[field] = parsed;
      handleFieldChange(field, parsed);
    }
  };

  const handleToggleUnlimited = (field, checked) => {
    if (checked) {
      if (typeof form[field] === 'number') {
        previousNumbersRef.current[field] = form[field];
      }
      handleFieldChange(field, null);
    } else {
      const restored = previousNumbersRef.current[field] ?? 0;
      handleFieldChange(field, restored);
    }
  };

  const handleToggleNoAnnual = (checked) => {
    if (checked) {
      if (typeof form.pricePerYear === 'number') {
        previousNumbersRef.current.pricePerYear = form.pricePerYear;
      }
      handleFieldChange('pricePerYear', null);
    } else {
      const restored = previousNumbersRef.current.pricePerYear ?? 0;
      handleFieldChange('pricePerYear', restored);
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!String(form.name || '').trim()) {
      nextErrors.name = 'Tên gói không được để trống';
    }

    if (!isFree) {
      if (form.pricePerMonth === '' || Number(form.pricePerMonth) < 0) {
        nextErrors.pricePerMonth = 'Giá/tháng phải lớn hơn hoặc bằng 0';
      }
      if (form.pricePerYear !== null && (form.pricePerYear === '' || Number(form.pricePerYear) < 0)) {
        nextErrors.pricePerYear = 'Giá/năm phải lớn hơn hoặc bằng 0';
      }
    }

    const maxSec = Number(form.liveTryonMaxSeconds);
    if (form.liveTryonMaxSeconds === '' || Number.isNaN(maxSec) || maxSec < 5 || maxSec > 120) {
      nextErrors.liveTryonMaxSeconds = 'Giây/lượt phải từ 5 đến 120';
    }

    const maxForms = Number(form.maxPendingConsignmentForms);
    if (
      form.maxPendingConsignmentForms === '' ||
      Number.isNaN(maxForms) ||
      maxForms < 1 ||
      maxForms > 50
    ) {
      nextErrors.maxPendingConsignmentForms = 'Số form ký gửi tối đa phải từ 1 đến 50';
    }

    if (
      form.liveTryonPerDay !== null &&
      form.liveTryonPerMonth !== null &&
      form.liveTryonPerDay !== '' &&
      form.liveTryonPerMonth !== '' &&
      Number(form.liveTryonPerDay) > Number(form.liveTryonPerMonth)
    ) {
      nextErrors.liveTryonPerDay = 'RT/ngày không được lớn hơn RT/tháng';
    }

    if (
      form.aiTryonPerDay !== null &&
      form.aiTryonPerMonth !== null &&
      form.aiTryonPerDay !== '' &&
      form.aiTryonPerMonth !== '' &&
      Number(form.aiTryonPerDay) > Number(form.aiTryonPerMonth)
    ) {
      nextErrors.aiTryonPerDay = 'Phối đồ/ngày không được lớn hơn Phối đồ/tháng';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    const payload = {
      name: String(form.name).trim(),
      description: String(form.description || '').trim(),
      pricePerMonth: isFree ? 0 : Number(form.pricePerMonth),
      pricePerYear: isFree ? null : form.pricePerYear === null ? null : Number(form.pricePerYear),
      liveTryonPerDay: form.liveTryonPerDay === null ? null : Number(form.liveTryonPerDay),
      liveTryonPerMonth: form.liveTryonPerMonth === null ? null : Number(form.liveTryonPerMonth),
      liveTryonMaxSeconds: Number(form.liveTryonMaxSeconds),
      aiTryonPerDay: form.aiTryonPerDay === null ? null : Number(form.aiTryonPerDay),
      aiTryonPerMonth: form.aiTryonPerMonth === null ? null : Number(form.aiTryonPerMonth),
      featuredListing: Boolean(form.featuredListing),
      maxPendingConsignmentForms: Number(form.maxPendingConsignmentForms),
      active: isFree ? true : Boolean(form.active),
      sortOrder: Number(form.sortOrder || 0),
    };

    try {
      setSubmitting(true);
      await membershipAdminApi.updatePlan(plan.id, payload);
      toast.success(`Đã cập nhật gói ${plan.tier}`);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Không thể cập nhật gói thành viên';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chỉnh sửa gói ${plan.tier} — ${TIER_LABELS[plan.tier] || plan.tier}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-[#DCE6DA] bg-[#F6F9F4] px-4 py-3 text-xs text-[#414942]">
          Thay đổi giá chỉ áp dụng cho lượt mua/gia hạn mới. Tăng hạn mức áp dụng ngay; giảm hạn mức chỉ áp dụng từ kỳ gia hạn tiếp theo.
        </div>

        {hasQuotaReduction && (
          <div
            role="alert"
            className="rounded-xl border border-[#FEA619] bg-[#FFF8EB] px-4 py-3 text-xs font-medium text-[#7A4F01]"
          >
            Giảm hạn mức chỉ áp dụng từ kỳ gia hạn tiếp theo. Thành viên đang dùng giữ nguyên mức cũ.
          </div>
        )}

        {submitError && (
          <div className="rounded-xl border border-[#D92D20]/30 bg-[#FFF5F5] px-4 py-3 text-xs font-medium text-[#D92D20]">
            {submitError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="plan-name"
            label="Tên gói"
            required
            value={form.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            error={errors.name}
          />
          <Input
            id="plan-sort-order"
            label="Thứ tự hiển thị"
            type="number"
            value={form.sortOrder}
            onChange={(e) => handleNumberChange('sortOrder', e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="plan-description" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
            Mô tả
          </label>
          <textarea
            id="plan-description"
            rows={2}
            value={form.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:border-[#006B2C] focus:ring-[#006B2C]/15 text-[#1F2A37]"
          />
        </div>

        {!isFree && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="plan-price-month"
              label="Giá / tháng (VNĐ)"
              type="number"
              min={0}
              value={form.pricePerMonth}
              onChange={(e) => handleNumberChange('pricePerMonth', e.target.value)}
              error={errors.pricePerMonth}
            />
            <div>
              <Input
                id="plan-price-year"
                label="Giá / năm (VNĐ)"
                type="number"
                min={0}
                disabled={form.pricePerYear === null}
                value={form.pricePerYear === null ? '' : form.pricePerYear}
                onChange={(e) => handleNumberChange('pricePerYear', e.target.value)}
                error={errors.pricePerYear}
              />
              <label className="inline-flex items-center gap-2 text-xs text-[#414942] cursor-pointer -mt-1">
                <input
                  type="checkbox"
                  checked={form.pricePerYear === null}
                  onChange={(e) => handleToggleNoAnnual(e.target.checked)}
                  className="rounded border-[#DDE5D9] text-[#006B2C] focus:ring-[#006B2C]"
                />
                <span>Không bán gói năm</span>
              </label>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {QUOTA_FIELDS.map(({ key, label }) => {
            const isUnlimited = form[key] === null;
            return (
              <div key={key}>
                <Input
                  id={`plan-${key}`}
                  label={label}
                  type="number"
                  min={0}
                  disabled={isUnlimited}
                  value={isUnlimited ? '' : form[key]}
                  onChange={(e) => handleNumberChange(key, e.target.value)}
                  error={errors[key]}
                />
                <label className="inline-flex items-center gap-2 text-xs text-[#414942] cursor-pointer -mt-1">
                  <input
                    type="checkbox"
                    checked={isUnlimited}
                    onChange={(e) => handleToggleUnlimited(key, e.target.checked)}
                    className="rounded border-[#DDE5D9] text-[#006B2C] focus:ring-[#006B2C]"
                  />
                  <span>Không giới hạn {label}</span>
                </label>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="plan-max-seconds"
            label="Giây / lượt RT (5–120)"
            type="number"
            min={5}
            max={120}
            value={form.liveTryonMaxSeconds}
            onChange={(e) => handleNumberChange('liveTryonMaxSeconds', e.target.value)}
            error={errors.liveTryonMaxSeconds}
          />
          <Input
            id="plan-max-consignment"
            label="Form ký gửi tối đa (1–50)"
            type="number"
            min={1}
            max={50}
            value={form.maxPendingConsignmentForms}
            onChange={(e) => handleNumberChange('maxPendingConsignmentForms', e.target.value)}
            error={errors.maxPendingConsignmentForms}
          />
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-1">
          <label className="inline-flex items-center gap-2 text-sm text-[#1F2A37] cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(form.featuredListing)}
              onChange={(e) => handleFieldChange('featuredListing', e.target.checked)}
              className="rounded border-[#DDE5D9] text-[#006B2C] focus:ring-[#006B2C]"
            />
            <span>Hiển thị tin nổi bật</span>
          </label>

          {!isFree && (
            <label className="inline-flex items-center gap-2 text-sm text-[#1F2A37] cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form.active)}
                onChange={(e) => handleFieldChange('active', e.target.checked)}
                className="rounded border-[#DDE5D9] text-[#006B2C] focus:ring-[#006B2C]"
              />
              <span>Đang bán</span>
            </label>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8E0]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={submitting}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </Modal>
  );
}

