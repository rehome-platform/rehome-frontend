import React from 'react';
import { Link } from 'react-router-dom';

/**
 * ReHome Official Logo Component
 * Theo Design tokens.pdf:
 * "Ô vuông bo góc màu #006B2C, bên trong là áo thun trắng giữa hai mũi tên vòng, chữ ReHome bên phải."
 */
export default function Logo({
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  showText = true,
  className = '',
  to = '/',
  subtitle = null,
}) {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const badgeRadius = {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-2xl',
  };

  const content = (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Icon: Ô vuông bo góc màu #006B2C với áo thun trắng và 2 mũi tên vòng */}
      <div
        className={`${iconSizes[size]} ${badgeRadius[size]} bg-[#006B2C] flex items-center justify-center shadow-sm relative overflow-hidden shrink-0 transition-transform group-hover:scale-105`}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1.5"
        >
          {/* Circular curved arrows around t-shirt */}
          {/* Top curve */}
          <path
            d="M 14 18 C 17 11, 31 11, 34 18"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <polygon points="32,13 36,18 30,19" fill="#FFFFFF" />

          {/* Bottom curve */}
          <path
            d="M 34 30 C 31 37, 17 37, 14 30"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <polygon points="16,35 12,30 18,29" fill="#FFFFFF" />

          {/* White T-shirt in center */}
          <path
            d="M 19 19 L 22 17 C 23 18.5, 25 18.5, 26 17 L 29 19 L 27.5 22.5 L 25.8 21.8 L 25.8 30.5 L 22.2 30.5 L 22.2 21.8 L 20.5 22.5 Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span
              className={`${textSizes[size]} font-extrabold font-heading text-[#006B2C] tracking-tight leading-tight`}
            >
              ReHome
            </span>
          </div>
          {subtitle && (
            <span className="text-[10px] sm:text-xs font-semibold text-[#5B6776] tracking-wide uppercase">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="group inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
