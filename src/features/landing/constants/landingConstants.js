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
  { href: '#ai-studio', label: 'AI Thử đồ' },
  { href: '#marketplace', label: 'Sản phẩm' },
  { href: '#warehouses', label: 'Ký gửi' },
  { href: '#community', label: 'Thiện nguyện' },
  { href: '#about', label: 'Về ReHome' },
  { href: '#install-guide', label: 'Tải APK' },
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

export const CITY_COORDS_PRESETS = [
  { id: 'hcm', label: 'TP. Hồ Chí Minh', lat: 10.7769, lng: 106.7009 },
  { id: 'hn', label: 'Hà Nội', lat: 21.0285, lng: 105.8542 },
  { id: 'dn', label: 'Đà Nẵng', lat: 16.0544, lng: 108.2022 },
];

export const ABOUT_PILLARS = [
  {
    id: 'ai',
    badge: 'Công nghệ dẫn lối',
    title: 'Xóa rào cản “sợ không hợp dáng”',
    description:
      'Bộ đôi Live Try-On qua camera và AI phối đồ thông minh giúp bạn nhìn thấy trang phục trên chính mình trước khi rút ví — mua đồ tuần hoàn tự tin như đồ mới.',
  },
  {
    id: 'trust',
    badge: 'Kiểm định tận tâm',
    title: 'Người bán nhàn tênh — Người mua an tâm',
    description:
      'Thay vì tự chụp ảnh, trả giá mệt mỏi hay lo hàng kém chất lượng, ReHome lo trọn khâu nhận đồ, kiểm định 6 tiêu chí, chụp hình, gắn AI và chuyển tiền về Ví.',
  },
  {
    id: 'impact',
    badge: 'Tuần hoàn nhân ái',
    title: 'Quần áo cũ chạm đúng tay người cần',
    description:
      'Mỗi chiến dịch thiện nguyện đều đến từ tổ chức đã xác minh pháp lý, cho phép gửi đồ trực tiếp hoặc chuyển đổi món ký gửi cuối kỳ chỉ bằng một chạm.',
  },
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

export const CORE_FEATURES = [
  {
    id: 'tryon',
    badge: 'Công nghệ AI',
    title: 'Live Try-On Realtime & AI Phối đồ',
    description:
      'Ướm thử trực tiếp qua camera với Live Try-On hoặc để AI tự gợi ý món ghép thành nguyên set hoàn chỉnh theo dáng Nữ / Nam.',
    highlights: ['Live Try-On qua camera', 'AI gợi ý phối nguyên set', 'Chỉ trừ lượt khi lên hình'],
    accent: 'accent',
  },
  {
    id: 'consign',
    badge: 'Ký gửi kiếm tiền',
    title: 'Ký gửi kiểm định tại kho gần bạn',
    description:
      'App tự gợi ý điểm ký gửi gần vị trí nhất. Mang đồ tới kiểm định 6 tiêu chí, chốt giá minh bạch và nhận 90% doanh thu kỳ đầu.',
    highlights: ['Gợi ý kho gần nhất', 'Kiểm định & dán tem SKU', 'Nhận tiền tự động vào Ví'],
    accent: 'primary',
  },
  {
    id: 'shop',
    badge: 'Mua sắm an toàn',
    title: 'Sàn thời trang tuần hoàn tuyển chọn',
    description:
      'Mỗi sản phẩm mở bán đều đã vượt qua quy trình kiểm định thực tế tại kho ReHome, thanh toán ví ReHome, MoMo hoặc VNPay an toàn.',
    highlights: ['100% kiểm định thực tế', 'Giá niêm yết & so sánh giá gốc', 'Hoàn trả minh bạch 3 ngày'],
    accent: 'primary',
  },
  {
    id: 'charity',
    badge: 'Lan tỏa cộng đồng',
    title: 'Quyên góp thiện nguyện minh bạch',
    description:
      'Kết nối trực tiếp với các tổ chức thiện nguyện đã được thẩm định pháp lý, đóng góp đồ đúng chiến dịch hoặc chuyển tiếp cuối kỳ ký gửi.',
    highlights: ['Tổ chức được xác minh hồ sơ', 'Theo dõi chiến dịch theo địa điểm', 'Chuyển đổi đồ chưa bán thành quà tặng'],
    accent: 'secondary',
  },
];

export const INSTALL_STEPS = [
  {
    step: '01',
    title: 'Tải tệp APK từ Google Drive',
    description:
      'Mở liên kết Google Drive bằng trình duyệt trên điện thoại Android, chọn tệp .apk phiên bản mới nhất và nhấn Tải xuống.',
  },
  {
    step: '02',
    title: 'Mở tệp vừa tải về',
    description:
      'Chạm vào thông báo tải xong hoặc mở ứng dụng Tệp / Quản lý tệp (Files) → mục Tải xuống (Downloads) và chọn tệp ReHome APK.',
  },
  {
    step: '03',
    title: 'Cấp quyền cài đặt nguồn ngoài',
    description:
      'Nếu Android hỏi xác nhận bảo mật, chọn Cài đặt (Settings) → bật "Cho phép từ nguồn này" (Allow from this source) cho trình duyệt hoặc Files.',
  },
  {
    step: '04',
    title: 'Nhấn Cài đặt & trải nghiệm',
    description:
      'Chọn Cài đặt (Install), chờ hệ thống hoàn tất trong vài giây rồi mở ứng dụng ReHome để đăng nhập bằng Email hoặc Google.',
  },
];
