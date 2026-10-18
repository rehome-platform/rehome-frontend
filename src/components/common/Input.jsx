import React from 'react';

export default function Input({
  label,
  error,
  helperText,
  id,
  type = 'text',
  className = '',
  required = false,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full mb-3">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
          {label} {required && <span className="text-[#D92D20]">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all ${
          error
            ? 'border-[#D92D20] bg-[#FFF5F5] focus:ring-[#D92D20]/20 text-[#D92D20]'
            : 'border-[#DDE5D9] hover:border-[#006B2C]/50 focus:border-[#006B2C] focus:ring-[#006B2C]/15 text-[#1F2A37]'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-[#D92D20] flex items-center gap-1 font-medium">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-[#5B6776]">{helperText}</p>
      ) : null}
    </div>
  );
}
