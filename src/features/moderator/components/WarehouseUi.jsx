import React, { useId } from 'react';
import '../styles/apiColors.css';
import { Link } from 'react-router-dom';
import ModeratorLayout from '../../../layouts/ModeratorLayout.jsx';
import Button from '../../../components/common/Button.jsx';
import { safeDocumentUrl } from '../models/warehouseModel.js';
import { isFixtureMode } from '../config/warehouseContract.js';

export const money = (value) =>
  value == null
    ? '—'
    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
export const date = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '—');
export function Page({ title, subtitle, children, actions, apiColors = true }) {
  return (
    <ModeratorLayout apiColors={apiColors && !isFixtureMode}>
      <div className="mx-auto max-w-6xl space-y-6">
        {isFixtureMode && (
          <div role="status" className="rounded-xl border border-secondary bg-amber-50 p-3 text-sm">
            Chế độ dữ liệu thử · không gọi backend, không xác nhận tích hợp thành công. Tải lại
            trang sẽ đặt lại dữ liệu.
          </div>
        )}
        <header className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text">{title}</h1>
            <p className="mt-2 text-sm text-textSecondary">{subtitle}</p>
          </div>
          <div className="flex gap-2 items-start">{actions}</div>
        </header>
        {children}
      </div>
    </ModeratorLayout>
  );
}
export function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-neutral bg-white p-5 space-y-4">
      {title && <h2 className="text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
const statusLabels = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
  INSPECTING: 'Đang kiểm định',
  WAITING_CONFIRMATION: 'Chờ Member xác nhận',
  STOCKED: 'Đã nhập kho',
  ON_SALE: 'Đang bán',
  RESERVED: 'Đang giữ hàng',
  SOLD: 'Đã bán',
  WITHDRAWN: 'Đã rút hàng',
  DESTROYED: 'Đã tiêu huỷ',
  WAITING_END_OF_TERM: 'Chờ xử lý cuối kỳ',
  UNCLAIMED: 'Vô thừa nhận',
  DONATED: 'Đã chuyển giao',
  RETURNED: 'Đã bàn giao',
  RETURNED_ONSITE: 'Đã trả tại chỗ',
};
export function Status({ children }) {
  return (
    <span className="inline-block rounded-full bg-background px-3 py-1 text-xs font-semibold text-accent border border-neutral">
      {statusLabels[children] || children || '—'}
    </span>
  );
}
export function ResourceState({ resource, empty = false, children }) {
  return (
    <>
      {resource.loading && <p role="status">Đang tải dữ liệu…</p>}
      {resource.error && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-error space-y-2">
          <p>
            {resource.error.code === 'CONTRACT_BLOCKED' ? 'Blocked · ' : ''}
            {resource.error.message}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              resource.clearActionError?.();
              resource.refresh();
            }}
          >
            Tải lại trạng thái
          </Button>
        </div>
      )}
      {resource.pollExpired && (
        <p role="status">
          Đã dừng tự cập nhật sau 10 phút. Dùng nút tải lại để kiểm tra trạng thái.
        </p>
      )}
      {!resource.loading && !resource.error && empty && (
        <p className="p-5 text-textSecondary">Chưa có dữ liệu phù hợp.</p>
      )}
      {children}
    </>
  );
}
export function Field({ label, error, children, ...props }) {
  const id = useId();
  const controlClass =
    'w-full rounded-xl border border-neutral bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children ? (
        React.cloneElement(children, {
          id,
          className: `${controlClass} ${children.props.className || ''}`,
          'aria-invalid': !!error,
          'aria-describedby': error ? `${id}-error` : undefined,
        })
      ) : (
        <input
          id={id}
          className={controlClass}
          {...props}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-error">
          {typeof error === 'string' ? error : 'Thông tin chưa hợp lệ.'}
        </p>
      )}
    </div>
  );
}
export function MemberSummary({ member }) {
  if (!member) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-background p-3">
      {member.avatarUrl && (
        <img
          className="h-12 w-12 rounded-full object-cover"
          src={member.avatarUrl}
          alt="Ảnh Member"
        />
      )}
      <div>
        <p className="font-semibold">{member.fullName}</p>
        <p className="text-sm">
          {member.memberCode} · {member.phone}
        </p>
      </div>
    </div>
  );
}
export function Photos({ photos = [] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {photos.map((photo, index) => (
        <figure key={photo.photoId || photo.url || index} className="space-y-1">
          <img
            className="h-32 w-28 rounded-xl object-cover border border-neutral"
            src={typeof photo === 'string' ? photo : photo.url}
            alt={`Ảnh sản phẩm ${index + 1}`}
          />
          {photo.status && (
            <figcaption className="text-xs">
              {photo.status === 'DONE'
                ? 'Đã tách nền'
                : photo.status === 'FAILED'
                  ? 'Tách nền thất bại'
                  : photo.status === 'PROCESSING'
                    ? 'Đang tách nền'
                    : 'Ảnh gốc'}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
export function DocumentLink({ url, children = 'Mở PDF' }) {
  const safe = safeDocumentUrl(url);
  return safe ? (
    <a
      className="inline-block text-primary underline font-semibold"
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ) : (
    <p className="text-sm text-textSecondary">
      Chưa có PDF hợp lệ. Hãy tải lại dữ liệu nếu liên kết hết hạn.
    </p>
  );
}
export function Pager({ page, totalPages = 1, onChange }) {
  return (
    <nav aria-label="Phân trang" className="flex justify-end items-center gap-3">
      <Button variant="outline" disabled={page <= 0} onClick={() => onChange(page - 1)}>
        Trước
      </Button>
      <span className="text-sm">
        Trang {page + 1}/{Math.max(1, totalPages)}
      </span>
      <Button
        variant="outline"
        disabled={page + 1 >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Sau
      </Button>
    </nav>
  );
}
export function DetailLink({ formId }) {
  return (
    <Link
      className="text-primary underline"
      to={`/moderator/consignments/${encodeURIComponent(formId)}`}
    >
      Mở chi tiết
    </Link>
  );
}
