import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ComparisonBadge from '../../src/features/admin/components/ComparisonBadge.jsx';

describe('ComparisonBadge', () => {
  it('renders nothing when there is no previous-period label ("Toàn thời gian")', () => {
    const { container } = render(<ComparisonBadge current={100} previous={50} label={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a loading placeholder without reading current/previous yet', () => {
    render(<ComparisonBadge current={null} previous={null} loading label="tháng trước" />);
    expect(screen.getByLabelText('Đang tải số liệu để so sánh')).toBeInTheDocument();
    expect(screen.queryByText(/so với/)).not.toBeInTheDocument();
  });

  it('renders nothing when the previous value has not arrived yet (not loading, still null)', () => {
    const { container } = render(<ComparisonBadge current={100} previous={null} label="tháng trước" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows "Mới" when the previous period was zero but this period is not', () => {
    render(<ComparisonBadge current={50000} previous={0} label="tháng trước" />);
    expect(screen.getByText('Mới so với tháng trước')).toBeInTheDocument();
  });

  it('renders nothing when both periods are zero', () => {
    const { container } = render(<ComparisonBadge current={0} previous={0} label="tháng trước" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a green "+X%" with an up arrow when this period grew', () => {
    render(<ComparisonBadge current={120} previous={100} label="tháng trước" />);
    const badge = screen.getByText('+20.0% so với tháng trước');
    expect(badge).toHaveClass('text-[#006B2C]');
    expect(badge.querySelector('.material-symbols-outlined')).toHaveTextContent('trending_up');
  });

  it('shows a red "-X%" with a down arrow when this period shrank, no extra minus sign', () => {
    render(<ComparisonBadge current={80} previous={100} label="tháng trước" />);
    const badge = screen.getByText('-20.0% so với tháng trước');
    expect(badge).toHaveClass('text-[#DC2626]');
    expect(badge.querySelector('.material-symbols-outlined')).toHaveTextContent('trending_down');
    // Không có dấu "+" hay "--" thừa
    expect(badge.textContent).not.toMatch(/\+/);
    expect(badge.textContent).not.toContain('--');
  });

  it('shows a neutral "0.0%" (never "-0.0%") when the change is negligible', () => {
    render(<ComparisonBadge current={99.97} previous={100} label="tháng trước" />);
    const badge = screen.getByText('0.0% so với tháng trước');
    expect(badge).toHaveClass('text-[#717971]');
    expect(badge.querySelector('.material-symbols-outlined')).toHaveTextContent('trending_flat');
    expect(screen.queryByText(/-0\.0%/)).not.toBeInTheDocument();
  });

  it('rounds to one decimal place', () => {
    render(<ComparisonBadge current={133} previous={100} label="năm trước" />);
    expect(screen.getByText('+33.0% so với năm trước')).toBeInTheDocument();
  });
});
