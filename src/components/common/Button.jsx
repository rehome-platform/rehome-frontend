import React from 'react';

const Button = React.forwardRef(function Button(
  {
    children,
    variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'warning' | 'accent' | 'danger' | 'danger-outline' | 'danger-ghost' | 'ghost'
    size = 'md', // 'sm' | 'md' | 'lg'
    disabled = false,
    loading = false,
    type = 'button',
    className = '',
    onClick,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    ...props
  },
  forwardedRef
) {
  const isDisabled = disabled || loading;

  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 enabled:motion-safe:active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary: 'bg-[#006B2C] text-white hover:bg-[#005523] hover:text-white focus:ring-[#006B2C]/30 shadow-sm hover:shadow',
    secondary: 'border border-[#DDE5D9] bg-[#EBF1E8] text-[#1F2A37] hover:bg-[#DDE5D9] hover:text-[#1F2A37] focus:ring-[#006B2C]/20',
    outline: 'border border-[#DDE5D9] bg-white text-[#1F2A37] hover:bg-[#F6F9F4] hover:border-[#006B2C] hover:text-[#1F2A37] focus:ring-[#006B2C]/20',
    warning: 'bg-[#FEA619] text-[#1F2A37] hover:bg-[#E59412] hover:text-[#1F2A37] focus:ring-[#FEA619]/40 shadow-sm font-bold',
    accent: 'bg-[#00685F] text-white hover:bg-[#005049] hover:text-white focus:ring-[#00685F]/30 shadow-sm',
    danger: 'bg-[#D92D20] text-white hover:bg-[#B42318] hover:text-white focus:ring-[#D92D20]/30 shadow-sm',
    'danger-outline': 'border border-[#D92D20] bg-white text-[#D92D20] hover:bg-[#FEF3F2] hover:border-[#B42318] hover:text-[#B42318] focus:ring-[#D92D20]/25',
    'danger-ghost': 'text-[#D92D20] hover:bg-[#FEF3F2] hover:text-[#B42318] focus:ring-[#D92D20]/25',
    ghost: 'text-[#1F2A37] hover:bg-[#F6F9F4] hover:text-[#006B2C] focus:ring-[#006B2C]/20',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-xl',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
  };

  return (
    <button
      ref={forwardedRef}
      type={type}
      disabled={isDisabled}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="inline-block w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin"
        />
      ) : null}
      {children}
    </button>
  );
});

export default Button;
