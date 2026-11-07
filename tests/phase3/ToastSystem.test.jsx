import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToastProvider, useToast } from '../../src/context/ToastContext.jsx';
import ToastContainer from '../../src/components/common/ToastContainer.jsx';

function TestConsumer() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success('Thao tác thành công')}>Bấm thành công</button>
      <button onClick={() => toast.error('Đã xảy ra lỗi')}>Bấm lỗi</button>
      <button onClick={() => toast.info('Thông tin quan trọng')}>Bấm thông tin</button>
    </div>
  );
}

describe('ToastSystem with Design Tokens & GSAP', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders success toast with correct tokens and message', () => {
    render(
      <ToastProvider>
        <TestConsumer />
        <ToastContainer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Bấm thành công'));
    expect(screen.getByText('Thao tác thành công')).toBeInTheDocument();
    
    // Check design tokens on toast card
    const toastCard = screen.getByRole('alert');
    expect(toastCard).toBeInTheDocument();
    expect(toastCard.className).toContain('rounded-2xl');
    expect(toastCard.className).toContain('bg-white');
  });

  it('renders error toast with correct error message', () => {
    render(
      <ToastProvider>
        <TestConsumer />
        <ToastContainer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Bấm lỗi'));
    expect(screen.getByText('Đã xảy ra lỗi')).toBeInTheDocument();
  });

  it('can be dismissed manually via close button', () => {
    render(
      <ToastProvider>
        <TestConsumer />
        <ToastContainer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Bấm thành công'));
    expect(screen.getByText('Thao tác thành công')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Đóng thông báo');
    fireEvent.click(closeBtn);

    // After dismissal, should be removed
    expect(screen.queryByText('Thao tác thành công')).not.toBeInTheDocument();
  });

  it('auto-dismisses after duration timeout', () => {
    render(
      <ToastProvider>
        <TestConsumer />
        <ToastContainer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Bấm thành công'));
    expect(screen.getByText('Thao tác thành công')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText('Thao tác thành công')).not.toBeInTheDocument();
  });
});
