import React from 'react';
import { Link } from 'react-router-dom';

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center space-x-2">
          <span className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">
            R
          </span>
          <span className="text-2xl font-bold font-heading text-primary">ReHome</span>
        </Link>
        {title && <h2 className="mt-4 text-2xl font-bold text-on-surface">{title}</h2>}
        {subtitle && <p className="mt-1 text-sm text-outline">{subtitle}</p>}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface-container-lowest py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-outline-variant">
          {children}
        </div>
      </div>
    </div>
  );
}
