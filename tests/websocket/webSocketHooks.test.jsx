import React, { useState } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { WebSocketProvider } from '../../src/context/WebSocketContext.jsx';
import {
  useWebSocket,
  useNotificationQueue,
  useConversationTopic,
} from '../../src/hooks/useWebSocket.js';

describe('WebSocketContext and Hooks', () => {
  let mockService;

  beforeEach(() => {
    mockService = {
      status: 'CONNECTED',
      getStatus: vi.fn(() => mockService.status),
      connect: vi.fn(),
      disconnect: vi.fn(),
      reconnectWithToken: vi.fn(),
      subscribe: vi.fn((destination, callback) => {
        return {
          unsubscribe: vi.fn(),
        };
      }),
      destroy: vi.fn(),
    };
  });

  const wrapper = ({ children }) => (
    <WebSocketProvider service={mockService} autoConnect={false}>
      {children}
    </WebSocketProvider>
  );

  it('useWebSocket returns connection state and service methods', () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.status).toBe('CONNECTED');
    expect(result.current.service).toBe(mockService);
  });

  it('useNotificationQueue automatically subscribes to /user/queue/notifications and unsubscribes on unmount', () => {
    const onNotification = vi.fn();
    const unsubSpy = vi.fn();
    mockService.subscribe.mockReturnValue({ unsubscribe: unsubSpy });

    const { unmount } = renderHook(() => useNotificationQueue(onNotification), { wrapper });

    expect(mockService.subscribe).toHaveBeenCalledWith(
      '/user/queue/notifications',
      expect.any(Function)
    );

    unmount();

    expect(unsubSpy).toHaveBeenCalledTimes(1);
  });

  it('useConversationTopic subscribes to dynamic topic and unsubscribes when conversationId changes', () => {
    const onMessage = vi.fn();
    const unsub1 = vi.fn();
    const unsub2 = vi.fn();
    mockService.subscribe
      .mockReturnValueOnce({ unsubscribe: unsub1 })
      .mockReturnValueOnce({ unsubscribe: unsub2 });

    const { rerender, unmount } = renderHook(
      ({ conversationId }) => useConversationTopic(conversationId, onMessage),
      {
        wrapper,
        initialProps: { conversationId: 'conv-111' },
      }
    );

    expect(mockService.subscribe).toHaveBeenCalledWith(
      '/topic/conversations.conv-111',
      expect.any(Function)
    );

    // Change conversation
    rerender({ conversationId: 'conv-222' });

    expect(unsub1).toHaveBeenCalledTimes(1);
    expect(mockService.subscribe).toHaveBeenCalledWith(
      '/topic/conversations.conv-222',
      expect.any(Function)
    );

    // Unmount
    unmount();
    expect(unsub2).toHaveBeenCalledTimes(1);
  });

  it('useConversationTopic does not subscribe if conversationId is falsy', () => {
    const onMessage = vi.fn();
    renderHook(() => useConversationTopic(null, onMessage), { wrapper });

    expect(mockService.subscribe).not.toHaveBeenCalled();
  });
});
