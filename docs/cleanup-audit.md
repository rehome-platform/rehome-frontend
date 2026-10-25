# Rà soát frontend — 2026-10-25

## Phạm vi kiểm tra

Đối chiếu import/export từ src/main.jsx, router, CSS import, dynamic import, index.html, cấu hình build/test/CI và tham chiếu trong tests. Đọc các module ứng viên trước khi xóa.

## 14 file đã xóa

- src/assets/icons/index.js
- src/assets/icons/verified.svg
- src/assets/images/logo.svg
- src/components/ConfirmModal.jsx
- src/components/chat.jsx
- src/features/admin/pages/AdminSystemPage.jsx
- src/features/admin/services/admin.service.js
- src/features/moderator/components/ConsignmentReceiptModal.jsx
- src/features/moderator/services/audit.service.js
- src/features/moderator/services/staff.service.js
- src/hooks/useConfirm.jsx
- src/hooks/useDebounce.js
- src/layouts/AuthLayout.jsx
- src/utils/conditionMapping.js

Các module này không có consumer trong ứng dụng hoặc tests. useConfirm chỉ tham chiếu ConfirmModal; cả hai không được gọi. AdminSystemPage chỉ còn barrel export, router đã dùng các trang riêng và redirect /admin/system về /admin/users; đã bỏ export cũ.

## Sắp xếp và dependencies

- Chuyển src/assets/icons/eco.png thành public/favicon.png; sửa index.html đang trỏ tới eco.svg không tồn tại.
- Bỏ thư mục rỗng sau khi xóa module cũ; giữ kiến trúc feature hiện tại.
- Cập nhật cây thư mục, bảng route và hướng dẫn test trong README; bỏ liên kết hand-off không tồn tại.
- Bỏ leaflet và hai plugin Tailwind forms/container-queries: không có import trong source/tests, Tailwind cấu hình plugins rỗng. Đồng bộ package-lock.json, không nâng phiên bản dependency.
- Xóa log và báo cáo build/test cũ có thể tái tạo. Giữ node_modules, .env và toàn bộ tests.

## Những phần giữ lại

- components/footer.jsx được role-navigation.test.mjs đọc và kiểm tra.
- CSS được @import, fixture được dynamic import và barrel UI vẫn được giữ.
- STOMP/SockJS dùng cho thông báo; MSW và user-event dùng trong tests.
- Hai HTTP helper có consumer và xử lý khác nhau nên không gộp.

## Xác minh

- npm test: 9 file, 53 test đạt.
- npm run test:legacy: 57/64 đạt; 7 test auth-recovery lỗi do mock react-router-dom thiếu useNavigate. Source và test của nhóm này không thay đổi trong đợt dọn dẹp.
- npm run build: thành công; còn cảnh báo chunk lớn hơn 500 kB.
- Chưa chạy E2E/backend integration trong đợt rà soát này.

- Kiểm tra đường dẫn import tĩnh, dynamic import chuỗi và CSS: không thiếu file (kể cả resolveDir của browser harness).
- Phiên bản các package còn lại trong lockfile không thay đổi; npm ls --depth=0 hợp lệ.
- Đã xóa dist sau khi build kiểm chứng; chạy npm run build để tái tạo trước khi preview.
- git diff --check không phát hiện lỗi whitespace.
