import React from 'react';

export default function Badge({
  children,
  variant = 'default', // 'default' | 'success' | 'warning' | 'danger' | 'info'
  size = 'md',
  className = '',
}) {
  const variants = {
    default: 'bg-[#F6F9F4] text-[#5B6776] border-[#DDE5D9]',
    success: 'bg-[#006B2C]/10 text-[#006B2C] border-[#006B2C]/20',
    warning: 'bg-[#FEA619] text-[#1F2A37] border-[#FEA619]',
    secondary: 'bg-[#FEA619] text-[#1F2A37] border-[#FEA619]',
    danger: 'bg-[#D92D20]/10 text-[#D92D20] border-[#D92D20]/20',
    info: 'bg-[#00685F]/10 text-[#00685F] border-[#00685F]/20',
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
