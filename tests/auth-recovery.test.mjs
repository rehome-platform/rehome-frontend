import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
import * as validators from '../src/utils/validators.js';

// Exercise the real component handlers with mocked hooks/router/API; no browser or live backend.
function harness(query = '', reset = false, overrides = {}) {
  const states = [];
  let cursor = 0;
  let calls = [];
  const React = {
    // This harness exercises submit handlers; countdown effects are a browser concern.
    useEffect() {},
    createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }),
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], value => { states[index] = value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = { current: initial };
      return states[index];
    },
  };
  const api = Object.fromEntries(['forgotPassword', 'resetPassword'].map(name => [name, async data => {
    calls.push([name, data]);
    return overrides[name]?.(data);
  }]));
  const module = { exports: {} };
  const source = readFileSync(new URL('../src/features/auth/pages/ForgotPassword.jsx', import.meta.url), 'utf8');
  vm.runInNewContext(transformSync(source, { loader: 'jsx', format: 'cjs' }).code, {
    module, exports: module.exports,
    require(name) {
      if (name === 'react') return React;
      if (name === 'react-router-dom') return {
        Link: 'a',
        useNavigate: () => () => {},
        useSearchParams: () => [new URLSearchParams(query)],
      };
      if (name.includes('Logo')) return { default: 'logo', __esModule: true };
      if (name.includes('auth.service')) return { authService: api };
      if (name.includes('validators')) return validators;
      throw Error(name);
    },
  });
  const render = () => { cursor = 0; return module.exports.default({ reset }); };
  function nodes(node, predicate) {
    if (!node || typeof node !== 'object') return [];
    return [...(predicate(node) ? [node] : []), ...node.children.flatMap(child => nodes(child, predicate))];
  }
  const find = (predicate) => nodes(render(), predicate)[0];
  return {
    calls, render,
    input(id, value) { find(n => n.props.id === id).props.onChange({ target: { value } }); },
    submit() { return find(n => n.type === 'form').props.onSubmit({ preventDefault() {} }); },
    find,
  };
}

test('invalid recovery email prevents API submission; no OTP inputs', async () => {
  const h = harness();
  h.input('recovery-email', 'invalid');
  await h.submit();
  assert.equal(h.calls.length, 0);
  assert.ok(h.find(n => n.props.role === 'alert'));
  assert.doesNotMatch(JSON.stringify(h.render()), /otp-input/);
});

test('request waits for API, blocks duplicates and confirms generically', async () => {
  let complete;
  const h = harness('', false, { forgotPassword: () => new Promise(resolve => { complete = resolve; }) });
  h.input('recovery-email', ' person@example.com ');
  const first = h.submit();
  await h.submit();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][1], 'person@example.com');
  assert.equal(h.find(n => n.type === 'button').props.disabled, true);
  assert.equal(h.find(n => n.props.role === 'status'), undefined);
  complete();
  await first;
  assert.ok(h.find(n => n.props.role === 'status'));
});

test('recovery API failure shows error without confirmation', async () => {
  const h = harness('', false, { forgotPassword: () => { throw Error('Network failure'); } });
  h.input('recovery-email', 'person@example.com');
  await h.submit();
  assert.ok(h.find(n => n.props.role === 'alert'));
  assert.equal(h.find(n => n.props.role === 'status'), undefined);
});

test('missing or malformed reset link does not offer a password form', () => {
  for (const query of ['', 'email=invalid&token=t', 'email=a%40example.com']) {
    const h = harness(query, true);
    assert.equal(h.find(n => n.type === 'form'), undefined);
    assert.ok(h.find(n => n.props.role === 'alert'));
  }
});

test('password policy and confirmation prevent invalid reset requests', async () => {
  const h = harness('email=a%40example.com&token=real-link-token', true);
  for (const [password, confirm] of [['short', 'short'], ['x'.repeat(73), 'x'.repeat(73)], ['secret123', 'different']]) {
    h.input('new-password', password);
    h.input('confirm-password', confirm);
    await h.submit();
    assert.equal(h.calls.length, 0);
    assert.ok(h.find(n => n.props.role === 'alert'));
  }
});

test('reset uses email-link token directly and confirms only after API success', async () => {
  const h = harness('email=a%2Btag%40example.com&token=real-link-token', true);
  h.input('new-password', 'secret123');
  h.input('confirm-password', 'secret123');
  await h.submit();
  assert.equal(h.calls[0][0], 'resetPassword');
  assert.equal(h.calls[0][1].email, 'a+tag@example.com');
  assert.equal(h.calls[0][1].resetToken, 'real-link-token');
  assert.equal(h.calls[0][1].newPassword, 'secret123');
  assert.ok(h.find(n => n.props.role === 'status'));
});

test('expired/used token response remains an error and offers a new link', async () => {
  const h = harness('email=a%40example.com&token=expired', true, {
    resetPassword: () => { throw Error('Token expired or already used'); },
  });
  h.input('new-password', 'secret123');
  h.input('confirm-password', 'secret123');
  await h.submit();
  assert.ok(h.find(n => n.props.role === 'alert'));
  assert.equal(h.find(n => n.props.role === 'status'), undefined);
  assert.ok(h.find(n => n.props.to === '/forgot-password'));
});
