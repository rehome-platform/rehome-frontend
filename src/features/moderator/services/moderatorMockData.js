/**
 * Dịch vụ mock data tập trung cho các module Bảng Điều Khiển Kho (Moderator Dashboard)
 * chưa có API backend thực tế hoặc chưa mở gate contract:
 * - Return Processing (Xử lý trả hàng, kiểm tra hàng về kho F-131..F-135, UC-68, TH-01..08, RT-01..04)
 * - Organization Verification (Xác minh tổ chức & đổi pháp lý F-137..F-140, UC-69, 70, TC-01..06, OA-01..06)
 * - Violation Reports (Báo cáo vi phạm cộng đồng F-141, UC-71, VP-01..02, CD-06)
 * - Warehouse Inbox (Hộp thư trao đổi kho ReHome F-091, UC-48, MC-01..02, CH-01..02)
 *
 * Đồng bộ mã thành viên (MB-001, MB-002, MB-0098231), đơn hàng (ORD-9821, ORD-9774),
 * SKU (Q7-AK-000411, TEST-SKU-1) và định danh kho Quận 7.
 */

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================
// 1. RETURN PROCESSING MOCK DATA & SERVICE
// ==========================================
let returnRequestsData = [
  {
    id: 'RET-3012',
    orderId: 'ORD-9821',
    buyerName: 'Trần Minh Thảo',
    buyerCode: 'MB-0098231',
    buyerPhone: '0908 112 344',
    itemName: 'Áo khoác gió thể thao Adidas',
    brand: 'Adidas',
    sku: 'Q7-AK-000411',
    amount: 450000,
    reason: 'Nghi ngờ hàng nhái, logo và đường may cẩu thả, chất vải không đúng',
    photoEvidence: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=500',
    status: 'SUSPECTED_COUNTERFEIT', // 'PENDING_INSPECT' | 'SUSPECTED_COUNTERFEIT' | 'RESOLVED'
    carrierStatus: 'Đã giao về kho Q7 (15/10/2026)',
    warehouseId: 'warehouse-a',
    outcome: null,
  },
  {
    id: 'RET-3015',
    orderId: 'ORD-9774',
    buyerName: 'Nguyễn Văn Đạt',
    buyerCode: 'MB-002',
    buyerPhone: '0977 441 209',
    itemName: 'Quần tây công sở Novelty',
    brand: 'Novelty',
    sku: 'Q7-QT-000188',
    amount: 280000,
    reason: 'Có khuyết điểm vết ố sau lưng áo không như mô tả',
    photoEvidence: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500',
    status: 'PENDING_INSPECT',
    carrierStatus: 'Đã giao về kho Q7 (14/10/2026)',
    warehouseId: 'warehouse-a',
    outcome: null,
  },
  {
    id: 'RET-3018',
    orderId: 'ORD-9650',
    buyerName: 'Nguyễn An',
    buyerCode: 'MB-001',
    buyerPhone: '0900000001',
    itemName: 'Áo len dệt kim cổ lọ Zara',
    brand: 'Zara',
    sku: 'TEST-SKU-1',
    amount: 320000,
    reason: 'Sản phẩm giao sai kích thước (Mô tả size L nhưng thực tế size S)',
    photoEvidence: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500',
    status: 'RESOLVED',
    outcome: 'RELIST',
    carrierStatus: 'Đã xử lý nhập kho (12/10/2026)',
    warehouseId: 'warehouse-a',
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

  async resolveValid(retId, outcome) {
    await delay();
    returnRequestsData = returnRequestsData.map((r) =>
      r.id === retId ? { ...r, status: 'RESOLVED', outcome } : r
    );
    const updated = returnRequestsData.find((r) => r.id === retId);
    return updated;
  },

  async resolveInvalid(retId) {
    await delay();
    returnRequestsData = returnRequestsData.map((r) =>
      r.id === retId ? { ...r, status: 'RESOLVED', outcome: 'INVALID_RETURN' } : r
    );
    const updated = returnRequestsData.find((r) => r.id === retId);
    return updated;
  },

  async markSuspectedCounterfeit(retId) {
    await delay();
    returnRequestsData = returnRequestsData.map((r) =>
      r.id === retId ? { ...r, status: 'SUSPECTED_COUNTERFEIT' } : r
    );
    return returnRequestsData.find((r) => r.id === retId);
  },
};

// ==========================================
// 2. ORG VERIFICATION MOCK DATA & SERVICE
// ==========================================
let orgsQueueData = [
  {
    id: 'ORG-01',
    name: 'Quỹ Từ Thiện Áo Ấm Vùng Cao',
    type: 'Quỹ từ thiện (NĐ 03/2026/NĐ-CP)',
    taxCode: '0312891204',
    representative: 'Lê Văn Cường (Chủ tịch Quỹ)',
    cccd: '079089012345',
    phone: '028 3822 9912',
    email: 'lienhe@aoamvungcao.org',
    address: '45 Nguyễn Đình Chiểu, P. Đa Kao, Q. 1, TP.HCM',
    receivingDropoff: 'Văn phòng quỹ - 45 Nguyễn Đình Chiểu (T2-T6, 8h-17h)',
    documents: [
      { name: 'Giấy phép thành lập và công nhận điều lệ quỹ (QĐ 145/QĐ-UBND)', url: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=500' },
      { name: 'Điều lệ quỹ đã được công nhận', url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=500' },
      { name: 'CCCD người đại diện hai mặt (Tự xóa sau 30 ngày)', url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=500' },
    ],
    submittedAt: '14/10/2026',
    status: 'PENDING',
  },
  {
    id: 'ORG-02',
    name: 'Câu Lạc Bộ Tình Nguyện Cầu Vồng',
    type: 'Câu lạc bộ trực thuộc Đoàn Trường ĐH KHXH&NV',
    taxCode: '', // Không có mã số thuế
    representative: 'Nguyễn Thị Bích (Chủ nhiệm CLB)',
    cccd: '075199008812',
    phone: '0918 332 109',
    email: 'clbcauvong@ussh.edu.vn',
    address: 'Phòng C102, 10-12 Đinh Tiên Hoàng, Q. 1, TP.HCM',
    receivingDropoff: 'Sảnh C nhà trường (T3-T5, 9h-16h)',
    documents: [
      { name: 'Quyết định thành lập CLB của Đoàn trường', url: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=500' },
      { name: 'Văn bản cử người đại diện phụ trách', url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=500' },
      { name: 'CCCD người phụ trách hai mặt', url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=500' },
    ],
    submittedAt: '15/10/2026',
    status: 'PENDING',
  },
];

let legalChangesData = [
  {
    id: 'CHG-801',
    orgName: 'Mái Ấm Hy Vọng Quận 8',
    orgType: 'Cơ sở bảo trợ xã hội ngoài công lập',
    currentRep: 'Trần Văn Long (Đã nghỉ hưu)',
    newRep: 'Trần Hoài Nam (Giám đốc điều hành mới)',
    newCccd: '079092001122',
    reason: 'Thay đổi người đại diện theo pháp luật theo Biên bản họp Hội đồng thành viên số 12/BB-HĐ',
    documents: [
      { name: 'Biên bản thay đổi người đại diện', url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=500' },
      { name: 'Giấy phép hoạt động điều chỉnh (Sở LĐ-TB&XH)', url: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=500' },
      { name: 'CCCD người đại diện mới hai mặt', url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=500' },
    ],
    submittedAt: '12/10/2026',
    status: 'PENDING',
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

  async approveOrg(orgId) {
    await delay();
    orgsQueueData = orgsQueueData.map((org) =>
      org.id === orgId ? { ...org, status: 'APPROVED' } : org
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
};

// ==========================================
// 3. VIOLATION REPORTS MOCK DATA & SERVICE
// ==========================================
let violationReportsData = [
  {
    id: 'REP-101',
    type: 'POST', // 'POST' | 'CAMPAIGN' | 'COMMENT'
    targetTitle: 'Bài viết: "Kêu gọi quyên góp khẩn cấp chuyển tiền vào STK cá nhân..."',
    authorName: 'Mái Ấm Hy Vọng Tự Phát',
    authorRole: 'Tổ chức',
    reporterName: 'Lê Hoàng Nam (Member)',
    reporterCode: 'MB-008129',
    reason: 'Bài viết kêu gọi chuyển tiền mặt vào số tài khoản cá nhân, sai lệch mục đích quyên góp quần áo của ReHome.',
    evidenceUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=500',
    submittedAt: '15/10/2026 09:15',
    status: 'PENDING',
  },
  {
    id: 'REP-102',
    type: 'CAMPAIGN',
    targetTitle: 'Chiến dịch: "Tiếp nhận áo ấm mùa đông tại 999 Hoàng Hoa Thám"',
    authorName: 'CLB Thiện Nguyện Ánh Sao',
    authorRole: 'Tổ chức',
    reporterName: 'Trần Thị B (Member)',
    reporterCode: 'MB-0098231',
    reason: 'Địa điểm nhận đồ không có thật, người dân mang đồ đến không có ai tiếp nhận.',
    submittedAt: '14/10/2026 14:30',
    status: 'PENDING',
  },
  {
    id: 'REP-103',
    type: 'COMMENT',
    targetTitle: 'Bình luận trên bài viết "Tổng kết chiến dịch vùng cao 2026"',
    authorName: 'Nguyễn Văn Đạt',
    authorRole: 'Member',
    reporterName: 'Quỹ Áo Ấm Vùng Cao',
    reason: 'Sử dụng ngôn từ lăng mạ, vu khống tổ chức chiếm đoạt quần áo quyên góp.',
    submittedAt: '14/10/2026 11:00',
    status: 'RESOLVED',
    actionTaken: 'Đã xóa bình luận',
  },
];

export const violationReportService = {
  async list({ type } = {}) {
    await delay();
    let data = [...violationReportsData];
    if (type && type !== 'ALL') {
      data = data.filter((r) => r.type === type);
    }
    return { data, total: data.length };
  },

  async takeAction(reportId, actionName) {
    await delay();
    violationReportsData = violationReportsData.map((r) =>
      r.id === reportId ? { ...r, status: 'RESOLVED', actionTaken: actionName } : r
    );
    return violationReportsData.find((r) => r.id === reportId);
  },

  async dismiss(reportId) {
    await delay();
    violationReportsData = violationReportsData.map((r) =>
      r.id === reportId ? { ...r, status: 'RESOLVED', actionTaken: 'Bỏ qua (Không vi phạm)' } : r
    );
    return violationReportsData.find((r) => r.id === reportId);
  },
};

// ==========================================
// 4. WAREHOUSE INBOX MOCK DATA & SERVICE
// ==========================================
let inboxConversationsData = [
  {
    id: 'CONV-01',
    memberCode: 'MB-0098231',
    memberName: 'Trần Thị B',
    phone: '0900000002',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    subject: 'Hỏi về thời hạn rút hàng miễn phí kỳ 2',
    lastMessage: 'Dạ anh/chị cho em hỏi món áo blazer của em qua kỳ 2 có được 7 ngày rút miễn phí nữa không ạ?',
    lastTime: '13:40',
    unread: true,
    messages: [
      { sender: 'member', text: 'Chào kho ReHome Quận 7 ạ!', time: '13:35' },
      { sender: 'member', text: 'Dạ anh/chị cho em hỏi món áo blazer của em qua kỳ 2 có được 7 ngày rút miễn phí nữa không ạ?', time: '13:40' },
    ],
  },
  {
    id: 'CONV-02',
    memberCode: 'MB-008129',
    memberName: 'Lê Hoàng Nam',
    phone: '0912 345 678',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    subject: 'Xác nhận đến lấy đồ ký gửi bị từ chối',
    lastMessage: 'Cảm ơn kho, chiều nay 16h em ghé lấy lại áo sơ mi ạ.',
    lastTime: '11:15',
    unread: false,
    messages: [
      { sender: 'moderator', text: 'Chào bạn Nam, form ký gửi áo sơ mi của bạn đã được kiểm định xong tại quầy.', time: '11:00' },
      { sender: 'member', text: 'Cảm ơn kho, chiều nay 16h em ghé lấy lại áo sơ mi ạ.', time: '11:15' },
    ],
  },
  {
    id: 'CONV-03',
    memberCode: 'MB-001',
    memberName: 'Nguyễn An',
    phone: '0900000001',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    subject: 'Kiểm tra tiến độ đơn hàng trả về',
    lastMessage: 'Kho đã nhận được kiện hoàn Áo len dệt kim TEST-SKU-1 chưa ạ?',
    lastTime: '09:20',
    unread: false,
    messages: [
      { sender: 'member', text: 'Kho đã nhận được kiện hoàn Áo len dệt kim TEST-SKU-1 chưa ạ?', time: '09:20' },
      { sender: 'moderator', text: 'Chào bạn An, kiện hàng đã được nhân viên kho kiểm định hợp lệ và hoàn tiền vào ví bạn rồi nhé!', time: '09:25' },
    ],
  },
];

export const warehouseInboxService = {
  async getConversations() {
    await delay();
    return { data: [...inboxConversationsData], total: inboxConversationsData.length };
  },

  async sendMessage(convId, text) {
    await delay();
    const newMsg = {
      sender: 'moderator',
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
};
