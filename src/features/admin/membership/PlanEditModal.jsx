import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Modal } from '../../../components/common/index.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { membershipAdminApi } from '../services/membershipAdminApi.js';
import { TIER_LABELS } from './membershipConstants.js';

// RT = thử đồ "real-time" qua camera (khác với "Phối đồ AI" là ghép ảnh tĩnh, không cần camera)
// Chỉ còn hạn mức theo NGÀY: trần theo tháng backend vẫn hỗ trợ (tùy chọn, mặc định null = không
// giới hạn) nhưng không cần thiết với nghiệp vụ hiện tại nên bỏ khỏi UI, không cho Admin chỉnh ở đây.
const QUOTA_FIELDS = [
  { key: 'liveTryonPerDay', label: 'Thử đồ real-time (camera) / ngày' },
  { key: 'aiTryonPerDay', label: 'Phối đồ AI (ảnh tĩnh) / ngày' },
];

const LIMIT_FIELDS = [
  {
    key: 'liveTryonMaxSeconds',
    label: 'Số giây tối đa mỗi lượt thử đồ real-time',
    min: 5,
    max: 120,
  },
  {
    key: 'maxPendingConsignmentForms',
    label: 'Số form ký gửi đang chờ tối đa',
    min: 1,
    max: 50,
  },
];

const ALL_QUOTA_KEYS = [
  'liveTryonPerDay',
  'liveTryonMaxSeconds',
  'aiTryonPerDay',
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
  const [editingKeys, setEditingKeys] = useState(() => new Set());
  const previousNumbersRef = useRef({});

  useEffect(() => {
    if (isOpen && plan) {
      setForm(buildInitialForm(plan));
      setErrors({});
      setSubmitError('');
      setSubmitting(false);
      setEditingKeys(new Set());
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

  // Hạn mức nào khác với giá trị gốc của gói (đang áp dụng) -> tô vàng + liệt kê ở banner, giống ConfigPage
  const dirtyLimitFields = useMemo(() => {
    if (!plan || !form) return [];
    return [...QUOTA_FIELDS, ...LIMIT_FIELDS].filter(({ key }) => {
      const original = plan[key] ?? null;
      const current = form[key] === '' ? null : form[key];
      return String(original) !== String(current);
    });
  }, [plan, form]);

  const toggleEditing = (key) => {
    setEditingKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

        {/* Cảnh báo thay đổi chưa lưu (cùng kiểu với trang Cấu hình tham số hệ thống) */}
        {dirtyLimitFields.length > 0 && (
          <div className="p-3.5 bg-[#FFFBEB] border border-[#F59E0B] text-[#92400E] rounded-2xl text-xs shadow-sm flex items-start gap-2">
            <span className="material-symbols-outlined text-lg shrink-0">warning</span>
            <div>
              <p className="font-bold">
                Bạn có {dirtyLimitFields.length} hạn mức đã sửa nhưng chưa lưu.
              </p>
              <p className="text-[11px] mt-0.5">
                {dirtyLimitFields.map((f) => f.label).join(' · ')}. Bấm "Lưu thay đổi" bên dưới để áp dụng.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {QUOTA_FIELDS.map(({ key, label }) => {
            const isUnlimited = form[key] === null;
            const editing = editingKeys.has(key);
            const dirty = dirtyLimitFields.some((f) => f.key === key);
            return (
              <div
                key={key}
                className={`rounded-2xl border p-4 flex flex-col gap-2.5 transition-colors ${
                  dirty
                    ? 'border-[#F59E0B] bg-[#FFFBEB]/60'
                    : editing
                    ? 'border-[#006B2C] bg-white shadow-sm'
                    : 'border-[#DDE5D9] bg-[#FBFDFB]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <label htmlFor={`plan-${key}`} className="text-xs font-semibold text-[#191C19] leading-snug">
                    {label}
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleEditing(key)}
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
                  id={`plan-${key}`}
                  type="number"
                  min={0}
                  readOnly={!editing}
                  disabled={isUnlimited}
                  value={isUnlimited ? '' : form[key]}
                  onChange={(e) => handleNumberChange(key, e.target.value)}
                  placeholder={isUnlimited ? 'Không giới hạn' : undefined}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold font-mono outline-none transition-all ${
                    editing
                      ? 'border-[#006B2C] bg-white text-[#191C19] focus:ring-2 focus:ring-[#006B2C]/15'
                      : 'border-transparent bg-[#F0F4EE] text-[#191C19] cursor-default'
                  } disabled:bg-[#F5F5F5] disabled:text-[#9E9E9E]`}
                />
                {errors[key] && <p className="text-[11px] text-[#D92D20] font-medium">{errors[key]}</p>}

                <label className="inline-flex items-center gap-2 text-xs text-[#414942] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUnlimited}
                    onChange={(e) => handleToggleUnlimited(key, e.target.checked)}
                    className="rounded border-[#DDE5D9] text-[#006B2C] focus:ring-[#006B2C]"
                  />
                  <span>Không giới hạn</span>
                </label>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LIMIT_FIELDS.map(({ key, label, min, max }) => {
            const editing = editingKeys.has(key);
            const dirty = dirtyLimitFields.some((f) => f.key === key);
            return (
              <div
                key={key}
                className={`rounded-2xl border p-4 flex flex-col gap-2.5 transition-colors ${
                  dirty
                    ? 'border-[#F59E0B] bg-[#FFFBEB]/60'
                    : editing
                    ? 'border-[#006B2C] bg-white shadow-sm'
                    : 'border-[#DDE5D9] bg-[#FBFDFB]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <label htmlFor={`plan-${key}`} className="text-xs font-semibold text-[#191C19] leading-snug">
                    {label} ({min}–{max})
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleEditing(key)}
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
                  id={`plan-${key}`}
                  type="number"
                  min={min}
                  max={max}
                  readOnly={!editing}
                  value={form[key]}
                  onChange={(e) => handleNumberChange(key, e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold font-mono outline-none transition-all ${
                    editing
                      ? 'border-[#006B2C] bg-white text-[#191C19] focus:ring-2 focus:ring-[#006B2C]/15'
                      : 'border-transparent bg-[#F0F4EE] text-[#191C19] cursor-default'
                  }`}
                />
                {errors[key] && <p className="text-[11px] text-[#D92D20] font-medium">{errors[key]}</p>}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-1">
          <label className="inline-flex items-center gap-2 text-sm text-[#1F2A37] cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(form.featuredListing)}
              onChange={(e) => handleFieldChange('featuredListing', e.target.checked)}
              className="rounded border-[#DDE5D9] text-[#006B2C] focus:ring-[#006B2C]"
            />
            <span>Hiển thị tin nổi bật (hạng cao hơn được xếp trên)</span>
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

