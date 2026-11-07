import { describe, it, expect, vi } from 'vitest';
import { getSockJsUrl } from '../../src/configs/api.config.js';

describe('WebSocket Config & Events', () => {
  it('should return /ws-sockjs with http/https scheme', () => {
    expect(getSockJsUrl('https://api.rehome.vn')).toBe('https://api.rehome.vn/ws-sockjs');
    expect(getSockJsUrl('wss://api.rehome.vn')).toBe('https://api.rehome.vn/ws-sockjs');
    expect(getSockJsUrl('http://localhost:8080/')).toBe('http://localhost:8080/ws-sockjs');
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
