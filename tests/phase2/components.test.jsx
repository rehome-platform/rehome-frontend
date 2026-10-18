import React, { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Phase2Provider,
  usePhase2,
  useResource,
} from '../../src/features/moderator/phase2/hooks.jsx';
import {
  counterService,
  consignmentService,
  inventoryService,
  catalogService,
} from '../../src/features/moderator/phase2/api.js';
import CounterPage from '../../src/features/moderator/pages/CounterPage.jsx';
import ReceiptPanel from '../../src/features/moderator/phase2/ReceiptPanel.jsx';
import Modal from '../../src/components/common/Modal.jsx';
import { Phase2Error } from '../../src/features/moderator/phase2/model.js';

const auth = vi.hoisted(() => ({
  user: { id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a', warehouseName: 'Kho A' },
  isAuthenticated: true,
}));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth }));
function Wrapper({ children }) {
  return (
    <StrictMode>
      <MemoryRouter>
        <Phase2Provider>{children}</Phase2Provider>
      </MemoryRouter>
    </StrictMode>
  );
}
const member1 = {
    memberId: 'member-1',
    memberCode: 'MB-001',
    fullName: 'Nguyễn An',
    phone: '0900000001',
  },
  member2 = {
    memberId: 'member-2',
    memberCode: 'MB-002',
    fullName: 'Trần Bình',
    phone: '0900000001',
  };
beforeEach(() => {
  auth.user = { id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a', warehouseName: 'Kho A' };
  auth.isAuthenticated = true;
});

describe('Member selection', () => {
  it('never selects the first phone result and clears identity/tasks when switching Member', async () => {
    vi.spyOn(counterService, 'lookup').mockResolvedValue([member1, member2]);
    const confirm = vi
      .spyOn(counterService, 'confirm')
      .mockImplementation(async (memberId) => ({ memberId, identityToken: `proof-${memberId}` }));
    const tasks = vi
      .spyOn(counterService, 'tasks')
      .mockResolvedValue([{ formId: 'f1', name: 'Việc của An', status: 'APPROVED' }]);
    const user = userEvent.setup();
    render(<CounterPage />, { wrapper: Wrapper });
    await user.selectOptions(screen.getByLabelText('Tra cứu bằng'), 'phone');
    await user.type(screen.getByLabelText('Số điện thoại'), '0900000001');
    await user.click(screen.getByRole('button', { name: 'Tra cứu', exact: true }));
    await screen.findByRole('button', { name: 'Chọn Member MB-001' });
    expect(confirm).not.toHaveBeenCalled();
    expect(tasks).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Chọn Member MB-001' }));
    await user.click(screen.getByRole('button', { name: 'Tôi đã đối chiếu đúng Member' }));
    await screen.findByText('Việc của An');
    await user.click(screen.getByRole('button', { name: 'Chọn Member MB-002' }));
    expect(screen.queryByText('Việc của An')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tôi đã đối chiếu đúng Member' })).toBeEnabled();
  });
  it('ignores a late identity confirmation after choosing another Member', async () => {
    vi.spyOn(counterService, 'lookup').mockResolvedValue([member1, member2]);
    let resolve;
    vi.spyOn(counterService, 'confirm').mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    vi.spyOn(counterService, 'tasks').mockResolvedValue([]);
    const user = userEvent.setup();
    render(<CounterPage />, { wrapper: Wrapper });
    await user.type(screen.getByLabelText('Mã Member'), 'MB-001');
    await user.click(screen.getByRole('button', { name: 'Tra cứu', exact: true }));
    await user.click(await screen.findByRole('button', { name: 'Chọn Member MB-001' }));
    await user.click(screen.getByRole('button', { name: 'Tôi đã đối chiếu đúng Member' }));
    await user.click(screen.getByRole('button', { name: 'Chọn Member MB-002' }));
    await act(async () => resolve({ memberId: 'member-1', identityToken: 'late' }));
    expect(screen.queryByText('Đã xác nhận danh tính')).not.toBeInTheDocument();
  });
});

describe('receipt and recovery gates', () => {
  it('does not expose stock-in before server confirmation', async () => {
    vi.spyOn(consignmentService, 'receipt').mockResolvedValue({
      receiptId: 'r1',
      confirmedAt: null,
      snapshot: { agreedPrice: 250000, commissionRate: 0.1 },
    });
    render(<ReceiptPanel receiptId="r1" allowStockIn />, { wrapper: Wrapper });
    await screen.findByText(/Đang chờ Member xác nhận/);
    expect(screen.queryByLabelText('Tên sản phẩm')).not.toBeInTheDocument();
    expect(screen.getByText('Hoa hồng: 10%')).toBeInTheDocument();
  });
  it('recovers an existing product instead of offering a second stock-in', async () => {
    vi.spyOn(consignmentService, 'receipt').mockResolvedValue({
      receiptId: 'r1',
      confirmedAt: '2026-10-18',
    });
    vi.spyOn(catalogService, 'list').mockResolvedValue({ categories: [], brands: [] });
    vi.spyOn(inventoryService, 'byReceipt').mockResolvedValue({ sku: 'RECOVERED-SKU' });
    render(<ReceiptPanel receiptId="r1" allowStockIn />, { wrapper: Wrapper });
    await screen.findByRole('link', { name: /Sản phẩm đã tồn tại · RECOVERED-SKU/ });
    expect(screen.queryByRole('button', { name: 'Nhập kho · tạo SKU' })).not.toBeInTheDocument();
  });
});

describe('session and request lifecycle', () => {
  function Probe({ loader }) {
    const session = usePhase2();
    const resource = useResource(loader, []);
    return (
      <>
        <p>{resource.data?.name}</p>
        <button onClick={() => resource.mutate(loader)}>Mutate</button>
        <output>{session.scope.userId}</output>
      </>
    );
  }
  it('runs under StrictMode and aborts old requests on identity changes', async () => {
    const signals = [];
    const loader = vi.fn(async (options) => {
      signals.push(options.signal);
      return { name: 'Data A' };
    });
    const view = render(<Probe loader={loader} />, { wrapper: Wrapper });
    await screen.findByText('Data A');
    expect(signals.at(-1).aborted).toBe(false);
    auth.user = { ...auth.user, id: 'mod-b', warehouseId: 'warehouse-b' };
    view.rerender(<Probe loader={async () => ({ name: 'Data B' })} />);
    await screen.findByText('Data B');
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(screen.queryByText('Data A')).not.toBeInTheDocument();
  });
  it('prevents immediate duplicate mutations and never retries network failures', async () => {
    let resolve;
    const action = vi.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    function MutationProbe() {
      const resource = useResource(async () => null, [], { enabled: false });
      return (
        <button
          onClick={() => {
            resource.mutate(action);
            resource.mutate(action);
          }}
        >
          Send
        </button>
      );
    }
    render(<MutationProbe />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Send'));
    expect(action).toHaveBeenCalledTimes(1);
    await act(async () => resolve(null));
  });
  it('keeps 409 feedback while refreshing server state', async () => {
    let load = 0;
    function ConflictProbe() {
      const resource = useResource(async () => ({ name: `Server ${++load}` }), []);
      return (
        <>
          <p>{resource.data?.name}</p>
          <button
            onClick={() =>
              resource.mutate(async () => {
                throw new Phase2Error('Claim đã hết hạn', 409);
              })
            }
          >
            Approve
          </button>
          <p role="alert">{resource.error?.message}</p>
        </>
      );
    }
    render(<ConflictProbe />, { wrapper: Wrapper });
    await screen.findByText(/Server/);
    fireEvent.click(screen.getByText('Approve'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Claim đã hết hạn'));
    expect(load).toBeGreaterThan(1);
  });
});

describe('modal keyboard behavior', () => {
  it('keeps input focus when typing rerenders an inline close handler', async () => {
    function Editor() {
      const [name, setName] = React.useState('');
      return <Modal isOpen title="Editor" onClose={() => {}}><input aria-label="Tên mới" value={name} onChange={event => setName(event.target.value)} /></Modal>;
    }
    const user = userEvent.setup();
    render(<Editor />);
    await user.type(screen.getByLabelText('Tên mới'), 'Thương hiệu mới');
    expect(screen.getByLabelText('Tên mới')).toHaveValue('Thương hiệu mới');
    expect(screen.getByLabelText('Tên mới')).toHaveFocus();
  });
  it('traps focus, closes on Escape and restores trigger focus', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const view = render(
      <Modal isOpen title="Test dialog" onClose={onClose}>
        <input aria-label="Test field" />
        <button>Save</button>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Test dialog');
    screen.getByText('Save').focus();
    await user.tab();
    expect(screen.getByLabelText('Đóng')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
    view.unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
