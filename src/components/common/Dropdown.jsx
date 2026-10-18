import React, { useState, useRef, useEffect } from 'react';

/**
 * ReHome Dropdown Component
 * Hỗ trợ item với icon, divider, variant nguy hiểm (danger) và bo góc 12px
 */
export default function Dropdown({ trigger, items = [], className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-60 origin-top-right rounded-xl bg-white shadow-card border border-[#DDE5D9] py-1.5 focus:outline-none animate-fadeIn">
          {items.map((item, idx) => {
            if (item.divider) {
              return <div key={idx} className="my-1 border-t border-[#DDE5D9]" />;
            }

            return (
              <button
                key={idx}
                type="button"
                className={`flex items-center gap-2.5 w-full px-3.5 py-2 text-left text-xs font-semibold transition-colors disabled:opacity-40 ${
                  item.danger
                    ? 'text-[#D92D20] hover:bg-[#FFF5F5]'
                    : 'text-[#1F2A37] hover:bg-[#F6F9F4] hover:text-[#006B2C]'
                }`}
                disabled={item.disabled}
                onClick={() => {
                  if (item.onClick) item.onClick();
                  setIsOpen(false);
                }}
              >
                {item.icon && (
                  <span
                    className={`material-symbols-outlined text-base ${
                      item.danger ? 'text-[#D92D20]' : 'text-[#5B6776]'
                    }`}
                  >
                    {item.icon}
                  </span>
                )}
                <span className="flex-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
