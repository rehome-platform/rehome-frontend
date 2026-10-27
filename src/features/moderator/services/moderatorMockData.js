/**
 * Dịch vụ mock data tập trung cho các module Bảng Điều Khiển Kho (Moderator Dashboard)
 * Chuẩn hóa 100% theo các wireframe thực tế:
 * - Yêu cầu trả hàng: TH-01, TH-02, TH-03, TH-04, TH-08 (RT-01..04 là phía Member mobile)
 * - Hồ sơ tổ chức: TC-01, TC-02, TC-03, TC-04, TC-05, TC-06 (OA/OP là phía Tổ chức)
 * - Báo cáo vi phạm: VP-01, VP-02 (OB là phía Tổ chức quản lý bài)
 * - Hộp thư kho: MC-01, MC-02 (CH là phía Member mobile chat)
 */

const delay = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================
// 1. RETURN PROCESSING (TH-01..08)
// ==========================================
let returnRequestsData = [
  {
    id: 'RET-00084',
    code: 'YC-00084',
    orderId: 'DH-00238',
    buyerName: 'Ngô Hải F',
    buyerCode: 'MB-004821',
    buyerPhone: '0912 345 456',
    buyerAddress: '142 Nguyễn Thị Thập, P. Tân Phú, Quận 7, TP.HCM',
    itemCount: 1,
    reason: 'Không đúng mô tả hoặc ảnh',
    buyerNote: 'Ảnh đăng là màu xanh đậm nhưng hàng nhận được bạc màu nhiều ở hai bên ống, mô tả không ghi.',
    buyerPhotos: [
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500',
      'https://images.unsplash.com/photo-1542272604-780c96859565?w=500',
    ],
    stockInPhotos: [
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500',
      'https://images.unsplash.com/photo-1542272604-780c96859565?w=500',
    ],
    stockInDate: '28/09/2026',
    submittedAt: '11/10 18:05',
    waitTime: '15 giờ',
    isOverdue: true,
    sku: 'RH-C2M08P',
    itemName: 'Quần jeans ống rộng',
    itemDetails: 'Levi\'s · 29 · Tốt',
    brand: 'Levi\'s',
    amount: 420000,
    shippingFee: 22000,
    senderCode: 'MB-004821',
    prevReturns: '0 / 14 món đã bán',
    payoutStatus: 'Chưa chia · còn giữ',
    isInspectorSelf: true, // Món này do chính Moderator kiểm định lúc nhập
    status: 'PENDING_APPROVAL', // PENDING_APPROVAL | WAITING_BUYER_DISPATCH | RETURNING | RECEIVED_INSPECT | RESOLVED
    carrierStatus: 'Chưa lấy hàng (Chờ duyệt)',
    outcome: null,
  },
  {
    id: 'RET-00088',
    code: 'YC-00088',
    orderId: 'DH-00245',
    buyerName: 'Trần Thị B',
    buyerCode: 'MB-002',
    buyerPhone: '0908 112 344',
    buyerAddress: '78 Lê Văn Sỹ, P. 13, Quận 3, TP.HCM',
    itemCount: 2,
    reason: 'Hỏng khi vận chuyển',
    buyerNote: 'Hộp bị móp rách, gãy khuy áo bên trong khi nhận từ shipper.',
    buyerPhotos: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500'],
    stockInPhotos: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500'],
    stockInDate: '01/10/2026',
    submittedAt: '12/10 08:20',
    waitTime: '1 giờ',
    isOverdue: false,
    sku: 'RH-AK0912',
    itemName: 'Áo khoác dạ nữ dáng dài',
    itemDetails: 'Zara · S · Rất tốt',
    brand: 'Zara',
    amount: 580000,
    shippingFee: 25000,
    senderCode: 'MB-001094',
    prevReturns: '1 / 8 món đã bán',
    payoutStatus: 'Chưa chia · còn giữ',
    isInspectorSelf: false,
    status: 'PENDING_APPROVAL',
    carrierStatus: 'Chờ duyệt',
    outcome: null,
  },
  {
    id: 'RET-00079',
    code: 'YC-00079',
    orderId: 'DH-00210',
    buyerName: 'Lê Minh C',
    buyerCode: 'MB-0098231',
    buyerPhone: '0977 441 209',
    buyerAddress: '23 Chu Văn An, Bình Thạnh, TP.HCM',
    itemCount: 1,
    reason: 'Nhận sai món',
    buyerNote: 'Giao nhầm chân váy thay vì quần tây',
    buyerPhotos: ['https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=500'],
    stockInPhotos: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500'],
    stockInDate: '25/09/2026',
    submittedAt: '09/10 14:02',
    waitTime: '—',
    sku: 'RH-QT0018',
    itemName: 'Quần tây công sở Novelty',
    itemDetails: 'Novelty · 31 · Tốt',
    brand: 'Novelty',
    amount: 280000,
    shippingFee: 22000,
    senderCode: 'MB-000523',
    prevReturns: '0 / 5 món đã bán',
    payoutStatus: 'Chưa chia · còn giữ',
    isInspectorSelf: false,
    status: 'RETURNING',
    carrierStatus: 'Đang vận chuyển về kho (GHN 58821944)',
    outcome: null,
  },
  {
    id: 'RET-00081',
    code: 'YC-00081',
    orderId: 'DH-00199',
    buyerName: 'Phạm Thu D',
    buyerCode: 'MB-008129',
    buyerPhone: '0933 881 202',
    buyerAddress: '55 Nam Kỳ Khởi Nghĩa, Quận 1, TP.HCM',
    itemCount: 1,
    reason: 'Tệ hơn kiểm định',
    buyerNote: 'Cổ áo bị giãn nhiều và có vết ố vàng không chụp trong ảnh kho.',
    buyerPhotos: ['https://images.unsplash.com/photo-1544441893-675973e31985?w=500'],
    stockInPhotos: ['https://images.unsplash.com/photo-1544441893-675973e31985?w=500'],
    stockInDate: '20/09/2026',
    submittedAt: '10/10 09:40',
    waitTime: '—',
    sku: 'RH-A7F31K',
    itemName: 'Áo khoác gió thể thao Adidas',
    itemDetails: 'Adidas · M · Khá',
    brand: 'Adidas',
    amount: 450000,
    shippingFee: 22000,
    senderCode: 'MB-000881',
    prevReturns: '0 / 12 món đã bán',
    payoutStatus: 'Chưa chia · còn giữ',
    isInspectorSelf: false,
    status: 'RECEIVED_INSPECT',
    carrierStatus: 'Hàng đã về kho 16/10 10:05, chờ kiểm',
    outcome: null,
  },
  {
    id: 'RET-00076',
    code: 'YC-00076',
    orderId: 'DH-00192',
    buyerName: 'Vũ Thanh H',
    buyerCode: 'MB-003112',
    buyerPhone: '0918 223 344',
    buyerAddress: '12 Hoàng Diệu, Quận 4, TP.HCM',
    itemCount: 3,
    reason: 'Không đúng mô tả',
    buyerNote: 'Size quá rộng so với bảng quy đổi',
    buyerPhotos: ['https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500'],
    stockInPhotos: ['https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500'],
    stockInDate: '15/09/2026',
    submittedAt: '08/10 16:15',
    waitTime: '—',
    sku: 'RH-SZ0192',
    itemName: 'Set áo sơ mi linen & quần suông',
    itemDetails: 'Uniqlo · L · Tốt',
    brand: 'Uniqlo',
    amount: 520000,
    shippingFee: 30000,
    senderCode: 'MB-002419',
    prevReturns: '0 / 9 món đã bán',
    payoutStatus: 'Chưa chia · còn giữ',
    isInspectorSelf: false,
    status: 'WAITING_BUYER_DISPATCH',
    carrierStatus: 'Chờ người mua gửi bưu cục',
    outcome: null,
  },
  {
    id: 'RET-00065',
    code: 'YC-00065',
    orderId: 'DH-00170',
    buyerName: 'Nguyễn An',
    buyerCode: 'MB-001',
    buyerPhone: '0900000001',
    buyerAddress: '100 Hai Bà Trưng, Quận 1, TP.HCM',
    itemCount: 1,
    reason: 'Lỗi kích thước',
    buyerNote: 'Đã hoàn tất kiểm tra và giải quyết.',
    buyerPhotos: ['https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500'],
    stockInPhotos: ['https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500'],
    stockInDate: '10/09/2026',
    submittedAt: '05/10 11:00',
    waitTime: '—',
    sku: 'TEST-SKU-1',
    itemName: 'Áo len dệt kim cổ lọ Zara',
    itemDetails: 'Zara · S · Tốt',
    brand: 'Zara',
    amount: 320000,
    shippingFee: 22000,
    senderCode: 'MB-000523',
    prevReturns: '0 / 14 món đã bán',
    payoutStatus: 'Đã giải quyết',
    isInspectorSelf: false,
    status: 'RESOLVED',
    carrierStatus: 'Đã hoàn tiền 342.000đ vào ví',
    outcome: 'RELIST',
  },
];

export const returnService = {
  async list({ status } = {}) {
    await delay();
    let data = [...returnRequestsData];
    if (status && status !== 'ALL') {
      data = data.filter((item) => item.status === status);
    }
    return { data, total: data.length };
  },

  async approveReturnAndCreateWaybill(retId) {
    await delay();
    returnRequestsData = returnRequestsData.map((r) =>
      r.id === retId
        ? {
            ...r,
            status: 'WAITING_BUYER_DISPATCH',
            carrierStatus: 'Đã tạo vận đơn thu hồi GHN · Chờ shipper lấy hàng',
          }
        : r
    );
    return returnRequestsData.find((r) => r.id === retId);
  },

  async rejectReturn(retId, reason) {
    await delay();
    returnRequestsData = returnRequestsData.map((r) =>
      r.id === retId
        ? {
            ...r,
            status: 'RESOLVED',
            outcome: 'REJECTED',
            rejectReason: reason,
            carrierStatus: 'Từ chối yêu cầu trả hàng',
          }
        : r
    );
    return returnRequestsData.find((r) => r.id === retId);
  },

  async resolveValid(retId, outcome) {
    await delay();
    returnRequestsData = returnRequestsData.map((r) =>
      r.id === retId
        ? {
            ...r,
            status: 'RESOLVED',
            outcome,
            carrierStatus: `Đã hoàn ${r.amount + r.shippingFee}đ vào ví người mua`,
          }
        : r
    );
    return returnRequestsData.find((r) => r.id === retId);
  },

  async resolveInvalid(retId, reason) {
    await delay();
    returnRequestsData = returnRequestsData.map((r) =>
      r.id === retId
        ? {
            ...r,
            status: 'RESOLVED',
            outcome: 'INVALID_RETURN',
            rejectReason: reason,
            carrierStatus: 'Hàng không hợp lệ · Lưu kho 7 ngày chờ khách nhận lại',
          }
        : r
    );
    return returnRequestsData.find((r) => r.id === retId);
  },

  async detail(retId) {
    await delay();
    return returnRequestsData.find((r) => r.id === retId);
  },
};

export const returnMockApi = returnService;

// ==========================================
// 2. ORG VERIFICATION (TC-01..06)
// ==========================================
let orgsQueueData = [
  {
    id: 'TC-00042',
    name: 'Quỹ Hạt Mầm Xanh',
    displayName: 'Hạt Mầm Xanh',
    type: 'Quỹ từ thiện',
    taxCode: '0312xxxxxx',
    scope: 'Toàn quốc',
    address: '88 Lê Lợi, P. Bến Nghé, Quận 1, TP.HCM',
    phone: '028 3822 xxxx',
    email: 'lienhe@hatmamxanh.org',
    representative: 'Lê Thị Mai · Chủ tịch quỹ',
    repCccdNumber: '079xxxxxxxxx',
    repCccdDate: '15/08/2021',
    repCccdAuthority: 'Cục Cảnh sát QLHC về TTXH',
    submittedAt: '11/10 09:14',
    waitTime: '1 ngày',
    submissionCount: 'Nộp lần đầu',
    status: 'PENDING',
    documents: [
      {
        title: 'CCCD mặt trước',
        info: '079xxxxxxxxx · 15/08/2021 · Cục Cảnh sát QLHC về TTXH',
        url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
      },
      {
        title: 'CCCD mặt sau',
        info: 'Tên khai trên thẻ: Lê Thị Mai — so với người đại diện: Lê Thị Mai',
        url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
      },
      {
        title: 'Giấy phép thành lập và công nhận điều lệ quỹ',
        info: '142/QĐ-BNV · 12/03/2023 · Bộ Nội vụ',
        url: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=600',
      },
      {
        title: 'Điều lệ quỹ đã được công nhận',
        info: 'Không có số · 12/03/2023 · Bộ Nội vụ',
        url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600',
      },
    ],
  },
  {
    id: 'TC-00041',
    name: 'CLB Thiện Nguyện ĐH Bách Khoa',
    displayName: 'CLB Bách Khoa',
    type: 'CLB trực thuộc pháp nhân',
    taxCode: 'không có',
    scope: 'TP.HCM',
    address: '268 Lý Thường Kiệt, Quận 10, TP.HCM',
    phone: '028 3865 xxxx',
    email: 'thiennguyen@hcmut.edu.vn',
    representative: 'Nguyễn Văn Nam · Chủ nhiệm CLB',
    submittedAt: '10/10 16:40',
    waitTime: '2 ngày',
    submissionCount: 'Nộp lại sau từ chối',
    status: 'PENDING',
    documents: [
      {
        title: 'Quyết định thành lập CLB của Đoàn trường',
        info: 'Số 45/QĐ-ĐTN · 05/01/2024 · Đoàn Trường ĐH Bách Khoa',
        url: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=600',
      },
      {
        title: 'CCCD người đại diện',
        info: '075xxxxxxxxx · Nguyễn Văn Nam',
        url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
      },
    ],
  },
  {
    id: 'TC-00039',
    name: 'Mái ấm Hướng Dương',
    displayName: 'Mái ấm Hướng Dương',
    type: 'Cơ sở trợ giúp xã hội',
    taxCode: 'không có',
    scope: 'Bình Tân, TP.HCM',
    address: '124 Mã Lò, P. Bình Trị Đông A, Bình Tân, TP.HCM',
    phone: '0903 445 xxxx',
    email: 'maiamhuongduong@gmail.com',
    representative: 'Trần Thị Thu · Trưởng cơ sở',
    submittedAt: '09/10 11:02',
    waitTime: '3 ngày',
    submissionCount: 'Nộp lần đầu',
    status: 'PENDING',
    documents: [],
  },
  {
    id: 'TC-00037',
    name: 'Công ty TNHH XH Tái Sinh',
    displayName: 'Tái Sinh Xanh',
    type: 'Doanh nghiệp xã hội',
    taxCode: '0318xxxxxx',
    scope: 'Toàn quốc',
    address: '15 Tôn Đức Thắng, Quận 1, TP.HCM',
    phone: '028 7300 xxxx',
    email: 'contact@taisinh.vn',
    representative: 'Phạm Đức Hùng · Giám đốc',
    submittedAt: '08/10 14:25',
    waitTime: '4 ngày',
    submissionCount: 'Nộp lần đầu',
    status: 'PENDING',
    documents: [],
  },
];

let legalChangesData = [
  {
    id: 'CHG-801',
    orgName: 'Mái ấm Tình Thương Quận 7',
    fieldChanged: 'Địa chỉ trụ sở',
    oldValue: '12 Nguyễn Thị Thập, P. Bình Thuận, Quận 7',
    newValue: '142 Nguyễn Thị Thập, P. Tân Phú, Quận 7, TP.HCM',
    submittedAt: '10/10/2026',
    status: 'PENDING',
    document: 'Giấy phép hoạt động điều chỉnh số 89/GP-SLĐTBXH',
  },
  {
    id: 'CHG-802',
    orgName: 'Quỹ Chia Sẻ Yêu Thương',
    fieldChanged: 'Người đại diện pháp lý',
    oldValue: 'Trần Văn Long (Đã thôi giữ chức vụ)',
    newValue: 'Trần Hoài Nam (Chủ tịch Hội đồng quản lý quỹ mới)',
    submittedAt: '08/10/2026',
    status: 'PENDING',
    document: 'Quyết định công nhận Chủ tịch quỹ số 22/QĐ-BNV',
  },
  {
    id: 'CHG-803',
    orgName: 'CLB Nụ Cười Em Thơ',
    fieldChanged: 'Tên tổ chức',
    oldValue: 'CLB Nụ Cười Em Thơ',
    newValue: 'Hội Thiện Nguyện Nụ Cười Trẻ Thơ',
    submittedAt: '06/10/2026',
    status: 'PENDING',
    document: 'Văn bản đổi tên của cơ quan chủ quản',
  },
];

export const orgVerificationService = {
  async getQueue() {
    await delay();
    return { data: [...orgsQueueData], total: orgsQueueData.length };
  },

  async getLegalChanges() {
    await delay();
    return { data: [...legalChangesData], total: legalChangesData.length };
  },

  async approveOrg(orgId, note) {
    await delay();
    orgsQueueData = orgsQueueData.map((org) =>
      org.id === orgId ? { ...org, status: 'APPROVED', auditNote: note } : org
    );
    return orgsQueueData.find((org) => org.id === orgId);
  },

  async rejectOrg(orgId, reason) {
    await delay();
    orgsQueueData = orgsQueueData.map((org) =>
      org.id === orgId ? { ...org, status: 'REJECTED', rejectReason: reason } : org
    );
    return orgsQueueData.find((org) => org.id === orgId);
  },

  async approveLegalChange(changeId) {
    await delay();
    legalChangesData = legalChangesData.map((chg) =>
      chg.id === changeId ? { ...chg, status: 'APPROVED' } : chg
    );
    return legalChangesData.find((chg) => chg.id === changeId);
  },

  async rejectLegalChange(changeId, reason) {
    await delay();
    legalChangesData = legalChangesData.map((chg) =>
      chg.id === changeId ? { ...chg, status: 'REJECTED', rejectReason: reason } : chg
    );
    return legalChangesData.find((chg) => chg.id === changeId);
  },

  async getOrgDetail(orgId) {
    await delay();
    return orgsQueueData.find((org) => org.id === orgId);
  },
};

export const orgVerificationMockApi = orgVerificationService;

// ==========================================
// 3. VIOLATION REPORTS (VP-01..02)
// ==========================================
let violationReportsData = [
  {
    id: 'VP-101',
    targetTitle: 'Tủ đồ 0 đồng cuối tuần này',
    targetType: 'Bài viết CĐ',
    authorName: 'Mái ấm Tình Thương Q7',
    postedAt: '08/10/2026',
    reportCount: 5,
    topReason: 'Nội dung gây hiểu nhầm',
    lastReportAt: '10/10 14:20',
    status: 'PENDING',
    reports: [
      {
        reporterCode: 'MB-0098231',
        reporterName: 'Trần Thị B',
        reason: 'Nội dung gây hiểu nhầm, nói quyên 500 phần quà nhưng thực tế không đủ',
        time: '10/10 14:20',
      },
      {
        reporterCode: 'MB-0103882',
        reporterName: 'Trần Văn G',
        reason: 'Số liệu không khớp với chiến dịch đã đăng trước đó',
        time: '10/10 09:05',
      },
      {
        reporterCode: 'MB-004821',
        reporterName: 'Ngô Hải F',
        reason: 'Hình ảnh đính kèm lấy từ sự kiện năm ngoái không ghi chú',
        time: '09/10 20:11',
      },
    ],
  },
  {
    id: 'VP-102',
    targetTitle: 'Bình luận của Trần Văn K',
    targetType: 'Bình luận',
    authorName: 'Trần Văn K',
    postedAt: '09/10/2026',
    reportCount: 1,
    topReason: 'Ngôn từ xúc phạm',
    lastReportAt: '09/10 09:15',
    status: 'PENDING',
    reports: [
      {
        reporterCode: 'ORG-01',
        reporterName: 'Quỹ Áo Ấm Vùng Cao',
        reason: 'Ngôn từ xúc phạm, thô tục và bôi nhọ danh dự tình nguyện viên',
        time: '09/10 09:15',
      },
    ],
  },
  {
    id: 'VP-103',
    targetTitle: "Chiến dịch 'Áo ấm mùa đông'",
    targetType: 'Chiến dịch',
    authorName: 'CLB Thiện Nguyện Ánh Sao',
    postedAt: '07/10/2026',
    reportCount: 2,
    topReason: 'Nghi ngờ không đúng mục đích',
    lastReportAt: '07/10 16:40',
    status: 'PENDING',
    reports: [
      {
        reporterCode: 'MB-001094',
        reporterName: 'Đặng Mỹ Linh',
        reason: 'Điểm nhận đồ không hoạt động, liên hệ hotline không ai nhấc máy',
        time: '07/10 16:40',
      },
    ],
  },
  {
    id: 'VP-104',
    targetTitle: "Bài viết · 'Quyên áo dài cũ'",
    targetType: 'Bài viết CĐ',
    authorName: 'Nhóm Thiện Nguyện Sen Hồng',
    postedAt: '05/10/2026',
    reportCount: 1,
    topReason: 'Spam, quảng cáo trá hình',
    lastReportAt: '05/10 11:02',
    status: 'RESOLVED',
    actionTaken: 'Gỡ nội dung',
    resolveReason: 'Bài viết gắn link bán hàng thương mại bên ngoài',
    reports: [
      {
        reporterCode: 'MB-000881',
        reporterName: 'Hoàng Gia Bảo',
        reason: 'Spam dẫn link bán hàng Shopee',
        time: '05/10 11:02',
      },
    ],
  },
];

export const violationReportService = {
  async list() {
    await delay();
    return { data: [...violationReportsData], total: violationReportsData.length };
  },

  async resolveViolation(reportId, action, reason) {
    await delay();
    violationReportsData = violationReportsData.map((r) =>
      r.id === reportId
        ? {
            ...r,
            status: 'RESOLVED',
            actionTaken: action,
            resolveReason: reason,
          }
        : r
    );
    return violationReportsData.find((r) => r.id === reportId);
  },

  async getDetail(reportId) {
    await delay();
    return violationReportsData.find((r) => r.id === reportId);
  },

  async dismissViolation(reportId, reason) {
    await delay();
    violationReportsData = violationReportsData.map((r) =>
      r.id === reportId
        ? {
            ...r,
            status: 'DISMISSED',
            actionTaken: 'Bác bỏ báo cáo — nội dung không vi phạm',
            resolveReason: reason,
          }
        : r
    );
    return violationReportsData.find((r) => r.id === reportId);
  },
};

export const violationReportMockApi = violationReportService;

// ==========================================
// 4. WAREHOUSE INBOX (MC-01..02)
// ==========================================
let inboxConversationsData = [
  {
    id: 'CONV-01',
    memberCode: 'MB-004821',
    memberName: 'Ngô Hải F',
    phone: '0912 345 456',
    waitTime: 'chờ 3 giờ',
    consignCount: '7 đang bán',
    shippingCount: '3',
    returnCount: '1 chờ duyệt',
    mentionedItem: {
      sku: 'RH-A7F31K',
      name: 'Áo khoác gió thể thao Adidas',
      status: 'Đang bán · B1-18',
    },
    status: 'UNANSWERED', // 'UNANSWERED' | 'DONE'
    unread: true,
    lastMessage: 'Dạ cảm ơn bạn!',
    messages: [
      {
        id: 1,
        sender: 'member',
        senderName: 'Ngô Hải F',
        text: 'Áo sơ mi linen của mình ký gửi hôm kia sao chưa lên app vậy ạ?',
        time: 'hôm qua 14:02',
      },
      {
        id: 2,
        sender: 'moderator',
        senderName: 'Moderator Trần Văn K',
        text: 'Chào bạn, món này đang chờ in tem và nhập kho. Sáng mai sẽ lên app, bạn sẽ nhận thông báo.',
        time: 'hôm qua 14:40',
      },
      {
        id: 3,
        sender: 'moderator',
        senderName: 'Moderator Lê Thị M',
        text: 'Chào bạn, hàng của bạn đã được nhập kho và đang bán với giá 185.000đ.',
        time: '09:42',
      },
      {
        id: 4,
        sender: 'member',
        senderName: 'Ngô Hải F',
        text: 'Dạ cảm ơn bạn!',
        time: '09:50',
      },
    ],
  },
  {
    id: 'CONV-02',
    memberCode: 'MB-002419',
    memberName: 'Nguyễn Thị Lan',
    phone: '0908 776 543',
    waitTime: 'chờ 1 giờ',
    consignCount: '4 đang bán',
    shippingCount: '0',
    returnCount: '0',
    mentionedItem: {
      sku: 'RH-C2M08P',
      name: 'Áo len Cardigan dáng ngắn',
      status: 'Đang bán · A2-04',
    },
    status: 'UNANSWERED',
    unread: true,
    lastMessage: 'Em muốn rút áo về, phí bao nhiêu ạ?',
    messages: [
      {
        id: 1,
        sender: 'member',
        senderName: 'Nguyễn Thị Lan',
        text: 'Em muốn rút áo về, phí bao nhiêu ạ?',
        time: '10:30',
      },
    ],
  },
  {
    id: 'CONV-03',
    memberCode: 'MB-003112',
    memberName: 'Võ Đăng Khoa',
    phone: '0978 123 456',
    waitTime: 'chờ 40 phút',
    consignCount: '2 đang bán',
    shippingCount: '1',
    returnCount: '0',
    mentionedItem: {
      sku: 'RH-2310',
      name: 'Áo blazer hai khuy Hàn Quốc',
      status: 'Đã đóng gói · Chờ lấy',
    },
    status: 'UNANSWERED',
    unread: true,
    lastMessage: 'Đơn RH-2310 chưa thấy GHN tới lấy',
    messages: [
      {
        id: 1,
        sender: 'member',
        senderName: 'Võ Đăng Khoa',
        text: 'Đơn RH-2310 chưa thấy GHN tới lấy',
        time: '11:10',
      },
    ],
  },
  {
    id: 'CONV-04',
    memberCode: 'MB-001094',
    memberName: 'Đặng Mỹ Linh',
    phone: '0933 456 789',
    waitTime: 'chờ 12 phút',
    consignCount: '5 đang bán',
    shippingCount: '2',
    returnCount: '0',
    mentionedItem: null,
    status: 'UNANSWERED',
    unread: true,
    lastMessage: 'Mình đổi số điện thoại nhận hàng được không?',
    messages: [
      {
        id: 1,
        sender: 'member',
        senderName: 'Đặng Mỹ Linh',
        text: 'Mình đổi số điện thoại nhận hàng được không?',
        time: '11:45',
      },
    ],
  },
  {
    id: 'CONV-05',
    memberCode: 'MB-000881',
    memberName: 'Hoàng Gia Bảo',
    phone: '0912 998 877',
    waitTime: 'hôm qua',
    consignCount: '3 đang bán',
    shippingCount: '0',
    returnCount: '0',
    mentionedItem: null,
    status: 'DONE',
    unread: false,
    lastMessage: 'Nhân viên: Đã gửi lại tem cho bạn',
    messages: [
      {
        id: 1,
        sender: 'member',
        senderName: 'Hoàng Gia Bảo',
        text: 'Tem in bị mất nét mã vạch rồi ạ',
        time: 'hôm qua 10:00',
      },
      {
        id: 2,
        sender: 'moderator',
        senderName: 'Moderator Nguyễn Văn A',
        text: 'Nhân viên: Đã gửi lại tem cho bạn',
        time: 'hôm qua 10:30',
      },
    ],
  },
  {
    id: 'CONV-06',
    memberCode: 'MB-000523',
    memberName: 'Lý Thanh Tâm',
    phone: '0903 111 222',
    waitTime: 'hôm qua',
    consignCount: '1 đang bán',
    shippingCount: '0',
    returnCount: '0',
    mentionedItem: null,
    status: 'DONE',
    unread: false,
    lastMessage: 'Nhân viên: Hoàn tiền đã về ví',
    messages: [
      {
        id: 1,
        sender: 'member',
        senderName: 'Lý Thanh Tâm',
        text: 'Kiểm tra giúp mình tiền hoàn đơn trả',
        time: 'hôm qua 09:00',
      },
      {
        id: 2,
        sender: 'moderator',
        senderName: 'Moderator Nguyễn Văn A',
        text: 'Nhân viên: Hoàn tiền đã về ví',
        time: 'hôm qua 09:15',
      },
    ],
  },
];

export const warehouseInboxService = {
  async getConversations() {
    await delay();
    return { data: [...inboxConversationsData], total: inboxConversationsData.length };
  },

  async sendMessage(convId, text, moderatorName = 'Nguyễn Văn A') {
    await delay();
    const newMsg = {
      id: Date.now(),
      sender: 'moderator',
      senderName: `Moderator ${moderatorName}`,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    inboxConversationsData = inboxConversationsData.map((conv) => {
      if (conv.id === convId) {
        return {
          ...conv,
          unread: false,
          messages: [...conv.messages, newMsg],
          lastMessage: text,
          lastTime: newMsg.time,
        };
      }
      return conv;
    });

    return inboxConversationsData.find((conv) => conv.id === convId);
  },

  async markAsDone(convId) {
    await delay();
    inboxConversationsData = inboxConversationsData.map((conv) =>
      conv.id === convId ? { ...conv, status: 'DONE', unread: false } : conv
    );
    return inboxConversationsData.find((conv) => conv.id === convId);
  },

  async getConversationDetail(convId) {
    await delay();
    return inboxConversationsData.find((conv) => conv.id === convId);
  },
};

export const warehouseInboxMockApi = warehouseInboxService;
