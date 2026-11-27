import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { WarehouseHistoryTabs } from '../../src/features/moderator/components/WarehouseHistoryTabs.jsx';
import { warehouseHistoryService } from '../../src/features/moderator/services/warehouseHistoryApi.js';
import { consignmentService } from '../../src/features/moderator/services/consignmentApi.js';
import { inventoryService } from '../../src/features/moderator/services/inventoryApi.js';
import { packingService } from '../../src/features/moderator/services/packingApi.js';
import baseApi from '../../src/services/baseApi.js';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => ({
  user: { id: 'mod', warehouseId: 'warehouse-a' }, isAuthenticated: true,
}) }));

function mount(url = '/moderator/packing?view=history') {
  return render(<MemoryRouter initialEntries={[url]}><Phase2Provider>
    <WarehouseHistoryTabs type="PACKING"><p>Đang làm việc</p></WarehouseHistoryTabs>
  </Phase2Provider></MemoryRouter>);
}
it('loads persistent history from the server on reload and paginates separately from the queue', async () => {
  const list = vi.spyOn(warehouseHistoryService, 'list').mockImplementation(async (_, params) => ({
    content: [{ id: `event-${params.page}`, actionType: 'CREATE_SHIPMENT', targetType: 'ORDER',
      targetId: 'o1', targetLabel: `DH-${params.page}`, actorName: 'Nhân viên A',
      createdAt: '2026-11-14T01:00:00Z', result: 'SUCCESS' }], totalPages: 2,
  }));
  const first = mount();
  await screen.findByText('Đơn hàng DH-0');
  expect(screen.getByText('Nhân viên A')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Sau' }));
  await screen.findByText('Đơn hàng DH-1');
  expect(list).toHaveBeenLastCalledWith('PACKING', { page: 1, size: 20 }, expect.any(Object));
  first.unmount();
  mount('/moderator/packing?view=history&historyPage=1');
  await screen.findByText('Đơn hàng DH-1');
});
it('does not fetch history on the work tab; handles errors and retry without fake rows', async () => {
  const list = vi.spyOn(warehouseHistoryService, 'list').mockRejectedValueOnce(new Error('Không tải được lịch sử'))
    .mockResolvedValue({ content: [], totalPages: 0 });
  mount('/moderator/packing');
  expect(list).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('tab', { name: 'Lịch sử' }));
  await screen.findByText('Không tải được lịch sử');
  expect(screen.queryByRole('button', { name: 'Tải lại lịch sử' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại trạng thái' }));
  await waitFor(() => expect(screen.getByText('Chưa có lịch sử thao tác.')).toBeInTheDocument());
});

it('prefers row.targetId over parsed row.target label when building detail links', async () => {
  vi.spyOn(warehouseHistoryService, 'list').mockResolvedValueOnce({
    content: [
      {
        id: 'evt-1',
        action: 'APPROVE_FORM',
        target: 'CONSIGNMENT_FORM CF-0099',
        targetId: '550e8400-e29b-41d4-a716-446655440099',
        actor: 'Nhân viên A',
        timestamp: '2026-11-19T01:00:00Z',
        result: 'APPROVED',
      },
    ],
    totalPages: 1,
  });

  mount('/moderator/consignments?view=history');
  const link = await screen.findByRole('link', { name: 'Phiếu ký gửi CF-0099' });
  expect(link).toHaveAttribute(
    'href',
    '/moderator/consignments/550e8400-e29b-41d4-a716-446655440099',
  );
});

it('resolves non-UUID formNo in consignmentService.read when direct lookup returns 400/404', async () => {
  const realUuid = '550e8400-e29b-41d4-a716-446655440012';
  const reqSpy = vi.spyOn(baseApi, 'request').mockImplementation(async (cfg) => {
    if (cfg.url.endsWith('/CF-0012')) {
      const err = new Error('Invalid UUID');
      err.response = { status: 400, data: { message: 'Invalid UUID' } };
      throw err;
    }
    if (cfg.url.includes('/consignment-forms') && !cfg.url.endsWith(realUuid)) {
      return {
        data: {
          data: {
            content: [{ id: realUuid, formNo: 'CF-0012', productName: 'Áo sơ mi' }],
          },
        },
      };
    }
    if (cfg.url.endsWith(realUuid)) {
      return {
        data: {
          data: { id: realUuid, formNo: 'CF-0012', productName: 'Áo sơ mi', status: 'APPROVED' },
        },
      };
    }
    throw new Error(`Unexpected request: ${cfg.url}`);
  });

  const detail = await consignmentService.read('CF-0012');
  expect(detail.id).toBe(realUuid);
  expect(detail.formNo).toBe('CF-0012');
  reqSpy.mockRestore();
});

it('resolves UUID productId in inventoryService.read when direct SKU lookup returns 404', async () => {
  const realUuid = '550e8400-e29b-41d4-a716-446655440077';
  const reqSpy = vi.spyOn(baseApi, 'request').mockImplementation(async (cfg) => {
    if (cfg.url.endsWith(`/${realUuid}`)) {
      const err = new Error('Product not found');
      err.response = { status: 404, data: { message: 'Not found' } };
      throw err;
    }
    if (cfg.url.includes('/inventory')) {
      return {
        data: {
          data: {
            content: [{ id: realUuid, sku: 'RH-SKU-077', name: 'Quần jean' }],
          },
        },
      };
    }
    if (cfg.url.endsWith('/RH-SKU-077')) {
      return {
        data: {
          data: { id: realUuid, sku: 'RH-SKU-077', name: 'Quần jean', status: 'ON_SALE' },
        },
      };
    }
    throw new Error(`Unexpected request: ${cfg.url}`);
  });

  const detail = await inventoryService.read(realUuid);
  expect(detail.name).toBe('Quần jean');
  expect(reqSpy).toHaveBeenCalledWith(
    expect.objectContaining({ url: expect.stringContaining('RH-SKU-077') }),
  );
  reqSpy.mockRestore();
});

it('links ORDER history row to UUID when targetType and targetId are present', async () => {
  const realUuid = '550e8400-e29b-41d4-a716-446655440019';
  const listSpy = vi.spyOn(warehouseHistoryService, 'list').mockResolvedValueOnce({
    content: [
      {
        id: 'evt-order-19',
        action: 'SCAN_SKU',
        target: 'ORDER OD-2026-000019',
        targetType: 'ORDER',
        targetId: realUuid,
        actor: 'Phạm Thị Thu Hà',
        timestamp: '2026-11-25T06:00:00Z',
        result: 'SUCCESS',
      },
    ],
    totalPages: 1,
  });

  try {
    mount('/moderator/packing?view=history');
    const link = await screen.findByRole('link', { name: 'Đơn hàng OD-2026-000019' });
    expect(link).toHaveAttribute('href', `/moderator/packing?orderId=${realUuid}`);
  } finally {
    listSpy.mockRestore();
  }
});

it('resolves non-UUID orderNo via PACKING queue when GET /orders/{id} returns 400', async () => {
  const realUuid = '550e8400-e29b-41d4-a716-446655440019';
  const scope = { userId: 'mod', warehouseId: 'warehouse-a' };
  const reqSpy = vi.spyOn(baseApi, 'request').mockImplementation(async (cfg) => {
    if (cfg.url === '/orders/OD-2026-000019') {
      const err = new Error('Bad Request');
      err.response = { status: 400, data: { message: "Giá trị của 'id' không hợp lệ." } };
      throw err;
    }
    if (cfg.url === '/queues') {
      return {
        data: {
          result: [{ id: 'q-19', type: 'PACKING', refId: realUuid, orderNo: 'OD-2026-000019' }],
        },
      };
    }
    if (cfg.url === `/orders/${realUuid}`) {
      return {
        data: {
          result: {
            id: realUuid,
            orderNo: 'OD-2026-000019',
            warehouseId: 'warehouse-a',
            status: 'PAID',
            items: [],
          },
        },
      };
    }
    throw new Error(`Unexpected request: ${cfg.url}`);
  });

  try {
    const detail = await packingService.read('OD-2026-000019', { scope });
    expect(detail.id).toBe(realUuid);
    expect(detail.orderId).toBe(realUuid);
    expect(detail.orderNo).toBe('OD-2026-000019');
  } finally {
    reqSpy.mockRestore();
  }
});

it('falls back to /orders/warehouse/sold when non-UUID orderNo is no longer in PACKING queue', async () => {
  const realUuid = '550e8400-e29b-41d4-a716-446655440020';
  const scope = { userId: 'mod', warehouseId: 'warehouse-a' };
  const reqSpy = vi.spyOn(baseApi, 'request').mockImplementation(async (cfg) => {
    if (cfg.url === '/orders/OD-2026-000020') {
      const err = new Error('Bad Request');
      err.response = { status: 400, data: { message: "Giá trị của 'id' không hợp lệ." } };
      throw err;
    }
    if (cfg.url === '/queues') {
      return { data: { result: [] } };
    }
    if (cfg.url === '/orders/warehouse/sold') {
      return {
        data: {
          result: {
            orders: {
              content: [{ id: realUuid, orderNo: 'OD-2026-000020' }],
              totalPages: 1,
            },
          },
        },
      };
    }
    if (cfg.url === `/orders/${realUuid}`) {
      return {
        data: {
          result: {
            id: realUuid,
            orderNo: 'OD-2026-000020',
            warehouseId: 'warehouse-a',
            status: 'PACKED',
            items: [],
          },
        },
      };
    }
    throw new Error(`Unexpected request: ${cfg.url}`);
  });

  try {
    const detail = await packingService.read('OD-2026-000020', { scope });
    expect(detail.id).toBe(realUuid);
    expect(detail.orderNo).toBe('OD-2026-000020');
  } finally {
    reqSpy.mockRestore();
  }
});
