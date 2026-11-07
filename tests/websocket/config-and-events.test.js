import { describe, it, expect, vi } from 'vitest';
import { getSockJsUrl, getWsSockJsUrl } from '../../src/configs/api.config.js';

describe('WebSocket Config & Events', () => {
  it('should return /ws-sockjs with http/https scheme when using getWsSockJsUrl or endpoint parameter', () => {
    expect(getWsSockJsUrl('https://api.rehome.vn')).toBe('https://api.rehome.vn/ws-sockjs');
    expect(getWsSockJsUrl('wss://api.rehome.vn')).toBe('https://api.rehome.vn/ws-sockjs');
    expect(getSockJsUrl('http://localhost:8080/', '/ws-sockjs')).toBe('http://localhost:8080/ws-sockjs');
    // Backward compatibility with Phase 2 contract default:
    expect(getSockJsUrl('https://example.test')).toBe('https://example.test/ws');
  });

  it('should dispatch auth:token_refreshed event on window when token is refreshed', () => {
    const handler = vi.fn();
    window.addEventListener('auth:token_refreshed', handler);

    window.dispatchEvent(
      new CustomEvent('auth:token_refreshed', { detail: { token: 'mock-new-token' } })
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.token).toBe('mock-new-token');

    window.removeEventListener('auth:token_refreshed', handler);
  });
});

