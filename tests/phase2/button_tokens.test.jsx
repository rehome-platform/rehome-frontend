import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Button from '../../src/components/common/Button.jsx';
import ModeratorLayout from '../../src/layouts/ModeratorLayout.jsx';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'mod-1', role: 'staff', warehouseName: 'Kho Quận 7' },
    logout: vi.fn(),
  }),
}));

vi.mock('../../src/components/notification/index.js', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

describe('Button component (BUG-M5-001 & GSAP micro-interactions)', () => {
  it('uses border-current instead of border-white on loading spinner for all variants', () => {
    const variants = ['primary', 'secondary', 'outline', 'warning', 'accent', 'danger', 'ghost'];

    variants.forEach((variant) => {
      const { container, unmount } = render(
        <Button variant={variant} loading>
          Đang xử lý
        </Button>
      );
      const spinner = container.querySelector('span.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner.className).toContain('border-current');
      expect(spinner.className).toContain('border-t-transparent');
      expect(spinner.className).not.toContain('border-white');
      unmount();
    });
  });

  it('forwards ref to the underlying button element and handles pointer events safely', () => {
    const ref = createRef();
    const onClick = vi.fn();

    render(
      <Button ref={ref} variant="primary" size="md" className="custom-class" onClick={onClick}>
        Lưu thay đổi
      </Button>
    );

    const btn = screen.getByRole('button', { name: 'Lưu thay đổi' });
    expect(ref.current).toBe(btn);
    expect(btn.className).toContain('custom-class');
    expect(btn.className).toContain('rounded-xl');

    fireEvent.pointerDown(btn);
    fireEvent.pointerUp(btn);
    fireEvent.pointerLeave(btn);
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables button and blocks click when loading or disabled', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Gửi
      </Button>
    );
    const btn = screen.getByRole('button', { name: 'Gửi' });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('ModeratorLayout (BUG-M5-004)', () => {
  it('enables moderator-api-colors by default so primary buttons render in ReHome green', () => {
    const { container } = render(
      <MemoryRouter>
        <ModeratorLayout>
          <div>Nội dung</div>
        </ModeratorLayout>
      </MemoryRouter>
    );
    expect(container.firstChild.className).toContain('moderator-api-colors');
  });
});
