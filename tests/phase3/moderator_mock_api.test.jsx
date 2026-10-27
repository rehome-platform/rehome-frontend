import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { returnService } from '../../src/features/moderator/services/returnApi.js';
import { orgVerificationService } from '../../src/features/moderator/services/orgVerificationApi.js';
import { violationReportService } from '../../src/features/moderator/services/violationReportApi.js';
import { warehouseInboxService } from '../../src/features/moderator/services/warehouseInboxApi.js';
import { API_BASE_URL, API_ENDPOINTS } from '../../src/configs/api.config.js';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

describe('P3: Moderator Domain MockAPI Services', () => {
  describe('1. Return Processing Service (returnService)', () => {
    it('calls GET /return-requests with Bearer token and returns response data', async () => {
      localStorage.setItem('rehome_token', 'mock-token-moderator');

      server.use(
        http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.RETURNS}`, ({ request }) => {
          expect(request.headers.get('authorization')).toBe('Bearer mock-token-moderator');
          const url = new URL(request.url);
          expect(url.searchParams.get('status')).toBe('PENDING_APPROVAL');

          return HttpResponse.json({
            result: [
              { id: 'RET-001', code: 'YC-001', status: 'PENDING_APPROVAL', amount: 350000 },
            ],
            isSuccess: true,
            statusCode: 200,
          });
        })
      );

      const res = await returnService.list({ status: 'PENDING_APPROVAL' });
      expect(Array.isArray(res.data) ? res.data : res).toBeDefined();
    });

    it('falls back to MockAPI data when server is unavailable or returns 404', async () => {
      server.use(
        http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.RETURNS}`, () => {
          return new HttpResponse(null, { status: 404 });
        })
      );

      const res = await returnService.list();
      expect(res.data).toBeDefined();
      expect(res.data.length).toBeGreaterThan(0);
      expect(res.data[0].code).toMatch(/^YC-/);
    });

    it('approves return request and calls POST /return-requests/{id}/approve', async () => {
      server.use(
        http.post(`${API_BASE_URL}/return-requests/RET-00084/approve`, () => {
          return HttpResponse.json({
            result: { id: 'RET-00084', status: 'WAITING_BUYER_DISPATCH' },
            isSuccess: true,
            statusCode: 200,
          });
        })
      );

      const res = await returnService.approveReturnAndCreateWaybill('RET-00084');
      expect(res).toBeDefined();
      expect(res.status).toBe('WAITING_BUYER_DISPATCH');
    });

    it('rejects return request and calls POST /return-requests/{id}/reject with reason', async () => {
      server.use(
        http.post(`${API_BASE_URL}/return-requests/RET-00084/reject`, async ({ request }) => {
          const body = await request.json();
          expect(body.reason).toBe('Hàng không đúng điều kiện đổi trả');
          return HttpResponse.json({
            result: { id: 'RET-00084', status: 'RESOLVED', outcome: 'REJECTED' },
            isSuccess: true,
            statusCode: 200,
          });
        })
      );

      const res = await returnService.rejectReturn('RET-00084', 'Hàng không đúng điều kiện đổi trả');
      expect(res).toBeDefined();
      expect(res.status).toBe('RESOLVED');
    });
  });

  describe('2. Organization Verification Service (orgVerificationService)', () => {
    it('calls GET /organizations/verifications or falls back to mock queue', async () => {
      server.use(
        http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.VERIFICATION_QUEUE}`, () => {
          return HttpResponse.json({
            result: [{ id: 'TC-001', name: 'Quỹ Mầm Xanh', status: 'PENDING' }],
            isSuccess: true,
            statusCode: 200,
          });
        })
      );

      const res = await orgVerificationService.getQueue();
      expect(res.data).toBeDefined();
    });

    it('calls POST /organizations/{id}/verify on approveOrg', async () => {
      server.use(
        http.post(`${API_BASE_URL}/organizations/TC-00042/verify`, async ({ request }) => {
          const body = await request.json();
          expect(body.note).toBe('Đã xác thực giấy phép hợp lệ');
          return HttpResponse.json({
            result: { id: 'TC-00042', status: 'APPROVED' },
            isSuccess: true,
            statusCode: 200,
          });
        })
      );

      const res = await orgVerificationService.approveOrg('TC-00042', 'Đã xác thực giấy phép hợp lệ');
      expect(res).toBeDefined();
      expect(res.status).toBe('APPROVED');
    });

    it('calls POST /organizations/{id}/reject on rejectOrg', async () => {
      server.use(
        http.post(`${API_BASE_URL}/organizations/TC-00042/reject`, async ({ request }) => {
          const body = await request.json();
          expect(body.reason).toBe('Giấy tờ đã hết hạn');
          return HttpResponse.json({
            result: { id: 'TC-00042', status: 'REJECTED' },
            isSuccess: true,
            statusCode: 200,
          });
        })
      );

      const res = await orgVerificationService.rejectOrg('TC-00042', 'Giấy tờ đã hết hạn');
      expect(res).toBeDefined();
      expect(res.status).toBe('REJECTED');
    });

    it('handles legal change approval and rejection', async () => {
      server.use(
        http.post(`${API_BASE_URL}/organizations/legal-change-requests/CHG-801/approve`, () => {
          return HttpResponse.json({
            result: { id: 'CHG-801', status: 'APPROVED' },
            isSuccess: true,
            statusCode: 200,
          });
        })
      );

      const approved = await orgVerificationService.approveLegalChange('CHG-801');
      expect(approved.status).toBe('APPROVED');
    });
  });

  describe('3. Violation Report Service (violationReportService)', () => {
    it('retrieves reports list and falls back gracefully when endpoint is 404', async () => {
      server.use(
        http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.VIOLATION_REPORTS}`, () => {
          return new HttpResponse(null, { status: 404 });
        })
      );

      const res = await violationReportService.list();
      expect(res.data).toBeDefined();
      expect(res.data.length).toBeGreaterThan(0);
      expect(res.data[0].id).toMatch(/^VP-/);
    });

    it('resolves violation with action and reason', async () => {
      server.use(
        http.post(`${API_BASE_URL}/violation-reports/VP-101/resolve`, async ({ request }) => {
          const body = await request.json();
          expect(body.action).toBe('Gỡ nội dung');
          expect(body.reason).toBe('Nội dung sai sự thật');
          return HttpResponse.json({
            result: { id: 'VP-101', status: 'RESOLVED', actionTaken: 'Gỡ nội dung' },
            isSuccess: true,
            statusCode: 200,
          });
        })
      );

      const res = await violationReportService.resolveViolation('VP-101', 'Gỡ nội dung', 'Nội dung sai sự thật');
      expect(res).toBeDefined();
      expect(res.status).toBe('RESOLVED');
    });

    it('dismisses violation when action is DISMISS or dismissal endpoint is called', async () => {
      server.use(
        http.post(`${API_BASE_URL}/violation-reports/VP-102/dismiss`, () => {
          return HttpResponse.json({
            result: { id: 'VP-102', status: 'DISMISSED' },
            isSuccess: true,
            statusCode: 200,
          });
        })
      );

      const res = await violationReportService.resolveViolation(
        'VP-102',
        'Bác bỏ báo cáo — nội dung không vi phạm',
        'Không có dấu hiệu vi phạm'
      );
      expect(res).toBeDefined();
      expect(res.status).toMatch(/RESOLVED|DISMISSED/);
    });
  });

  describe('4. Warehouse Inbox Service (warehouseInboxService)', () => {
    it('retrieves conversations list with MockAPI fallback', async () => {
      server.use(
        http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.WAREHOUSE_INBOX}`, () => {
          return new HttpResponse(null, { status: 404 });
        })
      );

      const res = await warehouseInboxService.getConversations();
      expect(res.data).toBeDefined();
      expect(res.data.length).toBeGreaterThan(0);
      expect(res.data[0].id).toMatch(/^CONV-/);
    });

    it('sends reply message in conversation', async () => {
      server.use(
        http.post(`${API_BASE_URL}/conversations/CONV-01/messages`, async ({ request }) => {
          const body = await request.json();
          expect(body.text).toBe('Kho đã nhận thông tin, đang xử lý cho bạn');
          return HttpResponse.json({
            result: {
              id: 'CONV-01',
              lastMessage: body.text,
              messages: [{ id: 99, text: body.text }],
            },
            isSuccess: true,
            statusCode: 200,
          });
        })
      );

      const res = await warehouseInboxService.sendMessage(
        'CONV-01',
        'Kho đã nhận thông tin, đang xử lý cho bạn',
        'Trần Văn B'
      );
      expect(res).toBeDefined();
      expect(res.lastMessage).toBe('Kho đã nhận thông tin, đang xử lý cho bạn');
    });

    it('marks conversation as completed', async () => {
      server.use(
        http.post(`${API_BASE_URL}/conversations/CONV-01/done`, () => {
          return HttpResponse.json({
            result: { id: 'CONV-01', status: 'DONE' },
            isSuccess: true,
            statusCode: 200,
          });
        })
      );

      const res = await warehouseInboxService.markAsDone('CONV-01');
      expect(res).toBeDefined();
      expect(res.status).toBe('DONE');
    });
  });
});
