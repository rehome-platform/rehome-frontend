
import React from 'react';
import { Link } from 'react-router-dom';

const GREEN = '#286B35';
const ORANGE = '#F5B642';

export default function Logo({
  size = 'md',
  showText = true,
  className = '',
  to = '/',
  subtitle = null,
}) {
  const iconSizes = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-5xl',
  };

  const badgeRadius = {
    sm: 'rounded-xl',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-[1.5rem]',
  };

  const content = (
    <div
      className={`inline-flex items-center gap-3 select-none ${className}`}
    >
      {/* ReHome icon */}
      <div
        className={`
          ${iconSizes[size]}
          ${badgeRadius[size]}
          shrink-0 overflow-hidden
          flex items-center justify-center
          bg-[${GREEN}]
        `}
        style={{ backgroundColor: GREEN }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          aria-label="ReHome logo icon"
          role="img"
        >
          {/* Upper white circular arrow */}
          <path
            d="M19 43
               C25 22 42 15 57 18
               C69 20 78 28 83 39"
            stroke="white"
            strokeWidth="4.5"
            strokeLinecap="round"
          />

          <path
            d="M72 34 L84 43 L87 28 Z"
            fill="white"
          />

          {/* Lower orange circular arrow */}
          <path
            d="M81 56
               C76 76 58 84 42 80
               C30 77 21 68 17 57"
            stroke={ORANGE}
            strokeWidth="4.5"
            strokeLinecap="round"
          />

          <path
            d="M26 61 L15 51 L12 66 Z"
            fill={ORANGE}
          />

          {/* White T-shirt */}
          <path
            d="
              M39 34
              L33 38
              L29 45
              L35 49
              L39 45
              L39 65
              Q39 68 42 68
              L60 68
              Q63 68 63 65
              L63 45
              L67 49
              L73 45
              L69 38
              L61 34
              L56 37
              Q50 42 44 37
              Z
            "
            fill="white"
          />

          {/* Orange heart on the shirt */}
          <path
            d="
              M50 51
              C47 46 41 48 42 52
              C42 56 50 61 50 61
              C50 61 58 56 58 52
              C59 48 53 46 50 51
              Z
            "
            fill={ORANGE}
          />
        </svg>
      </div>

      {/* Brand name */}
      {showText && (
        <div className="flex flex-col">
          <span
            className={`
              ${textSizes[size]}
              font-extrabold
              tracking-tight
              leading-none
            `}
            style={{
              color: GREEN,
              fontFamily: 'Arial, Helvetica, sans-serif',
            }}
          >
            ReHome
          </span>

          {subtitle && (
            <span className="mt-1 text-[10px] sm:text-xs font-semibold text-[#5B6776] tracking-wide uppercase">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="group inline-flex items-center"
        aria-label="ReHome - Trang chủ"
      >
        {content}
      </Link>
    );
  }

  return content;
}