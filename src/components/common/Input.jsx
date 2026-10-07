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
        <label htmlFor={inputId} className="block text-sm font-medium text-on-surface mb-1">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`w-full px-3 py-2 text-sm bg-surface-container-lowest border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error
            ? 'border-error focus:ring-error text-error'
            : 'border-outline-variant focus:border-primary focus:ring-primary text-on-surface'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs text-error">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-outline">{helperText}</p>
      ) : null}
    </div>
  );
}
