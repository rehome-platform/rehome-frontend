import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WarehouseInboxPage from '../../src/features/moderator/pages/WarehouseInboxPage.jsx';
import { warehouseInboxService } from '../../src/features/moderator/services/warehouseInboxApi.js';

vi.mock('../../src/features/moderator/services/warehouseInboxApi.js', () => ({
  warehouseInboxService: {
    getConversations: vi.fn(),
    sendMessage: vi.fn(),
    markAsDone: vi.fn(),
  },
}));

vi.mock('../../src/layouts/ModeratorLayout.jsx', () => ({
  default: ({ children }) => <div data-testid="moderator-layout">{children}</div>,
}));

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { name: 'Moderator 1', role: 'MODERATOR' } }),
}));

describe('WarehouseInboxPage Crash Resistance & Design Tokens', () => {
  it('does NOT crash when selectedConv.messages is undefined (reproduces & fixes issue 228)', async () => {
    // API returns conversation without messages array (e.g. backend ConversationSummaryResponse)
    const mockConvWithoutMessages = [
      {
        id: 'conv-101',
        memberName: 'Trần Văn B',
        memberCode: 'MB-0099',
        status: 'UNANSWERED',
        lastMessage: 'Cho mình hỏi đơn hàng ký gửi',
        waitTime: '5 phút trước',
        // messages field is deliberately missing/undefined
      },
    ];

    vi.mocked(warehouseInboxService.getConversations).mockResolvedValueOnce({
      data: mockConvWithoutMessages,
      total: 1,
    });

    render(
      <MemoryRouter>
        <WarehouseInboxPage />
      </MemoryRouter>
    );

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('Hộp thư điểm kí gửi')).toBeInTheDocument();
      expect(screen.getAllByText('Trần Văn B').length).toBeGreaterThan(0);
    });

    // Verify it rendered empty messages placeholder instead of crashing with TypeError
    expect(
      screen.getByText('Chưa có tin nhắn nào trong hội thoại này.')
    ).toBeInTheDocument();
  });

  it('displays friendly Error state and does NOT crash when API returns 500 error', async () => {
    // Simulate 500 Internal Server Error
    vi.mocked(warehouseInboxService.getConversations).mockRejectedValueOnce(
      new Error('Internal Server Error 500')
    );

    render(
      <MemoryRouter>
        <WarehouseInboxPage />
      </MemoryRouter>
    );

    // Wait for error state to display
    await waitFor(() => {
      expect(screen.getByText(/Không thể kết nối đến máy chủ hộp thư/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Tải lại/i })).toBeInTheDocument();
    });

    // Placeholder on right shows 0 waiting conversations
    expect(screen.getByText('Chọn một hội thoại để trả lời')).toBeInTheDocument();
    expect(screen.getByText(/0 hội thoại đang chờ/i)).toBeInTheDocument();
  });

  it('renders messages correctly with Design Tokens when messages array is present', async () => {
    const mockConvWithMessages = [
      {
        id: 'conv-102',
        memberName: 'Lê Thị C',
        memberCode: 'MB-0088',
        status: 'UNANSWERED',
        lastMessage: 'Xin chào shop',
        waitTime: '10 phút trước',
        messages: [
          {
            id: 'm1',
            sender: 'member',
            text: 'Chào shop, áo của mình đã bán được chưa?',
            time: '14:00',
          },
          {
            id: 'm2',
            sender: 'moderator',
            senderName: 'Moderator 1',
            text: 'Dạ ReHome đã nhận và đang trưng bày bạn nhé!',
            time: '14:02',
          },
        ],
      },
    ];

    vi.mocked(warehouseInboxService.getConversations).mockResolvedValueOnce({
      data: mockConvWithMessages,
      total: 1,
    });

    render(
      <MemoryRouter>
        <WarehouseInboxPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Lê Thị C').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Chào shop, áo của mình đã bán được chưa?')).toBeInTheDocument();
    const modBubble = screen.getByText('Dạ ReHome đã nhận và đang trưng bày bạn nhé!');
    expect(modBubble).toBeInTheDocument();
    expect(modBubble.className).toContain('bg-primary');
    expect(modBubble.className).toContain('rounded-xl');
  });
});
