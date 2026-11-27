/**
 * Hằng số & Nội dung cho Trang Tiếp thị / Trang đích ReHome
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

export const LANDING_NAV_ITEMS = [
  { id: 'drops', href: '#drops', label: 'Đồ mới về' },
  { id: 'experience', href: '#experience', label: 'Thử đồ AI' },
  { id: 'consignment', href: '#consignment', label: 'Ký gửi 90%' },
  { id: 'network', href: '#network', label: 'Kho & Cộng đồng' },
  { id: 'download', href: '#download', label: 'Cài APK' },
];

export const HERO_COPY = {
  eyebrow: 'Thời trang tuần hoàn · Kiểm định tại kho',
  headlineLead: 'Mặc thử qua AI.',
  headlineAccent: 'Ký gửi minh bạch, nhận 90%.',
  subtitle:
    'Nền tảng thời trang đã qua sử dụng được kiểm định 6 bước tại kho vật lý — thử trực tiếp lên dáng qua camera trước khi mua, hoặc ký gửi trọn gói để nhận 90% giá bán.',
};

export const HERO_STORY_SLIDES = [
  {
    id: 'tryon',
    label: 'Live Try-On',
    badge: 'LIVE TRY-ON',
    metric: '96% hợp dáng',
    caption: 'Ướm thử trực tiếp qua camera realtime',
  },
  {
    id: 'verified',
    label: 'Đồ kiểm định',
    badge: 'ĐÃ KIỂM ĐỊNH MÃ HÀNG HÓA',
    metric: 'Như mới 99%',
    caption: 'Kiểm định 6 bước tại kho',
  },
  {
    id: 'payout',
    label: 'Nhận 90%',
    badge: 'VÍ REHOME',
    metric: '+450.000 đ',
    caption: 'Tiền ký gửi 90% vừa về ví',
  },
];

export const AI_OUTFIT_COMBOS = [
  {
    id: 'office',
    label: 'Thanh lịch',
    modelType: 'Nữ',
    matchScore: '96%',
    top: { name: 'Áo sơ mi Zara trắng tay dài', tag: 'Slot Áo', price: 220000 },
    bottom: { name: 'Quần kaki Uniqlo be ống đứng', tag: 'AI gợi ý', price: 245000 },
    styleNote:
      'AI cân đối phom suông và tông trắng–be trung tính, tôn dáng gọn gàng đi làm hoặc gặp đối tác.',
  },
  {
    id: 'weekend',
    label: 'Năng động',
    modelType: 'Nam',
    matchScore: '94%',
    top: { name: 'Áo khoác gió Nike xanh đen', tag: 'Slot Áo', price: 380000 },
    bottom: { name: 'Quần jeans Levi’s 501 ống đứng', tag: 'AI gợi ý', price: 420000 },
    styleNote:
      'Kết hợp áo khoác dáng thể thao với denim ống đứng giúp giữ phom năng động cho cuối tuần.',
  },
  {
    id: 'minimal',
    label: 'Tối giản',
    modelType: 'Nữ',
    matchScore: '97%',
    top: { name: 'Áo thun Uniqlo cotton trắng trơn', tag: 'Slot Áo', price: 165000 },
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
  'Dán tem Mã hàng hóa riêng & lập biên nhận điện tử',
];

export const CONSIGN_EARNING_PRESETS = [250000, 500000, 1000000, 2000000];

export const CITY_COORDS_PRESETS = [
  { id: 'hcm', label: 'TP. Hồ Chí Minh', lat: 10.7769, lng: 106.7009 },
  { id: 'hn', label: 'Hà Nội', lat: 21.0285, lng: 105.8542 },
  { id: 'dn', label: 'Đà Nẵng', lat: 16.0544, lng: 108.2022 },
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Mang đồ tới kho gần nhất',
    description: 'Đem trang phục tới điểm kho ReHome gợi ý, không cần tự chụp ảnh hay đăng bài.',
  },
  {
    step: '02',
    title: 'Kiểm định & gắn slot AI',
    description: 'Chuyên viên kiểm tra 6 bước, thống nhất giá tại quầy và dán tem Mã hàng hóa chuẩn sàn.',
  },
  {
    step: '03',
    title: 'Thử đồ AI & chốt đơn',
    description: 'Người mua thử qua Live Try-On hoặc AI phối bộ trước khi thanh toán an toàn.',
  },
  {
    step: '04',
    title: 'Nhận 90% hoặc quyên góp',
    description: 'Nhận 90% giá bán về Ví ReHome hoặc chuyển thiện nguyện 1 chạm khi hết chu kỳ.',
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
    description: 'Mở liên kết Google Drive chính thức trên Android và tải tệp .apk bản mới nhất.',
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
