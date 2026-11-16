import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
    user: { id: 'mod-1', role: 'moderator', warehouseId: 'wh-1' },
  }),
}));

vi.mock('../../src/features/moderator/services/inventoryApi.js', () => ({
  inventoryService: {
    read: vi.fn(async () => ({
      id: 'SKU-1',
      name: 'Áo khoác dạ',
      status: 'WAITING_END_OF_TERM',
      currentPrice: 200000,
      floorPrice: 100000,
      currentTerm: 3,
    })),
  },
}));

vi.mock('../../src/features/moderator/services/endTermApi.js', () => ({
  endTermService: {
    pendingPricing: vi.fn(async () => [
      { productId: 'SKU-1', decisionId: 'dec-1', currentPrice: 200000 },
    ]),
    proposeReConsignPrice: vi.fn(async () => ({ receiptId: 'rc-1' })),
  },
}));

import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import ReConsignNegotiationPage from '../../src/features/moderator/pages/ReConsignNegotiationPage.jsx';

describe('ReConsignNegotiationPage minimum 1000 VND validation (BUG-M2-018)', () => {
  it('shows inline error and disables submit when proposedPrice is below 1000 VND', async () => {
    render(
      <Phase2Provider>
        <MemoryRouter initialEntries={['/moderator/inventory/SKU-1/re-consign']}>
          <Routes>
            <Route path="/moderator/inventory/:sku/re-consign" element={<ReConsignNegotiationPage />} />
          </Routes>
        </MemoryRouter>
      </Phase2Provider>,
    );

    const input = await screen.findByLabelText(/Giá bán đề xuất ký gửi lại/i);
    await waitFor(() => expect(input.value).toBe('200000'));

    fireEvent.change(input, { target: { value: '500' } });

    expect(screen.getByText('Giá tối thiểu phải từ 1.000đ')).toBeTruthy();
    const submitBtn = screen.getByRole('button', { name: /Gửi đề xuất giá mới cho Member/i });
    expect(submitBtn.disabled).toBe(true);

    fireEvent.change(input, { target: { value: '1000' } });
    expect(screen.queryByText('Giá tối thiểu phải từ 1.000đ')).toBeNull();
    expect(submitBtn.disabled).toBe(false);
  });
});
