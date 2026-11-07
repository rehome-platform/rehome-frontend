import React, { useState, useRef, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext.jsx';
import NotificationDropdown from './NotificationDropdown.jsx';

export default function NotificationBell({ userRole, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const notificationCtx = useNotification();
  const unreadCount = notificationCtx?.unreadCount || 0;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Bell Button */}
      <button
        type="button"
        aria-label="Thông báo"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={toggleDropdown}
        className="relative p-2 rounded-xl text-[#414942] hover:bg-[#F0F5EE] hover:text-[#006B2C] transition-colors focus:outline-none focus:ring-2 focus:ring-[#006B2C]/30 flex items-center justify-center"
      >
        <span className="material-symbols-outlined text-2xl leading-none">
          notifications
        </span>

        {/* Count Badge */}
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#FEA619] text-[#1F2A37] text-[10px] font-bold rounded-full font-sans flex items-center justify-center border-2 border-white leading-none shadow-sm"
          >
            {badgeText}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50">
          <NotificationDropdown
            onClose={() => setIsOpen(false)}
            userRole={userRole}
          />
        </div>
      )}
    </div>
  );
}
