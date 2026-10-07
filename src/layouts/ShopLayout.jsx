import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '../components/header.jsx';
import Footer from '../components/footer.jsx';
import Chat from '../components/chat.jsx';

export default function ShopLayout({ children }) {
  const location = useLocation();

  const navItems = [
    { path: '/shop', label: 'Biên nhận & Ký gửi', icon: 'receipt_long' },
    { path: '/shop/listing', label: 'Đăng bán 2 nhãn', icon: 'sell' },
    { path: '/shop/returns', label: 'Trả đồ & Tất toán', icon: 'assignment_return' },
    { path: '/wallet', label: 'Ví & Doanh thu', icon: 'account_balance_wallet' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />
      {/* Sub-navigation for Shop actor at counter */}
      <div className="bg-surface-container border-b border-outline-variant py-2 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex overflow-x-auto space-x-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      <Footer />
      <Chat />
    </div>
  );
}
