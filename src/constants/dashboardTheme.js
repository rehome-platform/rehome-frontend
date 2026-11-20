// Hệ màu sắc ngữ nghĩa dùng chung cho cả Admin Dashboard và Moderator Dashboard.
// Đồng bộ 100% theo Design Tokens ReHome:
// Primary #006B2C | Accent #00685F | Secondary/Warning #B54708 | Danger #B42318 | Surface #FFFFFF | Background #F6F9F4 | Border #DDE5D9

export const DASHBOARD_TONES = {
  primary: {
    iconBox: 'bg-[#ECFDF3] text-[#006B2C] border border-[#ABEFC6]',
    badge: 'bg-[#ECFDF3] text-[#006B2C] border border-[#ABEFC6]',
    dot: 'bg-[#006B2C]',
  },
  accent: {
    iconBox: 'bg-[#E0F2F1] text-[#00685F] border border-[#99D5CF]',
    badge: 'bg-[#E0F2F1] text-[#00685F] border border-[#99D5CF]',
    dot: 'bg-[#00685F]',
  },
  warning: {
    iconBox: 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]',
    badge: 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]',
    dot: 'bg-[#FEA619]',
  },
  danger: {
    iconBox: 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]',
    badge: 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]',
    dot: 'bg-[#D92D20]',
  },
  neutral: {
    iconBox: 'bg-[#F6F9F4] text-[#5B6776] border border-[#DDE5D9]',
    badge: 'bg-[#F6F9F4] text-[#5B6776] border border-[#DDE5D9]',
    dot: 'bg-[#5B6776]',
  },
};

export const DASHBOARD_CARD_CLASS =
  'bg-white rounded-2xl border border-[#DDE5D9] shadow-card transition-all duration-200 hover:border-[#006B2C]/40 hover:shadow-card-hover';
