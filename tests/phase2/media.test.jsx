import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Phase2Provider } from '../../src/features/moderator/phase2/hooks.jsx';
import { catalogService, inventoryService } from '../../src/features/moderator/phase2/api.js';
import { Phase2Error } from '../../src/features/moderator/phase2/model.js';
import PhotoUpload from '../../src/features/moderator/phase2/PhotoUpload.jsx';
import StockInForm from '../../src/features/moderator/phase2/StockInForm.jsx';
import QRScannerModal from '../../src/components/QRScannerModal.jsx';
const userIdentity = { id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a' };
vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: userIdentity, isAuthenticated: true }),
}));
function Wrapper({ children }) {
  return (
    <MemoryRouter>
      <Phase2Provider>{children}</Phase2Provider>
    </MemoryRouter>
  );
}
const file = () => new File(['image'], 'item.png', { type: 'image/png' });

describe('photo upload and ambiguous stock-in recovery', () => {
  it('retains failed files for retry and publishes only successful URLs', async () => {
    const upload = vi
      .spyOn(inventoryService, 'upload')
      .mockRejectedValueOnce(new Phase2Error('File quá lớn', 422))
      .mockResolvedValueOnce({ url: 'https://example.test/item.png' });
    const onChange = vi.fn(),
      user = userEvent.setup();
    render(<PhotoUpload onChange={onChange} />, { wrapper: Wrapper });
    await user.upload(screen.getByLabelText('Ảnh sản phẩm'), file());
    await screen.findByText('File quá lớn');
    expect(onChange).toHaveBeenLastCalledWith([], true);
    await user.click(screen.getByRole('button', { name: 'Thử tải lại' }));
    await screen.findByText('item.png · Đã tải ảnh gốc');
    expect(upload).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(['https://example.test/item.png'], false);
  });
  it('blocks another stock-in after response loss until receipt lookup recovers the server Product', async () => {
    vi.spyOn(catalogService, 'list').mockResolvedValue({
      categories: [{ id: 'cat', name: 'Áo', hidden: false }],
      brands: [{ id: 'brand', name: 'Brand', hidden: false }],
    });
    vi.spyOn(inventoryService, 'byReceipt')
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ sku: 'ONE-SKU' });
    vi.spyOn(inventoryService, 'upload').mockResolvedValue({
      url: 'https://example.test/item.png',
    });
    const create = vi
      .spyOn(inventoryService, 'create')
      .mockRejectedValue(new Phase2Error('Mất response', 0));
    const user = userEvent.setup();
    render(
      <StockInForm receipt={{ receiptId: 'r1', confirmedAt: '2026-10-18' }} onSuccess={vi.fn()} />,
      { wrapper: Wrapper },
    );
    await user.type(await screen.findByLabelText('Tên sản phẩm'), 'Áo mới');
    await user.type(screen.getByLabelText('Size'), 'M');
    await user.type(screen.getByLabelText('Vị trí kệ'), 'A1');
    await user.selectOptions(screen.getByLabelText('Danh mục'), 'cat');
    await user.selectOptions(screen.getByLabelText('Thương hiệu'), 'brand');
    await user.upload(screen.getByLabelText('Ảnh sản phẩm'), file());
    await user.click(screen.getByRole('button', { name: 'Nhập kho · tạo SKU' }));
    await screen.findByText(/Chưa xác định được kết quả nhập kho/);
    expect(screen.getByRole('button', { name: 'Nhập kho · tạo SKU' })).toBeDisabled();
    expect(create).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Kiểm tra kết quả theo biên nhận' }));
    await screen.findByRole('link', { name: /Sản phẩm đã tồn tại · ONE-SKU/ });
    expect(create).toHaveBeenCalledOnce();
  });
});

describe('camera lifecycle', () => {
  it('stops tracks when camera permission resolves after the modal was closed', async () => {
    let resolve;
    const stop = vi.fn();
    const original = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(
          () =>
            new Promise((done) => {
              resolve = done;
            }),
        ),
      },
    });
    vi.stubGlobal(
      'BarcodeDetector',
      class {
        async detect() {
          return [];
        }
      },
    );
    const view = render(<QRScannerModal isOpen onClose={vi.fn()} onScanSuccess={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bật Camera' }));
    view.rerender(<QRScannerModal isOpen={false} onClose={vi.fn()} onScanSuccess={vi.fn()} />);
    await act(async () => resolve({ getTracks: () => [{ stop }] }));
    expect(stop).toHaveBeenCalledOnce();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: original });
    vi.unstubAllGlobals();
  });
  it('decodes a real detector result once and stops its stream', async () => {
    const stop = vi.fn(),
      onScan = vi.fn(),
      original = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop }] })) },
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(4);
    vi.stubGlobal(
      'BarcodeDetector',
      class {
        async detect() {
          return [{ rawValue: 'MB-001' }];
        }
      },
    );
    render(<QRScannerModal isOpen onClose={vi.fn()} onScanSuccess={onScan} />);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Bật Camera' })));
    expect(onScan).toHaveBeenCalledExactlyOnceWith('MB-001');
    expect(stop).toHaveBeenCalledOnce();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: original });
    vi.unstubAllGlobals();
  });
});
