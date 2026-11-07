import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockStompSocket } from './mockStompBroker.js';
import { StompClientService } from '../../src/services/stompClientService.js';

describe('StompClientService', () => {
  let token = 'initial-jwt-token';
  let service;

  beforeEach(() => {
    MockStompSocket.reset();
    token = 'initial-jwt-token';
  });

  afterEach(() => {
    if (service) {
      service.destroy();
    }
  });

  it('should not connect when access token is missing', async () => {
    service = new StompClientService({
      getSockJsUrl: () => 'https://api.rehome.vn/ws-sockjs',
      getAccessToken: () => null,
      webSocketFactory: (url) => new MockStompSocket(url),
    });

    service.connect();

    expect(service.getStatus()).toBe('DISCONNECTED');
    expect(MockStompSocket.instances.length).toBe(0);
  });

  it('should connect with Authorization header in CONNECT frame', async () => {
    service = new StompClientService({
      getSockJsUrl: () => 'https://api.rehome.vn/ws-sockjs',
      getAccessToken: () => token,
      webSocketFactory: (url) => new MockStompSocket(url),
    });

    service.connect();

    await vi.waitFor(() => {
      expect(MockStompSocket.instances.length).toBe(1);
    });

    const socket = MockStompSocket.getLatest();

    await vi.waitFor(() => {
      const connectFrame = socket.sentFrames.find(
        (f) => f.command === 'CONNECT' || f.command === 'STOMP'
      );
      expect(connectFrame).toBeDefined();
      expect(connectFrame.headers['Authorization']).toBe(`Bearer ${token}`);
    });

    await vi.waitFor(() => {
      expect(service.getStatus()).toBe('CONNECTED');
    });
  });

  it('should receive notification messages on /user/queue/notifications', async () => {
    service = new StompClientService({
      getSockJsUrl: () => 'https://api.rehome.vn/ws-sockjs',
      getAccessToken: () => token,
      webSocketFactory: (url) => new MockStompSocket(url),
    });

    const notificationHandler = vi.fn();
    service.subscribe('/user/queue/notifications', notificationHandler);

    service.connect();

    await vi.waitFor(() => {
      expect(service.getStatus()).toBe('CONNECTED');
    });

    const socket = MockStompSocket.getLatest();
    await vi.waitFor(() => {
      const subFrame = socket.sentFrames.find(
        (f) => f.command === 'SUBSCRIBE' && f.headers.destination === '/user/queue/notifications'
      );
      expect(subFrame).toBeDefined();
    });

    const mockNotification = {
      id: 101,
      type: 'CONSIGNMENT_APPROVED',
      title: 'Đơn ký gửi đã duyệt',
      message: 'Mã đơn CG-001 đã được kiểm định',
      isRead: false,
      targetType: 'CONSIGNMENT',
      targetId: 'CG-001',
      warehouseId: 1,
      createdAt: '2026-11-07T10:00:00Z',
    };

    socket.serverSendMessage('/user/queue/notifications', mockNotification);

    await vi.waitFor(() => {
      expect(notificationHandler).toHaveBeenCalledTimes(1);
      expect(notificationHandler).toHaveBeenCalledWith(mockNotification, expect.anything());
    });
  });

  it('should receive chat messages on /topic/conversations.{id}', async () => {
    const conversationId = '550e8400-e29b-41d4-a716-446655440000';
    const topic = `/topic/conversations.${conversationId}`;

    service = new StompClientService({
      getSockJsUrl: () => 'https://api.rehome.vn/ws-sockjs',
      getAccessToken: () => token,
      webSocketFactory: (url) => new MockStompSocket(url),
    });

    const chatHandler = vi.fn();
    service.subscribe(topic, chatHandler);

    service.connect();

    await vi.waitFor(() => {
      expect(service.getStatus()).toBe('CONNECTED');
    });

    const socket = MockStompSocket.getLatest();
    await vi.waitFor(() => {
      const subFrame = socket.sentFrames.find(
        (f) => f.command === 'SUBSCRIBE' && f.headers.destination === topic
      );
      expect(subFrame).toBeDefined();
    });

    const mockMessage = {
      id: 5001,
      senderId: 'member-123',
      content: 'Chào bạn, đơn hàng thế nào rồi?',
      imageUrls: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
      createdAt: '2026-11-07T10:05:00Z',
      isMine: false,
    };

    socket.serverSendMessage(topic, mockMessage);

    await vi.waitFor(() => {
      expect(chatHandler).toHaveBeenCalledTimes(1);
      expect(chatHandler).toHaveBeenCalledWith(mockMessage, expect.anything());
    });
  });

  it('should reconnect with new token on auth:token_refreshed and restore subscriptions', async () => {
    const topic = '/topic/conversations.uuid-conv-1';
    service = new StompClientService({
      getSockJsUrl: () => 'https://api.rehome.vn/ws-sockjs',
      getAccessToken: () => token,
      webSocketFactory: (url) => new MockStompSocket(url),
    });

    const chatHandler = vi.fn();
    service.subscribe(topic, chatHandler);

    service.connect();

    await vi.waitFor(() => {
      expect(service.getStatus()).toBe('CONNECTED');
    });

    const firstSocket = MockStompSocket.getLatest();
    expect(firstSocket.sentFrames.some((f) => f.headers['Authorization'] === `Bearer ${token}`)).toBe(true);

    // Dispatch token refresh event
    const newToken = 'refreshed-jwt-token-999';
    token = newToken;
    window.dispatchEvent(
      new CustomEvent('auth:token_refreshed', { detail: { token: newToken } })
    );

    // Should create a 2nd socket with new token
    await vi.waitFor(() => {
      expect(MockStompSocket.instances.length).toBe(2);
    });

    const secondSocket = MockStompSocket.getLatest();
    await vi.waitFor(() => {
      const connectFrame = secondSocket.sentFrames.find(
        (f) => f.command === 'CONNECT' || f.command === 'STOMP'
      );
      expect(connectFrame).toBeDefined();
      expect(connectFrame.headers['Authorization']).toBe(`Bearer ${newToken}`);
    });

    // Subscriptions should automatically be restored on new socket
    await vi.waitFor(() => {
      const subFrame = secondSocket.sentFrames.find(
        (f) => f.command === 'SUBSCRIBE' && f.headers.destination === topic
      );
      expect(subFrame).toBeDefined();
    });

    // Message sent via second socket should reach handler
    secondSocket.serverSendMessage(topic, { id: 2, content: 'Test post-reconnect' });

    await vi.waitFor(() => {
      expect(chatHandler).toHaveBeenCalledWith(
        { id: 2, content: 'Test post-reconnect' },
        expect.anything()
      );
    });
  });

  it('should transition to ERROR state when server sends ERROR frame', async () => {
    const errorHandler = vi.fn();
    service = new StompClientService({
      getSockJsUrl: () => 'https://api.rehome.vn/ws-sockjs',
      getAccessToken: () => token,
      webSocketFactory: (url) => new MockStompSocket(url),
      onError: errorHandler,
    });

    service.connect();

    await vi.waitFor(() => {
      expect(service.getStatus()).toBe('CONNECTED');
    });

    const socket = MockStompSocket.getLatest();
    socket.serverSendError('Token expired', 'Invalid JWT signature');

    await vi.waitFor(() => {
      expect(service.getStatus()).toBe('ERROR');
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  it('should disconnect cleanly on auth:logout', async () => {
    service = new StompClientService({
      getSockJsUrl: () => 'https://api.rehome.vn/ws-sockjs',
      getAccessToken: () => token,
      webSocketFactory: (url) => new MockStompSocket(url),
    });

    service.connect();

    await vi.waitFor(() => {
      expect(service.getStatus()).toBe('CONNECTED');
    });

    window.dispatchEvent(new CustomEvent('auth:logout'));

    await vi.waitFor(() => {
      expect(service.getStatus()).toBe('DISCONNECTED');
    });
  });
});
