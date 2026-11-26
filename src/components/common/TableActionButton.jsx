import React from 'react';
import { Link } from 'react-router-dom';
import Button, { getButtonClasses } from './Button.jsx';

const ACTION_PRESETS = {
  view: {
    icon: 'visibility',
    label: 'Xem chi tiết',
    variant: 'outline',
  },
  edit: {
    icon: 'edit',
    label: 'Sửa',
    variant: 'outline',
  },
  delete: {
    icon: 'delete',
    label: 'Xóa',
    variant: 'danger',
  },
};

/**
 * Nút thao tác bảng dùng chung cho cả Admin và Moderator (Xem chi tiết / Sửa / Xóa).
 * Hỗ trợ prop `to` (và `state`) khi cần điều hướng bằng Link mà vẫn giữ nguyên thiết kế chuẩn.
 * Đồng bộ 100% chuẩn Design Tokens của ReHome.
 */
export default function TableActionButton({
  action = 'view',
  label,
  icon,
  variant,
  size = 'sm',
  className = '',
  children,
  to,
  state,
  ...rest
}) {
  const preset = ACTION_PRESETS[action] || ACTION_PRESETS.view;
  const resolvedIcon = icon !== undefined ? icon : preset.icon;
  const resolvedVariant = variant || preset.variant;
  const resolvedLabel = children || label || preset.label;
  const resolvedClassName = `gap-1 whitespace-nowrap ${className}`.trim();

  const innerContent = (
    <>
      {resolvedIcon && (
        <span aria-hidden="true" className="material-symbols-outlined text-sm leading-none">
          {resolvedIcon}
        </span>
      )}
      <span>{resolvedLabel}</span>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        state={state}
        className={getButtonClasses({
          variant: resolvedVariant,
          size,
          className: resolvedClassName,
        })}
        {...rest}
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <Button
      type="button"
      size={size}
      variant={resolvedVariant}
      className={resolvedClassName}
      {...rest}
    >
      {innerContent}
    </Button>
  );
}
