import React from 'react';

function ShieldSticker() {
  const shieldPath =
    'M30 29 C42 22 52 19 62 19 C72 19 82 22 94 29 C97 31 98 34 98 38 C98 63 85 83 62 93 C39 83 26 63 26 38 C26 34 27 31 30 29 Z';
  const sealPath =
    'M13.5 0 Q16.8 7 9.5 9.5 Q7 16.8 0 13.5 Q-7 16.8 -9.5 9.5 Q-16.8 7 -13.5 0 Q-16.8 -7 -9.5 -9.5 Q-7 -16.8 0 -13.5 Q7 -16.8 9.5 -9.5 Q16.8 -7 13.5 0 Z';

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 128 108"
      className="landing-diecut-svg w-[116px] h-[98px] overflow-visible select-none transition-transform duration-300 ease-out group-hover:scale-105 group-hover:-rotate-2"
    >
      <g transform="rotate(-4 62 56)">
        {/* Lớp viền cắt sticker màu trắng đồng nhất */}
        <g
          fill="#FFFFFF"
          stroke="#FFFFFF"
          strokeWidth="11"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <path d={shieldPath} />
          <g transform="translate(93 29)">
            <path d={sealPath} />
          </g>
        </g>

        {/* Khiên kiểm định xanh ReHome + dấu tích */}
        <path d={shieldPath} fill="#006B2C" />
        <path
          d="M35 35 C44 29 53 27 62 27"
          fill="none"
          stroke="#34D399"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeOpacity="0.55"
        />
        <path
          d="M46 55 L57 66 L78 44"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Huy hiệu ngôi sao vàng góc trên phải */}
        <g
          transform="translate(93 29)"
          className="origin-center transition-transform duration-300 ease-out group-hover:rotate-12 group-hover:scale-110"
        >
          <path d={sealPath} fill="#FEA619" stroke="#FFFFFF" strokeWidth="3.2" strokeLinejoin="round" />
          <path
            d="M0 -7.5 C1.2 -2.2 2.2 -1.2 7.5 0 C2.2 1.2 1.2 2.2 0 7.5 C-1.2 2.2 -2.2 1.2 -7.5 0 C-2.2 -1.2 -1.2 -2.2 0 -7.5 Z"
            fill="#0D2419"
          />
        </g>
      </g>
    </svg>
  );
}

function BagSticker() {
  const handlePath = 'M44 37 V29 C44 19 51 14 60 14 C69 14 76 19 76 29 V37';
  const bagPath =
    'M28 42 C28 37 32 34 37 34 H83 C88 34 92 37 92 42 L96 81 C97 88 92 93 85 93 H35 C28 93 23 88 24 81 Z';

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 128 108"
      className="landing-diecut-svg w-[116px] h-[98px] overflow-visible select-none transition-transform duration-300 ease-out group-hover:scale-105 group-hover:rotate-2"
    >
      <g transform="rotate(-3 60 56)">
        {/* Lớp viền cắt sticker màu trắng */}
        <g
          fill="#FFFFFF"
          stroke="#FFFFFF"
          strokeWidth="11"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <path d={handlePath} fill="none" strokeWidth="18" />
          <path d={bagPath} />
          <g transform="translate(91 74) rotate(8)">
            <rect x="-25" y="-14.5" width="50" height="29" rx="11" />
          </g>
        </g>

        {/* Quai túi xanh đậm + thân túi vàng nắng */}
        <path
          d={handlePath}
          fill="none"
          stroke="#0D2419"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path d={bagPath} fill="#FEA619" />
        <path
          d="M34 42 H86"
          fill="none"
          stroke="#FFC95C"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />
        <circle cx="44" cy="43" r="2.8" fill="#0D2419" />
        <circle cx="76" cy="43" r="2.8" fill="#0D2419" />

        {/* Thẻ giá xanh ngọc 90% */}
        <g transform="translate(91 74)">
          <g className="transition-transform duration-300 ease-out rotate-[8deg] group-hover:rotate-[15deg]">
            <rect
              x="-25"
              y="-14.5"
              width="50"
              height="29"
              rx="11"
              fill="#006B2C"
              stroke="#FFFFFF"
              strokeWidth="3.5"
            />
            <text
              x="0"
              y="0.5"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#FFFFFF"
              fontSize="14.5"
              fontWeight="800"
              fontFamily="var(--font-system), sans-serif"
            >
              90%
            </text>
          </g>
        </g>
      </g>
    </svg>
  );
}

function InstallSticker() {
  const headPath =
    'M24 56 C24 35 39 24 60 24 C81 24 96 35 96 56 C96 63 91 67 85 67 H35 C29 67 24 63 24 56 Z';

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 128 108"
      className="landing-diecut-svg w-[116px] h-[98px] overflow-visible select-none transition-transform duration-300 ease-out group-hover:scale-105 group-hover:-rotate-2"
    >
      <g transform="rotate(-3 60 55)">
        {/* Lớp viền cắt sticker màu trắng */}
        <g
          fill="#FFFFFF"
          stroke="#FFFFFF"
          strokeWidth="11"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <path d="M42 29 L34 17 M78 29 L86 17" fill="none" strokeWidth="16.5" />
          <path d={headPath} />
          <rect x="27" y="71" width="66" height="20" rx="10" />
          <circle cx="91" cy="76" r="18.5" />
        </g>

        {/* Linh vật Android bo tròn xanh ReHome */}
        <path
          d="M42 29 L34 17 M78 29 L86 17"
          fill="none"
          stroke="#006B2C"
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        <path d={headPath} fill="#006B2C" />
        <path
          d="M36 37 C44 31 52 29 60 29"
          fill="none"
          stroke="#34D399"
          strokeWidth="3"
          strokeLinecap="round"
          strokeOpacity="0.55"
        />
        <ellipse cx="45" cy="48" rx="4.2" ry="4.8" fill="#FFFFFF" />
        <ellipse cx="75" cy="48" rx="4.2" ry="4.8" fill="#FFFFFF" />
        <rect x="27" y="71" width="66" height="20" rx="10" fill="#16A34A" />

        {/* Huy hiệu tải xuống vàng nắng */}
        <g className="transition-transform duration-300 ease-out group-hover:translate-y-1">
          <circle cx="91" cy="76" r="18.5" fill="#FEA619" stroke="#FFFFFF" strokeWidth="3.5" />
          <path
            d="M91 68 V80 M85 75 L91 81 L97 75 M84 85 H98"
            fill="none"
            stroke="#0D2419"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
}

function CharitySticker() {
  const heartPath =
    'M 0 26 C -16 14 -30 3 -30 -10 C -30 -21 -21 -28 -11 -28 C -4 -28 0 -23 0 -19 C 0 -23 4 -28 11 -28 C 21 -28 30 -21 30 -10 C 30 3 16 14 0 26 Z';

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 128 108"
      className="landing-diecut-svg w-[116px] h-[98px] overflow-visible select-none transition-transform duration-300 ease-out group-hover:scale-105"
    >
      {/* Lớp viền cắt sticker màu trắng */}
      <g
        fill="#FFFFFF"
        stroke="#FFFFFF"
        strokeWidth="11"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <g transform="translate(47 57) rotate(-8)">
          <path d={heartPath} />
        </g>
        <g transform="translate(80 57) rotate(10) scale(0.92)">
          <path d={heartPath} />
        </g>
      </g>

      {/* Trái tim vàng nắng phía sau */}
      <g transform="translate(47 57)">
        <g className="transition-transform duration-300 ease-out -rotate-[8deg] group-hover:-rotate-[12deg]">
          <path d={heartPath} fill="#FEA619" />
          <path
            d="M-21 -12 C-21 -18 -16 -22 -11 -22"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeOpacity="0.65"
          />
        </g>
      </g>

      {/* Trái tim xanh ReHome đan xen phía trước */}
      <g transform="translate(80 57)">
        <g className="transition-transform duration-300 ease-out rotate-[10deg] scale-[0.92] group-hover:rotate-[14deg]">
          <path
            d={heartPath}
            fill="#006B2C"
            stroke="#FFFFFF"
            strokeWidth="3.8"
            strokeLinejoin="round"
          />
          <path
            d="M-20 -12 C-20 -18 -15 -22 -10 -22"
            fill="none"
            stroke="#34D399"
            strokeWidth="3"
            strokeLinecap="round"
            strokeOpacity="0.6"
          />
        </g>
      </g>

      {/* Điểm nhấn lấp lánh nhỏ */}
      <path
        d="M65 15 C66.1 20 67 20.9 72 22 C67 23.1 66.1 24 65 29 C63.9 24 63 23.1 58 22 C63 20.9 63.9 20 65 15 Z"
        fill="#FEA619"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinejoin="round"
        className="transition-transform duration-300 ease-out origin-center group-hover:-translate-y-0.5 group-hover:scale-110"
      />
    </svg>
  );
}

export function CardSticker({ visual }) {
  if (visual === 'shield') {
    return <ShieldSticker />;
  }
  if (visual === 'bag') {
    return <BagSticker />;
  }
  if (visual === 'install') {
    return <InstallSticker />;
  }
  return <CharitySticker />;
}
