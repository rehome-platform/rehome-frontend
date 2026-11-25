import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Modal, Table } from '../../../components/common/index.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { formatDateTime } from '../../../utils/formatters.js';
import { useAdminCacheActions } from '../hooks/useAdminQuery.jsx';
import contentReviewAdminApi from '../services/contentReviewAdminApi.js';

const PAGE_SIZE = 20;

const TABS = [
  { key: 'POST', label: 'Bài viết chờ duyệt' },
  { key: 'COMMENT', label: 'Bình luận chờ duyệt' },
];

function isConflictError(err) {
  const status = err?.response?.status;
  const code = err?.response?.data?.code || err?.code;
  const msg = String(err?.response?.data?.message || err?.message || '');
  return status === 409 || code === 'CONTENT_NOT_PENDING_REVIEW' || msg.includes('CONTENT_NOT_PENDING_REVIEW');
}

export default function AdminContentReviewsPage() {
  const toast = useToast();
  const cacheActions = useAdminCacheActions();

  const [kind, setKind] = useState('POST');
  const [page, setPage] = useState(0);
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [resolving, setResolving] = useState(false);

  const seqRef = useRef(0);
  const mountedRef = useRef(true);
  const resolvingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchPending = useCallback(async () => {
    const reqId = ++seqRef.current;
    setLoading(true);
    setError('');
    try {
      const data = await contentReviewAdminApi.listPending(kind, { page, size: PAGE_SIZE });
      if (!mountedRef.current || reqId !== seqRef.current) return;
      setItems(Array.isArray(data?.content) ? data.content : []);
      setTotalPages(data?.totalPages ?? 0);
      setTotalElements(data?.totalElements ?? 0);
    } catch (err) {
      if (!mountedRef.current || reqId !== seqRef.current) return;
      setItems([]);
      setTotalPages(0);
      setTotalElements(0);
      setError(
        err?.response?.data?.message || err?.message || 'Không thể tải danh sách nội dung chờ duyệt.'
      );
    } finally {
      if (mountedRef.current && reqId === seqRef.current) {
        setLoading(false);
      }
    }
  }, [kind, page]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleSelectKind = (nextKind) => {
    if (nextKind === kind) return;
    setKind(nextKind);
    setPage(0);
  };

  const openRejectModal = (item) => {
    setRejectTarget(item);
    setRejectReason('');
    setRejectError('');
  };

  const handleConfirmApprove = async () => {
    if (!approveTarget || resolvingRef.current) return;
    resolvingRef.current = true;
    setResolving(true);
    try {
      await contentReviewAdminApi.resolve(kind, approveTarget.id, {
        approved: true,
        version: approveTarget.version,
      });
      toast.success(
        kind === 'POST'
          ? 'Đã duyệt hiển thị lại bài viết.'
          : 'Đã duyệt hiển thị lại bình luận.'
      );
      setApproveTarget(null);
      cacheActions?.invalidate(['admin:audit-logs:']);
      await fetchPending();
    } catch (err) {
      if (isConflictError(err)) {
        toast.warn('Nội dung này đã được xử lý trước đó. Đang tải lại danh sách.');
        setApproveTarget(null);
        await fetchPending();
      } else {
        toast.error(err?.response?.data?.message || err?.message || 'Không thể duyệt nội dung.');
      }
    } finally {
      resolvingRef.current = false;
      if (mountedRef.current) setResolving(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget || resolvingRef.current) return;
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      setRejectError('Vui lòng nhập lý do từ chối.');
      return;
    }
    setRejectError('');
    resolvingRef.current = true;
    setResolving(true);
    try {
      await contentReviewAdminApi.resolve(kind, rejectTarget.id, {
        approved: false,
        version: rejectTarget.version,
        reason: trimmed,
      });
      toast.success(
        kind === 'POST'
          ? 'Đã gỡ bỏ bài viết vi phạm.'
          : 'Đã gỡ bỏ bình luận vi phạm.'
      );
      setRejectTarget(null);
      setRejectReason('');
      cacheActions?.invalidate(['admin:audit-logs:']);
      await fetchPending();
    } catch (err) {
      if (isConflictError(err)) {
        toast.warn('Nội dung này đã được xử lý trước đó. Đang tải lại danh sách.');
        setRejectTarget(null);
        setRejectReason('');
        await fetchPending();
      } else {
        toast.error(err?.response?.data?.message || err?.message || 'Không thể gỡ nội dung.');
      }
    } finally {
      resolvingRef.current = false;
      if (mountedRef.current) setResolving(false);
    }
  };

  const columns = [
    {
      header: 'Nội dung bị ẩn',
      render: (row) => (
        <p className="text-sm text-[#1F2A37] whitespace-pre-wrap break-words max-w-xl">
          {row.content || '—'}
        </p>
      ),
    },
    {
      header: 'Đối tượng',
      render: (row) => (
        <div className="space-y-1 text-xs">
          <div className="font-mono font-semibold text-[#1F2A37] break-all">{row.id}</div>
          {kind === 'COMMENT' && (
            <div className="text-[#5B6776] break-all">Bài viết: {row.postId || '—'}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Thời gian tạo',
      render: (row) => (
        <span className="text-xs text-[#5B6776] whitespace-nowrap">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      header: 'Trạng thái',
      render: () => <Badge variant="warning">Đang ẩn · Chờ duyệt</Badge>,
    },
    {
      header: 'Thao tác',
      render: (row) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Button
            size="sm"
            variant="primary"
            onClick={() => setApproveTarget(row)}
          >
            Duyệt hiển thị
          </Button>
          <Button
            size="sm"
            variant="danger-outline"
            onClick={() => openRejectModal(row)}
          >
            Gỡ vi phạm
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white p-6 rounded-xl border border-[#DDE5D9] space-y-4">
        <div className="p-3.5 rounded-xl bg-[#F6F9F4] border border-[#006B2C]/20 text-xs text-[#1F2A37] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="space-y-1">
            <div className="font-semibold text-[#006B2C]">Quy tắc tách luồng kiểm duyệt</div>
            <p>
              <strong>Từ vi phạm (Bài viết / Bình luận):</strong> Tự động ẩn và chuyển sang chờ Admin xử lý.{' '}
              <strong>Chat:</strong> Tự động che <strong>***</strong> các từ nhạy cảm để giữ luồng trò chuyện mượt mà.
            </p>
          </div>
          <Link
            to="/admin/violation-words"
            className="text-[#006B2C] font-semibold hover:underline shrink-0"
          >
            Quản lý từ ngữ vi phạm →
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((tab) => {
              const active = kind === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleSelectKind(tab.key)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
                    active
                      ? 'bg-[#006B2C] text-white shadow-sm'
                      : 'bg-white text-[#5B6776] border border-[#DDE5D9] hover:bg-[#F6F9F4] hover:text-[#1F2A37]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
            {totalElements > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]">
                {totalElements} mục chờ duyệt
              </span>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={loading}
            onClick={fetchPending}
            className="whitespace-nowrap"
          >
            Tải lại
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/30 text-sm text-[#D92D20] flex items-center justify-between gap-3"
        >
          <span>{error}</span>
          <Button type="button" variant="secondary" size="sm" onClick={fetchPending}>
            Thử lại
          </Button>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border border-[#DDE5D9] space-y-3">
        <Table
          columns={columns}
          data={items}
          loading={loading}
          emptyMessage={
            kind === 'POST'
              ? 'Không có bài viết vi phạm nào đang chờ duyệt.'
              : 'Không có bình luận vi phạm nào đang chờ duyệt.'
          }
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

      {/* Modal xác nhận duyệt hiển thị */}
      <Modal
        isOpen={Boolean(approveTarget)}
        onClose={() => !resolving && setApproveTarget(null)}
        title="Duyệt hiển thị nội dung"
        size="sm"
      >
        <div className="space-y-4 text-sm text-[#1F2A37]">
          <p>
            Xác nhận nội dung này không vi phạm và cho phép hiển thị công khai trở lại?
          </p>
          {approveTarget?.content && (
            <div className="p-3 rounded-xl bg-[#F6F9F4] border border-[#DDE5D9] text-xs whitespace-pre-wrap break-words">
              {approveTarget.content}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={resolving}
              onClick={() => setApproveTarget(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={resolving}
              disabled={resolving}
              onClick={handleConfirmApprove}
            >
              Xác nhận duyệt
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal gỡ bỏ nội dung vi phạm */}
      <Modal
        isOpen={Boolean(rejectTarget)}
        onClose={() => !resolving && setRejectTarget(null)}
        title="Gỡ nội dung vi phạm"
        size="md"
      >
        <div className="space-y-4 text-sm text-[#1F2A37]">
          <p className="text-xs text-[#5B6776]">
            Nội dung bị gỡ sẽ chuyển sang trạng thái REMOVED và không hiển thị công khai.
          </p>
          {rejectTarget?.content && (
            <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/20 text-xs whitespace-pre-wrap break-words">
              {rejectTarget.content}
            </div>
          )}
          <div>
            <label htmlFor="cr-reject-reason" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
              Lý do gỡ bỏ <span className="text-[#D92D20]">*</span>
            </label>
            <textarea
              id="cr-reject-reason"
              rows={3}
              value={rejectReason}
              disabled={resolving}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (rejectError) setRejectError('');
              }}
              placeholder="Ví dụ: Chứa từ ngữ thô tục / thông tin lừa đảo..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#DDE5D9] rounded-xl focus:outline-none focus:ring-2 focus:border-[#006B2C] focus:ring-[#006B2C]/15 text-[#1F2A37]"
            />
            {rejectError && (
              <p className="mt-1.5 text-xs text-[#D92D20] font-medium">{rejectError}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={resolving}
              onClick={() => setRejectTarget(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={resolving}
              disabled={resolving}
              onClick={handleConfirmReject}
            >
              Xác nhận gỡ
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
