import React, { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Phase2Provider,
  usePhase2,
  useResource,
} from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import {
  counterService,
  consignmentService,
  inventoryService,
  catalogService,
  queueService,
} from '../../src/features/moderator/services/warehouseApi.js';
import CounterPage from '../../src/features/moderator/pages/CounterPage.jsx';
import ConsignmentQueuePage from '../../src/features/moderator/pages/ConsignmentQueuePage.jsx';
import ReceiptPanel from '../../src/features/moderator/components/ReceiptPanel.jsx';
import Modal from '../../src/components/common/Modal.jsx';
import { Phase2Error } from '../../src/features/moderator/models/warehouseModel.js';

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
  it('renders all three task groups and executes counter handover upon confirmation', async () => {
    vi.spyOn(counterService, 'lookup').mockResolvedValue([member1]);
    vi.spyOn(counterService, 'confirm').mockResolvedValue({
      memberId: 'member-1',
      accountId: 'member-1',
      identityToken: 'proof-1',
      confirmedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
    vi.spyOn(counterService, 'tasks').mockResolvedValue({
      pendingForms: [{ id: 'form-1', productName: 'Áo khoác gió', desiredPrice: 250000, status: 'APPROVED' }],
      pendingWithdrawals: [{ id: 'req-withdrawal-1', productId: 'Q7-AK-001', productName: 'Quần jeans', feeCharged: 50000, pickupDeadline: '2026-10-30T10:00:00Z' }],
      pendingEndOfTerm: [{ id: 'req-endterm-1', productId: 'Q7-DM-002', productName: 'Đầm hoa', deadline: '2026-11-05T10:00:00Z' }],
    });
    const handoverSpy = vi.spyOn(counterService, 'handover').mockResolvedValue(null);

    const user = userEvent.setup();
    render(<CounterPage />, { wrapper: Wrapper });

    await user.type(screen.getByLabelText('Mã Member'), 'MB-001');
    await user.click(screen.getByRole('button', { name: 'Tra cứu', exact: true }));
    await user.click(await screen.findByRole('button', { name: 'Chọn Member MB-001' }));
    await user.click(screen.getByRole('button', { name: 'Tôi đã đối chiếu đúng Member' }));

    await screen.findByText('1. Tiếp nhận hàng ký gửi & Kiểm định');
    expect(screen.getByText('Áo khoác gió')).toBeInTheDocument();
    expect(screen.getByText('2. Khách đến nhận lại hàng rút giữa kỳ')).toBeInTheDocument();
    expect(screen.getByText('Quần jeans')).toBeInTheDocument();
    expect(screen.getByText('3. Khách đến nhận lại hàng hết kỳ ký gửi')).toBeInTheDocument();
    expect(screen.getByText('Đầm hoa')).toBeInTheDocument();

    const handoverButtons = screen.getAllByRole('button', { name: 'Bàn giao cho khách' });
    expect(handoverButtons).toHaveLength(2);
    await user.click(handoverButtons[0]);

    expect(await screen.findByText('Xác nhận bàn giao hiện vật tại quầy')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xác nhận đã bàn giao' }));

    expect(handoverSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'member-1',
        refId: 'req-withdrawal-1',
        context: 'ITEM_WITHDRAWAL',
      }),
    );
    expect(await screen.findByText(/Đã bàn giao thành công/)).toBeInTheDocument();
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

describe('ConsignmentQueuePage component behaviors', () => {
  it('renders queue items with badges and claims a task successfully', async () => {
    vi.spyOn(queueService, 'list').mockResolvedValue([
      {
        id: 'q-free',
        queueId: 'q-free',
        type: 'FORM_REVIEW',
        formId: 'form-101',
        name: 'Áo khoác dạ',
        claimedBy: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'q-mine',
        queueId: 'q-mine',
        type: 'INSPECTION',
        formId: 'form-102',
        name: 'Váy công sở',
        claimedBy: 'mod-a',
        createdAt: new Date().toISOString(),
      },
    ]);
    const claimSpy = vi.spyOn(queueService, 'claim').mockResolvedValue({
      id: 'q-free',
      claimedBy: 'mod-a',
      claimedAt: new Date().toISOString(),
    });

    render(<ConsignmentQueuePage />, { wrapper: Wrapper });
    expect(await screen.findByText('Áo khoác dạ')).toBeInTheDocument();
    expect(screen.getByText('chưa ai nhận')).toBeInTheDocument();
    expect(screen.getByText('bạn đang giữ')).toBeInTheDocument();

    const claimBtn = screen.getByRole('button', { name: 'Nhận việc' });
    fireEvent.click(claimBtn);

    await waitFor(() => {
      expect(claimSpy).toHaveBeenCalledWith('q-free', expect.anything());
    });
    expect(await screen.findByText(/Đã nhận việc/)).toBeInTheDocument();
  });

  it('displays error banner and reloads when claim encounters 409 conflict', async () => {
    vi.spyOn(queueService, 'list').mockResolvedValue([
      {
        id: 'q-conflict',
        queueId: 'q-conflict',
        type: 'PACKING',
        orderId: 'order-999',
        name: 'Giày sneaker',
        claimedBy: null,
        createdAt: new Date().toISOString(),
      },
    ]);
    vi.spyOn(queueService, 'claim').mockRejectedValue(
      new Phase2Error('Xung đột nhận việc', 409, 'QUEUE_ITEM_ALREADY_CLAIMED'),
    );

    render(<ConsignmentQueuePage />, { wrapper: Wrapper });
    expect(await screen.findByText('Giày sneaker')).toBeInTheDocument();

    const claimBtn = screen.getByRole('button', { name: 'Nhận việc' });
    fireEvent.click(claimBtn);

    expect(await screen.findByText(/Công việc đã được người khác nhận trước/)).toBeInTheDocument();
  });

  it('opens release modal and releases task successfully', async () => {
    vi.spyOn(queueService, 'list').mockResolvedValue([
      {
        id: 'q-mine-2',
        queueId: 'q-mine-2',
        type: 'FORM_REVIEW',
        formId: 'form-202',
        name: 'Túi xách da',
        claimedBy: 'mod-a',
        createdAt: new Date().toISOString(),
      },
    ]);
    const releaseSpy = vi.spyOn(queueService, 'release').mockResolvedValue(null);

    render(<ConsignmentQueuePage />, { wrapper: Wrapper });
    expect(await screen.findByText('Túi xách da')).toBeInTheDocument();

    const releaseTrigger = screen.getByRole('button', { name: 'Nhả việc' });
    fireEvent.click(releaseTrigger);

    expect(await screen.findByText('Nhả việc này về hàng đợi?')).toBeInTheDocument();

    const modalReleaseBtn = screen.getAllByRole('button', { name: 'Nhả việc' }).find(
      (btn) => btn.closest('[role="dialog"]'),
    );
    fireEvent.click(modalReleaseBtn);

    await waitFor(() => {
      expect(releaseSpy).toHaveBeenCalledWith('q-mine-2', expect.anything());
    });
    expect(await screen.findByText(/Đã nhả việc/)).toBeInTheDocument();
  });
});
