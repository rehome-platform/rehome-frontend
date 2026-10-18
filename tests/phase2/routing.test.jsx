import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppRouter from '../../src/routes/AppRouter.jsx';

const auth = vi.hoisted(() => ({ isAuthenticated: true, user: { role: 'staff' }, loading: false }));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth }));
vi.mock('../../src/features/auth/pages/index.js', () => Object.fromEntries(
  ['LoginPage', 'ForgotPassword', 'ProfilePage'].map((name) => [name, () => <p>{name}</p>]),
));
vi.mock('../../src/features/auth/pages/ResetPassword.jsx', () => ({ default: () => <p>ResetPassword</p> }));
vi.mock('../../src/features/admin/pages/index.js', () => Object.fromEntries(
  ['AdminDashboardPage', 'AdminAccountsPage', 'AdminModeratorsPage', 'AdminWarehousesPage', 'ConfigPage', 'AdminAuditLogsPage']
    .map((name) => [name, () => <p>{name}</p>]),
));
vi.mock('../../src/layouts/AdminLayout.jsx', () => ({ default: () => <div data-testid="admin-layout"><Outlet /></div> }));
vi.mock('../../src/features/moderator/pages/index.js', () => Object.fromEntries(
  ['CounterPage', 'ConsignmentDetailPage', 'InventoryDetailPage', 'EndOfTermPage', 'ConsignmentQueuePage',
    'WarehouseInventoryPage', 'PackingOrdersPage', 'ReturnProcessingPage', 'OrgVerificationPage',
    'ViolationReportsPage', 'CategoryBrandPage', 'WarehouseInboxPage']
    .map((name) => [name, () => <><p>{name}</p><input aria-label="Page editor" defaultValue="" /></>]),
));
function Location({ destination }) {
  const location = useLocation(), navigate = useNavigate();
  return <><output data-testid="path">{location.pathname}</output>
    <output data-testid="from">{location.state?.from?.pathname}</output>
    <button onClick={() => navigate(destination)}>Navigate</button></>;
}
function show(path, destination) {
  return render(<MemoryRouter initialEntries={[path]}><AppRouter /><Location destination={destination} /></MemoryRouter>);
}
beforeEach(() => { auth.isAuthenticated = true; auth.user = { role: 'staff' }; auth.loading = false; });
const moderatorRoutes = [
  ['/moderator/counter', 'CounterPage'], ['/moderator/queue', 'ConsignmentQueuePage'],
  ['/moderator/inventory', 'WarehouseInventoryPage'], ['/moderator/packing', 'PackingOrdersPage'],
  ['/moderator/consignments/form-1', 'ConsignmentDetailPage'], ['/moderator/inventory/SKU-1', 'InventoryDetailPage'],
  ['/moderator/end-of-term', 'EndOfTermPage'], ['/moderator/returns', 'ReturnProcessingPage'],
  ['/moderator/verifications', 'OrgVerificationPage'], ['/moderator/reports', 'ViolationReportsPage'],
  ['/moderator/categories', 'CategoryBrandPage'], ['/moderator/inbox', 'WarehouseInboxPage'],
];
describe('actual router and guards with opaque page bodies', () => {
  it.each(moderatorRoutes)('supports direct Moderator navigation to %s', async (path, page) => {
    show(path);
    expect(await screen.findByText(page)).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent(path);
  });
  it.each(['staff', 'moderator', 'admin'])('preserves Moderator access for %s', async (role) => {
    auth.user = { role };
    show('/moderator/end-of-term');
    expect(await screen.findByText('EndOfTermPage')).toBeInTheDocument();
  });
  it.each([
    ['/admin', 'AdminDashboardPage'], ['/admin/users', 'AdminAccountsPage'],
    ['/admin/moderators', 'AdminModeratorsPage'], ['/admin/warehouses', 'AdminWarehousesPage'],
    ['/admin/configs', 'ConfigPage'], ['/admin/audit-logs', 'AdminAuditLogsPage'],
    ['/admin/system', 'AdminAccountsPage'],
  ])('preserves nested Admin navigation to %s', async (path, page) => {
    auth.user = { role: 'admin' };
    show(path);
    expect(await screen.findByText(page)).toBeInTheDocument();
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
    if (path === '/admin/system') expect(screen.getByTestId('path')).toHaveTextContent('/admin/users');
  });
  it.each(['/profile', '/admin/users', '/moderator/consignments/form-1', '/moderator/inventory/SKU-1', '/moderator/end-of-term'])(
    'redirects anonymous navigation from %s and preserves the return path', async (path) => {
      auth.isAuthenticated = false; auth.user = null;
      show(path);
      expect(await screen.findByText('LoginPage')).toBeInTheDocument();
      expect(screen.getByTestId('from')).toHaveTextContent(path);
    },
  );
  it.each(['staff', 'moderator'])('redirects %s away from Admin routes to their existing home', async (role) => {
    auth.user = { role };
    show('/admin/users');
    expect(await screen.findByText('CounterPage')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-layout')).not.toBeInTheDocument();
  });
  it.each([['admin', '/admin'], ['staff', '/moderator/counter'], ['moderator', '/moderator/counter']])(
    'preserves default and fallback redirect destinations for %s', async (role, destination) => {
      auth.user = { role };
      show('/unknown');
      await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(destination));
    },
  );
  it('withholds protected pages until authentication restoration completes', async () => {
    auth.loading = true;
    const view = show('/moderator/end-of-term');
    expect(screen.queryByText('EndOfTermPage')).not.toBeInTheDocument();
    auth.loading = false;
    view.rerender(<MemoryRouter initialEntries={['/moderator/end-of-term']}><AppRouter /><Location /></MemoryRouter>);
    expect(await screen.findByText('EndOfTermPage')).toBeInTheDocument();
  });
  it.each(['/moderator/consignments/', '/moderator/inventory/'])(
    'remounts detail editors when the path parameter changes under %s', async (prefix) => {
      show(prefix + 'first', prefix + 'second');
      fireEvent.change(await screen.findByLabelText('Page editor'), { target: { value: 'Unsaved' } });
      fireEvent.click(screen.getByText('Navigate'));
      await waitFor(() => expect(screen.getByLabelText('Page editor')).toHaveValue(''));
    },
  );
});
