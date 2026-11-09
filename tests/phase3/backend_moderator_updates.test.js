import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queueService } from '../../src/features/moderator/services/queueApi.js';
import { returnService } from '../../src/features/moderator/services/returnApi.js';
import { warehouseInboxService } from '../../src/features/moderator/services/warehouseInboxApi.js';
import { orgVerificationService } from '../../src/features/moderator/services/orgVerificationApi.js';
import { callBackend } from '../../src/features/moderator/services/warehouseTransport.js';
import { catalogService } from '../../src/features/moderator/services/catalogApi.js';

vi.mock('../../src/features/moderator/services/warehouseTransport.js', () => ({ callBackend: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

describe('updated Moderator backend contracts', () => {
  it.each(['category', 'brand'])('deletes a %s through the backend endpoint', async (kind) => {
    vi.mocked(callBackend).mockResolvedValue(null);
    await catalogService.delete(kind, 'catalog-1');
    expect(callBackend).toHaveBeenCalledWith(expect.objectContaining({
      method: 'delete', url: `/${kind === 'category' ? 'categories' : 'brands'}/catalog-1`,
    }), expect.any(Object));
  });

  it('loads WITHDRAWAL tasks while preserving the request reference for counter handover', async () => {
    vi.mocked(callBackend).mockResolvedValue([{ id: 'queue-w', type: 'WITHDRAWAL', refId: 'withdrawal-1', targetName: 'Áo', subjectSubtitle: 'Member' }]);
    await expect(queueService.list({ type: 'WITHDRAWAL' })).resolves.toEqual([expect.objectContaining({ queueId: 'queue-w', refId: 'withdrawal-1', name: 'Áo', memberName: 'Member' })]);
    expect(callBackend).toHaveBeenCalledWith(expect.objectContaining({ url: '/queues', params: { type: 'WITHDRAWAL' } }), expect.any(Object));
  });

  it('keeps queue item identity separate from the return request identity', async () => {
    vi.mocked(callBackend).mockResolvedValue([{ id: 'queue-1', refId: 'return-1', type: 'RETURN', targetName: 'DH-01' }]);
    const [item] = await queueService.list({ type: 'RETURN' });
    expect(callBackend).toHaveBeenCalledWith(expect.objectContaining({ url: '/queues', params: { type: 'RETURN' } }), expect.any(Object));
    expect(item).toMatchObject({ queueId: 'queue-1', returnId: 'return-1', refId: 'return-1', name: 'DH-01' });
  });

  it('uses the authenticated warehouse return queue and preserves its empty result', async () => {
    vi.mocked(callBackend).mockResolvedValue({ content: [], totalElements: 0, page: 0, totalPages: 0 });
    await expect(returnService.list({ warehouseId: 'other-warehouse', page: 0, size: 20 })).resolves.toMatchObject({ data: [], total: 0 });
    expect(callBackend).toHaveBeenCalledWith(expect.objectContaining({ url: '/return-requests/queue', params: { page: 0, size: 20 } }), expect.any(Object));
  });

  it('preserves root Member summaries including zero counts from API 110', async () => {
    const summary = { id: 'conv-1', counterpart: { id: 'member-1', displayName: 'Member' }, phone: '0901234567', consignCount: 3, shippingCount: 0, returnCount: 1 };
    vi.mocked(callBackend).mockResolvedValue({ content: [summary], totalElements: 1 });
    await expect(warehouseInboxService.getConversations()).resolves.toEqual({ data: [summary], total: 1 });
  });

  it('allows the Moderator organization detail flow to use API 100', async () => {
    vi.mocked(callBackend).mockResolvedValue({ id: 'org-1', displayName: 'Organization' });
    await expect(orgVerificationService.getOrgPublicDetail('org-1')).resolves.toMatchObject({ id: 'org-1' });
    expect(callBackend).toHaveBeenCalledWith(expect.objectContaining({ method: 'get', url: '/api/organizations/org-1' }), expect.any(Object));
  });
});
