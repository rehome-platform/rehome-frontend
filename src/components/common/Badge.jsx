import React from 'react';

export default function Badge({
  children,
  variant = 'default', // 'default' | 'success' | 'warning' | 'danger' | 'info'
  size = 'md',
  className = '',
}) {
  const variants = {
    default: 'bg-[#F2F4F7] text-[#344054] border-[#D0D5DD]',
    success: 'bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]',
    warning: 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]',
    secondary: 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]',
    danger: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]',
    info: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
    purple: 'bg-[#F4F3FF] text-[#5925DC] border-[#D9D6FE]',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variants[variant] || variants.default} ${sizes[size] || sizes.md} ${className}`}
    >
      {children}
    </span>
  );
}
