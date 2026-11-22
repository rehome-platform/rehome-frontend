/**
 * Hằng số & Nội dung thuyết phục cho Trang Tiếp thị / Trang đích ReHome
 */

export const APK_DOWNLOAD_URL =
  'https://drive.google.com/drive/folders/1xsiXdvUgKbQrpz1L3QMzbSZwEiSIQ-OK?usp=drive_link';

export const APP_METADATA = {
  name: 'ReHome',
  version: '1.0.1',
  packageName: 'com.rehome.mobile',
  minAndroid: 'Android 8.0+',
  platform: 'Android APK',
  distributionLabel: 'Google Drive chính thức',
};

export const NAV_LINKS = [
  { href: '#explore', label: 'Khám phá' },
  { href: '#about', label: 'Cách hoạt động' },
  { href: '#compare', label: 'So sánh' },
];

export const LANDING_NAV_ITEMS = [
  { id: 'drops', type: 'anchor', href: '#drops', label: 'Đồ mới về' },
  { id: 'inspection', type: 'modal', modalTab: 'inspection', label: 'Kiểm định' },
  { id: 'consignment', type: 'modal', modalTab: 'consignment', label: 'Ký gửi 90%' },
  { id: 'install', type: 'modal', modalTab: 'install', label: 'Cài APK' },
  { id: 'policy', type: 'modal', modalTab: 'policy', label: 'Bảo mật' },
];

export const HERO_COPY = {
  tagline: 'Tủ đồ cũ của người khác... vừa khít với bạn qua camera.',
};

export const HERO_STORY_SLIDES = [
  {
    id: 'tryon',
    label: 'Live Try-On',
    badge: 'LIVE TRY-ON',
    metric: '96% hợp dáng',
    caption: 'Ướm trực tiếp lên dáng thật',
  },
  {
    id: 'verified',
    label: 'Đồ kiểm định',
    badge: 'SKU VERIFIED',
    metric: 'Như mới 99%',
    caption: 'Kiểm định 6 bước tại kho',
  },
  {
    id: 'payout',
    label: 'Nhận 90%',
    badge: 'VÍ REHOME',
    metric: '+450.000₫',
    caption: 'Tiền ký gửi 90% vừa về ví',
  },
];

export const CURIOSITY_CARDS = [
  {
    id: 'verify',
    title: 'Kiểm định 6 bước',
    desc: 'Kiểm tra thực tế tại kho và dán tem SKU chuẩn.',
    modalTab: 'inspection',
    visual: 'shield',
  },
  {
    id: 'consign',
    title: 'Ký gửi nhận 90%',
    desc: 'Gửi đồ tới kho — ReHome chụp ảnh & bán hộ A–Z.',
    modalTab: 'consignment',
    visual: 'bag',
  },
  {
    id: 'install',
    title: 'Cài APK trong 30 giây',
    desc: 'Tải bản Android từ Google Drive, cài trong 4 chạm.',
    modalTab: 'install',
    visual: 'install',
  },
  {
    id: 'charity',
    title: 'Thiện nguyện & Bảo mật',
    desc: 'Trao đồ tới tổ chức xác minh, đổi trả trong 3 ngày.',
    modalTab: 'policy',
    visual: 'charity',
  },
];

export const TRYON_SLOT_LABELS = {
  TOP: 'Áo • Thử đồ AI',
  BOTTOM: 'Quần/Váy • Thử đồ AI',
  DRESS: 'Đầm • Thử đồ AI',
};

export const AI_OUTFIT_COMBOS = [
  {
    id: 'office',
    label: 'Thanh lịch',
    modelType: 'Nữ',
    matchScore: '96%',
    top: { name: 'Áo sơ mi Zara trắng tay dài', tag: 'Slot Áo (TOP)', price: 220000 },
    bottom: { name: 'Quần kaki Uniqlo be ống đứng', tag: 'AI gợi ý (BOTTOM)', price: 245000 },
    styleNote:
      'AI cân đối phom suông và tông trắng–be trung tính, tôn dáng gọn gàng đi làm hoặc gặp đối tác.',
  },
  {
    id: 'weekend',
    label: 'Năng động',
    modelType: 'Nam',
    matchScore: '94%',
    top: { name: 'Áo khoác gió Nike xanh đen', tag: 'Slot Áo (TOP)', price: 380000 },
    bottom: { name: 'Quần jeans Levi’s 501 ống đứng', tag: 'AI gợi ý (BOTTOM)', price: 420000 },
    styleNote:
      'Kết hợp áo khoác dáng thể thao với denim ống đứng giúp giữ phom năng động cho cuối tuần.',
  },
  {
    id: 'minimal',
    label: 'Tối giản',
    modelType: 'Nữ',
    matchScore: '97%',
    top: { name: 'Áo thun Uniqlo cotton trắng trơn', tag: 'Slot Áo (TOP)', price: 165000 },
    bottom: { name: 'Đầm / Chân váy midi linen', tag: 'AI gợi ý đồng bộ', price: 260000 },
    styleNote:
      'Tối ưu tỷ lệ thân trên–dưới với chất liệu thoáng nhẹ, mặc thử một chạm trên mẫu cá nhân.',
  },
];

export const INSPECTION_GRADES = [
  { label: 'Mới còn tem (100%)', desc: 'Còn nguyên tem mác, chưa qua sử dụng' },
  { label: 'Như mới (99%)', desc: 'Sạch đẹp hoàn hảo, không vết bẩn hay sờn' },
  { label: 'Tốt (90–95%)', desc: 'Đã dùng nhẹ, giữ phom dáng và chất vải chuẩn' },
  { label: 'Có lỗi nhỏ (80–85%)', desc: 'Ghi chú minh bạch từng chi tiết trước khi lên sàn' },
];

export const INSPECTION_CHECKLIST = [
  'Đường may, phom dáng & chất liệu vải',
  'Khóa kéo, cúc bấm & phụ kiện đi kèm',
  'Độ sạch, mùi hương & xử lý vệ sinh kho',
  'Xếp hạng tình trạng 4 cấp minh bạch',
  'Chụp ảnh chuẩn sáng & gắn slot Thử đồ AI',
  'Dán tem SKU riêng & lập biên nhận điện tử',
];

export const CONSIGN_EARNING_PRESETS = [250000, 500000, 1000000];

export const BUYER_VOUCHER_PERKS = [
  {
    id: 'welcome',
    tag: 'Đơn đầu tiên',
    title: 'Voucher chào bạn mới',
    desc: 'Giảm trực tiếp khi đặt món kiểm định đầu tiên trên App.',
  },
  {
    id: 'freeship',
    tag: 'Tiết kiệm phí giao',
    title: 'Mã Freeship 1 chạm',
    desc: 'Lưu nhanh trong Kho Voucher, áp dụng tự động khi chốt đơn.',
  },
  {
    id: 'vip-stack',
    tag: 'Đặc quyền VIP',
    title: 'Ưu đãi định kỳ theo hạng',
    desc: 'Nhận mã giảm hàng tháng dành riêng cho thành viên ReHome.',
  },
];

export const CITY_COORDS_PRESETS = [
  { id: 'hcm', label: 'TP. Hồ Chí Minh', lat: 10.7769, lng: 106.7009 },
  { id: 'hn', label: 'Hà Nội', lat: 21.0285, lng: 105.8542 },
  { id: 'dn', label: 'Đà Nẵng', lat: 16.0544, lng: 108.2022 },
];

export const TRUST_PILLARS = [
  {
    id: 'ai-tryon',
    icon: 'sparkles',
    title: '1. Thử Đồ AI & Live Try-On',
    description:
      'Ướm thử trực tiếp qua camera realtime hoặc để AI tự phối nguyên set chuẩn dáng Nữ/Nam trước khi chốt đơn.',
    modalTab: 'about',
  },
  {
    id: 'warehouse-verify',
    icon: 'shield',
    title: '2. Kiểm Định 6 Bước Tại Kho',
    description:
      'Chuyên viên kiểm tra chất vải, đường may, vệ sinh kho, xếp hạng 4 cấp độ mới và dán tem SKU chống tráo.',
    modalTab: 'inspection',
  },
  {
    id: 'transparent-wallet',
    icon: 'lock',
    title: '3. Ký Gửi 90% & Ví Minh Bạch',
    description:
      'Người bán nhận tới 90% giá bán khi giao dịch thành công. Người mua được đổi trả 3 ngày và bảo vệ thanh toán.',
    modalTab: 'consignment',
  },
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: '1',
    title: 'Mang Đồ Tới Kho Gần Nhất',
    description: 'Đem đồ tới điểm kho gợi ý, không cần tự chụp.',
  },
  {
    step: '2',
    title: 'Kiểm Định & Gắn Slot AI',
    description: 'Kiểm tra 6 bước, định giá công khai và chụp ảnh chuẩn.',
  },
  {
    step: '3',
    title: 'Thử Đồ AI & Chốt Đơn',
    description: 'Thử qua camera hoặc AI phối bộ trước khi thanh toán.',
  },
  {
    step: '4',
    title: 'Nhận 90% Hoặc Quyên Góp',
    description: 'Nhận 90% về Ví hoặc chuyển thiện nguyện 1 chạm.',
  },
];

export const COMPARISON_ROWS = [
  {
    criterion: 'Thử đồ trước khi mua',
    rehome: { type: 'positive', text: 'Live Try-On Camera & AI phối bộ' },
    facebook: { type: 'negative', text: 'Không thể thử trước' },
    classifieds: { type: 'warning', text: 'Chỉ xem ảnh tĩnh 2D' },
  },
  {
    criterion: 'Kiểm định chất lượng',
    rehome: { type: 'positive', text: 'Kiểm định 6 bước & dán tem SKU' },
    facebook: { type: 'negative', text: 'Tự kiểm tra rủi ro lỗi ẩn' },
    classifieds: { type: 'negative', text: 'Không kiểm định thực tế' },
  },
  {
    criterion: 'Quy trình bán & ký gửi',
    rehome: { type: 'positive', text: 'Kho lo A–Z, nhận 90% về Ví' },
    facebook: { type: 'negative', text: 'Tự chụp, trả giá mất thời gian' },
    classifieds: { type: 'warning', text: 'Tự đăng bán & tự giao hàng' },
  },
  {
    criterion: 'Xử lý đồ tồn & cộng đồng',
    rehome: { type: 'positive', text: 'Chuyển thiện nguyện 1 chạm' },
    facebook: { type: 'negative', text: 'Bỏ xó hoặc vứt bỏ lãng phí' },
    classifieds: { type: 'warning', text: 'Tự tìm đầu mối quyên góp' },
  },
];

export const FOOTER_TRUST_ITEMS = [
  {
    id: 'verify',
    icon: 'shield',
    tone: 'emerald',
    title: '100% Kiểm Định Kho',
    subtitle: '6 tiêu chí & phân hạng 4 cấp độ mới',
  },
  {
    id: 'ai',
    icon: 'sparkles',
    tone: 'gold',
    title: '2 Chế Độ Thử Đồ AI',
    subtitle: 'Live Try-On Camera & AI tự phối set',
  },
  {
    id: 'consign',
    icon: 'bag',
    tone: 'teal',
    title: 'Ký Gửi Nhận 90%',
    subtitle: 'Kho chụp ảnh, bán hộ & chuyển Ví',
  },
  {
    id: 'charity',
    icon: 'heart',
    tone: 'amber',
    title: 'Thiện Nguyện Minh Bạch',
    subtitle: '100% tổ chức đối tác đã xác minh',
  },
];

export const FOOTER_CONTACT = {
  hotline: '1900 6868 (8:00 - 21:00)',
  email: 'support@rehome.vn',
  address: 'Hệ thống điểm kho tại TP.HCM · Hà Nội · Đà Nẵng',
};

export const INFO_MODAL_TABS = [
  { id: 'about', label: 'Giới thiệu ReHome' },
  { id: 'inspection', label: 'Kiểm định 6 bước' },
  { id: 'consignment', label: 'Quy chế ký gửi' },
  { id: 'install', label: 'Cài đặt APK' },
  { id: 'policy', label: 'Chính sách & Bảo mật' },
];

export const ECOSYSTEM_ROLES = [
  {
    role: 'Người mua sành điệu',
    highlight: 'Live Try-On & AI Phối đồ',
    summary: 'Thử qua camera thời gian thực, ghép bộ 96% hợp gu, săn đồ hiệu 100% đã kiểm định.',
  },
  {
    role: 'Người ký gửi thông minh',
    highlight: 'Nhận tới 90% giá bán',
    summary: 'App gợi ý điểm kho gần nhất, thương lượng giá công bằng tại quầy, bán tự động 30 ngày.',
  },
  {
    role: 'Tổ chức thiện nguyện',
    highlight: 'Xác minh pháp lý 100%',
    summary: 'Mở chiến dịch rõ món cần, nhận quyên góp tại kho ReHome hoặc điểm nhận chính thức.',
  },
];

export const INSTALL_STEPS = [
  {
    step: '01',
    title: 'Tải tệp APK từ Google Drive',
    description: 'Mở link Google Drive trên Android và tải tệp .apk bản mới nhất.',
  },
  {
    step: '02',
    title: 'Mở tệp vừa tải về',
    description: 'Chạm thông báo tải xong hoặc mở mục Tải xuống (Downloads) trong Files.',
  },
  {
    step: '03',
    title: 'Cấp quyền cài đặt nguồn ngoài',
    description: 'Bật "Cho phép từ nguồn này" trong Cài đặt khi Android hỏi xác nhận.',
  },
  {
    step: '04',
    title: 'Nhấn Cài đặt & trải nghiệm',
    description: 'Chọn Install, mở ReHome và đăng nhập nhanh bằng Email hoặc Google.',
  },
];
