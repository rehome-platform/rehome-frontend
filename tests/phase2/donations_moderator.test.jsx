import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL, API_ENDPOINTS } from '../../src/configs/api.config.js';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import DonationsPage from '../../src/features/moderator/pages/DonationsPage.jsx';

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
      organization: { id: 'org-1', displayName: 'Quỹ Hy Vọng' },
      warehouses: [{ id: 'wh-1', name: 'Điểm ký gửi - TPHCM' }],
    },
  ];

  it('records direct donation at counter, labels consigned item donations with SKU, and hands over selected items', async () => {
    let donations = [
      {
        id: 'don-b',
        warehouseId: 'wh-1',
        campaignId: 'camp-1',
        campaignTitle: 'Áo ấm mùa đông',
        organizationId: 'org-1',
        organizationName: 'Quỹ Hy Vọng',
        productId: 'Q7-AK-000111',
        productName: 'Áo khoác dạ',
        donorName: 'Trần Bình',
        isAnonymous: false,
        note: 'Món ký gửi: Áo khoác dạ · SKU Q7-AK-000111',
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
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận bàn giao' }));

    await waitFor(() =>
      expect(handoverBody).toEqual({
        donationIds: ['don-b'],
        organizationId: 'org-1',
        campaignId: 'camp-1',
      }),
    );
  });

  it('blocks direct donation recording when warehouse has no open campaigns', async () => {
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

    expect(await screen.findByText(/Chưa có chiến dịch đang nhận đồ tại điểm ký gửi này/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ghi nhận lượt quyên góp' })).toBeDisabled();
  });
});

