import React from 'react';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  disabled = false,
  loading = false,
  type = 'button',
  className = '',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.99]';

  const variants = {
    primary: 'bg-[#006B2C] text-white hover:bg-[#005523] focus:ring-[#006B2C]/30 shadow-sm hover:shadow',
    secondary: 'bg-[#FEA619] text-[#1F2A37] hover:bg-[#E59412] focus:ring-[#FEA619]/40 shadow-sm font-bold',
    accent: 'bg-[#00685F] text-white hover:bg-[#005049] focus:ring-[#00685F]/30 shadow-sm',
    outline: 'border border-[#DDE5D9] bg-white text-[#1F2A37] hover:bg-[#F6F9F4] hover:border-[#006B2C] focus:ring-[#006B2C]/20',
    danger: 'bg-[#D92D20] text-white hover:bg-[#B42318] focus:ring-[#D92D20]/30 shadow-sm',
    ghost: 'text-[#1F2A37] hover:bg-[#F6F9F4] hover:text-[#006B2C] focus:ring-[#006B2C]/20',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
      ) : null}
      {children}
    </button>
  );
}
