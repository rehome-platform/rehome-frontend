import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';

// Exercise the real view and its handlers with mocked hooks, like the existing
// component suites. These tests do not simulate browser layout or backend calls.
function harness(withLogger = true) {
  const state = [];
  const logs = [];
  let cursor = 0;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
  };
  const module = { exports: {} };
  const source = readFileSync(new URL('../src/features/admin/components/AdminAccountsView.jsx', import.meta.url), 'utf8');
  vm.runInNewContext(transformSync(source, { loader: 'jsx', format: 'cjs' }).code, {
    module, exports: module.exports,
    require(name) {
      if (name === 'react') return React;
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  function expand(node) {
    if (!node || typeof node !== 'object') return node;
    if (typeof node.type === 'function') return expand(node.type(node.props));
    return { ...node, props: { ...node.props, children: node.props.children.map(expand) } };
  }
  const render = () => {
    cursor = 0;
    return expand(module.exports.default(withLogger ? { onLogAction: entry => logs.push(entry) } : {}));
  };
  function all(predicate, node = render()) {
    if (!node || typeof node !== 'object') return [];
    return [...(predicate(node) ? [node] : []), ...node.props.children.flatMap(child => all(predicate, child))];
  }
  const button = (label, root) => {
    const found = all(node => node.type === 'button' && text(node).trim() === label, root)[0];
    assert.ok(found, `Button not found: ${label}`);
    return found;
  };
  const rows = () => all(node => node.type === 'tbody')[0]?.props.children.filter(Boolean) ?? [];
  const row = name => rows().find(node => text(node).includes(name));
  const clickMenu = name => {
    const target = all(node => node.props.title === 'Tùy chọn', row(name))[0];
    assert.ok(target, `Account menu not found: ${name}`);
    target.props.onClick();
  };
  return {
    render, all, button, rows, row, logs, clickMenu,
    search(value) { all(node => node.type === 'input')[0].props.onChange({ target: { value } }); },
    select(index, value) { all(node => node.type === 'select')[index].props.onChange({ target: { value } }); },
    reason(value) { all(node => node.type === 'textarea')[0].props.onChange({ target: { value } }); },
    details(name) { clickMenu(name); button('visibilityXem chi tiết').props.onClick(); },
    lock(name) { clickMenu(name); button('lockKhóa tài khoản').props.onClick(); },
  };
}

function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node !== 'object') return String(node);
  return node.props.children.map(text).join('');
}

const names = ['Lê Hoàng Nam', 'Nguyễn Thị Mai', 'Quỹ Hy Vọng Xanh', 'Mái Ấm Hướng Dương', 'Phạm Thu Hà', 'Đỗ Quang Huy', 'Trần Bảo Ngọc', 'Võ Minh Khang'];

test('initial listing preserves account order, roles, statuses and decorative pagination', () => {
  const h = harness();
  assert.equal(h.rows().length, 8);
  h.rows().forEach((row, index) => assert.ok(text(row).includes(names[index])));
  assert.match(text(h.row(names[0])), /Member.*Bị khóa/);
  assert.match(text(h.row(names[2])), /Organizer.*Hoạt động/);
  assert.match(text(h.row(names[4])), /Moderator.*Hoạt động/);
  assert.match(text(h.render()), /Hiển thị 1 - 8 trong tổng số 2.498 tài khoản/);
  for (const label of ['Trước', '1', '2', '3', '313', 'Sau']) {
    assert.equal(h.button(label).props.onClick, undefined);
  }
  assert.equal(h.all(node => node.type === 'textarea').length, 0);
  assert.equal(h.all(node => node.type === 'button' && text(node).includes('Xóa bộ lọc')).length, 0);
});

test('search matches case-insensitive names/emails and the existing formatted phone substring', () => {
  const h = harness();
  for (const [keyword, name] of [['HOÀNG NAM', names[0]], ['MAI.NGUYEN@GMAIL.COM', names[1]], ['0977 340', names[4]]]) {
    h.search(keyword);
    assert.equal(h.rows().length, 1);
    assert.ok(text(h.rows()[0]).includes(name));
  }
  h.search(' nam.le@gmail.com ');
  assert.equal(h.rows().length, 0, 'Search must not start trimming input during refactoring');
});

test('role/status/search filters combine and reset restores all rows and controls', () => {
  const h = harness();
  h.select(0, 'member');
  assert.equal(h.rows().length, 4);
  h.select(1, 'ACTIVE');
  assert.equal(h.rows().length, 3);
  h.search('mai.nguyen');
  assert.equal(h.rows().length, 1);
  h.button('restart_altXóa bộ lọc').props.onClick();
  assert.equal(h.rows().length, 8);
  assert.equal(h.all(node => node.type === 'input')[0].props.value, '');
  assert.deepEqual(h.all(node => node.type === 'select').map(node => node.props.value), ['ALL', 'ALL']);
});

test('empty state suppresses the table and its reset button clears every filter', () => {
  const h = harness();
  h.select(0, 'moderator');
  h.select(1, 'LOCKED');
  h.search('unknown');
  assert.match(text(h.render()), /Không tìm thấy tài khoản phù hợp/);
  assert.equal(h.all(node => node.type === 'table').length, 0);
  assert.equal(h.all(node => node.type === 'button' && text(node) === 'Sau').length, 0);
  h.button('filter_alt_offXóa bộ lọc').props.onClick();
  assert.equal(h.rows().length, 8);
});

test('only one action menu opens and toggling or leaving it closes the menu', () => {
  const h = harness();
  h.clickMenu(names[0]);
  assert.ok(h.button('lock_openMở khóa'));
  h.clickMenu(names[1]);
  assert.ok(h.button('lockKhóa tài khoản'));
  assert.equal(h.all(node => node.type === 'button' && text(node) === 'lock_openMở khóa').length, 0);
  h.clickMenu(names[1]);
  assert.equal(h.all(node => node.props.onMouseLeave).length, 0);
  h.clickMenu(names[2]);
  h.all(node => node.props.onMouseLeave)[0].props.onMouseLeave();
  assert.equal(h.all(node => node.props.onMouseLeave).length, 0);
});

test('details show contact data and ordered history; close button and backdrop dismiss the drawer', () => {
  const h = harness();
  h.details(names[0]);
  let content = text(h.render());
  assert.match(content, /Chi tiết tài khoản/);
  assert.match(content, /Email:nam.le@gmail.com/);
  assert.match(content, /Số điện thoại:0903 112 458/);
  assert.ok(content.indexOf('02/10/2026 14:20') < content.indexOf('18/08/2026 09:10'));
  assert.equal(h.all(node => node.props.onMouseLeave).length, 0);
  h.button('close').props.onClick();
  assert.doesNotMatch(text(h.render()), /Chi tiết tài khoản/);
  h.details(names[2]);
  assert.match(text(h.render()), /Chưa ghi nhận lịch sử xử phạt nào/);
  h.all(node => node.props.className?.includes('bg-black/40'))[0].props.onClick();
  assert.doesNotMatch(text(h.render()), /Chi tiết tài khoản/);
});

test('lock reason is required, maxLength remains 300, typing clears errors and cancel has no side effects', () => {
  const h = harness();
  h.lock(names[1]);
  assert.match(text(h.render()), /Khóa tài khoản này\?/);
  assert.equal(h.all(node => node.type === 'textarea')[0].props.maxLength, 300);
  h.reason('   ');
  h.button('lockXác nhận khóa').props.onClick();
  assert.match(text(h.render()), /Vui lòng nhập lý do khóa/);
  assert.match(text(h.row(names[1])), /Hoạt động/);
  assert.equal(h.logs.length, 0);
  h.reason(' Valid reason ');
  assert.doesNotMatch(text(h.render()), /Vui lòng nhập lý do khóa/);
  assert.match(text(h.render()), /14 \/ 300/);
  h.button('Hủy').props.onClick();
  assert.equal(h.all(node => node.type === 'textarea').length, 0);
  h.lock(names[1]);
  assert.equal(h.all(node => node.type === 'textarea')[0].props.value, '');
  assert.equal(h.logs.length, 0);
});

test('locking from the drawer updates table, history and audit exactly once with trimmed reason', () => {
  const h = harness();
  h.details(names[1]);
  h.button('lockKhóa tài khoản này').props.onClick();
  h.reason('  Repeated violation  ');
  h.button('lockXác nhận khóa').props.onClick();
  assert.equal(h.all(node => node.type === 'textarea').length, 0);
  assert.match(text(h.row(names[1])), /Bị khóa/);
  const content = text(h.render());
  assert.ok(content.indexOf('09/10/2026 14:00') < content.indexOf('30/09/2026 17:30'));
  assert.match(content, /Lý do: Repeated violation/);
  assert.ok(h.button('lock_openMở khóa tài khoản'));
  assert.deepEqual(JSON.parse(JSON.stringify(h.logs)), [{
    time: '09/10/2026 14:00', user: 'Trần Minh Quân', role: 'Admin',
    action: 'Khóa tài khoản Member "Nguyễn Thị Mai"',
  }]);
  assert.match(text(h.row(names[2])), /Hoạt động/);
});

test('unlock from the drawer synchronizes status/history and preserves previous history', () => {
  const h = harness();
  h.details(names[0]);
  h.button('lock_openMở khóa tài khoản').props.onClick();
  assert.match(text(h.row(names[0])), /Hoạt động/);
  const content = text(h.render());
  assert.ok(content.indexOf('09/10/2026 14:05') < content.indexOf('02/10/2026 14:20'));
  assert.match(content, /Lý do: Mở khóa theo yêu cầu sau khi rà soát tuân thủ\./);
  assert.ok(h.button('lockKhóa tài khoản này'));
  assert.deepEqual(JSON.parse(JSON.stringify(h.logs)), [{
    time: '09/10/2026 14:05', user: 'Trần Minh Quân', role: 'Admin',
    action: 'Mở khóa tài khoản Member "Lê Hoàng Nam"',
  }]);
});

test('menu actions work without audit callback and a status change immediately reapplies filters', () => {
  const h = harness(false);
  h.select(1, 'LOCKED');
  h.clickMenu(names[0]);
  h.button('lock_openMở khóa').props.onClick();
  assert.equal(h.rows().length, 0);
  h.button('filter_alt_offXóa bộ lọc').props.onClick();
  h.lock(names[2]);
  h.reason('Existing local action');
  h.button('lockXác nhận khóa').props.onClick();
  assert.match(text(h.row(names[2])), /Bị khóa/);
  h.details(names[2]);
  assert.match(text(h.render()), /Existing local action/);
});

test('changing another account leaves the open detail drawer unchanged', () => {
  const h = harness();
  h.details(names[2]);
  h.lock(names[1]);
  h.reason('Different account');
  h.button('lockXác nhận khóa').props.onClick();
  assert.match(text(h.row(names[1])), /Bị khóa/);
  assert.match(text(h.render()), /Chưa ghi nhận lịch sử xử phạt nào/);
  assert.ok(h.button('lockKhóa tài khoản này'));
});
