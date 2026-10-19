import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
import * as roleConfig from '../src/configs/role.config.js';

// Component logic tests with mocked React hooks, authentication and router.
// These do not simulate browser rendering, real login, or backend authorization.
function harness(file, role = 'admin', authenticated = true) {
  const state = [];
  let cursor = 0;
  let logouts = 0;
  const navigations = [];
  const auth = { user: { role, email: 'test@example.com' }, isAuthenticated: authenticated, loading: false,
    logout: async () => { logouts++; auth.user = null; auth.isAuthenticated = false; } };
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }),
    useState(initial) {
      const i = cursor++;
      if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial;
      return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }];
    },
    useRef: initial => ({ current: initial }), useEffect() {},
  };
  const module = { exports: {} };
  const source = readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
  vm.runInNewContext(transformSync(source, { loader: 'jsx', format: 'cjs' }).code, {
    module, exports: module.exports,
    require(name) {
      if (name === 'react') return React;
      if (name === 'react-router-dom') return { Link: 'Link', Navigate: 'Navigate', Route: 'Route', Routes: 'Routes',
        useLocation: () => ({ pathname: '/admin' }), useNavigate: () => path => navigations.push(path) };
      if (name.includes('AuthContext')) return { useAuth: () => auth };
      if (name.includes('NotificationContext')) return { useNotification: () => ({ unreadCount: 0 }) };
      if (name.includes('role.config')) return roleConfig;
      // Other imported components stay opaque; tests exercise each target separately.
      return new Proxy({ __esModule: true, default: name }, { get: (target, key) => target[key] ?? String(key) });
    },
  });
  const render = (props = {}) => { cursor = 0; return module.exports.default(props); };
  function nodes(node) {
    if (!node || typeof node !== 'object') return [];
    return [node, ...(node.props.children || []).flatMap(nodes)];
  }
  const all = (predicate, props) => nodes(render(props)).filter(predicate);
  return { auth, render, all, navigations, get logouts() { return logouts; } };
}

const headerFile = 'features/admin/components/AdminHeader.jsx';
function openHeader(h) { h.all(n => n.props.role === 'button')[0].props.onClick(); }

test('TC-B-002: Admin account menu removes warehouse switch, retains profile/logout', () => {
  const h = harness(headerFile);
  openHeader(h);
  const links = h.all(n => n.type === 'Link');
  assert.deepEqual(links.map(n => n.props.to), ['/profile']);
  assert.ok(h.all(n => n.type === 'button' && n.props.onClick)[0]);
});

test('TC-B-011: Profile action closes the account dropdown', () => {
  const h = harness(headerFile);
  openHeader(h);
  h.all(n => n.type === 'Link' && n.props.to === '/profile')[0].props.onClick();
  assert.equal(h.all(n => n.props.id === 'admin-account-dropdown').length, 0);
});

test('TC-B-010: Logout delegates to auth and protected content is then denied (mocked)', async () => {
  const h = harness(headerFile);
  openHeader(h);
  await h.all(n => n.type === 'button' && n.props.onClick)[0].props.onClick();
  assert.equal(h.logouts, 1);
  assert.equal(h.all(n => n.props.id === 'admin-account-dropdown').length, 0);
  const guard = harness('routes/PrivateRoute.jsx', null, h.auth.isAuthenticated);
  assert.equal(guard.render({ roles: ['admin'], children: 'protected' }).props.to, '/login');
});

test('TC-B-012: Enter and Space toggle account menu and update expanded state (handler only)', () => {
  const h = harness(headerFile);
  for (const key of ['Enter', ' ']) {
    let prevented = false;
    h.all(n => n.props.role === 'button')[0].props.onKeyDown({ key, preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(h.all(n => n.props.role === 'button')[0].props['aria-expanded'], key === 'Enter');
  }
});

test('TC-B-003: Admin sidebar and profile header/footer expose no warehouse navigation', () => {
  for (const file of ['features/admin/components/AdminSidebar.jsx', 'components/header.jsx', 'components/footer.jsx']) {
    const h = harness(file);
    assert.equal(h.all(n => n.type === 'Link' && n.props.to?.startsWith('/moderator')).length, 0, file);
    if (file.endsWith('header.jsx')) {
      const dropdown = h.all(n => n.props.items)[0];
      dropdown.props.items.filter(item => item.onClick && !item.danger).forEach(item => item.onClick());
      assert.ok(h.navigations.every(path => path === '/profile' || path.startsWith('/admin')));
    }
  }
});

test('TC-B-006: Moderator layouts and footer retain warehouse links without Admin links', () => {
  for (const role of ['staff', 'moderator']) {
    for (const file of ['layouts/ModeratorLayout.jsx', 'components/header.jsx', 'components/footer.jsx']) {
      const h = harness(file, role);
      assert.ok(h.all(n => n.type === 'Link' && n.props.to?.startsWith('/moderator')).length > 0, file);
      assert.equal(h.all(n => n.type === 'Link' && n.props.to?.startsWith('/admin')).length, 0, file);
    }
  }
});

function routeConfigs() {
  return harness('routes/AppRouter.jsx').all(n => n.type === 'Route');
}

test('TC-B-004/005/007/008: Actual route configuration and guard preserve explicit role policy', () => {
  const routes = routeConfigs().filter(n => n.props.path?.startsWith('/admin') || n.props.path?.startsWith('/moderator'));
  assert.equal(routes.length, 14);
  for (const route of routes) {
    const roles = route.props.element.props.roles;
    for (const role of ['admin', 'staff', 'moderator']) {
      const h = harness('routes/PrivateRoute.jsx', role);
      const result = h.render({ roles, children: 'protected' });
      if (route.props.path.startsWith('/moderator') || role === 'admin') assert.equal(result, 'protected');
      else {
        assert.equal(result.type, 'Navigate');
        assert.ok(result.props.to !== '/admin');
      }
    }
    const anonymous = harness('routes/PrivateRoute.jsx', null, false);
    const result = anonymous.render({ roles, children: 'protected' });
    assert.equal(result.props.to, '/login');
    assert.equal(result.props.state.from.pathname, '/admin');
  }
});

test('TC-B-001/005: Existing default landing targets follow authenticated role (mocked)', () => {
  for (const [role, expected] of [['admin', '/admin'], ['staff', '/moderator/counter'], ['moderator', '/moderator/counter']]) {
    const h = harness('routes/AppRouter.jsx', role);
    const root = h.all(n => n.type === 'Route' && n.props.path === '/')[0];
    assert.equal(root.props.element.type().props.to, expected);
  }
});

test('TC-B-009: Guards withhold content during restoration then honor restored role (mocked)', () => {
  const h = harness('routes/PrivateRoute.jsx');
  h.auth.loading = true;
  assert.notEqual(h.render({ roles: ['admin'], children: 'protected' }), 'protected');
  h.auth.loading = false;
  assert.equal(h.render({ roles: ['admin'], children: 'protected' }), 'protected');
});
