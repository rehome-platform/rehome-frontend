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

    fireEvent.click(within(dialog).getByLabelText(/Đúng người nhận/i));
    fireEvent.click(within(dialog).getByLabelText(/Đủ số lượng/i));
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
    fireEvent.click(within(dialog).getByLabelText(/Đúng người nhận/i));
    fireEvent.click(within(dialog).getByLabelText(/Đủ số lượng/i));
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

  it('QG-01: switches ACTIVE/HISTORY views, sends search & pagination params, handles array fallback, hides locked orgs from ACTIVE, and shows pending/handedOver counts', async () => {
    const requestedParams = [];
    const allCampaigns = [
      {
        id: 'camp-active',
        title: 'Chiến dịch Đang Mở',
        status: 'OPEN',
        endTime: '2026-12-20T00:00:00Z',
        pendingCount: 3,
        handedOverCount: 5,
        organization: { id: 'org-1', displayName: 'Quỹ Hy Vọng', status: 'ACTIVE' },
        warehouses: [{ id: 'wh-1', name: 'Điểm ký gửi - TPHCM' }],
      },
      {
        id: 'camp-locked-org',
        title: 'Chiến dịch Tổ Chức Bị Khóa',
        status: 'OPEN',
        endTime: '2026-12-20T00:00:00Z',
        pendingCount: 1,
        handedOverCount: 0,
        organization: { id: 'org-locked', displayName: 'Tổ chức Bị Khóa', status: 'LOCKED' },
        warehouses: [{ id: 'wh-1', name: 'Điểm ký gửi - TPHCM' }],
      },
      {
        id: 'camp-closed',
        title: 'Chiến dịch Đã Đóng',
        status: 'CLOSED',
        endTime: '2026-10-01T00:00:00Z',
        pendingCount: 2,
        handedOverCount: 9,
        organization: { id: 'org-2', displayName: 'Quỹ Ánh Sáng', status: 'ACTIVE' },
        warehouses: [{ id: 'wh-1', name: 'Điểm ký gửi - TPHCM' }],
      },
    ];

    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.MY_WAREHOUSES}`, () =>
        HttpResponse.json([{ id: 'wh-1', name: 'Điểm ký gửi - TPHCM' }]),
      ),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.WAREHOUSE_CAMPAIGNS('wh-1')}`, ({ request }) => {
        const url = new URL(request.url);
        requestedParams.push({
          view: url.searchParams.get('view'),
          q: url.searchParams.get('q'),
          page: url.searchParams.get('page'),
          size: url.searchParams.get('size'),
        });
        // Simulate backend returning a raw array & ignoring view=HISTORY
        return ok(allCampaigns);
      }),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.WAREHOUSE_DONATIONS('wh-1')}`, () => ok([])),
    );

    renderDonations();

    expect((await screen.findAllByText('Chiến dịch Đang Mở')).length).toBeGreaterThan(0);
    expect(screen.getByText('3 chờ lấy')).toBeInTheDocument();
    expect(screen.getByText('5 đã bàn giao')).toBeInTheDocument();
    // Locked org campaign must NOT appear in ACTIVE view
    expect(screen.queryByText('Chiến dịch Tổ Chức Bị Khóa')).not.toBeInTheDocument();
    expect(screen.queryByText('Chiến dịch Đã Đóng')).not.toBeInTheDocument();

    // Switch to HISTORY view
    fireEvent.click(screen.getByRole('tab', { name: /Lịch sử chiến dịch/i }));

    expect((await screen.findAllByText('Chiến dịch Đã Đóng')).length).toBeGreaterThan(0);
    expect(screen.getByText('2 chờ lấy')).toBeInTheDocument();
    expect(screen.getByText('9 đã bàn giao')).toBeInTheDocument();
    // Active campaign must NOT appear in HISTORY fallback
    expect(screen.queryByText('Chiến dịch Đang Mở')).not.toBeInTheDocument();

    // Search in HISTORY
    fireEvent.change(screen.getByLabelText(/Tìm chiến dịch/i), { target: { value: 'Ánh Sáng' } });

    await waitFor(() => {
      expect(requestedParams.some((p) => p.view === 'HISTORY' && p.q === 'Ánh Sáng' && p.page === '0')).toBe(true);
    });
  });

  it('QG-02: blocks creating new donations for CLOSED/EXPIRED/LOCKED/BANNED campaign while allowing viewing and handing over existing PENDING donations', async () => {
    let handoverCalled = false;
    const closedCampaign = {
      id: 'camp-closed',
      title: 'Chiến dịch Mùa Hè (Đã đóng)',
      status: 'CLOSED',
      endTime: '2026-10-01T00:00:00Z',
      pendingCount: 1,
      handedOverCount: 0,
      organization: { id: 'org-2', displayName: 'Quỹ Ánh Sáng' },
      warehouses: [{ id: 'wh-1', name: 'Điểm ký gửi - TPHCM' }],
    };

    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.MY_WAREHOUSES}`, () =>
        HttpResponse.json([{ id: 'wh-1', name: 'Điểm ký gửi - TPHCM' }]),
      ),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.WAREHOUSE_CAMPAIGNS('wh-1')}`, ({ request }) => {
        const view = new URL(request.url).searchParams.get('view');
        if (view === 'HISTORY') return ok({ content: [closedCampaign], totalPages: 1 });
        return ok({ content: [], totalPages: 0 });
      }),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.WAREHOUSE_DONATIONS('wh-1')}`, () =>
        ok([
          {
            id: 'don-old-1',
            warehouseId: 'wh-1',
            campaignId: 'camp-closed',
            campaignTitle: 'Chiến dịch Mùa Hè (Đã đóng)',
            organizationId: 'org-2',
            organizationName: 'Quỹ Ánh Sáng',
            donorName: 'Phạm Minh',
            isAnonymous: false,
            note: '10 tập vở',
            status: 'PENDING_PICKUP',
            createdAt: '2026-09-20T09:00:00Z',
          },
        ]),
      ),
      http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.HANDOVER_DONATIONS('wh-1')}`, () => {
        handoverCalled = true;
        return ok({ handedOverCount: 1, organizationId: 'org-2', status: 'HANDED_OVER' });
      }),
    );

    renderDonations();

    // Switch to HISTORY and select the closed campaign
    fireEvent.click(await screen.findByRole('tab', { name: /Lịch sử chiến dịch/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Chọn chiến dịch Mùa Hè/i }));

    // Recording form must be blocked with clear message
    expect(await screen.findByText(/không thể ghi nhận lượt quyên góp mới/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ghi nhận lượt quyên góp' })).toBeDisabled();

    // Existing PENDING_PICKUP donation can still be viewed and handed over
    expect(screen.getByText('10 tập vở')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn lượt don-old-1' }));
    fireEvent.click(screen.getByRole('button', { name: /Bàn giao cho tổ chức \(1\)/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText(/Đúng người nhận/i));
    fireEvent.click(within(dialog).getByLabelText(/Đủ số lượng/i));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận bàn giao' }));

    await waitFor(() => expect(handoverCalled).toBe(true));
  });

  it('QG-03: blocks mixing donations across different campaigns or organizations and requires both handover confirmations without duplicate submit', async () => {
    let handoverCalls = 0;
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
            id: 'don-c1',
            warehouseId: 'wh-1',
            campaignId: 'camp-1',
            campaignTitle: 'Áo ấm mùa đông',
            organizationId: 'org-1',
            organizationName: 'Quỹ Hy Vọng',
            donorName: 'Người A',
            note: 'Áo khoác',
            status: 'PENDING_PICKUP',
            createdAt: '2026-11-11T09:00:00Z',
          },
          {
            id: 'don-c1-diff-org',
            warehouseId: 'wh-1',
            campaignId: 'camp-1',
            campaignTitle: 'Áo ấm mùa đông',
            organizationId: 'org-99',
            organizationName: 'Quỹ Khác',
            donorName: 'Người B',
            note: 'Chăn bông',
            status: 'PENDING_PICKUP',
            createdAt: '2026-11-11T09:05:00Z',
          },
          {
            id: 'don-c2',
            warehouseId: 'wh-1',
            campaignId: 'camp-2',
            campaignTitle: 'Sách cho em',
            organizationId: 'org-2',
            organizationName: 'Quỹ Ánh Sáng',
            donorName: 'Người C',
            note: 'Sách giáo khoa',
            status: 'PENDING_PICKUP',
            createdAt: '2026-11-11T09:10:00Z',
          },
        ]),
      ),
      http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.HANDOVER_DONATIONS('wh-1')}`, async () => {
        handoverCalls += 1;
        await new Promise((r) => setTimeout(r, 80));
        return ok({ handedOverCount: 1, organizationId: 'org-1', status: 'HANDED_OVER' });
      }),
    );

    renderDonations();

    const cb1 = await screen.findByRole('checkbox', { name: 'Chọn lượt don-c1' });
    const cbDiffOrg = screen.getByRole('checkbox', { name: 'Chọn lượt don-c1-diff-org' });
    const cbDiffCamp = screen.getByRole('checkbox', { name: 'Chọn lượt don-c2' });

    fireEvent.click(cb1);
    expect(cbDiffOrg).toBeDisabled();
    expect(cbDiffCamp).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Bàn giao cho tổ chức \(1\)/ }));
    const dialog = screen.getByRole('dialog');
    const confirmBtn = within(dialog).getByRole('button', { name: 'Xác nhận bàn giao' });

    // Disabled until BOTH checkboxes are checked
    expect(confirmBtn).toBeDisabled();
    fireEvent.click(within(dialog).getByLabelText(/Đúng người nhận/i));
    expect(confirmBtn).toBeDisabled();
    fireEvent.click(within(dialog).getByLabelText(/Đủ số lượng/i));
    expect(confirmBtn).not.toBeDisabled();

    // Rapid double click should only submit once
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(handoverCalls).toBe(1));
  });
});

