import React, { useState, useRef, useEffect } from 'react';

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
        <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md bg-surface-container-lowest shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-outline-variant py-1">
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="block w-full px-4 py-2 text-left text-sm text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40"
              disabled={item.disabled}
              onClick={() => {
                if (item.onClick) item.onClick();
                setIsOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
