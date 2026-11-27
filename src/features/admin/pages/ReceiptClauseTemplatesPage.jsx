import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Modal, TableActionButton } from '../../../components/common/index.js';
import { useToast } from '../../../context/ToastContext.jsx';
import receiptClauseAdminApi from '../services/receiptClauseAdminApi.js';
import ReceiptPreviewPanel from './ReceiptPreviewPanel.jsx';
import {
  RECEIPT_PLACEHOLDERS,
  RECEIPT_PLACEHOLDER_MAP,
  editorTextToTemplate,
  extractUsedPlaceholders,
  findUnknownPlaceholders,
  templateToEditorText,
  tokenizeClauseTemplate,
} from './receiptClausePlaceholders.js';
import {
  STATIC_STALE_TIME_MS,
  useAdminCache,
  useAdminCacheActions,
} from '../hooks/useAdminQuery.jsx';

const RECEIPT_CLAUSES_CACHE_KEY = 'admin:receipt-clauses:list';

const EMPTY_DRAFT = { title: '', bodyTemplate: '', active: true };

function renderClauseBodyReadable(template) {
  const tokens = tokenizeClauseTemplate(template);
  if (tokens.length === 0) return '—';
  return tokens.map((token, idx) => {
    if (token.type !== 'placeholder') {
      return <React.Fragment key={idx}>{token.value}</React.Fragment>;
    }
    if (token.meta) {
      return (
        <span
          key={`${token.key}-${idx}`}
          title={`${token.meta.label} — ${token.meta.desc}`}
          className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#ECFDF3] border border-[#ABEFC6] text-[#006B2C] font-semibold text-xs tabular-nums"
        >
          {token.meta.sample}
        </span>
      );
    }
    return (
      <span
        key={`${token.key}-${idx}`}
        title="Thông số chưa được hệ thống hỗ trợ"
        className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#FFFAEB] border border-[#FEDF89] text-[#B54708] font-semibold text-xs"
      >
        Thông số chưa hỗ trợ
      </span>
    );
  });
}

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
  const [showVariableGuide, setShowVariableGuide] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);

  const bodyInputRef = useRef(null);
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

  const sortedItems = useMemo(
    () => items.slice().sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [items],
  );

  const activeCount = useMemo(
    () => items.filter((item) => item.active !== false).length,
    [items],
  );

  const previewNoMap = useMemo(() => {
    const map = {};
    let n = 5;
    for (const clause of sortedItems) {
      if (clause.active !== false) {
        map[clause.id] = n++;
      }
    }
    return map;
  }, [sortedItems]);

  const normalizedDraftBody = useMemo(
    () => editorTextToTemplate(draft.bodyTemplate),
    [draft.bodyTemplate],
  );

  // Biên nhận mẫu bên phải luôn phản ánh đúng những gì đang gõ bên trái, chưa cần bấm Lưu
  const previewClauses = useMemo(() => {
    if (editingId === null) return items;
    const draftForPreview = { ...draft, bodyTemplate: normalizedDraftBody };
    if (editingId === 'new') {
      const nextOrder = items.reduce((max, c) => Math.max(max, c.displayOrder ?? 0), 0) + 1;
      return [...items, { id: 'new-draft', displayOrder: nextOrder, ...draftForPreview }];
    }
    return items.map((c) => (c.id === editingId ? { ...c, ...draftForPreview } : c));
  }, [items, editingId, draft, normalizedDraftBody]);

  const highlightId = editingId === 'new' ? 'new-draft' : editingId;
  const unknownDraftVars = useMemo(
    () => findUnknownPlaceholders(normalizedDraftBody),
    [normalizedDraftBody],
  );

  const startCreate = () => {
    setEditingId('new');
    setDraft(EMPTY_DRAFT);
    setErrors({});
  };

  const startEdit = (clause) => {
    setEditingId(clause.id);
    setDraft({
      title: clause.title,
      bodyTemplate: templateToEditorText(clause.bodyTemplate),
      active: clause.active,
    });
    setErrors({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setErrors({});
  };

  const insertPlaceholder = (key) => {
    const meta = RECEIPT_PLACEHOLDER_MAP[key];
    if (!meta) return;
    const token = meta.editorToken;
    const el = bodyInputRef.current;
    if (el && typeof el.selectionStart === 'number' && typeof el.selectionEnd === 'number') {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const nextBody =
        draft.bodyTemplate.slice(0, start) + token + draft.bodyTemplate.slice(end);
      setDraft((d) => ({ ...d, bodyTemplate: nextBody }));
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
          if (bodyInputRef.current) {
            bodyInputRef.current.focus();
            const pos = start + token.length;
            bodyInputRef.current.setSelectionRange(pos, pos);
          }
        });
      }
      return;
    }
    setDraft((d) => ({
      ...d,
      bodyTemplate: d.bodyTemplate ? `${d.bodyTemplate}${d.bodyTemplate.endsWith(' ') ? '' : ' '}${token}` : token,
    }));
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
      bodyTemplate: editorTextToTemplate(draft.bodyTemplate).trim(),
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
    <div className="space-y-4 font-sans">
      {/* Top Toolbar Card */}
      <div className="bg-white p-5 rounded-xl border border-[#DDE5D9] space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm text-[#5B6776]">
              Quản lý các điều khoản tùy chỉnh áp dụng từ Điều 5 cho biên nhận ký gửi tạo mới.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F2F4F7] text-[#344054]">
                {items.length} điều khoản
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF3] text-[#067647] border border-[#ABEFC6]">
                {activeCount} đang áp dụng
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              aria-expanded={showVariableGuide}
              onClick={() => setShowVariableGuide((prev) => !prev)}
              className="gap-1.5 whitespace-nowrap"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                tune
              </span>
              <span>Thông số tự động ({RECEIPT_PLACEHOLDERS.length})</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={startCreate}
              disabled={editingId === 'new'}
              className="gap-1.5 whitespace-nowrap"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                add
              </span>
              <span>Thêm điều khoản</span>
            </Button>
          </div>
        </div>

        {showVariableGuide && (
          <div className="pt-3 border-t border-[#DDE5D9] space-y-2.5">
            <p className="text-xs text-[#5B6776]">
              Các thông số tự động dưới đây sẽ được điền theo số liệu thực tế của từng biên nhận khi phát hành:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {RECEIPT_PLACEHOLDERS.map((item) => (
                <div
                  key={item.key}
                  className="rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]/60 px-3 py-2.5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#ECFDF3] border border-[#ABEFC6] text-[#006B2C] font-semibold">
                      {item.label}
                    </span>
                    <span className="font-semibold text-[#1F2A37] tabular-nums">
                      Mẫu: {item.sampleLabel}
                    </span>
                  </div>
                  <p className="text-[#5B6776] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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

      {/* Aligned Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Cột trái: Form soạn & danh sách điều khoản */}
        <div className="lg:col-span-7 space-y-3.5">
          {editingId !== null && (
            <div className="bg-white p-5 rounded-xl border-2 border-[#006B2C]/35 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#DDE5D9]">
                <p className="text-sm font-bold text-[#1F2A37]">
                  {editingId === 'new' ? 'Thêm điều khoản mới' : 'Chỉnh sửa điều khoản'}
                </p>
                <button
                  type="button"
                  aria-label="Đóng biểu mẫu"
                  onClick={cancelEdit}
                  disabled={submitting}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[#5B6776] hover:text-[#1F2A37] hover:bg-[#F6F9F4] transition-colors"
                >
                  ✕
                </button>
              </div>

              <Input
                id="rct-title"
                label="Tiêu đề"
                required
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                error={errors.title}
                placeholder="Ví dụ: ĐIỀU 5 — GIẢM GIÁ"
              />

              <div className="w-full space-y-2.5">
                <label htmlFor="rct-body" className="block text-xs font-semibold text-[#1F2A37]">
                  Nội dung <span className="text-[#D92D20]">*</span>
                </label>
                <textarea
                  ref={bodyInputRef}
                  id="rct-body"
                  rows={5}
                  value={draft.bodyTemplate}
                  onChange={(e) => setDraft((d) => ({ ...d, bodyTemplate: e.target.value }))}
                  placeholder="Nhập nội dung điều khoản. Bấm các nút bên dưới để chèn thông số tự động như Giá sàn, Phí rút hàng..."
                  className="w-full px-3.5 py-2.5 text-sm leading-relaxed bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:border-[#006B2C] focus:ring-[#006B2C]/15 text-[#1F2A37]"
                />
                {errors.bodyTemplate ? (
                  <p className="text-xs text-[#D92D20] font-medium">{errors.bodyTemplate}</p>
                ) : null}

                {unknownDraftVars.length > 0 && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[#FEDF89] bg-[#FFFAEB] px-3 py-2 text-xs text-[#B54708]"
                  >
                    Phát hiện thông số chưa được hệ thống hỗ trợ. Vui lòng chỉ sử dụng 4 thông số tự động bên dưới.
                  </div>
                )}

                <div className="rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]/70 p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#1F2A37]">
                      Chèn nhanh thông số tự động
                    </span>
                    <span className="text-[11px] text-[#5B6776]">
                      Tự động điền số liệu thật lúc tạo biên nhận
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {RECEIPT_PLACEHOLDERS.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => insertPlaceholder(item.key)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#ABEFC6] bg-white hover:bg-[#ECFDF3] text-xs font-semibold text-[#006B2C] transition-colors"
                      >
                        <span>+ {item.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 border-t border-[#DDE5D9]">
                    {RECEIPT_PLACEHOLDERS.map((item) => (
                      <p key={item.key} className="text-[11px] text-[#5B6776] leading-snug">
                        <span className="font-semibold text-[#006B2C]">{item.label}:</span>{' '}
                        {item.desc} · <span className="text-[#344054] font-medium">mẫu {item.sampleLabel}</span>
                      </p>
                    ))}
                  </div>
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
          )}

          <div className="space-y-3">
            {loading && sortedItems.length === 0 ? (
              <div className="bg-white p-6 rounded-xl border border-[#DDE5D9] text-sm text-[#5B6776]">
                Đang tải danh sách điều khoản...
              </div>
            ) : sortedItems.length === 0 ? (
              <div className="bg-white p-6 rounded-xl border border-[#DDE5D9] text-sm text-[#5B6776]">
                Chưa có điều khoản nào. Bấm "Thêm điều khoản" để bắt đầu.
              </div>
            ) : (
              sortedItems.map((clause) => {
                const isEditing = clause.id === editingId;
                const usedVars = extractUsedPlaceholders(clause.bodyTemplate);
                const previewNo = previewNoMap[clause.id];

                return (
                  <div
                    key={clause.id}
                    className={`bg-white rounded-xl border transition-all overflow-hidden ${
                      isEditing
                        ? 'border-[#006B2C] ring-2 ring-[#006B2C]/15'
                        : 'border-[#DDE5D9] hover:border-[#C4D1BF]'
                    }`}
                  >
                    {/* Header Card */}
                    <div className="px-4 pt-4 pb-2.5 flex items-start justify-between gap-3">
                      <p className="text-sm font-bold text-[#1F2A37] leading-snug">
                        {clause.title}
                      </p>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={clause.active}
                        onClick={() => handleToggle(clause)}
                        title={clause.active ? 'Đang áp dụng — bấm để tắt' : 'Đã tắt — bấm để bật'}
                        className="inline-flex items-center gap-2 shrink-0 group"
                      >
                        <span
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
                            clause.active ? 'bg-[#006B2C]' : 'bg-[#D9DEDA] group-hover:bg-[#C4CCC6]'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                              clause.active ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                          />
                        </span>
                        <span
                          className={`text-xs font-semibold whitespace-nowrap ${
                            clause.active ? 'text-[#006B2C]' : 'text-[#5B6776]'
                          }`}
                        >
                          {clause.active ? 'Đang áp dụng' : 'Đã tắt'}
                        </span>
                      </button>
                    </div>

                    {/* Body Card */}
                    <div className="px-4 pb-3 space-y-2.5">
                      <p className="text-[13.5px] leading-relaxed text-[#344054] whitespace-pre-wrap">
                        {renderClauseBodyReadable(clause.bodyTemplate)}
                      </p>

                      {usedVars.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-[11px] font-medium text-[#5B6776]">
                            Thông số tự động:
                          </span>
                          {usedVars.map(({ key, meta }) => (
                            <span
                              key={key}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#F6F9F4] border border-[#DDE5D9] px-2 py-0.5 text-[11px] text-[#344054]"
                            >
                              <span className="font-semibold text-[#006B2C]">
                                {meta ? meta.label : 'Không xác định'}
                              </span>
                              {meta ? (
                                <>
                                  <span className="text-[#98A2B3]">·</span>
                                  <span>mẫu {meta.sampleLabel}</span>
                                </>
                              ) : null}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Card */}
                    <div className="px-4 py-2.5 bg-[#FAFBF9] border-t border-[#EEF2EC] flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={`text-xs font-medium ${
                          isEditing
                            ? 'text-[#B54708]'
                            : clause.active && previewNo
                              ? 'text-[#5B6776]'
                              : 'text-[#667085]'
                        }`}
                      >
                        {isEditing
                          ? 'Đang chỉnh sửa ở biểu mẫu'
                          : clause.active && previewNo
                            ? `Hiển thị tại Điều ${previewNo}`
                            : 'Không hiện trên biên nhận mới'}
                      </span>
                      <div className="inline-flex items-center gap-2">
                        <TableActionButton action="edit" onClick={() => startEdit(clause)} />
                        <TableActionButton action="delete" onClick={() => setDeleteTarget(clause)} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Cột phải: Biên nhận mẫu cập nhật live */}
        <div className="lg:col-span-5 lg:sticky lg:top-4">
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
