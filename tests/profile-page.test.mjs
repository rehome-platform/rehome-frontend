import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
import * as validators from '../src/utils/validators.js';

// Real page handlers and validators with mocked context/service boundaries.
// Effects, dependencies, cleanups and rerenders are exercised; browser layout
// and the actual AuthProvider are covered by profile-password.browser.mjs.
const defaultUser = {
  fullName: 'Profile User', name: 'Display alias', email: 'profile@example.test',
  phone: '0912345678', avatarUrl: 'profile-avatar', avatar: 'fallback-avatar',
  role: 'admin', accountId: 42, memberCode: 'CODE-42', authorities: 'ROLE_ADMIN', emailVerified: true,
};

function harness(overrides = {}, user = defaultUser) {
  const slots = [];
  const timers = [];
  const warnings = [];
  const calls = { loads: 0, profiles: [], passwords: [], logouts: 0 };
  let cursor = 0;
  let dirty = false;
  let mounted = true;
  let lateWrites = 0;
  let effects = [];
  const auth = {
    user,
    updateProfile(data) { calls.profiles.push(data); return overrides.updateProfile?.(data); },
    changePassword(data) { calls.passwords.push(data); return overrides.changePassword?.(data); },
    logout() { calls.logouts++; },
  };
  const React = {
    Fragment: Symbol('Fragment'),
    createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => {
        if (!mounted) lateWrites++;
        const next = typeof value === 'function' ? value(slots[index]) : value;
        if (!Object.is(next, slots[index])) { slots[index] = next; dirty = true; }
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(callback, dependencies) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
        slots[index] = { dependencies };
        effects.push(() => { previous?.cleanup?.(); slots[index].cleanup = callback(); });
      }
    },
  };
  const module = { exports: {} };
  const source = readFileSync(new URL('../src/features/auth/pages/ProfilePage.jsx', import.meta.url), 'utf8');
  const dependencies = {
    react: React,
    '../../../context/AuthContext.jsx': { useAuth: () => auth },
    '../../../components/header.jsx': { __esModule: true, default: 'Header' },
    '../../../components/common/Badge.jsx': { __esModule: true, default: 'Badge' },
    '../services/auth.service.js': { __esModule: true, default: { getCurrentUser() {
      calls.loads++;
      return overrides.getCurrentUser?.() ?? Promise.resolve(null);
    } } },
    '../../../utils/validators.js': validators,
    '../styles/profile-password.css': {},
  };
  vm.runInNewContext(transformSync(source, { loader: 'jsx', format: 'cjs' }).code, {
    module, exports: module.exports,
    console: { warn: (...args) => warnings.push(args) },
    setTimeout: (callback, delay) => timers.push({ callback, delay }),
    require(name) {
      if (!Object.hasOwn(dependencies, name)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  function expand(node) {
    if (!node || typeof node !== 'object') return node;
    if (typeof node.type === 'function') return expand(node.type(node.props));
    return { ...node, props: { ...node.props, children: node.props.children.map(expand) } };
  }
  function render() {
    assert.ok(mounted, 'Cannot render an unmounted page');
    let tree;
    let attempts = 0;
    do {
      assert.ok(attempts++ < 12, 'Effects must settle without a rerender loop');
      cursor = 0;
      dirty = false;
      tree = expand(module.exports.default());
      const pending = effects;
      effects = [];
      pending.forEach(callback => callback());
    } while (dirty);
    return tree;
  }
  function all(predicate, node = render()) {
    function visit(current) {
      if (!current || typeof current !== 'object') return [];
      return [...(predicate(current) ? [current] : []), ...current.props.children.flatMap(visit)];
    }
    return visit(node);
  }
  const byId = id => {
    const node = all(node => node.props.id === id)[0];
    assert.ok(node, `Missing element: ${id}`);
    return node;
  };
  const h = {
    auth, calls, timers, warnings, render, all, byId,
    get lateWrites() { return lateWrites; },
    input(id, value) { byId(id).props.onChange({ target: { value } }); },
    tab(name) { byId('tab-profile-' + name).props.onClick(); },
    submit() { return all(node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} }); },
    async flush() { await Promise.resolve(); await Promise.resolve(); if (mounted) render(); },
    unmount() {
      mounted = false;
      slots.forEach(value => value?.cleanup?.());
    },
  };
  render();
  return h;
}

function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  return typeof node === 'object' ? node.props.children.map(text).join('') : String(node);
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fillPasswords(h, oldPassword = ' fixture-current ', password = ' fixture-next ') {
  h.input('current-pass-input', oldPassword);
  h.input('new-pass-input', password);
  h.input('confirm-pass-input', password);
}

test('Profile displays context identity, immutable email and existing role-specific fallbacks', () => {
  for (const [role, code, badge] of [['admin', 'ADM-OFFICIAL', 'Quản trị viên'], ['staff', 'MOD-OFFICIAL', 'Nhân viên Kho'], ['moderator', 'MOD-OFFICIAL', 'Nhân viên Kho']]) {
    const h = harness({}, { ...defaultUser, role, memberCode: '', authorities: '', rawRole: '', emailVerified: false });
    assert.equal(h.byId('user-name-input').props.value, 'Profile User');
    assert.equal(h.byId('user-phone-input').props.value, '0912345678');
    assert.equal(h.byId('user-email-input').props.disabled, true);
    assert.equal(h.byId('user-email-input').props.value, 'profile@example.test');
    assert.match(text(h.render()), new RegExp(code));
    assert.match(text(h.render()), new RegExp(badge));
    assert.match(text(h.render()), /Đang kích hoạt/);
    assert.equal(h.all(node => node.type === 'Header').length, 1);
    assert.equal(h.all(node => node.type === 'footer' || node.type === 'Footer').length, 0);
  }
});

test('fresh profile loads once, exposes loading state and updates form fields without changing context identity', async () => {
  const pending = deferred();
  const h = harness({ getCurrentUser: () => pending.promise });
  assert.match(text(h.render()), /Đang tải/);
  assert.equal(h.byId('user-name-input').props.value, 'Profile User');
  pending.resolve({ fullName: 'Fresh name', phone: '0987654321', avatarUrl: 'fresh-avatar' });
  await h.flush();
  assert.doesNotMatch(text(h.render()), /Đang tải/);
  assert.equal(h.byId('user-name-input').props.value, 'Fresh name');
  assert.equal(h.byId('user-phone-input').props.value, '0987654321');
  assert.equal(h.all(node => node.type === 'img')[0].props.src, 'fresh-avatar');
  assert.equal(h.auth.user, defaultUser);
  assert.equal(h.calls.loads, 1);
});

test('user changes resynchronize editable fields and preserve alias fallbacks', async () => {
  const h = harness();
  await h.flush();
  h.input('user-name-input', 'Unsaved edit');
  h.auth.user = { name: 'Replacement alias', phone: '', avatar: 'alias-avatar', role: 'staff' };
  h.render();
  assert.equal(h.byId('user-name-input').props.value, 'Replacement alias');
  assert.equal(h.byId('user-phone-input').props.value, '');
  assert.equal(h.all(node => node.type === 'img')[0].props.src, 'alias-avatar');
  assert.equal(h.calls.loads, 1);
});

test('profile load errors retain editable context values and end loading', async () => {
  const h = harness({ getCurrentUser: () => Promise.reject(new Error('Load failed')) });
  await h.flush();
  assert.equal(h.warnings.length, 1);
  assert.equal(h.byId('user-name-input').props.value, 'Profile User');
  assert.doesNotMatch(text(h.render()), /Đang tải|Load failed/);
});

test('profile loading ignores late responses after unmount', async () => {
  const pending = deferred();
  const h = harness({ getCurrentUser: () => pending.promise });
  h.unmount();
  pending.resolve({ fullName: 'Too late', phone: '0987654321' });
  await h.flush();
  assert.equal(h.lateWrites, 0);
});

test('profile validation rejects blank names and invalid phones but permits an omitted phone', async () => {
  const h = harness();
  await h.flush();
  h.input('user-name-input', '   ');
  await h.submit();
  assert.match(text(h.render()), /Vui lòng nhập họ và tên nhân sự/);
  h.input('user-name-input', 'A');
  h.input('user-phone-input', 'short');
  await h.submit();
  assert.match(text(h.render()), /Số điện thoại phải có ít nhất 10 chữ số/);
  assert.equal(h.calls.profiles.length, 0);
  h.input('user-phone-input', '');
  await h.submit();
  assert.equal(h.calls.profiles.length, 1);
  assert.equal(h.calls.profiles[0].fullName, 'A', 'Do not introduce the stricter validateFullName rule');
});

test('profile save preserves trimmed payload, selected avatar, pending state and four-second success timing', async () => {
  const pending = deferred();
  const h = harness({ updateProfile: () => pending.promise });
  await h.flush();
  h.input('user-name-input', ' Updated name ');
  h.input('user-phone-input', ' 0987654321 ');
  const preset = h.all(node => node.type === 'button' && node.props.children.some(child => child?.type === 'img'))[1];
  const avatar = preset.props.children[0].props.src;
  preset.props.onClick();
  const request = h.submit();
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls.profiles[0])), { fullName: 'Updated name', name: 'Updated name', phone: '0987654321', avatarUrl: avatar, avatar });
  assert.equal(h.byId('btn-save-profile').props.disabled, true);
  assert.match(text(h.render()), /Đang lưu/);
  assert.doesNotMatch(text(h.render()), /Cập nhật thông tin hồ sơ trên máy chủ thành công/);
  assert.equal(h.timers.length, 0);
  pending.resolve();
  await request;
  assert.equal(h.byId('btn-save-profile').props.disabled, false);
  assert.match(text(h.render()), /Cập nhật thông tin hồ sơ trên máy chủ thành công/);
  assert.equal(h.timers[0].delay, 4000);
  h.timers[0].callback();
  assert.doesNotMatch(text(h.render()), /Cập nhật thông tin hồ sơ trên máy chủ thành công/);
});

test('profile save failures preserve edits, use the existing fallback and allow retry', async () => {
  let failure = true;
  const h = harness({ updateProfile: () => { if (failure) throw new Error(''); } });
  await h.flush();
  h.input('user-name-input', 'Retained edit');
  await h.submit();
  assert.match(text(h.render()), /Không thể cập nhật hồ sơ lúc này/);
  assert.equal(h.byId('user-name-input').props.value, 'Retained edit');
  assert.equal(h.byId('btn-save-profile').props.disabled, false);
  failure = false;
  await h.submit();
  assert.doesNotMatch(text(h.render()), /Không thể cập nhật hồ sơ lúc này/);
  assert.equal(h.calls.profiles.length, 2);
});

test('switching tabs preserves unsaved profile and password values and visibility state', async () => {
  const h = harness();
  await h.flush();
  h.input('user-name-input', 'Unsaved profile');
  h.tab('security');
  fillPasswords(h);
  h.all(node => node.props['aria-controls'] === 'current-pass-input')[0].props.onClick();
  h.tab('sessions');
  assert.match(text(h.render()), /profile@example.test.*ROLE_ADMIN/);
  h.tab('info');
  assert.equal(h.byId('user-name-input').props.value, 'Unsaved profile');
  h.tab('security');
  assert.equal(h.byId('current-pass-input').props.value, ' fixture-current ');
  assert.equal(h.byId('current-pass-input').props.type, 'text');
});

test('password validation preserves required checks, length policy and confirmation order', async () => {
  const h = harness();
  h.tab('security');
  for (const [current, next, confirm, error] of [
    ['', '', '', 'Vui lòng nhập mật khẩu hiện tại.'],
    ['current', '   ', '', 'Vui lòng nhập mật khẩu'],
    ['current', 'short', 'short', 'Mật khẩu tối thiểu 6 ký tự'],
    ['current', 'secret', '', 'Vui lòng xác nhận mật khẩu'],
    ['current', 'secret', 'other', 'Mật khẩu xác nhận không khớp'],
  ]) {
    h.input('current-pass-input', current);
    h.input('new-pass-input', next);
    h.input('confirm-pass-input', confirm);
    await h.submit();
    assert.equal(text(h.byId('password-change-error')), 'error' + error);
  }
  assert.equal(h.calls.passwords.length, 0);
  fillPasswords(h, 'current', '123456');
  await h.submit();
  assert.equal(h.calls.passwords.length, 1);
});

test('password visibility controls retain labels, relationships and shared confirmation visibility', () => {
  const h = harness();
  h.tab('security');
  const current = () => h.all(node => node.props['aria-controls'] === 'current-pass-input')[0];
  const next = () => h.all(node => node.props['aria-controls'] === 'new-pass-input confirm-pass-input')[0];
  current().props.onClick();
  next().props.onClick();
  for (const id of ['current-pass-input', 'new-pass-input', 'confirm-pass-input']) {
    assert.equal(h.byId(id).props.type, 'text');
    assert.equal(h.byId(id).props.required, true);
    assert.equal(h.all(node => node.props.htmlFor === id).length, 1);
  }
  assert.equal(current().props['aria-pressed'], true);
  assert.equal(next().props['aria-pressed'], true);
  assert.equal(current().props.type, 'button');
  assert.equal(current().props['aria-label'], 'Ẩn mật khẩu hiện tại');
  assert.equal(h.byId('current-pass-input').props.autoComplete, 'current-password');
  assert.equal(h.byId('new-pass-input').props.autoComplete, 'new-password');
});

test('password requests prevent immediate duplicates and preserve payload, disabled state and tab persistence', async () => {
  const pending = deferred();
  const h = harness({ changePassword: () => pending.promise });
  h.tab('security');
  fillPasswords(h);
  const submit = h.byId('profile-password-form').props.onSubmit;
  let prevented = 0;
  const event = { preventDefault() { prevented++; } };
  const first = submit(event);
  await submit(event);
  assert.equal(prevented, 2);
  assert.equal(h.calls.passwords.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls.passwords[0])), { oldPassword: ' fixture-current ', newPassword: ' fixture-next ', newPasswordRepeat: ' fixture-next ' });
  assert.equal(h.byId('profile-password-form').props['aria-busy'], true);
  assert.equal(h.byId('btn-submit-change-pass').props.disabled, true);
  assert.ok(h.all(node => node.type === 'input').every(node => node.props.disabled));
  assert.ok(h.all(node => node.props['aria-pressed'] !== undefined).every(node => node.props.disabled));
  assert.equal(h.all(node => node.props.role === 'status').length, 0);
  h.tab('info');
  h.tab('security');
  assert.equal(h.byId('profile-password-form').props['aria-busy'], true);
  pending.resolve({ success: true });
  await first;
  assert.equal(h.auth.user, defaultUser);
  assert.equal(h.byId('profile-password-form').props['aria-busy'], false);
});

test('confirmed password success clears and hides secrets, persists until dismissed and does not schedule a timer', async () => {
  const h = harness();
  h.tab('security');
  fillPasswords(h);
  h.all(node => node.props['aria-controls'] === 'current-pass-input')[0].props.onClick();
  h.all(node => node.props['aria-controls'] === 'new-pass-input confirm-pass-input')[0].props.onClick();
  await h.submit();
  for (const id of ['current-pass-input', 'new-pass-input', 'confirm-pass-input']) {
    assert.equal(h.byId(id).props.value, '');
    assert.equal(h.byId(id).props.type, 'password');
    assert.equal(h.byId(id).props.disabled, false);
  }
  assert.equal(h.all(node => node.props.role === 'status')[0].props['aria-atomic'], 'true');
  assert.equal(h.timers.length, 0);
  h.tab('sessions');
  h.tab('security');
  assert.match(text(h.render()), /Mật khẩu đã được thay đổi thành công/);
  h.all(node => node.props['aria-label'] === 'Đóng thông báo thành công')[0].props.onClick();
  assert.equal(h.all(node => node.props.role === 'status').length, 0);
});

test('password API failures retain inputs and session, expose errors accessibly and permit retry', async () => {
  let message = 'Backend rejection';
  const h = harness({ changePassword: () => { if (message !== null) throw new Error(message); } });
  h.tab('security');
  fillPasswords(h);
  for (const reason of ['Backend rejection', 'Network failure', '']) {
    message = reason;
    await h.submit();
    assert.match(text(h.byId('password-change-error')), reason ? new RegExp(reason) : /Không thể đổi mật khẩu/);
    assert.equal(h.byId('password-change-error').props.role, 'alert');
    assert.equal(h.byId('profile-password-form').props['aria-describedby'], 'password-change-error');
    assert.equal(h.byId('btn-submit-change-pass').props.disabled, false);
    assert.equal(h.byId('current-pass-input').props.value, ' fixture-current ');
    assert.equal(h.all(node => node.props.role === 'status').length, 0);
    assert.equal(h.auth.user, defaultUser);
  }
  message = null;
  await h.submit();
  assert.equal(h.byId('profile-password-form').props['aria-describedby'], undefined);
  assert.equal(h.all(node => node.props.role === 'alert').length, 0);
  assert.equal(h.all(node => node.props.role === 'status').length, 1);
});

test('late password success and error responses cannot update an unmounted page', async () => {
  for (const outcome of ['resolve', 'reject']) {
    const pending = deferred();
    const h = harness({ changePassword: () => pending.promise });
    await h.flush();
    h.tab('security');
    fillPasswords(h);
    const request = h.submit();
    h.unmount();
    pending[outcome](new Error('Late response'));
    await request;
    assert.equal(h.lateWrites, 0);
  }
});

test('both logout controls delegate to context without invoking profile or password updates', async () => {
  const h = harness();
  await h.flush();
  h.all(node => node.type === 'button' && text(node).includes('Đăng xuất phiên'))[0].props.onClick();
  h.tab('sessions');
  h.all(node => node.type === 'button' && text(node) === 'Đăng xuất phiên này')[0].props.onClick();
  assert.equal(h.calls.logouts, 2);
  assert.equal(h.calls.profiles.length, 0);
  assert.equal(h.calls.passwords.length, 0);
});
