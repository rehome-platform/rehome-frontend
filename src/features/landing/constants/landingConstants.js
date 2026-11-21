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

export const NAV_LINKS = [
  { href: '#features', label: 'Tính năng' },
  { href: '#marketplace', label: 'Sản phẩm' },
  { href: '#community', label: 'Thiện nguyện' },
  { href: '#warehouses', label: 'Điểm ký gửi' },
  { href: '#membership', label: 'Gói VIP' },
  { href: '#install-guide', label: 'Cài đặt APK' },
];

export const TRYON_SLOT_LABELS = {
  TOP: 'Áo • Thử đồ AI',
  BOTTOM: 'Quần/Váy • Thử đồ AI',
  DRESS: 'Đầm • Thử đồ AI',
};

export const CORE_FEATURES = [
  {
    id: 'consign',
    badge: 'Quy trình 4 bước',
    title: 'Ký gửi kiểm định tại kho',
    description:
      'Gửi yêu cầu ngay trên điện thoại, mang đồ đến điểm ký gửi ReHome để chuyên viên kiểm định chất lượng, định giá minh bạch và theo dõi doanh thu tự động.',
    highlights: ['Biên nhận điện tử rõ ràng', 'Hoa hồng minh bạch theo kỳ', 'Quản lý giá bán linh hoạt'],
    accent: 'primary',
  },
  {
    id: 'tryon',
    badge: 'Công nghệ AI',
    title: 'Thử đồ AI & Live Try-On',
    description:
      'Ướm thử trực tiếp Áo, Quần/Váy hoặc Đầm trước khi chốt đơn bằng tính năng thử đồ AI theo ảnh cá nhân hoặc Live Try-On thời gian thực qua camera.',
    highlights: ['Phân loại slot Áo / Quần / Đầm', 'Xem trước độ vừa vặn trực quan', 'Hạn mức tăng theo gói thành viên'],
    accent: 'accent',
  },
  {
    id: 'shop',
    badge: 'Mua sắm an toàn',
    title: 'Sàn thời trang tuần hoàn tuyển chọn',
    description:
      'Mỗi sản phẩm mở bán đều đã vượt qua quy trình kiểm định tại kho ReHome, thanh toán qua ví hoặc cổng trực tuyến an toàn và giao nhận minh bạch.',
    highlights: ['100% kiểm định thực tế tại kho', 'Giá niêm yết & so sánh giá gốc', 'Theo dõi trạng thái đơn hàng tức thì'],
    accent: 'primary',
  },
  {
    id: 'charity',
    badge: 'Lan tỏa cộng đồng',
    title: 'Quyên góp thiện nguyện minh bạch',
    description:
      'Kết nối trực tiếp với các tổ chức thiện nguyện đã được xác minh pháp lý, đóng góp sản phẩm đúng chiến dịch đang cần tại điểm ký gửi gần bạn.',
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
