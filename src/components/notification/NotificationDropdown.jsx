import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useNotification } from '../../context/NotificationContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { resolveNotificationUrl } from '../../utils/notificationNavigator.js';
import { formatDateTime } from '../../utils/formatters.js';

gsap.registerPlugin(useGSAP);

export default function NotificationDropdown({ onClose, userRole, className = '' }) {
  const navigate = useNavigate();
  const notificationCtx = useNotification();
  let authUser = null;
  try {
    const auth = useAuth();
    authUser = auth?.user;
  } catch {
    // If rendered outside AuthProvider
  }

  const role = userRole || authUser?.role || 'moderator';
  const containerRef = useRef(null);

  const notifications = notificationCtx?.notifications || [];
  const unreadCount = notificationCtx?.unreadCount || 0;
  const hasMore = notificationCtx?.hasMore || false;
  const loadingMore = notificationCtx?.loadingMore || false;
  const markAsRead = notificationCtx?.markAsRead;
  const markAllAsRead = notificationCtx?.markAllAsRead;
  const loadMoreNotifications = notificationCtx?.loadMoreNotifications;

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'

  useGSAP(
    () => {
      if (containerRef.current) {
        gsap.from(containerRef.current, {
          opacity: 0,
          y: -10,
          scale: 0.98,
          duration: 0.2,
          ease: 'power2.out',
        });
      }
    },
    { scope: containerRef }
  );

  const filteredNotifications =
    activeTab === 'unread'
      ? notifications.filter((item) => !item.isRead && !item.read)
      : notifications;

  const handleItemClick = (item) => {
    if (!item.isRead && !item.read && markAsRead) {
      markAsRead(item.id);
    }
    const targetUrl = resolveNotificationUrl(item, role);
    if (targetUrl) {
      navigate(targetUrl);
    }
    if (onClose) {
      onClose();
    }
  };

  const handleMarkAll = async (e) => {
    e.stopPropagation();
    if (markAllAsRead) {
      await markAllAsRead();
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid="notification-dropdown"
      className={`w-80 sm:w-96 bg-white border border-[#DDE5D9] rounded-2xl shadow-xl font-sans overflow-hidden z-50 text-[#1F2A37] flex flex-col ${className}`}
      role="region"
      aria-label="Hộp thoại thông báo"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#E2E8E0] flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-base text-[#1F2A37]">Thông báo</h3>
          {unreadCount > 0 && (
            <span className="text-xs font-semibold text-[#006B2C] bg-[#E8F5E9] px-2 py-0.5 rounded-full">
              ({unreadCount})
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleMarkAll}
          className="text-xs font-medium text-[#006B2C] hover:text-[#005221] hover:underline transition-colors"
        >
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Bộ lọc thông báo"
        className="flex border-b border-[#E2E8E0] px-4 bg-[#FAFCF9] text-xs font-semibold"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
          className={`py-2.5 px-3 border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-[#006B2C] text-[#006B2C]'
              : 'border-transparent text-[#586776] hover:text-[#1F2A37]'
          }`}
        >
          Tất cả
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'unread'}
          onClick={() => setActiveTab('unread')}
          className={`py-2.5 px-3 border-b-2 transition-colors ${
            activeTab === 'unread'
              ? 'border-[#006B2C] text-[#006B2C]'
              : 'border-transparent text-[#586776] hover:text-[#1F2A37]'
          }`}
        >
          Chưa đọc
        </button>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-[#E2E8E0]">
        {filteredNotifications.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <span className="material-symbols-outlined text-4xl text-[#717971] mb-2 block">
              notifications_off
            </span>
            <p className="text-sm font-medium text-[#586776]">
              {activeTab === 'unread'
                ? 'Không có thông báo chưa đọc'
                : 'Không có thông báo nào'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isUnread = !item.isRead && !item.read;
            return (
              <div
                key={item.id}
                data-testid={`notification-item-${item.id}`}
                onClick={() => handleItemClick(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleItemClick(item);
                  }
                }}
                role="button"
                tabIndex={0}
                className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 hover:bg-[#F0F5EE] text-left focus:outline-none ${
                  isUnread ? 'bg-[#F6F9F4]' : 'bg-white'
                }`}
              >
                {/* Unread indicator / icon */}
                <div className="relative shrink-0 mt-0.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isUnread
                        ? 'bg-[#E8F5E9] text-[#006B2C]'
                        : 'bg-[#F0F2EE] text-[#586776]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      notifications
                    </span>
                  </div>
                  {isUnread && (
                    <span
                      aria-label="Chưa đọc"
                      className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#FEA619] border-2 border-white"
                    />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4
                      className={`text-xs truncate ${
                        isUnread
                          ? 'font-bold text-[#1F2A37]'
                          : 'font-semibold text-[#1F2A37]'
                      }`}
                    >
                      {item.title || 'Thông báo'}
                    </h4>
                  </div>
                  <p className="text-xs text-[#586776] line-clamp-2 mt-0.5 leading-relaxed">
                    {item.message}
                  </p>
                  {item.createdAt && (
                    <span className="text-[10px] text-[#586776] mt-1 block">
                      {formatDateTime(item.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer / Load More */}
      {hasMore && (
        <div className="p-2.5 border-t border-[#E2E8E0] bg-[#FAFCF9] text-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => loadMoreNotifications && loadMoreNotifications()}
            className="w-full py-1.5 px-3 text-xs font-semibold text-[#006B2C] hover:bg-[#E8F5E9] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {loadingMore ? 'Đang tải...' : 'Tải thêm'}
          </button>
        </div>
      )}
    </div>
  );
}
