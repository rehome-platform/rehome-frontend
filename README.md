# ReHome - Frontend Web Application (Hệ Thống Điều Hành & Vận Hành Tập Trung)

> Cập nhật toàn diện và chuẩn hóa theo tài liệu chính thức: **"ReHome — Tài liệu tổng quan hệ thống (sau Review 1)"**.

---

## 1. Phân Tích Nghiệp Vụ & Phạm Vi Nền Tảng (Web vs Mobile)

### 1.1. Mô hình vận hành ReHome
- **Mô hình cốt lõi:** Ký gửi và mua bán quần áo đã qua sử dụng **có kiểm định tại kho tập trung**, thử đồ AI 2 slot (Áo + Quần) và khu vực kết nối các tổ chức từ thiện đã xác minh tư cách pháp nhân.
- **Dòng tiền & Quỹ nền tảng:**
  - **Tiền vào (Thật):** Qua cổng MoMo (tiền đơn hàng, phí ship, phí rút hàng ngoài cửa sổ miễn phí 7 ngày).
  - **Tiền ra (Giả lập):** Hoàn tiền ví người mua, cộng tiền ví người bán, rút tiền ví đều là giao dịch giả lập lưu trong hệ thống.
  - **Nguyên tắc ghi sổ kép:** Quỹ nền tảng đối ứng cân bằng với ví Member. Mọi biến động đều được lưu vết trong Transaction và Audit Log.

### 1.2. Phân định Tác nhân (Actors) & Nền tảng thực thi theo Mục 2
| Actor | Nền tảng thực thi | Phạm vi nghiệp vụ theo tài liệu chính thức Review 1 |
|---|---|---|
| **Member** | **Mobile App (100%)** | Đóng 3 vai (Người mua, người ký gửi, người quyên góp). Mua sắm, giỏ hàng, đặt đơn MoMo/ví, tracking đơn, tạo form ký gửi, nhận biên nhận, hạ giá, thử đồ AI 2 slot, ví cá nhân. *(Không thực thi trên Web)* |
| **Organization** | **Mobile App (100%)** | Tổ chức từ thiện đã xác minh: Tạo/sửa/đóng chiến dịch (địa điểm, khung giờ, loại đồ ưu tiên); Đăng bài viết cộng đồng kèm ảnh hoạt động; Cập nhật thông tin và xin đổi pháp lý. *(Không thực thi trên Web, không lưu số kg quyên góp)* |
| **Moderator** | **Web App (Chính thức)** | Nhân viên thuộc đúng một chi nhánh kho: Tra cứu Member tại quầy bằng mã/SĐT, kiểm định thật/giả & chốt giá, in tem SKU dán áo, nhập kho, quản lý vị trí kệ, đóng gói tạo đơn GHN, bàn giao tại quầy, xử lý hàng trả (hội chẩn 2 moderator nghi giả), xác minh tổ chức từ thiện theo checklist 8 bước, duyệt đổi pháp lý, xử lý báo cáo vi phạm, quản lý danh mục/thương hiệu, trả lời hộp thư kho. |
| **Admin** | **Web App (Chính thức)** | Quản lý toàn bộ tài khoản (Member, Tổ chức) - khóa/mở khóa; Tạo tài khoản Moderator và gán chi nhánh kho; Quản lý mạng lưới kho chi nhánh; Cấu hình 5 nhóm tham số hệ thống (Mục 11); Dashboard Quỹ nền tảng & Doanh thu thực tế (Mục 7 & 8); Xuất báo cáo Excel; Nhật ký kiểm toán Audit Log. |
| **Guest / Auth** | **Web / Mobile** | Đăng nhập hệ thống điều hành (Admin, Moderator); Quên mật khẩu qua email. |

---

## 2. Các Thành Phần Đã Được Loại Bỏ / Thanh Lọc Khỏi Ứng Dụng Web
1. ❌ **Loại bỏ vai trò "Shop (Cửa hàng ký gửi)"**:
   - ReHome vận hành theo mô hình kho tập trung do Moderator quản lý, không có actor "Shop". Đã xóa toàn bộ thư mục `src/features/shop/`, `ShopLayout.jsx`, `RegisterShop.jsx`.
2. ❌ **Loại bỏ phân hệ "Tổ chức từ thiện (Organization Web Portal)"**:
   - Theo Mục 2 và Mục 3, tác nhân **Organization chỉ thực thi trên Mobile App**. Đã xóa thư mục `src/features/organizer/`, `OrgLayout.jsx`, `RegisterOrg.jsx`.
3. ❌ **Loại bỏ quy trình Cân kg & Quét QR check-in quyên góp**:
   - Theo Mục 0 và Mục 10, hệ thống không lưu bất kỳ dữ liệu quyên góp nào, đồ được người dân tự mang đến điểm nhận ngoài đời.
4. ❌ **Loại bỏ quy trình "Phân xử khiếu nại tranh chấp 2 tầng"**:
   - Theo Mục 10 & Mục 14, hệ thống không có luồng khiếu nại riêng (chỉ liên hệ qua email/hộp thư kho). Đã xóa `DisputeResolutionPage.jsx`.
5. ❌ **Loại bỏ PayOS, Ví âm, Rút tiền ngày 1 & 16, Trần giá 2.000.000 đ**:
   - Tiền vào qua MoMo, chi tiền giả lập. Rút tiền tự động không qua người duyệt (tối thiểu 10.000 đ, tối đa 3 lần/ngày).
   - Hoa hồng tăng dần 3 kỳ (10% - 15% - 20%). Giá sàn 50% giá chốt. Không có trần giá 2 triệu.
6. ❌ **Loại bỏ các giao diện mua hàng cá nhân / ví cá nhân Member trên Web**:
   - Web App tập trung 100% tài nguyên cho hệ thống điều hành và tác nghiệp của Moderator (Kho) và Admin (Quản trị).

---

## 3. Cấu Trúc Thư Mục Chuẩn Hóa (Folder Structure)

```text
src/
├── assets/                           # Tài nguyên tĩnh (SVG icons, Logo ReHome)
├── components/                       # UI Dumb Components dùng chung
│   ├── common/
│   │   ├── Badge.jsx                 # Hiển thị trạng thái (Success, Warning, Danger, Info)
│   │   ├── Button.jsx                # Nút bấm chuẩn Material Design
│   │   ├── Dropdown.jsx              # Menu thả xuống
│   │   ├── Input.jsx                 # Ô nhập liệu có validation & helper text
│   │   ├── Modal.jsx                 # Hộp thoại modal tương tác
│   │   ├── Table.jsx                 # Bảng dữ liệu chuẩn hóa
│   │   └── index.js
│   ├── ConfirmModal.jsx              # Modal xác nhận thao tác quan trọng
│   ├── QRScannerModal.jsx            # Modal quét mã QR / SKU bằng camera
│   ├── header.jsx                    # Header thanh điều hướng cổng điều hành Web
│   └── footer.jsx                    # Footer thông tin hệ sinh thái ReHome
│
├── configs/                          # Cấu hình hằng số trung tâm
│   ├── api.config.js                 # API endpoints chuẩn hóa cho Moderator & Admin
│   ├── role.config.js                # Định nghĩa vai trò Web: ADMIN, MODERATOR
│   └── systemParams.config.js        # 5 nhóm tham số cấu hình hệ thống theo Mục 11
│
├── context/                          # State management toàn cục
│   ├── AuthContext.jsx               # Quản lý phiên đăng nhập & phân quyền
│   └── NotificationContext.jsx       # Quản lý thông báo thời gian thực
│
├── layouts/                          # Khung giao diện theo vai trò thực thi Web
│   ├── AdminLayout.jsx               # Layout chuyên nghiệp cho Quản trị viên (Sidebar + Topbar)
│   ├── ModeratorLayout.jsx           # Layout tác nghiệp kho cho Moderator (Vận hành + Kiểm duyệt)
│   └── AuthLayout.jsx                # Layout màn hình xác thực đăng nhập / quên mật khẩu
│
├── features/                         # CÁC PHÂN HỆ NGHIỆP VỤ THỰC THI TRÊN WEB
│   ├── auth/                         # Phân hệ Xác thực nhân sự Web
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx         # Đăng nhập chuẩn Google Stitch (Admin, Moderator)
│   │   │   ├── ForgotPassword.jsx    # Đặt lại mật khẩu qua email (UC-02)
│   │   │   └── index.js
│   │   └── services/
│   │       └── auth.service.js
│   │
│   ├── admin/                        # Phân hệ Quản trị viên (ADMIN)
│   │   ├── components/
│   │   │   ├── AdminAccountsView.jsx      # Quản lý tài khoản (Member, Org) - Khóa/mở khóa (UC-76..78)
│   │   │   ├── AdminModeratorsView.jsx    # Tạo & phân Moderator vào kho chi nhánh (UC-79..81)
│   │   │   ├── AdminWarehousesView.jsx    # Quản lý mạng lưới chi nhánh kho, chặn ẩn còn tồn (UC-82..85)
│   │   │   ├── AdminAuditLogsView.jsx     # Nhật ký kiểm toán thao tác hệ thống (UC-90, F-160)
│   │   │   ├── AdminOverviewView.jsx      # Thống kê tổng quan hoạt động
│   │   │   ├── AdminHeader.jsx
│   │   │   └── AdminSidebar.jsx
│   │   ├── pages/
│   │   │   ├── AdminDashboardPage.jsx     # Dashboard Quỹ nền tảng & Sổ kép đối ứng (Mục 7 & 8)
│   │   │   ├── AdminSystemPage.jsx        # Trang điều hành tập trung các phân hệ Admin
│   │   │   ├── ConfigPage.jsx             # Cấu hình 5 nhóm tham số chuẩn Mục 11 (UC-86, 87)
│   │   │   └── index.js
│   │   └── services/
│   │       └── admin.service.js
│   │
│   └── moderator/                    # Phân hệ Nhân viên Kho / Kiểm duyệt viên (MODERATOR)
│       ├── components/
│       │   ├── BarcodePrintModal.jsx      # In tem nhãn mã vạch/QR SKU dán lên áo (F-122)
│       │   ├── ConsignmentReceiptModal.jsx# Mẫu Biên nhận ký gửi hàng hóa chuẩn Mục 12
│       │   └── SuspiciousCounterfeitModal.jsx # Quy trình hội chẩn 2 Moderator nghi giả (F-134, F-135)
│       ├── pages/
│       │   ├── CounterPage.jsx            # Quầy tiếp nhận: Tra cứu Member, Kiểm định, Chốt giá, Giao nhận tại chỗ
│       │   ├── ConsignmentQueuePage.jsx   # Hàng đợi tiếp nhận & duyệt form ký gửi online (F-111..F-114)
│       │   ├── WarehouseInventoryPage.jsx # Quản lý tồn kho: Kệ hàng, Quét QR, Hàng vô thừa nhận (F-123..126, F-130)
│       │   ├── PackingOrdersPage.jsx      # Đóng gói xuất kho, quét SKU đối chiếu & tạo vận đơn GHN (F-127, UC-65)
│       │   ├── ReturnProcessingPage.jsx   # Xử lý hàng trả về kho, kiểm tra & quyết định (F-131..F-135)
│       │   ├── OrgVerificationPage.jsx    # Xác minh hồ sơ tổ chức theo 8 bước Mục 9 & duyệt đổi pháp lý
│       │   ├── ViolationReportsPage.jsx   # Xử lý báo cáo vi phạm cộng đồng (gỡ bài, ẩn chiến dịch) (Mục 13)
│       │   ├── CategoryBrandPage.jsx      # Quản lý Danh mục (gán slot Áo/Quần thử đồ AI) & Thương hiệu
│       │   ├── WarehouseInboxPage.jsx     # Hộp thư hỗ trợ kho trao đổi với Member (F-091, UC-48)
│       │   └── index.js
│       └── services/
│           └── moderator.service.js
│
├── routes/
│   ├── AppRouter.jsx                 # Routing phân quyền phân hệ Web (Admin & Moderator)
│   └── PrivateRoute.jsx              # Bảo vệ route theo trạng thái đăng nhập & role
├── services/
│   └── baseApi.js                    # Tầng kết nối Axios có Interceptor token & auto refresh
├── styles/
│   ├── global.css                    # CSS toàn cục & định dạng phông Be Vietnam Pro
│   └── tailwind.css                  # Tích hợp TailwindCSS
└── utils/
    ├── api.js                        # Xử lý format lỗi API
    ├── conditionMapping.js           # Bảng mapping độ mới sản phẩm kiểm định (1-5)
    ├── formatters.js                 # Định dạng tiền tệ VND, ngày tháng
    └── validators.js                 # Validation form (CCCD, MST, giá sàn, mật khẩu)
```

---

## 4. Hướng Dẫn Cài Đặt & Khởi Chạy

1. **Cài đặt các gói phụ thuộc:**
   ```bash
   npm install
   ```
2. **Khởi chạy môi trường phát triển (Dev Server):**
   ```bash
   npm run dev
   ```
3. **Đóng gói dự án (Production Build):**
   ```bash
   npm run build
   ```
