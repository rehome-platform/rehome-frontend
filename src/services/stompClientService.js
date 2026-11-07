/**
 * ReHome Core STOMP WebSocket Service
 * Quản lý kết nối STOMP qua SockJS (/ws-sockjs) với xác thực Bearer token qua STOMP CONNECT header
 */
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getSockJsUrl } from '../configs/api.config.js';
import { getToken } from './baseApi.js';

export class StompClientService {
  constructor(options = {}) {
    this.getSockJsUrl = options.getSockJsUrl || getSockJsUrl;
    this.getAccessToken = options.getAccessToken || getToken;
    this.webSocketFactory = options.webSocketFactory || ((url) => new SockJS(url));
    this.onStatusChange = options.onStatusChange || null;
    this.onError = options.onError || null;

    this.status = 'DISCONNECTED'; // 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR'
    this.client = null;
    this.subscriptions = new Map(); // destination -> Set<callback>
    this.stompSubscriptions = new Map(); // destination -> StompSubscription
    this.currentAccessToken = null;

    this._handleTokenRefreshed = this._handleTokenRefreshed.bind(this);
    this._handleLogout = this._handleLogout.bind(this);

    this._bindEvents();
  }

  _bindEvents() {
    if (typeof window !== 'undefined') {
      window.addEventListener('auth:token_refreshed', this._handleTokenRefreshed);
      window.addEventListener('auth:logout', this._handleLogout);
      window.addEventListener('auth:expired', this._handleLogout);
    }
  }

  _unbindEvents() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('auth:token_refreshed', this._handleTokenRefreshed);
      window.removeEventListener('auth:logout', this._handleLogout);
      window.removeEventListener('auth:expired', this._handleLogout);
    }
  }

  _handleTokenRefreshed(event) {
    const newToken = event?.detail?.token;
    if (newToken) {
      this.currentAccessToken = newToken;
      // Chỉ tự động reconnect nếu client đang kết nối hoặc đã kết nối
      if (this.status === 'CONNECTED' || this.status === 'CONNECTING') {
        this.reconnectWithToken(newToken);
      }
    }
  }

  _handleLogout() {
    this.disconnect();
  }

  getStatus() {
    return this.status;
  }

  setStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      if (typeof this.onStatusChange === 'function') {
        try {
          this.onStatusChange(newStatus);
        } catch (err) {
          console.error('[StompClientService] onStatusChange error:', err);
        }
      }
    }
  }

  connect() {
    const token = this.getAccessToken?.();
    if (!token) {
      this.setStatus('DISCONNECTED');
      return;
    }

    const sockJsUrl = this.getSockJsUrl?.();
    if (!sockJsUrl) {
      this.setStatus('ERROR');
      return;
    }

    this.currentAccessToken = token;
    this.setStatus('CONNECTING');

    try {
      this.client = new Client({
        webSocketFactory: () => this.webSocketFactory(sockJsUrl),
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        reconnectDelay: 0,
        heartbeatIncoming: 0,
        heartbeatOutgoing: 0,
        onConnect: () => {
          this.setStatus('CONNECTED');
          // Restore all registered subscriptions
          for (const destination of this.subscriptions.keys()) {
            this._subscribeToStomp(destination);
          }
        },
        onStompError: (frame) => {
          this.setStatus('ERROR');
          if (typeof this.onError === 'function') {
            try {
              this.onError(frame);
            } catch (err) {
              console.error('[StompClientService] onError callback failed:', err);
            }
          }
        },
        onWebSocketError: (event) => {
          this.setStatus('ERROR');
          if (typeof this.onError === 'function') {
            try {
              this.onError(event);
            } catch (err) {
              console.error('[StompClientService] onError callback failed:', err);
            }
          }
        },
        onWebSocketClose: () => {
          if (this.status !== 'ERROR') {
            this.setStatus('DISCONNECTED');
          }
        },
      });

      this.client.activate();
    } catch (err) {
      this.setStatus('ERROR');
      if (typeof this.onError === 'function') {
        this.onError(err);
      }
    }
  }

  _subscribeToStomp(destination) {
    if (!this.client || this.status !== 'CONNECTED') {
      return;
    }

    // Unsubscribe existing stomp sub if any
    const existingSub = this.stompSubscriptions.get(destination);
    if (existingSub) {
      try {
        existingSub.unsubscribe();
      } catch {}
      this.stompSubscriptions.delete(destination);
    }

    const sub = this.client.subscribe(destination, (message) => {
      let payload = message.body;
      if (message.body) {
        try {
          payload = JSON.parse(message.body);
        } catch {
          payload = message.body;
        }
      }

      const callbacks = this.subscriptions.get(destination);
      if (callbacks) {
        callbacks.forEach((cb) => {
          try {
            cb(payload, message);
          } catch (err) {
            console.error(`[StompClientService] Error in subscription callback for ${destination}:`, err);
          }
        });
      }
    });

    this.stompSubscriptions.set(destination, sub);
  }

  subscribe(destination, callback) {
    if (!destination || typeof callback !== 'function') {
      return { unsubscribe: () => {} };
    }

    if (!this.subscriptions.has(destination)) {
      this.subscriptions.set(destination, new Set());
    }
    this.subscriptions.get(destination).add(callback);

    if (this.status === 'CONNECTED' && !this.stompSubscriptions.has(destination)) {
      this._subscribeToStomp(destination);
    }

    return {
      unsubscribe: () => {
        const set = this.subscriptions.get(destination);
        if (set) {
          set.delete(callback);
          if (set.size === 0) {
            this.subscriptions.delete(destination);
            const stompSub = this.stompSubscriptions.get(destination);
            if (stompSub) {
              try {
                stompSub.unsubscribe();
              } catch {}
              this.stompSubscriptions.delete(destination);
            }
          }
        }
      },
    };
  }

  reconnectWithToken(newToken) {
    if (!newToken) return;

    this.currentAccessToken = newToken;

    if (this.client) {
      try {
        if (this.client.active) {
          this.client.deactivate();
        }
      } catch {}
      this.client = null;
    }

    this.stompSubscriptions.clear();
    this.connect();
  }

  disconnect() {
    if (this.client) {
      try {
        if (this.client.active) {
          this.client.deactivate();
        }
      } catch {}
      this.client = null;
    }

    this.stompSubscriptions.clear();
    this.setStatus('DISCONNECTED');
  }

  destroy() {
    this._unbindEvents();
    this.disconnect();
    this.subscriptions.clear();
  }
}

export default StompClientService;
