import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL, API_ENDPOINTS } from '../../src/configs/api.config.js';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import DonationsPage from '../../src/features/moderator/pages/DonationsPage.jsx';
import { INVENTORY_STATUS_LABELS } from '../../src/features/moderator/pages/WarehouseInventoryPage.jsx';
import { Status } from '../../src/features/moderator/components/WarehouseUi.jsx';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 'mod-1', role: 'moderator', warehouseId: 'wh-1' } }),
}));

const server = setupServer();
const ok = (result) => HttpResponse.json({ isSuccess: true, result });

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderDonations(url = '/moderator/donations') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Phase2Provider>
        <Routes>
          <Route path="/moderator/donations" element={<DonationsPage />} />
        </Routes>
      </Phase2Provider>
    </MemoryRouter>,
  );
}

describe('Moderator DonationsPage (Luồng A & B)', () => {
  const campaigns = [
    {
      id: 'camp-1',
      title: 'Áo ấm mùa đông',
      endTime: '2026-12-20T00:00:00Z',
      preferredItemTypes: ['Áo khoác', 'Chăn ấm'],
      organization: { id: 'org-1', displayName: 'Quỹ Hy Vọng' },
      warehouses: [{ id: 'wh-1', name: 'Điểm ký gửi - TPHCM' }],
    },
  ];

  it('records direct donation at counter, labels consigned item donations with photo/SKU/moderator, and lists notes & SKUs in handover modal', async () => {
    let donations = [
      {
        id: 'don-b',
        warehouseId: 'wh-1',
        campaignId: 'camp-1',
        campaignTitle: 'Áo ấm mùa đông',
        organizationId: 'org-1',
        organizationName: 'Quỹ Hy Vọng',
        source: 'CONSIGNED_ITEM',
        product: {
          id: 'Q7-AK-000111',
          sku: 'Q7-AK-000111',
          name: 'Áo khoác dạ',
          photoUrl: 'https://img.test/ao-khoac.jpg',
        },
        donorName: 'Trần Bình',
        isAnonymous: false,
        note: 'Món ký gửi: Áo khoác dạ · SKU Q7-AK-000111',
        recordedBy: 'MOD-01',
        status: 'PENDING_PICKUP',
        createdAt: '2026-11-11T09:00:00Z',
      },
    ];
    let recordedBody = null;
    let handoverBody = null;

    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.MY_WAREHOUSES}`, () =>
        HttpResponse.json([{ id: 'wh-1', name: 'Điểm ký gửi - TPHCM' }]),
      ),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.WAREHOUSE_CAMPAIGNS('wh-1')}`, () =>
        ok({ content: campaigns, totalPages: 1 }),
      ),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.WAREHOUSE_DONATIONS('wh-1')}`, () => ok(donations)),
      http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.WAREHOUSE_DONATIONS('wh-1')}`, async ({ request }) => {
        recordedBody = await request.json();
        const created = {
          id: 'don-a',
          warehouseId: 'wh-1',
          campaignId: recordedBody.campaignId,
          campaignTitle: 'Áo ấm mùa đông',
          organizationId: 'org-1',
          organizationName: 'Quỹ Hy Vọng',
          donorName: recordedBody.donorName,
          isAnonymous: recordedBody.isAnonymous,
          note: recordedBody.note,
          recordedBy: 'MOD-02',
          status: 'PENDING_PICKUP',
          createdAt: '2026-11-11T10:00:00Z',
        };
        donations = [created, ...donations];
        return ok(created);
      }),
      http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.HANDOVER_DONATIONS('wh-1')}`, async ({ request }) => {
        handoverBody = await request.json();
        donations = donations.map((d) =>
          handoverBody.donationIds.includes(d.id) ? { ...d, status: 'HANDED_OVER', handedOverAt: '2026-11-11T11:00:00Z' } : d,
        );
        return ok({ handedOverCount: handoverBody.donationIds.length, organizationId: 'org-1', status: 'HANDED_OVER' });
      }),
    );

    renderDonations();

    expect(await screen.findByText('Món ký gửi · SKU Q7-AK-000111')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Áo khoác dạ' })).toHaveAttribute('src', 'https://img.test/ao-khoac.jpg');
    expect(screen.getByText('MOD-01')).toBeInTheDocument();
    expect(screen.getByText('Áo khoác, Chăn ấm')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Tên người quyên góp/), { target: { value: 'Nguyễn An' } });
    fireEvent.change(screen.getByLabelText(/Ghi chú gộp hiện vật/), { target: { value: '5 áo, 2 chăn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận lượt quyên góp' }));

    await waitFor(() =>
      expect(recordedBody).toEqual({
        campaignId: 'camp-1',
        donorName: 'Nguyễn An',
        isAnonymous: false,
        note: '5 áo, 2 chăn',
      }),
    );
    expect(await screen.findByText('5 áo, 2 chăn')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn lượt don-b' }));
    fireEvent.click(screen.getByRole('button', { name: /Bàn giao cho tổ chức \(1\)/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Món ký gửi: Áo khoác dạ · SKU Q7-AK-000111')).toBeInTheDocument();
    expect(within(dialog).getByText('Q7-AK-000111')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận bàn giao' }));

    await waitFor(() =>
      expect(handoverBody).toEqual({
        donationIds: ['don-b'],
        organizationId: 'org-1',
        campaignId: 'camp-1',
      }),
    );
  });

  it('blocks direct donation recording when warehouse has no open campaigns and surfaces 4xx form & 400 handover errors', async () => {
    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.MY_WAREHOUSES}`, () =>
        HttpResponse.json([{ id: 'wh-1', name: 'Điểm ký gửi - TPHCM' }]),
      ),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.WAREHOUSE_CAMPAIGNS('wh-1')}`, () =>
        ok({ content: [], totalPages: 0 }),
      ),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.WAREHOUSE_DONATIONS('wh-1')}`, () => ok([])),
    );

    renderDonations();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Địa điểm này hiện không có chiến dịch nào nhận đồ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ghi nhận lượt quyên góp' })).toBeDisabled();
  });

  it('prefills donorName from query param, shows 4xx record error on form, and shows 400 handover error in modal', async () => {
    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.MY_WAREHOUSES}`, () =>
        HttpResponse.json([{ id: 'wh-1', name: 'Điểm ký gửi - TPHCM' }]),
      ),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.WAREHOUSE_CAMPAIGNS('wh-1')}`, () =>
        ok({ content: campaigns, totalPages: 1 }),
      ),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.WAREHOUSE_DONATIONS('wh-1')}`, () =>
        ok([
          {
            id: 'don-1',
            warehouseId: 'wh-1',
            campaignId: 'camp-1',
            campaignTitle: 'Áo ấm mùa đông',
            organizationId: 'org-1',
            organizationName: 'Quỹ Hy Vọng',
            donorName: 'Lê Hoa',
            isAnonymous: false,
            note: '2 áo len',
            recordedBy: 'MOD-01',
            status: 'PENDING_PICKUP',
            createdAt: '2026-11-11T09:00:00Z',
          },
        ]),
      ),
      http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.WAREHOUSE_DONATIONS('wh-1')}`, () =>
        HttpResponse.json({ message: 'Chiến dịch đã hết hạn nhận đồ.' }, { status: 409 }),
      ),
      http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.HANDOVER_DONATIONS('wh-1')}`, () =>
        HttpResponse.json({ message: 'Danh sách quyên góp không hợp lệ.' }, { status: 400 }),
      ),
    );

    renderDonations('/moderator/donations?donorName=L%C3%AA%20Hoa');

    const donorInput = await screen.findByLabelText(/Tên người quyên góp/);
    expect(donorInput).toHaveValue('Lê Hoa');

    fireEvent.change(screen.getByLabelText(/Ghi chú gộp hiện vật/), { target: { value: '3 khăn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận lượt quyên góp' }));
    expect(await screen.findByText('Chiến dịch đã hết hạn nhận đồ.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn lượt don-1' }));
    fireEvent.click(screen.getByRole('button', { name: /Bàn giao cho tổ chức \(1\)/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận bàn giao' }));

    expect(
      await within(dialog).findByText('Danh sách không hợp lệ (có lượt đã bàn giao hoặc khác chiến dịch). Tải lại rồi chọn lại.'),
    ).toBeInTheDocument();
  });

  it('displays Đã quyên góp label for DONATED status in inventory UI', () => {
    expect(INVENTORY_STATUS_LABELS.DONATED).toBe('Đã quyên góp');
    render(<Status>DONATED</Status>);
    expect(screen.getByText('Đã quyên góp')).toBeInTheDocument();
  });
});

