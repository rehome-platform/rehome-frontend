# ReHome - Frontend Web Application

## 1. Giới thiệu
Ứng dụng Web dành cho hệ thống **ReHome** (Nền tảng Ký gửi & Tuần hoàn Thời trang). Phục vụ 4 nhóm tác nhân chính:
- **Cửa hàng ký gửi (Shop):** Lập biên nhận tại quầy, kiểm định chất lượng, đăng bán 2 nhãn và tất toán PayOS.
- **Tổ chức từ thiện (Organizer):** Quản lý chiến dịch, tiếp nhận đồ quyên góp qua QR Code.
- **Kiểm duyệt viên (Moderator):** Đối chiếu hồ sơ pháp lý đối tác, phân xử khiếu nại tranh chấp 2 tầng.
- **Quản trị viên (Admin):** Dashboard tài chính, cấu hình trần giá 2.000.000 đ, tỷ lệ chia sẻ doanh thu và kiểm soát tài khoản.

## 2. Kiến trúc (Architecture)
Hệ thống được tổ chức theo mô hình **Feature-based + Layered Architecture**:
- **Presentation Layer (Tầng Giao Diện):** `src/layouts/`, `src/components/`, `src/features/*/pages/`
- **Business Logic & State Layer (Tầng Nghiệp Vụ & Trạng Thái):** `src/context/`, `src/hooks/`
- **Service & Network Layer (Tầng Dịch Vụ Mạng):** `src/services/baseApi.js`, `src/features/*/services/`
- **Shared & Infrastructure Layer (Tầng Dùng Chung):** `src/utils/`, `src/configs/`, `src/styles/`, `src/assets/`

## 3. Cấu trúc thư mục (Folder Structure)
Chi tiết cây thư mục chuẩn mực đã được triển khai:
```text
src/
├── assets/                       # Tài nguyên tĩnh cục bộ (icons SVG, logo)
├── components/                   # UI Dumb Components dùng chung (Button, Modal, Table, Header, Footer, QRScanner)
├── configs/                      # Cấu hình hằng số (api.config.js, role.config.js)
├── context/                      # Quản lý trạng thái toàn cục (AuthContext, NotificationContext)
├── features/                     # CÁC MODULE NGHIỆP VỤ CỐT LÕI (Feature-based)
│   ├── auth/                     # Phân hệ Xác thực & Đăng ký
│   ├── shop/                     # Phân hệ Cửa hàng Ký gửi
│   ├── organizer/                # Phân hệ Tổ chức từ thiện
│   ├── moderator/                # Phân hệ Kiểm duyệt & Phân xử
│   ├── admin/                    # Phân hệ Quản trị tối cao
│   ├── orders/                   # Phân hệ Đơn hàng & Vận chuyển
│   └── wallet/                   # Phân hệ Ví & Tài chính
├── hooks/                        # Custom Hooks (useConfirm, useDebounce, useQRScanner)
├── layouts/                      # Layout Wrappers (ShopLayout, AdminLayout, AuthLayout)
├── routes/                       # Định tuyến (AppRouter, PrivateRoute)
├── services/                     # Tầng kết nối mạng trung tâm (baseApi.js)
├── styles/                       # CSS toàn cục (global.css, tailwind.css)
├── utils/                        # Pure functions (api, validators, conditionMapping, formatters)
├── App.jsx                       # Root Component
└── main.jsx                      # Điểm khởi chạy React với Vite
```

## 4. Hướng dẫn chạy ứng dụng
1. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
2. Khởi chạy môi trường phát triển (Dev Server):
   ```bash
   npm run dev
   ```
3. Đóng gói cho môi trường production:
   ```bash
   npm run build
   ```
