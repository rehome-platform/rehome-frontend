import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PhotoUpload from '../../src/features/moderator/components/PhotoUpload.jsx';

// Mock inventoryService.upload
vi.mock('../../src/features/moderator/services/warehouseApi.js', () => ({
  inventoryService: {
    upload: vi.fn().mockImplementation((file) =>
      Promise.resolve({ url: `https://fake.storage/${file.name}` })
    ),
  },
}));

describe('PhotoUpload Thumbnail Preview & Visual Management (KD-08)', () => {
  it('renders thumbnail preview for selected files instead of plain text only', async () => {
    // Mock URL.createObjectURL
    const mockCreateObjectUrl = vi.fn().mockReturnValue('blob:mock-image-url');
    const mockRevokeObjectUrl = vi.fn();
    window.URL.createObjectURL = mockCreateObjectUrl;
    window.URL.revokeObjectURL = mockRevokeObjectUrl;

    const onChange = vi.fn();
    render(<PhotoUpload onChange={onChange} />);

    const file = new File(['dummy content'], 'ao_thun.png', { type: 'image/png' });
    const input = screen.getByLabelText(/Ảnh sản phẩm/i);

    fireEvent.change(input, { target: { files: [file] } });

    // Expect an img element to be rendered
    const img = await screen.findByAltText(/ao_thun.png/i);
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toBeTruthy();

    // Check "Ảnh chính" badge on first image
    expect(screen.getAllByText(/Ảnh chính/i).length).toBeGreaterThanOrEqual(1);
  });

  it('allows removing an image visually with delete button', async () => {
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-image-url');
    window.URL.revokeObjectURL = vi.fn();

    const onChange = vi.fn();
    render(<PhotoUpload onChange={onChange} />);

    const file = new File(['dummy content'], 'vay.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/Ảnh sản phẩm/i);

    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByAltText(/vay.jpg/i);

    const deleteBtn = screen.getByRole('button', { name: /Xóa ảnh vay.jpg|Bỏ ảnh/i });
    fireEvent.click(deleteBtn);

    expect(screen.queryByAltText(/vay.jpg/i)).not.toBeInTheDocument();
  });

  it('opens preview modal when zoom button is clicked', async () => {
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-image-url');
    window.URL.revokeObjectURL = vi.fn();

    render(<PhotoUpload onChange={vi.fn()} />);

    const file = new File(['dummy content'], 'dam_hoa.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/Ảnh sản phẩm/i);

    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByAltText(/dam_hoa.jpg/i);

    const zoomBtn = screen.getByRole('button', { name: /Phóng to dam_hoa.jpg|Xem ảnh/i });
    fireEvent.click(zoomBtn);

    // Modal title or large image should appear
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
