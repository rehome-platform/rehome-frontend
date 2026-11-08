import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OpeningHoursPicker from '../../src/features/admin/components/OpeningHoursPicker.jsx';

describe('OpeningHoursPicker component', () => {
  it('renders with initial parsed value and displays formatted header', () => {
    const handleChange = vi.fn();
    render(
      <OpeningHoursPicker
        value="08:00 - 20:00 (Thứ 2 - Chủ nhật)"
        onChange={handleChange}
      />
    );

    expect(screen.getByDisplayValue('08:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20:00')).toBeInTheDocument();
    expect(screen.getByText('08:00 - 20:00 (Thứ 2 - Chủ nhật)')).toBeInTheDocument();
  });

  it('changes open time and invokes onChange with updated string', () => {
    const handleChange = vi.fn();
    render(
      <OpeningHoursPicker
        value="08:00 - 20:00 (Thứ 2 - Chủ nhật)"
        onChange={handleChange}
      />
    );

    const openInput = screen.getByDisplayValue('08:00');
    fireEvent.change(openInput, { target: { value: '09:00' } });

    expect(handleChange).toHaveBeenCalledWith('09:00 - 20:00 (Thứ 2 - Chủ nhật)');
  });

  it('clicks preset Thứ 2 - Thứ 7 and updates string', () => {
    const handleChange = vi.fn();
    render(
      <OpeningHoursPicker
        value="08:00 - 20:00 (Thứ 2 - Chủ nhật)"
        onChange={handleChange}
      />
    );

    const monSatBtn = screen.getByText('Thứ 2 - Thứ 7');
    fireEvent.click(monSatBtn);

    expect(handleChange).toHaveBeenCalledWith('08:00 - 20:00 (Thứ 2 - Thứ 7)');
  });
});

