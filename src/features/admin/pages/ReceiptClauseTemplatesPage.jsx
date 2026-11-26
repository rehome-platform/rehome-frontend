import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Modal, TableActionButton } from '../../../components/common/index.js';
import { useToast } from '../../../context/ToastContext.jsx';
import receiptClauseAdminApi from '../services/receiptClauseAdminApi.js';
import ReceiptPreviewPanel from './ReceiptPreviewPanel.jsx';
import {
  STATIC_STALE_TIME_MS,
  useAdminCache,
  useAdminCacheActions,
} from '../hooks/useAdminQuery.jsx';

const RECEIPT_CLAUSES_CACHE_KEY = 'admin:receipt-clauses:list';

const EMPTY_DRAFT = { title: '', bodyTemplate: '', active: true };
// Mỗi placeholder được thay bằng số liệu thật của chính biên nhận đó lúc tạo — không phải số
// chung cho mọi đơn, nên khác nhau giữa các biên nhận dù cùng dùng một mẫu điều khoản
const PLACEHOLDER_HINTS = [
  { key: 'floorPrice', desc: 'Giá sàn — giá thấp nhất được giảm xuống của biên nhận này' },
  { key: 'withdrawalFee', desc: 'Phí rút hàng ngoài thời gian miễn phí' },
  { key: 'freeWithdrawalWindowDays', desc: 'Số ngày đầu mỗi kỳ được rút hàng không mất phí' },
  { key: 'degradedCompensationRate', desc: 'Tỷ lệ đền bù khi hàng xuống cấp, tính trên giá bán hiện tại' },
];

export default function ReceiptClauseTemplatesPage() {
  const toast = useToast();
  const cache = useAdminCache();
  const cacheActions = useAdminCacheActions();
  const initialCached = cache?.read(RECEIPT_CLAUSES_CACHE_KEY)?.data || null;

  const [items, setItems] = useState(() => initialCached ?? []);
  const [loading, setLoading] = useState(() => !initialCached);
  const [error, setError] = useState('');

  // editingId: null (không sửa gì) | 'new' (đang thêm) | id của điều đang sửa
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);

  const seqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchClauses = useCallback(async ({ force = false } = {}) => {
    const cachedEntry = cache?.read(RECEIPT_CLAUSES_CACHE_KEY) || null;
    if (!force && cachedEntry && cache.isFresh(cachedEntry, STATIC_STALE_TIME_MS)) {
      setItems(cachedEntry.data ?? []);
      setError('');
      setLoading(false);
      return;
    }

    const reqId = ++seqRef.current;
    const hasCached = Boolean(cachedEntry?.data);
    if (hasCached) {
      setItems(cachedEntry.data);
      setError('');
      setLoading(false);
    } else {
      setLoading(true);
      setError('');
    }

    try {
      const data = await receiptClauseAdminApi.list();
      if (!mountedRef.current || reqId !== seqRef.current) return;
      const list = Array.isArray(data) ? data : [];
      cache?.write(RECEIPT_CLAUSES_CACHE_KEY, list);
      setItems(list);
    } catch (err) {
      if (!mountedRef.current || reqId !== seqRef.current) return;
      if (!hasCached || force) {
        setItems([]);
        setError(
          err?.response?.data?.message || err?.message || 'Không thể tải danh sách điều khoản.',
        );
      }
    } finally {
      if (mountedRef.current && reqId === seqRef.current) {
        setLoading(false);
      }
    }
  }, [cache]);

  useEffect(() => {
    fetchClauses();
  }, [fetchClauses]);

  // Biên nhận mẫu bên phải luôn phản ánh đúng những gì đang gõ bên trái, chưa cần bấm Lưu
  const previewClauses = useMemo(() => {
    if (editingId === null) return items;
    if (editingId === 'new') {
      const nextOrder = items.reduce((max, c) => Math.max(max, c.displayOrder ?? 0), 0) + 1;
      return [...items, { id: 'new-draft', displayOrder: nextOrder, ...draft }];
    }
    return items.map((c) => (c.id === editingId ? { ...c, ...draft } : c));
  }, [items, editingId, draft]);

  const highlightId = editingId === 'new' ? 'new-draft' : editingId;

  const startCreate = () => {
    setEditingId('new');
    setDraft(EMPTY_DRAFT);
    setErrors({});
  };

  const startEdit = (clause) => {
    setEditingId(clause.id);
    setDraft({ title: clause.title, bodyTemplate: clause.bodyTemplate, active: clause.active });
    setErrors({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setErrors({});
  };

  const validate = () => {
    const nextErrors = {};
    if (!draft.title.trim()) nextErrors.title = 'Tiêu đề không được để trống.';
    if (!draft.bodyTemplate.trim()) nextErrors.bodyTemplate = 'Nội dung không được để trống.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (submittingRef.current) return;
    if (!validate()) return;

    const payload = {
      title: draft.title.trim(),
      bodyTemplate: draft.bodyTemplate.trim(),
      active: draft.active,
    };

    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (editingId === 'new') {
        await receiptClauseAdminApi.create(payload);
        toast.success(`Đã thêm "${payload.title}". Áp dụng cho biên nhận ký gửi tạo mới từ bây giờ.`);
      } else {
        await receiptClauseAdminApi.update(editingId, payload);
        toast.success(`Đã cập nhật "${payload.title}". Biên nhận đã tạo trước đó không bị ảnh hưởng.`);
      }
      cancelEdit();
      cacheActions?.invalidate(['admin:receipt-clauses:', 'admin:audit-logs:']);
      await fetchClauses({ force: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || 'Không thể lưu điều khoản. Vui lòng thử lại.';
      toast.error(msg);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleToggle = async (clause) => {
    try {
      await receiptClauseAdminApi.toggle(clause.id);
      toast.success(`Đã ${clause.active ? 'tắt' : 'bật'} "${clause.title}".`);
      cacheActions?.invalidate(['admin:receipt-clauses:', 'admin:audit-logs:']);
      fetchClauses({ force: true });
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Không thể đổi trạng thái điều khoản.',
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await receiptClauseAdminApi.remove(deleteTarget.id);
      toast.success(`Đã xóa "${deleteTarget.title}".`);
      if (editingId === deleteTarget.id) cancelEdit();
      setDeleteTarget(null);
      cacheActions?.invalidate(['admin:receipt-clauses:', 'admin:audit-logs:']);
      fetchClauses({ force: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể xóa điều khoản.');
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/30 text-sm text-[#D92D20] flex items-center justify-between gap-3"
        >
          <span>{error}</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => fetchClauses({ force: true })}>
            Thử lại
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Cột trái: soạn / danh sách điều khoản */}
        <div className="space-y-4">
          {editingId !== null ? (
            <div className="bg-white p-5 rounded-xl border border-[#006B2C]/30 space-y-4">
              <p className="text-sm font-semibold text-[#1F2A37]">
                {editingId === 'new' ? 'Thêm điều khoản mới' : 'Chỉnh sửa điều khoản'}
              </p>

              <Input
                id="rct-title"
                label="Tiêu đề"
                required
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                error={errors.title}
                placeholder="Ví dụ: ĐIỀU 4 — GIẢM GIÁ"
              />

              <div className="w-full">
                <label htmlFor="rct-body" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
                  Nội dung <span className="text-[#D92D20]">*</span>
                </label>
                <textarea
                  id="rct-body"
                  rows={6}
                  value={draft.bodyTemplate}
                  onChange={(e) => setDraft((d) => ({ ...d, bodyTemplate: e.target.value }))}
                  placeholder="Nội dung điều khoản. Có thể chèn số liệu bằng placeholder, ví dụ {{floorPrice}}"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:border-[#006B2C] focus:ring-[#006B2C]/15 text-[#1F2A37]"
                />
                {errors.bodyTemplate ? (
                  <p className="mt-1.5 text-xs text-[#D92D20] font-medium">{errors.bodyTemplate}</p>
                ) : null}
                <div className="mt-1.5 space-y-1">
                  <p className="text-xs text-[#5B6776]">
                    Placeholder hỗ trợ (tự thay bằng số liệu thật của biên nhận lúc tạo):
                  </p>
                  <ul className="space-y-0.5">
                    {PLACEHOLDER_HINTS.map(({ key, desc }) => (
                      <li key={key} className="text-xs text-[#5B6776] flex items-baseline gap-1.5">
                        <code className="px-1 py-0.5 rounded bg-[#F6F9F4] text-[#006B2C] shrink-0">
                          {`{{${key}}}`}
                        </code>
                        <span>{desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="rct-active"
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
                  className="w-4 h-4 accent-[#006B2C] rounded"
                />
                <label htmlFor="rct-active" className="text-sm font-medium text-[#1F2A37]">
                  Áp dụng cho biên nhận tạo mới
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-[#DDE5D9]">
                <Button type="button" variant="secondary" onClick={cancelEdit} disabled={submitting}>
                  Hủy
                </Button>
                <Button type="button" variant="primary" loading={submitting} disabled={submitting} onClick={handleSave}>
                  Lưu điều khoản
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="primary" onClick={startCreate} className="gap-1.5">
              <span className="material-symbols-outlined text-base">add</span>
              <span>Thêm điều khoản</span>
            </Button>
          )}

          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-[#5B6776] px-1">Đang tải...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-[#5B6776] px-1">Chưa có điều khoản nào.</p>
            ) : (
              items
                .slice()
                .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                .map((clause) => (
                  <div
                    key={clause.id}
                    className={`bg-white p-4 rounded-xl border space-y-2 ${
                      clause.id === editingId ? 'border-[#006B2C]' : 'border-[#DDE5D9]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1F2A37]">{clause.title}</p>
                        <p className="text-xs text-[#5B6776] mt-0.5 line-clamp-2">{clause.bodyTemplate}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={clause.active}
                        onClick={() => handleToggle(clause)}
                        title={clause.active ? 'Đang áp dụng — bấm để tắt' : 'Đã tắt — bấm để bật'}
                        className="shrink-0"
                      >
                        <span
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
                            clause.active ? 'bg-[#006B2C]' : 'bg-[#D9DEDA]'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                              clause.active ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                          />
                        </span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-[#F0F2EF]">
                      <TableActionButton action="edit" onClick={() => startEdit(clause)} />
                      <TableActionButton action="delete" onClick={() => setDeleteTarget(clause)} />
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Cột phải: biên nhận mẫu, luôn hiện và cập nhật live */}
        <div className="lg:sticky lg:top-4">
          <ReceiptPreviewPanel clauses={previewClauses} highlightId={highlightId} />
        </div>
      </div>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Xác nhận xóa điều khoản"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#1F2A37]">
            Bạn có chắc muốn xóa <span className="font-semibold">"{deleteTarget?.title}"</span>?
            Biên nhận đã tạo trước đó không bị ảnh hưởng.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button type="button" variant="danger" loading={deleting} disabled={deleting} onClick={handleConfirmDelete}>
              Xác nhận xóa
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
