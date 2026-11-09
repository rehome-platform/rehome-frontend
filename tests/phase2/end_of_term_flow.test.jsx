import React, { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import InventoryDetailPage from '../../src/features/moderator/pages/InventoryDetailPage.jsx';
import CounterPage from '../../src/features/moderator/pages/CounterPage.jsx';
import { inventoryService, counterService } from '../../src/features/moderator/services/warehouseApi.js';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';

const auth = vi.hoisted(() => ({
  user: { id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a', warehouseName: 'Kho A' },
  isAuthenticated: true,
}));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth }));

describe('Luồng Hết hạn 3 kỳ (TK-02 & BG-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('InventoryDetailPage: displays TAKE_BACK banner with formatted date and links to counter with memberCode', async () => {
    vi.spyOn(inventoryService, 'read').mockResolvedValue({
      id: 'PROD-301',
      sku: 'RH-T3N77F',
      name: 'Áo len cổ lọ Muji',
      status: 'ON_SALE',
      decision: 'TAKE_BACK',
      takeBackDate: '2026-10-30T10:00:00Z',
      daysToTakeBack: 5,
      member: {
        memberCode: 'MB-004821',
        fullName: 'Ngô Hải F',
      },
      currentPrice: 350000,
    });
    vi.spyOn(inventoryService, 'movements').mockResolvedValue([]);

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/moderator/inventory/RH-T3N77F']}>
          <Phase2Provider>
            <Routes>
              <Route path="/moderator/inventory/:sku" element={<InventoryDetailPage />} />
            </Routes>
          </Phase2Provider>
        </MemoryRouter>
      </StrictMode>
    );

    expect(await screen.findByRole('heading', { name: 'Áo len cổ lọ Muji' })).toBeInTheDocument();
    expect(screen.getByText('ĐƯỢC YÊU CẦU NHẬN LẠI HÀNG')).toBeInTheDocument();
    expect(screen.getByText(/Khách đã chọn nhận lại cuối kỳ \(miễn phí\)/)).toBeInTheDocument();
    expect(screen.getByText(/30\/10\/2026/)).toBeInTheDocument();

    const counterButton = screen.getByRole('button', { name: 'Quầy tiếp nhận →' });
    const counterLink = counterButton.closest('a');
    expect(counterLink).toHaveAttribute('href', expect.stringContaining('/moderator/counter?memberCode=MB-004821&refId=PROD-301'));
  });

  it('InventoryDetailPage: displays RE_CONSIGN banner and button navigating to negotiation page', async () => {
    vi.spyOn(inventoryService, 'read').mockResolvedValue({
      id: 'PROD-302',
      sku: 'RH-RECON01',
      name: 'Váy dạ hội cao cấp',
      status: 'WAITING_END_OF_TERM',
      decision: 'RE_CONSIGN',
      member: {
        memberCode: 'MB-009988',
        fullName: 'Lê Thu Trang',
      },
      currentPrice: 850000,
    });
    vi.spyOn(inventoryService, 'movements').mockResolvedValue([]);

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/moderator/inventory/RH-RECON01']}>
          <Phase2Provider>
            <Routes>
              <Route path="/moderator/inventory/:sku" element={<InventoryDetailPage />} />
            </Routes>
          </Phase2Provider>
        </MemoryRouter>
      </StrictMode>
    );

    expect(await screen.findByRole('heading', { name: 'Váy dạ hội cao cấp' })).toBeInTheDocument();
    expect(screen.getByText('ĐƯỢC YÊU CẦU KÝ GỬI LẠI')).toBeInTheDocument();
    expect(screen.getByText(/Ký gửi lại cuối kỳ \(Hết kỳ 3: 90 ngày\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đàm phán giá →' })).toBeInTheDocument();
  });

  it('CounterPage: performs counter handover for end-of-term item (END_OF_TERM_TAKE_BACK)', async () => {
    const member = {
      memberId: 'member-endterm-1',
      accountId: 'member-endterm-1',
      memberCode: 'MB-004821',
      fullName: 'Ngô Hải F',
    };

    vi.spyOn(counterService, 'lookup').mockResolvedValue([member]);
    vi.spyOn(counterService, 'confirm').mockResolvedValue({
      memberId: 'member-endterm-1',
      accountId: 'member-endterm-1',
      identityToken: 'proof-token-123',
      confirmedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
    vi.spyOn(counterService, 'tasks').mockResolvedValue({
      pendingForms: [],
      pendingWithdrawals: [],
      pendingEndOfTerm: [
        {
          id: 'decision-001',
          productId: 'PROD-301',
          sku: 'RH-T3N77F',
          productName: 'Áo len cổ lọ Muji',
          deadline: '2026-11-05T10:00:00Z',
        },
      ],
    });
    const handoverSpy = vi.spyOn(counterService, 'handover').mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/moderator/counter?memberCode=MB-004821&refId=decision-001']}>
          <Phase2Provider>
            <Routes>
              <Route path="/moderator/counter" element={<CounterPage />} />
            </Routes>
          </Phase2Provider>
        </MemoryRouter>
      </StrictMode>
    );

    // Identity confirmation at counter
    const confirmMemberBtn = await screen.findByRole('button', { name: 'Tôi đã đối chiếu đúng Member' });
    await user.click(confirmMemberBtn);

    // Verify End-of-term task group is rendered
    expect(await screen.findByText('3. Khách đến nhận lại hàng hết kỳ ký gửi')).toBeInTheDocument();
    expect(screen.getByText('Áo len cổ lọ Muji')).toBeInTheDocument();

    // Click handover
    const handoverBtn = screen.getByRole('button', { name: 'Bàn giao cho khách' });
    await user.click(handoverBtn);

    // Dialog appears
    expect(await screen.findByText('Xác nhận bàn giao hiện vật tại quầy')).toBeInTheDocument();
    expect(screen.getByText('Nhận lại cuối kỳ')).toBeInTheDocument();

    // Fast-match SKU button or type into SKU verification input
    const quickMatchBtn = screen.getByRole('button', { name: 'Khớp nhanh' });
    await user.click(quickMatchBtn);

    const checkbox = screen.getByRole('checkbox', { name: /Tôi đã hỏi và xác nhận đúng người nhận/ });
    await user.click(checkbox);

    // Confirm handover
    const submitBtn = screen.getByRole('button', { name: /Xác nhận.*bàn giao/ });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(handoverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'member-endterm-1',
          refId: 'decision-001',
          context: 'END_OF_TERM_TAKE_BACK',
        })
      );
    });
  });
});
