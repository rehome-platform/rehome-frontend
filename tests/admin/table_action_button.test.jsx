import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import TableActionButton from '../../src/components/common/TableActionButton.jsx';

describe('TableActionButton', () => {
  it('renders standardized view, edit, and delete presets with icons and invokes onClick', () => {
    const onView = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <div>
        <TableActionButton action="view" onClick={onView} />
        <TableActionButton action="edit" onClick={onEdit} />
        <TableActionButton action="delete" onClick={onDelete} />
      </div>
    );

    const viewBtn = screen.getByRole('button', { name: /Xem chi tiết/i });
    const editBtn = screen.getByRole('button', { name: /Sửa/i });
    const deleteBtn = screen.getByRole('button', { name: /Xóa/i });

    expect(viewBtn.textContent).toContain('visibility');
    expect(editBtn.textContent).toContain('edit');
    expect(deleteBtn.textContent).toContain('delete');

    fireEvent.click(viewBtn);
    fireEvent.click(editBtn);
    fireEvent.click(deleteBtn);

    expect(onView).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('renders a Link with standardized outline classes when prop `to` is provided', () => {
    render(
      <MemoryRouter>
        <TableActionButton action="view" to="/moderator/inventory/SKU-1" />
      </MemoryRouter>
    );

    const viewLink = screen.getByRole('link', { name: 'Xem chi tiết' });
    expect(viewLink).toHaveAttribute('href', '/moderator/inventory/SKU-1');
    expect(viewLink.textContent).toContain('visibility');
    expect(viewLink.className).toContain('border-[#DDE5D9]');
    expect(viewLink.className).toContain('bg-white');
  });
});
