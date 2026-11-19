import React from 'react';
import { act, render, renderHook, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { useReturnProcessing } from '../../src/features/moderator/hooks/useReturnProcessing.jsx';
import { returnService, mapReturnItem } from '../../src/features/moderator/services/returnApi.js';
import { inventoryService } from '../../src/features/moderator/services/inventoryApi.js';
import {
  ReturnInspectionProduct,
  ReturnCompareDialog,
  DegradedCaseModal,
} from '../../src/features/moderator/components/returns/ReturnSections.jsx';
import { ReturnEvidence, ReturnPhotoComparison } from '../../src/features/moderator/components/returns/ReturnEvidence.jsx';
import { within } from '@testing-library/react';

const item = { id: 'ret-1', code: 'YC-1', status: 'RECEIVED_INSPECT', itemName: 'Actual item', stockInPhotos: [], buyerPhotos: [] };
const wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;
beforeEach(() => {
  vi.spyOn(returnService, 'list').mockResolvedValue({ data: [item] });
  vi.spyOn(returnService, 'detail').mockResolvedValue(item);
  vi.spyOn(returnService, 'inspect').mockResolvedValue({});
  vi.spyOn(returnService, 'resolveValid').mockResolvedValue({});
  vi.spyOn(returnService, 'resolveInvalid').mockResolvedValue({});
  vi.spyOn(returnService, 'flagCounterfeit').mockResolvedValue({});
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

it('uses existing item identity without SKU entry and shows missing real comparison photos', () => {
  render(<ReturnInspectionProduct selectedItem={item} checklist={{}} setChecklist={() => {}} />);
  expect(screen.queryByPlaceholderText(/Nhập SKU/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/mã SKU/i)).not.toBeInTheDocument();
  expect(screen.getByText(/Chưa có ảnh nhập kho/i)).toBeInTheDocument();
  expect(screen.getByText(/Chưa có ảnh người mua/i)).toBeInTheDocument();
});

it('compares every actual photo and never substitutes stock images', () => {
  render(<ReturnCompareDialog isCompareModalOpen setIsCompareModalOpen={() => {}} selectedItem={{ ...item, stockInPhotos: ['https://photos.test/1', 'https://photos.test/2'] }} />);
  expect(screen.getAllByRole('img').map(img => img.getAttribute('src'))).toEqual(['https://photos.test/1', 'https://photos.test/2']);
  expect(screen.getByText(/Chưa có ảnh người mua/i)).toBeInTheDocument();
});

it('does not invent a product brand, size or SKU when the backend omits them', () => {
  const mapped = mapReturnItem({ id: '1' });
  expect(mapped.sku).toBeNull();
  expect(mapped.brand).toBeNull();
  expect(mapped.size).toBeNull();
});

it.each(['VALID', 'INVALID', 'DEGRADED', 'COUNTERFEIT'])('requires uploaded evidence and preserves its URLs for %s inspection', async path => {
  vi.spyOn(inventoryService, 'upload').mockResolvedValueOnce({ url: 'https://photos.test/a' }).mockRejectedValueOnce(new Error('Upload failed')).mockResolvedValueOnce({ url: 'https://photos.test/b' });
  const { result } = renderHook(() => useReturnProcessing(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => { await result.current.handleOpenInspect(item); });
  expect(returnService.detail).toHaveBeenCalledWith(item.id);
  await act(async () => { result.current.setInspectionVerdict(path === 'INVALID' ? 'INVALID' : 'VALID'); result.current.setInvalidReason('Wrong item'); });
  await act(async () => { await result.current.handleSaveInspection(); });
  expect(returnService.inspect).not.toHaveBeenCalled();
  await act(async () => { await result.current.uploadEvidence([new File(['a'], 'a.jpg', { type: 'image/jpeg' }), new File(['b'], 'b.jpg', { type: 'image/jpeg' })]); });
  expect(result.current.evidenceError).toMatch(/Upload failed/);
  await act(async () => { await result.current.handleSaveInspection(); });
  expect(returnService.inspect).not.toHaveBeenCalled();
  await act(async () => { await result.current.retryEvidence(); });
  await act(async () => {
    if (path === 'DEGRADED') await result.current.handleCreateDegradedCase({ notes: 'Damaged' });
    else if (path === 'COUNTERFEIT') await result.current.handleFlagCounterfeit();
    else await result.current.handleSaveInspection();
  });
  expect(returnService.inspect).toHaveBeenCalledWith(item.id, expect.objectContaining({ evidenceImageUrls: ['https://photos.test/a', 'https://photos.test/b'] }));
});

it('opens degradation modal with no fabricated evidence and blocks submission', () => {
  render(<DegradedCaseModal isOpen onClose={() => {}} selectedItem={item} degradedNotes="Damaged" setDegradedNotes={() => {}} handleCreateDegradedCase={() => {}} />);
  expect(screen.queryAllByRole('img')).toHaveLength(0);
  expect(screen.getByRole('button', { name: /Lập hồ sơ/i })).toBeDisabled();
});

it.each([2, 3, 5])('renders %i inspection evidence photos in a consistent object-cover gallery and opens lightbox with navigation', (count) => {
  const urls = Array.from({ length: count }, (_, idx) => `https://photos.test/ev-${idx + 1}.jpg`);
  const removeEvidence = vi.fn();
  render(<ReturnEvidence evidenceImageUrls={urls} removeEvidence={removeEvidence} uploadEvidence={() => {}} />);

  expect(screen.getByText(/Bằng chứng kiểm hàng tại kho/i)).toBeInTheDocument();
  expect(screen.getByText(`${count} / 5 ảnh đã tải lên`)).toBeInTheDocument();

  const imgs = screen.getAllByAltText(/Bằng chứng kiểm hàng \d+/i);
  expect(imgs).toHaveLength(count);
  imgs.forEach((img) => {
    expect(img.className).toContain('object-cover');
  });

  // Delete button calls removeEvidence without opening lightbox
  fireEvent.click(screen.getByRole('button', { name: 'Xóa ảnh bằng chứng 1' }));
  expect(removeEvidence).toHaveBeenCalledWith(0);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  // Clicking first thumbnail opens full-image lightbox with navigation
  fireEvent.click(imgs[0]);
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText(`Ảnh 1 / ${count}`)).toBeInTheDocument();
  expect(within(dialog).getByRole('img')).toHaveAttribute('src', urls[0]);

  fireEvent.click(within(dialog).getByRole('button', { name: /Sau/i }));
  expect(within(dialog).getByText(`Ảnh 2 / ${count}`)).toBeInTheDocument();
  expect(within(dialog).getByRole('img')).toHaveAttribute('src', urls[1]);

  fireEvent.click(within(dialog).getAllByRole('button', { name: /^Đóng$/i })[0]);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('renders ReturnPhotoComparison with separated Ảnh đóng gói and Ảnh người mua gửi panels and click-to-zoom lightbox', () => {
  const packingUrl = 'https://photos.test/pack-1.jpg';
  const buyerUrl = 'https://photos.test/buyer-1.jpg';
  render(
    <ReturnPhotoComparison
      packingPhotos={[packingUrl]}
      stockPhotos={['https://photos.test/stock-ref.jpg']}
      buyerPhotos={[buyerUrl]}
      compact
    />
  );

  expect(screen.getByRole('heading', { name: /^Ảnh đóng gói$/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /^Ảnh người mua gửi$/i })).toBeInTheDocument();

  const packImg = screen.getByAltText('Ảnh đóng gói 1');
  const buyerImg = screen.getByAltText('Ảnh người mua 1');
  expect(packImg.className).toContain('object-cover');
  expect(buyerImg.className).toContain('object-cover');

  fireEvent.click(packImg);
  let dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('Ảnh đóng gói')).toBeInTheDocument();
  expect(within(dialog).getByRole('img')).toHaveAttribute('src', packingUrl);
  fireEvent.click(within(dialog).getAllByRole('button', { name: /^Đóng$/i })[0]);

  fireEvent.click(buyerImg);
  dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('Ảnh người mua gửi')).toBeInTheDocument();
  expect(within(dialog).getByRole('img')).toHaveAttribute('src', buyerUrl);
});
