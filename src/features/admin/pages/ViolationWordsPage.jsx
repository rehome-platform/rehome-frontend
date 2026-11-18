import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Modal, Table } from '../../../components/common/index.js';
import { useToast } from '../../../context/ToastContext.jsx';
import violationWordAdminApi from '../services/violationWordAdminApi.js';
import ViolationWordModal from './ViolationWordModal.jsx';

const PAGE_SIZE = 20;

const CATEGORY_LABELS = {
  PROFANITY: 'Ngôn từ thô tục',
  FRAUD: 'Lừa đảo',
  SPAM: 'Spam',
  INAPPROPRIATE: 'Không phù hợp',
};

const SEVERITY_LABELS = {
  WARNING: 'Cảnh báo',
  BLOCKED: 'Chặn nội dung',
};

const SEVERITY_VARIANTS = {
  WARNING: 'warning',
  BLOCKED: 'danger',
};

const ACTION_LABELS = {
  AUTO_FLAG: 'Tự động gắn cờ',
  AUTO_REJECT: 'Tự động từ chối',
  NOTIFY_ADMIN: 'Thông báo admin',
};

export { CATEGORY_LABELS, SEVERITY_LABELS, ACTION_LABELS };

export default function ViolationWordsPage() {
  const toast = useToast();

  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(0);

  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);

  const seqRef = useRef(0);

  const fetchWords = useCallback(async () => {
    const reqId = ++seqRef.current;
    setLoading(true);
    setError('');
    try {
      const data = await violationWordAdminApi.search({
        keyword: keyword.trim(),
        category,
        severity,
        isActive: isActive === '' ? undefined : isActive === 'true',
        page,
        size: PAGE_SIZE,
      });
      if (reqId !== seqRef.current) return;
      setItems(Array.isArray(data?.content) ? data.content : []);
      setTotalPages(data?.totalPages ?? 0);
      setTotalElements(data?.totalElements ?? 0);
    } catch (err) {
      if (reqId !== seqRef.current) return;
      setItems([]);
      setTotalPages(0);
      setTotalElements(0);
      setError(
        err?.response?.data?.message || err?.message || 'Không thể tải danh sách từ khóa vi phạm.'
      );
    } finally {
      if (reqId === seqRef.current) setLoading(false);
    }
  }, [keyword, category, severity, isActive, page]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(0);
  };

  const handleResetFilters = () => {
    setKeyword('');
    setCategory('');
    setSeverity('');
    setIsActive('');
    setPage(0);
  };

  const handleOpenCreate = () => {
    setEditingWord(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (word) => {
    setEditingWord(word);
    setModalOpen(true);
  };

  const handleToggle = async (word) => {
    try {
      await violationWordAdminApi.toggle(word.id);
      toast.success(`Đã ${word.isActive ? 'tắt' : 'bật'} từ khóa "${word.word}".`);
      fetchWords();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Không thể đổi trạng thái từ khóa.'
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await violationWordAdminApi.remove(deleteTarget.id);
      toast.success(`Đã xóa từ khóa "${deleteTarget.word}".`);
      setDeleteTarget(null);
      fetchWords();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Không thể xóa từ khóa.'
      );
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Từ khóa',
      render: (row) => <span className="font-semibold text-[#191C19]">{row.word}</span>,
    },
    {
      header: 'Nhóm',
      render: (row) => CATEGORY_LABELS[row.category] || row.category,
    },
    {
      header: 'Mức độ',
      render: (row) => (
        <Badge variant={SEVERITY_VARIANTS[row.severity] || 'default'}>
          {SEVERITY_LABELS[row.severity] || row.severity}
        </Badge>
      ),
    },
    {
      header: 'Hành động hệ thống',
      render: (row) => ACTION_LABELS[row.action] || row.action,
    },
    {
      header: 'Trạng thái',
      render: (row) => (
        <button
          type="button"
          role="switch"
          aria-checked={row.isActive}
          onClick={() => handleToggle(row)}
          title={row.isActive ? 'Đang áp dụng — bấm để tắt' : 'Đã tắt — bấm để bật'}
          className="flex items-center gap-2 group"
        >
          <span
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
              row.isActive ? 'bg-[#006B2C]' : 'bg-[#D9DEDA] group-hover:bg-[#C4CCC6]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                row.isActive ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </span>
          <span className={`text-xs font-semibold ${row.isActive ? 'text-[#006B2C]' : 'text-[#5B6776]'}`}>
            {row.isActive ? 'Đang áp dụng' : 'Đã tắt'}
          </span>
        </button>
      ),
    },
    {
      header: 'Thao tác',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => handleOpenEdit(row)} className="gap-1">
            <span className="material-symbols-outlined text-sm">edit</span>
            <span>Sửa</span>
          </Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row)} className="gap-1">
            <span className="material-symbols-outlined text-sm">delete</span>
            <span>Xóa</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white p-6 rounded-xl border border-[#E2E8E0] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            {totalElements > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#006B2C]">
                {totalElements} từ khóa
              </span>
            )}
          </div>
          <Button variant="primary" onClick={handleOpenCreate} className="gap-1.5">
            <span className="material-symbols-outlined text-base">add</span>
            <span>Thêm từ khóa</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-[#E2E8E0]">
          <div>
            <label htmlFor="vw-keyword" className="block text-xs font-medium text-[#5B6776] mb-1">
              Từ khóa
            </label>
            <input
              id="vw-keyword"
              type="text"
              value={keyword}
              onChange={handleFilterChange(setKeyword)}
              placeholder="Tìm theo từ..."
              className="px-3 py-1.5 text-sm rounded-xl border border-[#E2E8E0] text-[#191C19] focus:outline-none focus:ring-2 focus:ring-[#006B2C]/20"
            />
          </div>

          <div>
            <label htmlFor="vw-category" className="block text-xs font-medium text-[#5B6776] mb-1">
              Nhóm vi phạm
            </label>
            <select
              id="vw-category"
              value={category}
              onChange={handleFilterChange(setCategory)}
              className="px-3 py-1.5 text-sm rounded-xl border border-[#E2E8E0] bg-white text-[#191C19]"
            >
              <option value="">Tất cả nhóm</option>
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="vw-severity" className="block text-xs font-medium text-[#5B6776] mb-1">
              Mức độ
            </label>
            <select
              id="vw-severity"
              value={severity}
              onChange={handleFilterChange(setSeverity)}
              className="px-3 py-1.5 text-sm rounded-xl border border-[#E2E8E0] bg-white text-[#191C19]"
            >
              <option value="">Tất cả mức độ</option>
              {Object.entries(SEVERITY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="vw-active" className="block text-xs font-medium text-[#5B6776] mb-1">
              Trạng thái
            </label>
            <select
              id="vw-active"
              value={isActive}
              onChange={handleFilterChange(setIsActive)}
              className="px-3 py-1.5 text-sm rounded-xl border border-[#E2E8E0] bg-white text-[#191C19]"
            >
              <option value="">Tất cả</option>
              <option value="true">Đang áp dụng</option>
              <option value="false">Đã tắt</option>
            </select>
          </div>

          {(keyword || category || severity || isActive) && (
            <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters}>
              Xóa lọc
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/30 text-sm text-[#D92D20] flex items-center justify-between gap-3"
        >
          <span>{error}</span>
          <Button type="button" variant="secondary" size="sm" onClick={fetchWords}>
            Thử lại
          </Button>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border border-[#E2E8E0] space-y-3">
        <Table
          columns={columns}
          data={items}
          loading={loading}
          emptyMessage="Chưa có từ khóa vi phạm nào phù hợp."
        />

        <div className="flex items-center justify-between pt-1 text-xs text-[#5B6776]">
          <span>
            Trang {page + 1} / {Math.max(totalPages, 1)}
            {totalElements > 0 && <span className="ml-2 font-medium">({totalElements} bản ghi)</span>}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page <= 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Trang trước
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Trang sau
            </Button>
          </div>
        </div>
      </div>

      <ViolationWordModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        word={editingWord}
        onSuccess={fetchWords}
      />

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Xác nhận xóa từ khóa"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#1F2A37]">
            Bạn có chắc muốn xóa từ khóa <span className="font-semibold">"{deleteTarget?.word}"</span>?
            Hành động này không thể hoàn tác.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
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
