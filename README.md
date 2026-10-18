# ReHome - Frontend Web Application

> **Cổng Điều Hành & Quản Trị Tập Trung Nền Tảng Ký Gửi & Tuần Hoàn Thời Trang ReHome**  
> Tuân thủ tài liệu đặc tả nghiệp vụ chính thức: `ReHome — Tài liệu tổng quan hệ thống (sau Review 1).pdf`

---

## 1. Giới thiệu & Phân định phạm vi nền tảng (Scope & Boundaries)

Ứng dụng Web ReHome được thiết kế và xây dựng chuyên biệt như một **trung tâm tác nghiệp và quản trị nội bộ**, phục vụ **duy nhất 2 nhóm tác nhân (actors)**:

1. **Nhân viên Kho / Kiểm duyệt viên (Moderator):**
   - Vận hành tác nghiệp trực tiếp tại quầy tiếp nhận kho chi nhánh (tra cứu Member, kiểm định độ mới, chốt giá niêm yết, in tem SKU barcode, xuất biên nhận ký gửi).
   - Kiểm duyệt yêu cầu ký gửi online từ xa, quản lý sơ đồ vị trí kệ kho, kiểm kê quét mã QR.
   - Đóng gói xuất kho tạo vận đơn Giao Hàng Nhanh (GHN).
   - Tiếp nhận hàng trả về kho và thực hiện quy trình **hội chẩn 2 Moderator** thẩm định hàng nghi giả trước khi tiêu hủy.
   - Thẩm định hồ sơ pháp lý tổ chức từ thiện theo **8 bước kiểm chứng**.
   - Xử lý báo cáo vi phạm cộng đồng và giải đáp thắc mắc qua hộp thư hỗ trợ kho chi nhánh.

2. **Quản trị viên (Admin):**
   - Giám sát toàn bộ nền tảng qua **Dashboard Quỹ nền tảng & Sổ kép đối ứng (Double-entry Ledger)** giữa Ví Member và Quỹ ReHome (Mục 7 & 8).
   - Quản lý tài khoản Member & Tổ chức từ thiện (khóa / mở khóa tài khoản vi phạm).
   - Phân bổ nhân sự Moderator vào từng kho chi nhánh cụ thể.
   - Quản trị mạng lưới chi nhánh kho vật lý (có cơ chế guardrail **chặn ẩn/xóa kho khi vẫn còn hàng tồn kho**).
   - Cấu hình tập trung **5 nhóm tham số hệ thống** theo chuẩn Mục 11.
   - Truy vết nhật ký kiểm toán (Audit Logs) và xuất báo cáo tài chính định dạng Excel.

> [!IMPORTANT]
> **Phân định nền tảng theo Mục 2 & Mục 3 của Tài liệu Review 1:**
> - Hai tác nhân **Member (Khách hàng / Người ký gửi)** và **Tổ chức từ thiện (Organization)** được thực thi **100% trên Ứng dụng Di động (Mobile App)** (Bao gồm: Mua sắm, Đăng ký gửi đồ, Quản lý ví tiền, Thử đồ ảo AI, Đăng ký hồ sơ pháp lý, Tạo chiến dịch quyên góp, Đăng bài cộng đồng).
> - Phiên bản Web **loại bỏ hoàn toàn** các khái niệm lỗi thời không có trong tài liệu nghiệp vụ: Không có actor Shop ký gửi, không có cổng thanh toán PayOS (ReHome sử dụng MoMo nạp tiền và đối ứng nội bộ), không có kỳ đối soát ngày 1 & 16, không có luồng theo dõi số kg quyên góp, không có trần giá 2.000.000đ, và không có phân giải tranh chấp 2 cấp.

---

## 2. Kiến trúc ứng dụng (Architecture)

Dự án áp dụng mô hình kiến trúc **Feature-based + Layered Architecture** đảm bảo tính mô-đun hóa, dễ mở rộng và phân tách rõ ràng trách nhiệm:

- **Presentation Layer (Tầng Giao Diện):**
  - Layouts chuẩn hóa theo vai trò (`src/layouts/`)
  - UI Components dùng chung (`src/components/`, `src/components/common/`)
  - Giao diện nghiệp vụ theo phân hệ (`src/features/*/pages/`, `src/features/*/components/`)
- **Business Logic & State Layer (Tầng Nghiệp Vụ & Trạng Thái):**
  - Quản lý phiên đăng nhập & phân quyền nhân sự (`src/context/AuthContext.jsx`)
  - Thông báo thời gian thực (`src/context/NotificationContext.jsx`)
  - Custom Hooks xử lý QR Scanner, debounce tìm kiếm, modal xác nhận (`src/hooks/`)
- **Service & Network Layer (Tầng Dịch Vụ Mạng):**
  - Axios HTTP Client tích hợp JWT Interceptors & Auto Refresh (`src/services/baseApi.js`)
  - Các service API theo phân hệ (`src/features/*/services/`)
- **Configuration & Infrastructure Layer (Tầng Cấu Hình & Tiện Ích):**
  - Tập trung hóa Endpoint API (`src/configs/api.config.js`)
  - Định nghĩa phân quyền Web (`src/configs/role.config.js`)
  - 5 nhóm tham số vận hành chuẩn Mục 11 (`src/configs/systemParams.config.js`)
  - Tiện ích thuần: định dạng tiền tệ/ngày tháng, mapping độ mới, validate form (`src/utils/`)

---

## 3. Cấu trúc thư mục chi tiết (Folder Structure)

Cây thư mục dưới đây được đối chiếu với các thư mục và file hiện có trong `rehome-frontend` (không bao gồm `node_modules/` và `dist/`):

```text
rehome-frontend/
├── docs/                                 # Tài liệu đặc tả nghiệp vụ chính thức
│   └── demo_account.md
├── public/                               # Tài nguyên công khai tĩnh
├── src/                                  # Toàn bộ mã nguồn ứng dụng Web
│   ├── assets/                           # Tài nguyên tĩnh cục bộ
│   │   ├── icons/                        # Icon SVG dùng chung
│   │   │   ├── eco.png
│   │   │   ├── index.js                  # Export trung tâm icon
│   │   │   └── verified.svg              # Huy hiệu xác minh chính hãng/tổ chức
│   │   ├── images/
│   │   │   └── logo.svg
│   │   └── logo/
│   │       └── rehome-logo.png
│   │
│   ├── components/                       # UI Components dùng chung toàn ứng dụng
│   │   ├── common/                       # Base components chuẩn Material Design
│   │   │   ├── Badge.jsx                 # Hiển thị nhãn trạng thái (Success, Warning, Danger, Info)
│   │   │   ├── Button.jsx                # Nút bấm tương tác đa kích thước & biến thể
│   │   │   ├── Dropdown.jsx              # Menu thả xuống chọn thao tác/bộ lọc
│   │   │   ├── Input.jsx                 # Ô nhập liệu có validation & icon tích hợp
│   │   │   ├── Logo.jsx
│   │   │   ├── Modal.jsx                 # Hộp thoại modal tương tác đa năng
│   │   │   ├── Table.jsx                 # Bảng dữ liệu chuẩn hóa hỗ trợ phân trang
│   │   │   └── index.js                  # Export tập trung common components
│   │   ├── chat.jsx                      # Widget chat hỗ trợ trao đổi thời gian thực
│   │   ├── ConfirmModal.jsx              # Modal xác nhận thao tác quan trọng (tiêu hủy, duyệt, khóa)
│   │   ├── footer.jsx                    # Footer thông tin hệ thống điều hành ReHome
│   │   ├── header.jsx                    # Header thanh điều hướng Web Portal
│   │   └── QRScannerModal.jsx            # Modal quét mã QR / SKU bằng camera thiết bị
│   │
│   ├── configs/                          # Cấu hình hằng số trung tâm hệ thống
│   │   ├── api.config.js                 # Centralized API Endpoints cho Admin & Moderator
│   │   ├── role.config.js                # Phân quyền vai trò trên Web: ADMIN, MODERATOR
│   │   └── systemParams.config.js        # 5 nhóm tham số cấu hình hệ thống theo Mục 11
│   │
│   ├── context/                          # Quản lý trạng thái toàn cục (React Context)
│   │   ├── AuthContext.jsx               # Quản lý phiên đăng nhập, JWT token & vai trò nhân sự
│   │   └── NotificationContext.jsx       # Quản lý thông báo toast thời gian thực
│   │
│   ├── features/                         # CÁC PHÂN HỆ NGHIỆP VỤ THỰC THI TRÊN WEB
│   │   │
│   │   ├── admin/                        # PHÂN HỆ QUẢN TRỊ VIÊN HỆ THỐNG (ADMIN)
│   │   │   ├── components/
│   │   │   │   ├── AdminAccountsView.jsx      # Quản lý tài khoản (Member, Org) - Khóa/mở khóa (UC-76..78)
│   │   │   │   ├── AdminAuditLogsView.jsx     # Nhật ký kiểm toán thao tác hệ thống (UC-90, F-160)
│   │   │   │   ├── AdminHeader.jsx            # Header riêng của cổng quản trị Admin
│   │   │   │   ├── AdminModeratorsView.jsx    # Cấp tài khoản & phân bổ Moderator vào kho chi nhánh (UC-79..81)
│   │   │   │   ├── AdminOverviewView.jsx      # Thống kê tổng quan điều hành Google Stitch
│   │   │   │   ├── AdminSidebar.jsx           # Sidebar điều hướng các phân hệ Admin
│   │   │   │   └── AdminWarehousesView.jsx    # Quản lý mạng lưới kho, chặn ẩn kho còn tồn (UC-82..85)
│   │   │   ├── pages/
│   │   │   │   ├── AdminAccountsPage.jsx
│   │   │   │   ├── AdminAuditLogsPage.jsx
│   │   │   │   ├── AdminDashboardPage.jsx     # Dashboard Quỹ nền tảng & Sổ kép đối ứng (Mục 7 & 8)
│   │   │   │   ├── AdminModeratorsPage.jsx
│   │   │   │   ├── AdminSystemPage.jsx        # Portal điều hành tập trung các phân hệ Admin
│   │   │   │   ├── AdminWarehousesPage.jsx
│   │   │   │   ├── ConfigPage.jsx             # Cấu hình 5 nhóm tham số chuẩn Mục 11 (UC-86, 87)
│   │   │   │   └── index.js                   # Export tập trung các trang Admin
│   │   │   └── services/
│   │   │       └── admin.service.js           # API services quản trị hệ thống, quỹ và nhân sự
│   │   │
│   │   ├── auth/                         # PHÂN HỆ XÁC THỰC NHÂN SỰ NỘI BỘ
│   │   │   ├── pages/
│   │   │   │   ├── ForgotPassword.jsx         # Khôi phục mật khẩu tài khoản nhân sự qua email (UC-02)
│   │   │   │   ├── LoginPage.jsx              # Đăng nhập chuẩn Google Stitch (Admin, Moderator)
│   │   │   │   ├── ProfilePage.jsx
│   │   │   │   ├── ResetPassword.jsx
│   │   │   │   └── index.js                   # Export tập trung các trang Auth
│   │   │   └── services/
│   │   │       └── auth.service.js            # API services đăng nhập, đăng xuất, refresh token
│   │   │
│   │   └── moderator/                    # PHÂN HỆ NHÂN VIÊN KHO / KIỂM DUYỆT (MODERATOR)
│   │       ├── components/
│   │       │   ├── BarcodePrintModal.jsx      # In tem nhãn barcode/QR SKU dán lên áo quần (F-122)
│   │       │   ├── ConsignmentReceiptModal.jsx# Mẫu Biên nhận ký gửi hàng hóa chuẩn Mục 12
│   │       │   └── SuspiciousCounterfeitModal.jsx # Quy trình hội chẩn 2 Moderator nghi hàng giả (F-134, F-135)
│   │       ├── pages/
│   │       │   ├── CategoryBrandPage.jsx      # Quản lý Danh mục (slot Áo/Quần thử đồ AI) & Thương hiệu (UC-72..75)
│   │       │   ├── ConsignmentQueuePage.jsx   # Hàng đợi tiếp nhận & duyệt form ký gửi online (F-111..F-114)
│   │       │   ├── CounterPage.jsx            # Quầy tiếp nhận: Tra cứu Member, Kiểm định, Chốt giá, Bàn giao (UC-60, 62, 66)
│   │       │   ├── OrgVerificationPage.jsx    # Xác minh hồ sơ tổ chức theo 8 bước Mục 9 & duyệt đổi pháp lý (UC-69, 70)
│   │       │   ├── PackingOrdersPage.jsx      # Đóng gói xuất kho, quét SKU đối chiếu & tạo vận đơn GHN (UC-65, F-127)
│   │       │   ├── ReturnProcessingPage.jsx   # Xử lý hàng trả về kho, thẩm định 2 Moderator (F-131..F-135, UC-68)
│   │       │   ├── ViolationReportsPage.jsx   # Xử lý báo cáo vi phạm cộng đồng theo Mục 13 (UC-71, F-141)
│   │       │   ├── WarehouseInboxPage.jsx     # Hộp thư hỗ trợ kho trao đổi với Member (UC-48, F-091)
│   │       │   ├── WarehouseInventoryPage.jsx # Quản lý tồn kho: Vị trí kệ, Quét QR, Hàng vô thừa nhận (UC-63, 64, 67, F-130)
│   │       │   └── index.js                   # Export tập trung các trang Moderator
│   │       └── services/
│   │           ├── audit.service.js           # API services kiểm kê kho & nhật ký vận hành
│   │           └── staff.service.js           # API services quầy tiếp nhận, đơn hàng, kiểm duyệt
│   │
│   ├── hooks/                            # Custom React Hooks
│   │   ├── useConfirm.jsx                # Hook gọi hộp thoại xác nhận tương tác
│   │   ├── useDebounce.js                # Hook tối ưu hóa tìm kiếm & tra cứu dữ liệu
│   │   └── useQRScanner.js               # Hook tích hợp camera quét mã QR/SKU
│   │
│   ├── layouts/                          # Khung giao diện phân quyền trên Web
│   │   ├── AdminLayout.jsx               # Layout chuyên nghiệp cho Quản trị viên (Sidebar + Topbar)
│   │   ├── AuthLayout.jsx                # Layout màn hình xác thực đăng nhập / quên mật khẩu
│   │   └── ModeratorLayout.jsx           # Layout tác nghiệp kho cho Moderator (Vận hành + Kiểm duyệt)
│   │
│   ├── routes/                           # Cấu hình định tuyến (Routing)
│   │   ├── AppRouter.jsx                 # Cấu hình Route trung tâm cho Web (Admin & Moderator)
│   │   └── PrivateRoute.jsx              # Bảo vệ route theo vai trò người dùng (Role-based Guard)
│   │
│   ├── services/                         # Tầng kết nối mạng trung tâm
│   │   └── baseApi.js                    # Cấu hình Axios Client, JWT Interceptors & Auto Refresh Token
│   │
│   ├── styles/                           # Định kiểu toàn cục (Styling)
│   │   ├── global.css                    # CSS toàn cục & cấu hình phông chữ Be Vietnam Pro
│   │   └── tailwind.css                  # Tích hợp TailwindCSS
│   │
│   ├── utils/                            # Tiện ích bổ trợ (Pure Helpers & Validators)
│   │   ├── api.js                        # Tiện ích bóc tách và định dạng lỗi API chuẩn hóa
│   │   ├── conditionMapping.js           # Bảng mapping 5 mức độ độ mới sản phẩm kiểm định (1-5)
│   │   ├── formatters.js                 # Định dạng tiền tệ VND, ngày tháng, mã đơn hàng
│   │   └── validators.js                 # Validation form (giá sàn 50%, CCCD 12 số, mã số thuế)
│   │
│   ├── App.jsx                           # Root Component bao bọc Providers và AppRouter
│   └── main.jsx                          # Điểm khởi chạy React 18 với Vite
│
├── tests/
│   ├── auth-recovery.test.mjs
│   └── role-navigation.test.mjs
│
├── .env                                  # Biến môi trường kết nối API Backend
├── .gitignore                            # Danh sách tệp loại trừ khỏi Git
├── index.html                            # HTML template nạp font Be Vietnam Pro & Google Icons
├── package.json                          # Khai báo dependencies và scripts
├── package-lock.json
├── postcss.config.js                     # Cấu hình PostCSS cho TailwindCSS
├── README.md
├── tailwind.config.js                    # Bảng màu thiết kế Material Design 3 (Google Stitch)
└── vite.config.js                        # Cấu hình bundler Vite & alias đường dẫn
```

`node_modules/` và `dist/` không được liệt kê vì là thư mục sinh ra khi cài đặt và build.

---

## 4. Bản đồ nghiệp vụ & Chức năng chi tiết (Business Mapping)

### 4.1. Phân hệ Nhân viên Kho / Kiểm duyệt (Moderator Portal)

| Trang / Component | Mã UC / Function (Review 1) | Nghiệp vụ chi tiết |
| :--- | :--- | :--- |
| **`CounterPage.jsx`** | UC-60, UC-62, UC-66, F-122 | **Quầy tiếp nhận ký gửi tại chỗ:** Tra cứu Member bằng mã/SĐT, kiểm định ngoại quan 5 mức độ, chốt giá niêm yết (ràng buộc giá sàn 50%), in tem SKU barcode dán áo, xuất Biên nhận ký gửi chuẩn Mục 12. |
| **`ConsignmentQueuePage.jsx`** | UC-61, F-111 → F-114 | **Hàng đợi ký gửi Online:** Tiếp nhận ảnh chụp sản phẩm từ xa do Member gửi qua app, duyệt hồ sơ hoặc từ chối nêu rõ lý do. |
| **`WarehouseInventoryPage.jsx`** | UC-63, UC-64, UC-67, F-123..126, F-130 | **Quản lý kho chi nhánh:** Phân bổ vị trí kệ (Dãy-Tầng-Ô), kiểm kê quét QR bằng camera, xử lý thanh lý hàng vô thừa nhận quá hạn 30 ngày. |
| **`PackingOrdersPage.jsx`** | UC-65, F-127 | **Đóng gói xuất kho:** Quét mã SKU đối chiếu hàng trước khi đóng gói, tạo mã vận đơn Giao Hàng Nhanh (GHN). |
| **`ReturnProcessingPage.jsx`** | UC-68, F-131 → F-135 | **Xử lý hàng trả về:** Tiếp nhận khiếu nại trả hàng; mở quy trình **Hội chẩn 2 Moderator** thẩm định hàng nghi giả trước khi xác nhận tiêu hủy và hoàn tiền. |
| **`OrgVerificationPage.jsx`** | UC-69, UC-70, Mục 9 | **Thẩm định tổ chức từ thiện:** Quy trình 8 bước đối chiếu hồ sơ pháp lý (Quyết định thành lập, Điều lệ, CCCD người đại diện, Giấy ủy quyền, Mã số thuế). |
| **`ViolationReportsPage.jsx`** | UC-71, F-141, Mục 13 | **Xử lý vi phạm cộng đồng:** Xử lý báo cáo bài đăng/bình luận vi phạm tiêu chuẩn cộng đồng, áp dụng chế tài trừ điểm uy tín. |
| **`CategoryBrandPage.jsx`** | UC-72 → UC-75 | **Danh mục & Thương hiệu:** Quản lý danh mục hỗ trợ phân loại slot Áo / Quần phục vụ tính năng AI Thử đồ ảo (Virtual Try-on) trên Mobile. |
| **`WarehouseInboxPage.jsx`** | UC-48, F-091 | **Hộp thư kho chi nhánh:** Kênh trao đổi trực tiếp giữa nhân viên kho và Member về tình trạng sản phẩm ký gửi. |
| **`BarcodePrintModal.jsx`** | F-122 | Hỗ trợ in tem nhãn barcode SKU chuẩn khổ giấy nhiệt để dán trực tiếp lên sản phẩm. |
| **`ConsignmentReceiptModal.jsx`**| Mục 12 | Mẫu biên nhận ký gửi hàng hóa gồm thông tin Member, danh mục hàng, giá thỏa thuận, điều khoản 3 kỳ. |
| **`SuspiciousCounterfeitModal.jsx`**| F-134, F-135 | Hộp thoại hội chẩn bắt buộc cần chữ ký/xác nhận của Moderator thứ 2 độc lập đối với sản phẩm nghi giả. |

---

### 4.2. Phân hệ Quản trị viên (Admin Portal)

| Trang / Component | Mã UC / Function (Review 1) | Nghiệp vụ chi tiết |
| :--- | :--- | :--- |
| **`AdminDashboardPage.jsx`** | UC-88, UC-89, Mục 7 & 8 | **Dashboard Quỹ nền tảng & Sổ kép:** Theo dõi dòng tiền đối ứng giữa Ví Member và Quỹ ReHome (Tiền đang giữ - Holding Fund, Doanh thu hoa hồng 3 kỳ 10%-15%-20%, Số dư thực tế), xuất báo cáo Excel. |
| **`AdminAccountsView.jsx`** | UC-76 → UC-78 | **Quản lý tài khoản:** Tra cứu hồ sơ Member & Tổ chức từ thiện; thực thi khóa/mở khóa tài khoản có hành vi gian lận. |
| **`AdminModeratorsView.jsx`** | UC-79 → UC-81 | **Quản lý nhân viên kho:** Tạo tài khoản nhân sự và điều chuyển/phân bổ Moderator vào từng chi nhánh kho cụ thể. |
| **`AdminWarehousesView.jsx`** | UC-82 → UC-85 | **Mạng lưới kho chi nhánh:** Thêm mới, chỉnh sửa thông tin kho; tích hợp guardrail **chặn ẩn/xóa kho khi vẫn còn hàng tồn kho**. |
| **`ConfigPage.jsx`** | UC-86, UC-87, Mục 11 | **Cấu hình 5 nhóm tham số:** Cấu hình thời gian ký gửi, phí dịch vụ, thời hạn xử lý, điểm tín nhiệm và cấu trúc mã SKU. |
| **`AdminAuditLogsView.jsx`** | UC-90, F-160 | **Nhật ký kiểm toán:** Truy vết lịch sử mọi hành động nhạy cảm của Admin và Moderator phục vụ đối soát an toàn. |

---

## 5. Cấu hình 5 nhóm tham số hệ thống (Mục 11)

Toàn bộ tham số vận hành được quản lý tập trung tại `src/configs/systemParams.config.js`:

1. **Nhóm 1 - Thời gian ký gửi & Hoa hồng lũy tiến:**
   - Kỳ 1 (30 ngày đầu): Hoa hồng **10%**
   - Kỳ 2 (20 ngày tiếp theo): Hoa hồng **15%**
   - Kỳ 3 (10 ngày cuối): Hoa hồng **20%**
   - Sau 60 ngày: Hàng chuyển trạng thái quá hạn ký gửi.
2. **Nhóm 2 - Tài chính & Dịch vụ:**
   - Phí lưu kho quá hạn: `2.000 VNĐ / ngày`
   - Phí ship mẫu kiểm định tận nơi: `30.000 VNĐ / lượt`
   - Hạn mức rút tiền tối thiểu: `50.000 VNĐ`
   - Ngưỡng giá sàn niêm yết: Không được giảm dưới **50%** giá thỏa thuận ban đầu.
3. **Nhóm 3 - Thời hạn xử lý:**
   - Thời hạn duyệt đơn ký gửi online: `48 giờ`
   - Thời hạn lấy lại hàng ký gửi: `15 ngày`
   - Thời hạn thanh lý hàng vô thừa nhận: `30 ngày`
4. **Nhóm 4 - Điểm tín nhiệm cộng đồng:**
   - Điểm mặc định ban đầu: `100 điểm`
   - Trừ điểm khi hủy đơn / vi phạm bài đăng: `-10 đến -30 điểm`
   - Ngưỡng khóa tài khoản tự động: Dưới `50 điểm`
5. **Nhóm 5 - Quy chuẩn mã SKU & Vị trí kho:**
   - Cấu trúc SKU: `RH-[Mã Kho]-[Mã Danh Mục]-[Số Thứ Tự 6 chữ số]` (VD: `RH-KHO01-AO-000124`)
   - Định dạng vị trí: `Kệ [Dãy]-[Tầng]-[Ô]` (VD: `A-02-15`)

---

## 6. Bảng định tuyến Web Portal (Routing Table)

| Tuyến đường (Route) | Quyền hạn (Role) | Trang Component | Mục đích nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `/` | Public | `HomePage` | Cổng thông tin điều hướng tập trung cho nhân sự ReHome |
| `/login` | Public | `LoginPage` | Đăng nhập tài khoản nội bộ (Admin / Moderator) |
| `/forgot-password` | Public | `ForgotPassword` | Khôi phục mật khẩu nhân viên qua email |
| `/moderator/counter` | Moderator | `CounterPage` | Quầy tiếp nhận ký gửi trực tiếp tại kho chi nhánh |
| `/moderator/queue` | Moderator | `ConsignmentQueuePage` | Hàng đợi kiểm duyệt yêu cầu ký gửi online |
| `/moderator/inventory` | Moderator | `WarehouseInventoryPage`| Quản lý vị trí kệ kho, quét QR & thanh lý hàng quá hạn |
| `/moderator/packing` | Moderator | `PackingOrdersPage` | Đóng gói xuất kho & tích hợp tạo đơn GHN |
| `/moderator/returns` | Moderator | `ReturnProcessingPage` | Xử lý hoàn hàng & hội chẩn 2 Moderator nghi giả |
| `/moderator/verifications`| Moderator | `OrgVerificationPage` | Thẩm định hồ sơ pháp lý 8 bước tổ chức từ thiện |
| `/moderator/reports` | Moderator | `ViolationReportsPage` | Xử lý báo cáo vi phạm bài đăng/bình luận |
| `/moderator/categories` | Moderator | `CategoryBrandPage` | Quản lý danh mục (slot thử đồ AI) & thương hiệu |
| `/moderator/inbox` | Moderator | `WarehouseInboxPage` | Hộp thư hỗ trợ trao đổi với khách hàng |
| `/admin` | Admin | `AdminDashboardPage` | Dashboard Quỹ nền tảng & Sổ kép đối ứng |
| `/admin/system` | Admin | `AdminSystemPage` | Cổng điều hành chung các phân hệ quản trị |
| `/admin/users` | Admin | `AdminSystemPage` | Quản lý tài khoản người dùng & tổ chức |
| `/admin/moderators` | Admin | `AdminSystemPage` | Phân bổ Moderator theo chi nhánh kho |
| `/admin/warehouses` | Admin | `AdminSystemPage` | Mạng lưới kho vật lý (chặn ẩn kho còn tồn) |
| `/admin/audit-logs` | Admin | `AdminSystemPage` | Nhật ký kiểm toán thao tác hệ thống |
| `/admin/configs` | Admin | `ConfigPage` | Cấu hình 5 nhóm tham số hệ thống Mục 11 |

---

## 7. Thiết kế & Công nghệ sử dụng (Tech Stack)

- **Frontend Core:** React 18 (`^18.3.1`), Vite (`^5.2.11`), JavaScript (ESNext, JSX)
- **Styling & Design System:**
  - TailwindCSS (`^3.4.19`) với bảng màu **Material Design 3 (Google Stitch)**:
    - Primary: `#006B2C` (Nature Emerald Green)
    - Primary Container: `#00873A`
    - Surface: `#F4FCF0` / `#F8FAF8`
    - Typography: **Be Vietnam Pro** (nạp trực tiếp từ Google Fonts)
- **Routing:** React Router DOM v6 (`^6.23.1`)
- **HTTP Client:** Axios (`^1.7.2`) kèm Interceptors tự động đính kèm Bearer Token
- **Bản đồ kho & vị trí:** Leaflet (`^1.9.4`)
- **Giao tiếp thời gian thực:** `@stomp/stompjs` & `sockjs-client`

---

## 8. Hướng dẫn cài đặt & Khởi chạy (Getting Started)

### 8.1. Yêu cầu môi trường
- **Node.js**: Phiên bản `>= 18.0.0`
- **npm**: Phiên bản `>= 9.0.0`

### 8.2. Cấu hình biến môi trường
Tạo hoặc kiểm tra file `.env` tại thư mục gốc của dự án:
```env
VITE_API_BASE_URL=https://prm393.up.railway.app
```

### 8.3. Cài đặt các gói phụ thuộc
```bash
npm install
```

### 8.4. Khởi chạy môi trường phát triển (Dev Server)
```bash
npm run dev
```
Mặc định ứng dụng sẽ chạy tại: `http://localhost:5173/`

### 8.5. Đóng gói cho môi trường Production (Build)
```bash
npm run build
```
Kết quả đóng gói bundle tối ưu sẽ được lưu tại thư mục `dist/`.

### 8.6. Xem trước bản đóng gói Production (Preview)
```bash
npm run preview
```
