import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WarehouseInboxPage from '../../src/features/moderator/pages/WarehouseInboxPage.jsx';
import { warehouseInboxService } from '../../src/features/moderator/services/warehouseInboxApi.js';

vi.mock('../../src/features/moderator/services/warehouseInboxApi.js', () => ({
  warehouseInboxService: {
    getConversations: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    uploadImage: vi.fn(),
    markAsDone: vi.fn(),
  },
}));

vi.mock('../../src/layouts/ModeratorLayout.jsx', () => ({
  default: ({ children }) => <div data-testid="moderator-layout">{children}</div>,
}));

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { id: 'mod-1', name: 'Moderator 1', role: 'MODERATOR' } }),
}));

vi.mock('../../src/hooks/useWebSocket.js', () => ({
  useConversationTopic: vi.fn(),
}));

describe('WarehouseInboxPage Crash Resistance & Design Tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

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
      },
    ];

    vi.mocked(warehouseInboxService.getConversations).mockResolvedValueOnce({
      data: mockConvWithoutMessages,
      total: 1,
    });
    vi.mocked(warehouseInboxService.getMessages).mockResolvedValueOnce({
      data: [],
      total: 0,
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
    await waitFor(() => {
      expect(
        screen.getByText('Chưa có tin nhắn nào trong hội thoại này.')
      ).toBeInTheDocument();
    });
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
    vi.mocked(warehouseInboxService.getMessages).mockResolvedValueOnce({
      data: mockConvWithMessages[0].messages,
      total: 2,
    });

    render(
      <MemoryRouter>
        <WarehouseInboxPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Lê Thị C').length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(screen.getByText('Chào shop, áo của mình đã bán được chưa?')).toBeInTheDocument();
      const modBubble = screen.getByText('Dạ ReHome đã nhận và đang trưng bày bạn nhé!');
      expect(modBubble).toBeInTheDocument();
      expect(modBubble.closest('.bg-primary')).not.toBeNull();
      expect(modBubble.closest('.rounded-xl')).not.toBeNull();
    });
  });

  it('API 112 & API 113: fetches messages on conversation select and sends response message with content and imageUrls', async () => {
    const mockConv = [
      {
        id: 'conv-300',
        memberName: 'Phạm Minh D',
        memberCode: 'MB-0077',
        status: 'UNANSWERED',
        lastMessage: 'Cần hỗ trợ đơn hàng',
        counterpart: { id: 'member-300', displayName: 'Phạm Minh D' },
      },
    ];

    vi.mocked(warehouseInboxService.getConversations).mockResolvedValueOnce({
      data: mockConv,
      total: 1,
    });

    // API 112: getMessages returns content list
    vi.mocked(warehouseInboxService.getMessages).mockResolvedValueOnce({
      data: [
        {
          id: 'msg-1',
          senderId: 'member-300',
          content: 'Xin chào kho ReHome!',
          imageUrls: [],
          createdAt: '2026-11-08T10:00:00Z',
          isMine: false,
        },
      ],
      total: 1,
    });

    // API 113: sendMessage response
    vi.mocked(warehouseInboxService.sendMessage).mockResolvedValueOnce({
      id: 'msg-2',
      senderId: 'mod-1',
      content: 'Chào bạn, kho có thể hỗ trợ gì ạ?',
      imageUrls: ['https://res.cloudinary.com/demo/image/upload/v1/sample.jpg'],
      createdAt: '2026-11-08T10:01:00Z',
      isMine: true,
    });

    render(
      <MemoryRouter>
        <WarehouseInboxPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Xin chào kho ReHome!')).toBeInTheDocument();
    });

    expect(warehouseInboxService.getMessages).toHaveBeenCalledWith('conv-300', expect.any(Object));

    // Type text and submit form
    const input = screen.getByPlaceholderText('Nhập câu trả lời…');
    fireEvent.change(input, { target: { value: 'Chào bạn, kho có thể hỗ trợ gì ạ?' } });

    const form = input.closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(warehouseInboxService.sendMessage).toHaveBeenCalledWith(
        'conv-300',
        {
          content: 'Chào bạn, kho có thể hỗ trợ gì ạ?',
          imageUrls: [],
        },
        'Moderator 1'
      );
    });

    // Verify new message is immediately rendered in chat window
    await waitFor(() => {
      expect(screen.getAllByText('Chào bạn, kho có thể hỗ trợ gì ạ?').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByAltText('Ảnh đính kèm 1')).toHaveAttribute(
        'src',
        'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg'
      );
    });
  });

  it('Issue 2 & 3: opens with default tab "Tất cả" and orders tabs: Tất cả -> Đã xong -> Chưa trả lời', async () => {
    const mockList = [
      {
        id: 'c1',
        status: 'UNANSWERED',
        memberName: 'Member 1',
        phone: '0901234567',
        consignCount: 0,
        shippingCount: 0,
        returnCount: 0,
      },
      {
        id: 'c2',
        status: 'DONE',
        memberName: 'Member 2',
        phone: '0909999888',
        consignCount: 3,
        shippingCount: 1,
        returnCount: 0,
      },
    ];

    vi.mocked(warehouseInboxService.getConversations).mockResolvedValueOnce({
      data: mockList,
      total: 2,
    });
    vi.mocked(warehouseInboxService.getMessages).mockResolvedValue({
      data: [],
      total: 0,
    });

    render(
      <MemoryRouter>
        <WarehouseInboxPage />
      </MemoryRouter>
    );

    // Wait for load
    await waitFor(() => {
      expect(screen.getAllByText('Member 1').length).toBeGreaterThan(0);
      expect(screen.getByText('Member 2')).toBeInTheDocument();
    });

    // Check tab order: buttons inside tabs container
    const tabButtons = screen.getAllByRole('button').filter((b) =>
      b.textContent?.includes('Tất cả') ||
      b.textContent?.includes('Đã xong') ||
      b.textContent?.includes('Chưa trả lời')
    );

    expect(tabButtons).toHaveLength(3);
    expect(tabButtons[0]).toHaveTextContent('Tất cả');
    expect(tabButtons[1]).toHaveTextContent('Đã xong');
    expect(tabButtons[2]).toHaveTextContent(/Chưa trả lời/);

    // Tab "Tất cả" is active by default (contains active classes)
    expect(tabButtons[0]).toHaveClass('border-primary');
  });

  it('Issue 1: connects real member info and formats counts (e.g. 0 món, 0 đơn instead of —)', async () => {
    const mockConv = [
      {
        id: 'conv-real-data',
        memberName: 'Võ Thị Mai',
        phone: '0987654321',
        consignCount: 0,
        shippingCount: 0,
        returnCount: 0,
        counterpart: {
          id: 'member-999',
          displayName: 'Võ Thị Mai',
        },
      },
    ];

    vi.mocked(warehouseInboxService.getConversations).mockResolvedValueOnce({
      data: mockConv,
      total: 1,
    });
    vi.mocked(warehouseInboxService.getMessages).mockResolvedValueOnce({
      data: [],
      total: 0,
    });

    render(
      <MemoryRouter>
        <WarehouseInboxPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Võ Thị Mai').length).toBeGreaterThan(0);
      expect(screen.getByText('0987654321')).toBeInTheDocument();
      expect(screen.getByText('0 món')).toBeInTheDocument();
      expect(screen.getByText('0 đơn')).toBeInTheDocument();
      expect(screen.getByText('0 yêu cầu')).toBeInTheDocument();
    });
  });
});
