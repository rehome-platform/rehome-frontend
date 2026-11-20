import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../src/context/AuthContext.jsx';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import WarehouseInventoryPage from '../../src/features/moderator/pages/WarehouseInventoryPage.jsx';
import { inventoryService } from '../../src/features/moderator/services/warehouseApi.js';

describe('Task 6: WarehouseInventoryPage includes tab for items returned to seller', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "Gửi về người bán" tab and queries inventoryService.list with status WITHDRAWN', async () => {
    const listSpy = vi.spyOn(inventoryService, 'list').mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 1,
    });

    render(
      <MemoryRouter initialEntries={['/moderator/inventory']}>
        <AuthContext.Provider
          value={{ user: { id: 'mod-1', role: 'MODERATOR', warehouseId: 'wh-1' }, isAuthenticated: true }}
        >
          <Phase2Provider>
            <WarehouseInventoryPage />
          </Phase2Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const returnedTab = await screen.findByRole('button', { name: 'Đã hoàn trả người bán' });
    fireEvent.click(returnedTab);

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'WITHDRAWN' }),
        expect.anything()
      );
    });
  });
});
