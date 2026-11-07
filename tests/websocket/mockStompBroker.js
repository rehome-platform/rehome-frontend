/**
 * Mock STOMP Broker over SockJS / WebSocket interface
 * Simulates STOMP 1.2 protocol frames for unit testing @stomp/stompjs
 */
export class MockStompSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.sentFrames = [];
    this.subscriptions = new Map(); // id -> destination
    MockStompSocket.instances.push(this);

    // Auto-open socket after microtask
    queueMicrotask(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) {
        this.onopen({ type: 'open' });
      }
    });
  }

  send(data) {
    const frame = parseStompFrame(data);
    this.sentFrames.push(frame);

    if (frame.command === 'CONNECT' || frame.command === 'STOMP') {
      // Auto reply with CONNECTED frame unless told not to
      queueMicrotask(() => {
        if (this.shouldFailConnect) {
          this.serverSendError(this.connectErrorMessage || 'Authentication failed');
          this.close();
        } else {
          this.serverSendConnected();
        }
      });
    } else if (frame.command === 'SUBSCRIBE') {
      const subId = frame.headers.id;
      const destination = frame.headers.destination;
      this.subscriptions.set(subId, destination);
    } else if (frame.command === 'UNSUBSCRIBE') {
      const subId = frame.headers.id;
      this.subscriptions.delete(subId);
    } else if (frame.command === 'DISCONNECT') {
      queueMicrotask(() => {
        this.close();
      });
    }
  }

  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose({ code: 1000, reason: 'Normal closure', wasClean: true });
    }
  }

  serverSendConnected(version = '1.2') {
    const frameText = `CONNECTED\nversion:${version}\nheart-beat:0,0\n\n\x00`;
    if (this.onmessage) {
      this.onmessage({ data: frameText });
    }
  }

  serverSendMessage(destination, bodyObjOrString, extraHeaders = {}) {
    const body = typeof bodyObjOrString === 'string' ? bodyObjOrString : JSON.stringify(bodyObjOrString);
    // Find all matching subscriptions
    for (const [subId, dest] of this.subscriptions.entries()) {
      if (dest === destination) {
        let headersStr = `destination:${dest}\nsubscription:${subId}\nmessage-id:${Math.random().toString(36).substring(2)}\n`;
        for (const [k, v] of Object.entries(extraHeaders)) {
          headersStr += `${k}:${v}\n`;
        }
        const frameText = `MESSAGE\n${headersStr}\n${body}\x00`;
        if (this.onmessage) {
          this.onmessage({ data: frameText });
        }
      }
    }
  }

  serverSendError(message, details = '') {
    const frameText = `ERROR\nmessage:${message}\n\n${details}\x00`;
    if (this.onmessage) {
      this.onmessage({ data: frameText });
    }
  }

  static getLatest() {
    return MockStompSocket.instances[MockStompSocket.instances.length - 1];
  }

  static reset() {
    MockStompSocket.instances = [];
  }
}

function parseStompFrame(raw) {
  const normalized = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
  const nullIdx = normalized.indexOf('\x00');
  const content = nullIdx >= 0 ? normalized.substring(0, nullIdx) : normalized;

  const headerBodySplit = content.split('\n\n');
  const headerPart = headerBodySplit[0] || '';
  const body = headerBodySplit.slice(1).join('\n\n');

  const lines = headerPart.split('\n').map((l) => l.trim()).filter(Boolean);
  const command = lines[0] || '';
  const headers = {};

  for (let i = 1; i < lines.length; i++) {
    const colonIdx = lines[i].indexOf(':');
    if (colonIdx > 0) {
      const key = lines[i].substring(0, colonIdx).trim();
      const val = lines[i].substring(colonIdx + 1).trim();
      headers[key] = val;
    }
  }

  return { command, headers, body };
}

