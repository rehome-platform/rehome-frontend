import React, { useRef, useCallback } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const Button = React.forwardRef(function Button(
  {
    children,
    variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'warning' | 'accent' | 'danger' | 'ghost'
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
  const buttonRef = useRef(null);
  const spinnerRef = useRef(null);
  const isDisabled = disabled || loading;

  const setRefs = useCallback(
    (node) => {
      buttonRef.current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef]
  );

  const { contextSafe } = useGSAP(
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return undefined;
      }
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (loading && spinnerRef.current) {
          gsap.fromTo(
            spinnerRef.current,
            { scale: 0.6, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.18, ease: 'back.out(1.7)', clearProps: 'transform,opacity' }
          );
        }
      });
      return () => mm.revert();
    },
    { scope: buttonRef, dependencies: [loading] }
  );

  const prefersAnimatedMotion = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

  const handlePointerDown = contextSafe((event) => {
    if (!isDisabled && buttonRef.current && prefersAnimatedMotion()) {
      gsap.to(buttonRef.current, {
        scale: 0.97,
        duration: 0.12,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
    onPointerDown?.(event);
  });

  const handlePointerReset = contextSafe((event) => {
    if (buttonRef.current && prefersAnimatedMotion()) {
      gsap.to(buttonRef.current, {
        scale: 1,
        duration: 0.16,
        ease: 'power2.out',
        overwrite: 'auto',
        clearProps: 'transform',
      });
    }
    if (event?.type === 'pointerup') {
      onPointerUp?.(event);
    } else if (event?.type === 'pointerleave') {
      onPointerLeave?.(event);
    }
  });

  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-[background-color,border-color,color,box-shadow,opacity] duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary: 'bg-[#006B2C] text-white hover:bg-[#005523] hover:text-white focus:ring-[#006B2C]/30 shadow-sm hover:shadow',
    secondary: 'border border-[#DDE5D9] bg-white text-[#1F2A37] hover:bg-[#F6F9F4] hover:border-[#006B2C] hover:text-[#1F2A37] focus:ring-[#006B2C]/20',
    outline: 'border border-[#DDE5D9] bg-white text-[#1F2A37] hover:bg-[#F6F9F4] hover:border-[#006B2C] hover:text-[#1F2A37] focus:ring-[#006B2C]/20',
    warning: 'bg-[#FEA619] text-[#1F2A37] hover:bg-[#E59412] hover:text-[#1F2A37] focus:ring-[#FEA619]/40 shadow-sm font-bold',
    accent: 'bg-[#00685F] text-white hover:bg-[#005049] hover:text-white focus:ring-[#00685F]/30 shadow-sm',
    danger: 'bg-[#D92D20] text-white hover:bg-[#B42318] hover:text-white focus:ring-[#D92D20]/30 shadow-sm',
    ghost: 'text-[#1F2A37] hover:bg-[#F6F9F4] hover:text-[#006B2C] focus:ring-[#006B2C]/20',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-xl',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
  };

  return (
    <button
      ref={setRefs}
      type={type}
      disabled={isDisabled}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      onClick={onClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerReset}
      onPointerLeave={handlePointerReset}
      {...props}
    >
      {loading ? (
        <span
          ref={spinnerRef}
          aria-hidden="true"
          className="inline-block w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin"
        />
      ) : null}
      {children}
    </button>
  );
});

export default Button;
