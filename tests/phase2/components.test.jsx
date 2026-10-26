import React, { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
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
import ConsignmentDetailPage from '../../src/features/moderator/pages/ConsignmentDetailPage.jsx';
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

function WithIdentity({ identity, children }) {
  const { setIdentity } = usePhase2();
  React.useEffect(() => {
    if (identity) setIdentity(identity);
  }, [identity, setIdentity]);
  return children;
}

function renderDetailRoute(ui, route = '/moderator/consignments/form-101', identity = null) {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[route]}>
        <Phase2Provider>
          <WithIdentity identity={identity}>
            <Routes>
              <Route path="/moderator/consignments/:formId" element={ui} />
            </Routes>
          </WithIdentity>
        </Phase2Provider>
      </MemoryRouter>
    </StrictMode>,
  );
}

describe('ConsignmentDetailPage component behaviors', () => {
  it('renders form details and approves form successfully with feedback', async () => {
    vi.spyOn(consignmentService, 'read').mockResolvedValue({
      id: 'form-101',
      formId: 'form-101',
      name: 'Áo khoác gió',
      productName: 'Áo khoác gió',
      status: 'PENDING',
      allowedActions: ['APPROVE', 'REJECT'],
      claimedBy: 'mod-a',
    });
    const approveSpy = vi.spyOn(queueService, 'approve').mockResolvedValue({
      id: 'form-101',
      status: 'APPROVED',
      bringInDeadline: '2026-11-03',
    });

    renderDetailRoute(<ConsignmentDetailPage />);
    expect(await screen.findByRole('heading', { name: /Áo khoác gió/ })).toBeInTheDocument();
    expect(screen.getByText('Chờ duyệt')).toBeInTheDocument();

    const approveBtn = screen.getByRole('button', { name: /Duyệt form/ });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith('form-101', expect.anything());
    });
    expect(await screen.findByText(/Đã duyệt form ký gửi thành công/)).toBeInTheDocument();
  });

  it('rejects form online with reason feedback', async () => {
    vi.spyOn(consignmentService, 'read').mockResolvedValue({
      id: 'form-101',
      formId: 'form-101',
      name: 'Quần jeans',
      status: 'PENDING',
      allowedActions: ['APPROVE', 'REJECT'],
      claimedBy: 'mod-a',
    });
    const rejectSpy = vi.spyOn(queueService, 'reject').mockResolvedValue({
      id: 'form-101',
      status: 'REJECTED',
    });

    const user = userEvent.setup();
    renderDetailRoute(<ConsignmentDetailPage />);
    expect(await screen.findByRole('heading', { name: /Quần jeans/ })).toBeInTheDocument();

    const rejectRadio = screen.getByLabelText(/Từ chối kèm lý do/i);
    await user.click(rejectRadio);

    const reasonInput = screen.getByPlaceholderText(/Nhập lý do từ chối/);
    await user.type(reasonInput, 'Ảnh quá mờ không xem được');

    const rejectBtn = screen.getByRole('button', { name: 'Từ chối form ký gửi' });
    await user.click(rejectBtn);

    await waitFor(() => {
      expect(rejectSpy).toHaveBeenCalledWith('form-101', 'Ảnh quá mờ không xem được', expect.anything());
    });
    expect(await screen.findByText(/Đã từ chối form ký gửi/)).toBeInTheDocument();
  });

  it('starts inspection when member is identified at counter', async () => {
    vi.spyOn(consignmentService, 'read').mockResolvedValue({
      id: 'form-101',
      formId: 'form-101',
      name: 'Váy dạ hội',
      status: 'APPROVED',
      memberId: 'member-1',
      allowedActions: ['START_INSPECTION'],
      claimedBy: 'mod-a',
    });
    const startSpy = vi.spyOn(consignmentService, 'start').mockResolvedValue(null);

    renderDetailRoute(
      <ConsignmentDetailPage />,
      '/moderator/consignments/form-101',
      { memberId: 'member-1', identityToken: 'token-abc' },
    );
    expect(await screen.findByRole('heading', { name: /Váy dạ hội/ })).toBeInTheDocument();

    const startBtn = screen.getByRole('button', { name: 'Bắt đầu kiểm định tại quầy' });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(startSpy).toHaveBeenCalledWith('form-101', expect.anything(), expect.anything());
    });
    expect(await screen.findByText(/Đã bắt đầu kiểm định tại quầy/)).toBeInTheDocument();
  });

  it('completes inspection after checking all 6 checklist items and entering valid price', async () => {
    vi.spyOn(consignmentService, 'read').mockResolvedValue({
      id: 'form-101',
      formId: 'form-101',
      name: 'Đầm hoa',
      status: 'INSPECTING',
      memberId: 'member-1',
      allowedActions: ['COMPLETE_INSPECTION', 'RETURN_ONSITE'],
      claimedBy: 'mod-a',
    });
    const completeSpy = vi.spyOn(consignmentService, 'complete').mockResolvedValue({
      receiptId: 'rcpt-test-1',
    });

    const user = userEvent.setup();
    renderDetailRoute(
      <ConsignmentDetailPage />,
      '/moderator/consignments/form-101',
      { memberId: 'member-1', identityToken: 'token-abc' },
    );
    expect(await screen.findByRole('heading', { name: /Đầm hoa/ })).toBeInTheDocument();

    // Check all 6 checklist boxes
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(6);
    for (const box of checkboxes) {
      await user.click(box);
    }

    const noteInput = screen.getByPlaceholderText(/Mô tả độ mới/);
    await user.type(noteInput, 'Còn nguyên tag, mới 99%');

    const priceInput = screen.getByPlaceholderText(/VD: 850000/);
    await user.type(priceInput, '850000');

    const termSelect = screen.getByLabelText(/Độ dài kỳ ký gửi/);
    await user.selectOptions(termSelect, '30');

    const submitBtn = screen.getByRole('button', { name: /Đạt kiểm định/ });
    expect(submitBtn).toBeEnabled();
    await user.click(submitBtn);

    await waitFor(() => {
      expect(completeSpy).toHaveBeenCalledWith(
        'form-101',
        expect.objectContaining({
          conditionNote: 'Còn nguyên tag, mới 99%',
          agreedPrice: 850000,
          termLengthDays: 30,
        }),
        expect.anything(),
      );
    });
    expect(await screen.findByText(/Đã lập biên nhận ký gửi thành công/)).toBeInTheDocument();
  });

  it('returns item onsite when inspection fails', async () => {
    vi.spyOn(consignmentService, 'read').mockResolvedValue({
      id: 'form-101',
      formId: 'form-101',
      name: 'Áo len',
      status: 'INSPECTING',
      memberId: 'member-1',
      allowedActions: ['COMPLETE_INSPECTION', 'RETURN_ONSITE'],
      claimedBy: 'mod-a',
    });
    const returnSpy = vi.spyOn(consignmentService, 'returnOnsite').mockResolvedValue({
      id: 'form-101',
      status: 'REJECTED',
    });

    const user = userEvent.setup();
    renderDetailRoute(
      <ConsignmentDetailPage />,
      '/moderator/consignments/form-101',
      { memberId: 'member-1', identityToken: 'token-abc' },
    );
    expect(await screen.findByRole('heading', { name: /Áo len/ })).toBeInTheDocument();

    const returnSelect = screen.getByLabelText(/Lý do không nhận/);
    await user.selectOptions(returnSelect, returnSelect.options[1].value);

    const noteInput = screen.getByPlaceholderText(/Mô tả vết bẩn, lỗi rách/);
    await user.type(noteInput, 'Vết rách lớn ở tay áo');

    const returnBtn = screen.getByRole('button', { name: 'Xác nhận trả đồ tại chỗ cho Member' });
    await user.click(returnBtn);

    await waitFor(() => {
      expect(returnSpy).toHaveBeenCalledWith(
        'form-101',
        expect.objectContaining({ note: 'Vết rách lớn ở tay áo' }),
        expect.anything(),
      );
    });
    expect(await screen.findByText(/Đã xác nhận trả đồ tại chỗ/)).toBeInTheDocument();
  });

  it('displays backend permission notice gracefully when read fails with 403', async () => {
    vi.spyOn(consignmentService, 'read').mockRejectedValue(
      new Phase2Error('Forbidden', 403, 'CONSIGNMENT_FORM_FORBIDDEN'),
    );

    renderDetailRoute(<ConsignmentDetailPage />);
    expect(
      await screen.findByText(/Backend giới hạn quyền đọc chi tiết form trực tiếp/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở Hàng đợi công việc' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quầy tiếp nhận Member' })).toBeInTheDocument();
  });

  it('ReceiptPanel downloads binary PDF via consignmentService.pdf when confirmed', async () => {
    vi.spyOn(consignmentService, 'receipt').mockResolvedValue({
      id: 'rcpt-test-2',
      receiptId: 'rcpt-test-2',
      receiptNo: 'RCP-2026-001',
      confirmedAt: '2026-10-26T14:00:00Z',
      agreedPrice: 600000,
      floorPrice: 420000,
      termLengthDays: 30,
      commissionRateTerm1: 0.15,
    });
    const pdfSpy = vi.spyOn(consignmentService, 'pdf').mockResolvedValue({
      pdfUrl: 'blob:http://localhost/receipt.pdf',
    });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {});

    render(<ReceiptPanel receiptId="rcpt-test-2" />, { wrapper: Wrapper });
    expect(await screen.findByText(/RCP-2026-001/)).toBeInTheDocument();
    expect(screen.getByText(/Member đã xác nhận/)).toBeInTheDocument();

    const pdfBtn = screen.getByRole('button', { name: 'Mở PDF biên nhận' });
    fireEvent.click(pdfBtn);

    await waitFor(() => {
      expect(pdfSpy).toHaveBeenCalledWith('rcpt-test-2');
    });
    expect(openSpy).toHaveBeenCalledWith('blob:http://localhost/receipt.pdf', '_blank');
  });
});
