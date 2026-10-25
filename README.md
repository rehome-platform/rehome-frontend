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
  - Custom Hook xử lý QR Scanner (`src/hooks/`)
- **Service & Network Layer (Tầng Dịch Vụ Mạng):**
  - Axios HTTP Client tích hợp JWT Interceptors & Auto Refresh (`src/services/baseApi.js`)
  - Auth service (`src/features/auth/services/`) và API nghiệp vụ kho (`src/features/moderator/services/`)
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
├── .github/workflows/       # CI
├── docs/                    # Tài liệu và biên bản rà soát
├── public/favicon.png       # Tài nguyên công khai
├── src/
│   ├── assets/logo/         # Logo import qua Vite
│   ├── components/          # Header, QR scanner, footer phục vụ kiểm thử
│   │   └── common/          # UI dùng chung
│   ├── configs/             # API, vai trò, tham số hệ thống
│   ├── context/             # Auth và thông báo realtime
│   ├── features/
│   │   ├── admin/           # components/, pages/
│   │   ├── auth/            # pages/, services/, styles/
│   │   └── moderator/       # components/, pages/, hooks/, services/, models/, config/, fixtures/
│   ├── hooks/               # Quét QR
│   ├── layouts/             # Admin và Moderator
│   ├── routes/              # Router và bảo vệ quyền
│   ├── services/            # HTTP client dùng chung
│   ├── styles/              # Global CSS và Tailwind
│   ├── utils/               # API helpers, formatters, validators
│   ├── App.jsx
│   └── main.jsx
├── tests/
│   ├── *.test.mjs           # Kiểm thử Node (test:legacy)
│   ├── *.browser.mjs        # Kịch bản browser độc lập
│   ├── phase2/, phase4/     # Kiểm thử Vitest
│   ├── e2e/                 # Playwright với fixture
│   └── integration/         # Kiểm thử backend thật
├── .env.example
├── index.html
├── package.json
├── package-lock.json
└── *.config.js              # Vite, Vitest, Playwright, PostCSS, Tailwind
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
| `/admin/system` | Admin | `Redirect → /admin/users` | Cổng điều hành chung các phân hệ quản trị |
| `/admin/users` | Admin | `AdminAccountsPage` | Quản lý tài khoản người dùng & tổ chức |
| `/admin/moderators` | Admin | `AdminModeratorsPage` | Phân bổ Moderator theo chi nhánh kho |
| `/admin/warehouses` | Admin | `AdminWarehousesPage` | Mạng lưới kho vật lý (chặn ẩn kho còn tồn) |
| `/admin/audit-logs` | Admin | `AdminAuditLogsPage` | Nhật ký kiểm toán thao tác hệ thống |
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
## Kiểm tra và bảo trì

- `npm test`: Vitest cho nghiệp vụ kho.
- `npm run test:legacy`: kiểm thử Node cho auth, admin và phân quyền.
- `npm run test:e2e`: Playwright với fixture cục bộ.
- `npm run test:e2e:integration`: cần backend và biến môi trường tích hợp.

Chi tiết: [Biên bản rà soát](docs/cleanup-audit.md).
