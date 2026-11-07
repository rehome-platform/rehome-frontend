import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CounterPage from '../../src/features/moderator/pages/CounterPage.jsx';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { ToastProvider } from '../../src/context/ToastContext.jsx';
import { counterService } from '../../src/features/moderator/services/warehouseApi.js';
import { detectLookupKind } from '../../src/features/moderator/hooks/useCounter.jsx';

const auth = vi.hoisted(() => ({
  user: { id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a', warehouseName: 'Kho A' },
  isAuthenticated: true,
}));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth }));

vi.mock('../../src/features/moderator/services/warehouseApi.js', () => ({
  counterService: {
    lookup: vi.fn(),
    confirm: vi.fn(),
    tasks: vi.fn(),
    handover: vi.fn(),
  },
  inventoryService: {
    scanSku: vi.fn(),
  },
}));

function Wrapper({ children }) {
  return (
    <MemoryRouter initialEntries={['/moderator/counter']}>
      <Phase2Provider>
        <ToastProvider>{children}</ToastProvider>
      </Phase2Provider>
    </MemoryRouter>
  );
}

describe('QT-01 Unified Counter Lookup Input & Auto-detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly classifies inputs using detectLookupKind helper', () => {
    expect(detectLookupKind('0912345678')).toBe('phone');
    expect(detectLookupKind('0855123456')).toBe('phone');
    expect(detectLookupKind('0398765432')).toBe('phone');
    expect(detectLookupKind('MB-004821')).toBe('memberCode');
    expect(detectLookupKind('mb-999')).toBe('memberCode');
    expect(detectLookupKind('customer_code')).toBe('memberCode');
    expect(detectLookupKind('1234567890')).toBe('memberCode'); // Doesn't start with 0
  });

  it('submits { phone: ... } payload when inputting a Vietnamese phone number starting with 0', async () => {
    counterService.lookup.mockResolvedValueOnce([
      {
        memberId: 'mem-01',
        memberCode: 'MB-001',
        fullName: 'Nguyễn Văn A',
        phone: '0901234567',
      },
    ]);

    render(<CounterPage />, { wrapper: Wrapper });

    expect(screen.getByRole('heading', { name: /Hỏi khách mã Member hoặc số điện thoại/i })).toBeInTheDocument();
    const input = screen.getByPlaceholderText(/MB-0000000/i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '0901234567' } });
    fireEvent.click(screen.getByRole('button', { name: /^Tra cứu$/i }));

    await waitFor(() => {
      expect(counterService.lookup).toHaveBeenCalledWith(
        { phone: '0901234567' },
        expect.anything()
      );
    });

    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument();
  });

  it('submits { memberCode: ... } payload when inputting a Member Code (e.g. MB-004821)', async () => {
    counterService.lookup.mockResolvedValueOnce([
      {
        memberId: 'mem-02',
        memberCode: 'MB-004821',
        fullName: 'Trần Thị B',
        phone: '0988776655',
      },
    ]);

    render(<CounterPage />, { wrapper: Wrapper });

    const input = screen.getByPlaceholderText(/MB-0000000/i);
    fireEvent.change(input, { target: { value: 'MB-004821' } });
    fireEvent.click(screen.getByRole('button', { name: /^Tra cứu$/i }));

    await waitFor(() => {
      expect(counterService.lookup).toHaveBeenCalledWith(
        { memberCode: 'MB-004821' },
        expect.anything()
      );
    });

    expect(await screen.findByText('Trần Thị B')).toBeInTheDocument();
  });
});

