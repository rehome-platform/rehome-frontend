import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '../../src/features/auth/pages/LoginPage.jsx';
import PrivateRoute from '../../src/routes/PrivateRoute.jsx';
import NotFoundPage from '../../src/pages/NotFoundPage.jsx';
import AppRouter from '../../src/routes/AppRouter.jsx';

const authState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  login: vi.fn(),
};

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => authState,
}));

vi.mock('../../src/features/moderator/pages/WarehouseHomePage.jsx', () => ({
  default: () => <div>Warehouse Home Mock</div>,
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderLogin(initialEntry = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/moderator" element={<div>Moderator Home</div>} />
        <Route path="/moderator/counter" element={<div>Counter Page</div>} />
        <Route path="/admin" element={<div>Admin Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Moderator default post-login & home redirect (/moderator)', () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.user = null;
    authState.loading = false;
    authState.login = vi.fn();
  });

  it('redirects to /moderator after login as moderator', async () => {
    authState.login.mockResolvedValueOnce({ user: { id: 'mod-1', role: 'moderator' } });
    renderLogin();

    fireEvent.change(screen.getByLabelText('Email nhân sự'), {
      target: { value: 'mod@rehome.vn' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), {
      target: { value: 'Password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /Đăng nhập/i }).closest('form'));

    expect(await screen.findByText('Moderator Home')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/moderator');
    expect(screen.getByTestId('location').textContent).not.toBe('/moderator/counter');
  });

  it('redirects to /moderator after login as staff alias', async () => {
    authState.login.mockResolvedValueOnce({ user: { id: 'staff-1', role: 'staff' } });
    renderLogin();

    fireEvent.change(screen.getByLabelText('Email nhân sự'), {
      target: { value: 'staff@rehome.vn' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), {
      target: { value: 'Password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /Đăng nhập/i }).closest('form'));

    expect(await screen.findByText('Moderator Home')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/moderator');
  });

  it('preserves intended /moderator/counter deep link in location.state.from after login', async () => {
    authState.login.mockResolvedValueOnce({ user: { id: 'mod-1', role: 'moderator' } });
    renderLogin({ pathname: '/login', state: { from: { pathname: '/moderator/counter' } } });

    fireEvent.change(screen.getByLabelText('Email nhân sự'), {
      target: { value: 'mod@rehome.vn' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), {
      target: { value: 'Password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /Đăng nhập/i }).closest('form'));

    expect(await screen.findByText('Counter Page')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/moderator/counter');
  });

  it('redirects already-authenticated moderator visiting /login to /moderator', async () => {
    authState.isAuthenticated = true;
    authState.user = { id: 'mod-1', role: 'moderator' };
    renderLogin('/login');

    expect(await screen.findByText('Moderator Home')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/moderator');
  });

  it('PrivateRoute redirects unauthorized moderator from admin route to /moderator', async () => {
    authState.isAuthenticated = true;
    authState.user = { id: 'mod-1', role: 'moderator' };

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <LocationProbe />
        <Routes>
          <Route
            path="/admin"
            element={
              <PrivateRoute roles={['admin']}>
                <div>Admin Secret</div>
              </PrivateRoute>
            }
          />
          <Route path="/moderator" element={<div>Moderator Home</div>} />
          <Route path="/moderator/counter" element={<div>Counter Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Moderator Home')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/moderator');
  });

  it('AppRouter RootRedirect sends authenticated moderator from / to /moderator', async () => {
    authState.isAuthenticated = true;
    authState.user = { id: 'mod-1', role: 'moderator' };

    render(
      <MemoryRouter initialEntries={['/']}>
        <LocationProbe />
        <AppRouter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/moderator');
    });
    expect(await screen.findByText('Warehouse Home Mock')).toBeInTheDocument();
  });

  it('NotFoundPage links authenticated moderator back to /moderator', () => {
    authState.isAuthenticated = true;
    authState.user = { id: 'mod-1', role: 'moderator' };

    render(
      <MemoryRouter initialEntries={['/unknown-path']}>
        <NotFoundPage />
      </MemoryRouter>,
    );

    const homeLink = screen.getByRole('link', { name: 'Về cổng Điểm ký gửi' });
    expect(homeLink).toHaveAttribute('href', '/moderator');
  });
});
