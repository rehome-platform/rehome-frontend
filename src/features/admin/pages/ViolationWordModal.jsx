import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, Modal } from '../../../components/common/index.js';
import { useToast } from '../../../context/ToastContext.jsx';
import violationWordAdminApi from '../services/violationWordAdminApi.js';
import { ACTION_LABELS, CATEGORY_LABELS, SEVERITY_LABELS } from './ViolationWordsPage.jsx';

const DEFAULT_ACTION = 'AUTO_FLAG';

export default function ViolationWordModal({ isOpen, onClose, word = null, onSuccess }) {
  const toast = useToast();
  const isEdit = Boolean(word?.id);

  const [wordText, setWordText] = useState('');
  const [category, setCategory] = useState('PROFANITY');
  const [severity, setSeverity] = useState('WARNING');
  const [action, setAction] = useState(DEFAULT_ACTION);
  const [active, setActive] = useState(true);
  const [note, setNote] = useState('');

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    if (word) {
      setWordText(word.word || '');
      setCategory(word.category || 'PROFANITY');
      setSeverity(word.severity || 'WARNING');
      setAction(word.action || DEFAULT_ACTION);
      setActive(word.isActive !== undefined ? Boolean(word.isActive) : true);
      setNote(word.note || '');
    } else {
      setWordText('');
      setCategory('PROFANITY');
      setSeverity('WARNING');
      setAction(DEFAULT_ACTION);
      setActive(true);
      setNote('');
    }
    setErrors({});
    setSubmitError('');
    submittingRef.current = false;
    setSubmitting(false);
  }, [isOpen, word]);

  const validate = () => {
    const nextErrors = {};
    if (!wordText.trim()) {
      nextErrors.word = 'Từ khóa không được để trống.';
    } else if (wordText.trim().length > 255) {
      nextErrors.word = 'Từ khóa tối đa 255 ký tự.';
    }
    if (note.length > 1000) {
      nextErrors.note = 'Ghi chú tối đa 1000 ký tự.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setSubmitError('');
    if (!validate()) return;

    const payload = {
      word: wordText.trim(),
      category,
      severity,
      action,
      isActive: active,
      note: note.trim(),
    };

    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (isEdit) {
        await violationWordAdminApi.update(word.id, payload);
        toast.success(`Đã cập nhật từ khóa "${payload.word}".`);
      } else {
        await violationWordAdminApi.create(payload);
        toast.success(`Đã thêm từ khóa "${payload.word}".`);
      }
      await onSuccess?.();
      onClose?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || 'Không thể lưu từ khóa. Vui lòng thử lại.';
      setSubmitError(msg);
      toast.error(`Lưu từ khóa thất bại: ${msg}`);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa từ khóa vi phạm' : 'Thêm từ khóa vi phạm'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError ? (
          <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/30 text-xs text-[#D92D20]">
            {submitError}
          </div>
        ) : null}

        <Input
          id="vw-word"
          label="Từ khóa"
          required
          value={wordText}
          onChange={(e) => setWordText(e.target.value)}
          error={errors.word}
          placeholder="Ví dụ: lừa đảo"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="vw-category-select" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
              Nhóm vi phạm <span className="text-[#D92D20]">*</span>
            </label>
            <select
              id="vw-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:border-[#006B2C] focus:ring-[#006B2C]/15 text-[#1F2A37]"
            >
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="vw-severity-select" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
              Mức độ <span className="text-[#D92D20]">*</span>
            </label>
            <select
              id="vw-severity-select"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:border-[#006B2C] focus:ring-[#006B2C]/15 text-[#1F2A37]"
            >
              {Object.entries(SEVERITY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="vw-action-select" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
            Hành động hệ thống <span className="text-[#D92D20]">*</span>
          </label>
          <select
            id="vw-action-select"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:border-[#006B2C] focus:ring-[#006B2C]/15 text-[#1F2A37]"
          >
            {Object.entries(ACTION_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="p-3 rounded-xl bg-[#F6F9F4] border border-[#006B2C]/20 text-xs text-[#1F2A37] flex items-start gap-2">
          <span className="material-symbols-outlined text-base text-[#006B2C] mt-0.5">shield</span>
          <span>
            <strong>Bài viết / Bình luận</strong> chứa từ khóa vi phạm sẽ bị{' '}
            <strong>ẩn và chuyển sang chờ Admin xử lý</strong>; trong <strong>Chat</strong> hệ thống
            tự động che <strong>***</strong> để giữ luồng trò chuyện mượt mà.
          </span>
        </div>

        <div className="w-full">
          <label htmlFor="vw-note" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
            Ghi chú
          </label>
          <textarea
            id="vw-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú thêm (không bắt buộc)..."
            className="w-full px-3.5 py-2 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:border-[#006B2C] focus:ring-[#006B2C]/15 text-[#1F2A37]"
          />
          {errors.note ? <p className="mt-1.5 text-xs text-[#D92D20] font-medium">{errors.note}</p> : null}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            id="vw-active"
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4 accent-[#006B2C] rounded"
          />
          <label htmlFor="vw-active" className="text-sm font-medium text-[#1F2A37]">
            Áp dụng ngay (kích hoạt)
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-[#DDE5D9]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={submitting}>
            Lưu từ khóa
          </Button>
        </div>
      </form>
    </Modal>
  );
}
