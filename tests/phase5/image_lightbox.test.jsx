import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ImageLightbox from '../../src/components/common/ImageLightbox.jsx';
import Modal from '../../src/components/common/Modal.jsx';
import { Photos } from '../../src/features/moderator/components/WarehouseUi.jsx';
import { ConsignmentPhotoViewer } from '../../src/features/moderator/components/consignment/ConsignmentDetailSections.jsx';
import ProductEditModal from '../../src/features/moderator/components/ProductEditModal.jsx';
import DonationsPage from '../../src/features/moderator/pages/DonationsPage.jsx';
import WarehouseInboxPage from '../../src/features/moderator/pages/WarehouseInboxPage.jsx';
import ViolationReportsPage from '../../src/features/moderator/pages/ViolationReportsPage.jsx';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { donationService } from '../../src/features/moderator/services/donationApi.js';
import { warehouseInboxService } from '../../src/features/moderator/services/warehouseInboxApi.js';
import { violationReportService } from '../../src/features/moderator/services/violationReportApi.js';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'mod-1', name: 'Moderator 1', role: 'MODERATOR', warehouseId: 'wh-1' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../src/layouts/ModeratorLayout.jsx', () => ({
  default: ({ children }) => <div data-testid="moderator-layout">{children}</div>,
}));

vi.mock('../../src/hooks/useWebSocket.js', () => ({
  useConversationTopic: vi.fn(),
}));

describe('ImageLightbox & Web Image Click-to-Zoom', () => {
  const sampleImages = [
    'https://cdn.rehome.test/img-1.jpg',
    'https://cdn.rehome.test/img-2.jpg',
    'https://cdn.rehome.test/img-3.jpg',
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('opens with initial image, counter, categoryLabel, and 100% zoom', () => {
    render(
      <ImageLightbox
        isOpen
        onClose={vi.fn()}
        images={sampleImages}
        initialIndex={0}
        categoryLabel="Ảnh sản phẩm lưu kho"
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Ảnh sản phẩm lưu kho')).toBeInTheDocument();
    expect(within(dialog).getByText('Ảnh 1 / 3')).toBeInTheDocument();
    expect(within(dialog).getByText('100%')).toBeInTheDocument();
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', sampleImages[0]);
  });

  it('supports zoom in/out via buttons, keyboard (+/-), and mouse wheel, clamped between 100% and 400%', () => {
    render(<ImageLightbox isOpen onClose={vi.fn()} images={sampleImages} />);

    const dialog = screen.getByRole('dialog');
    const zoomInBtn = within(dialog).getByRole('button', { name: 'Phóng to' });
    const zoomOutBtn = within(dialog).getByRole('button', { name: 'Thu nhỏ' });
    const img = within(dialog).getByRole('img');
    const stage = img.parentElement;

    expect(zoomOutBtn).toBeDisabled();

    // Button zoom in: 100% -> 150%
    fireEvent.click(zoomInBtn);
    expect(within(dialog).getByText('150%')).toBeInTheDocument();
    expect(zoomOutBtn).toBeEnabled();

    // Keyboard '+' zoom in: 150% -> 200%
    fireEvent.keyDown(window, { key: '+' });
    expect(within(dialog).getByText('200%')).toBeInTheDocument();

    // Wheel up zoom in: 200% -> 225%
    fireEvent.wheel(stage, { deltaY: -100 });
    expect(within(dialog).getByText('225%')).toBeInTheDocument();

    // Clamp at 400%
    for (let i = 0; i < 6; i += 1) {
      fireEvent.click(zoomInBtn);
    }
    expect(within(dialog).getByText('400%')).toBeInTheDocument();
    expect(zoomInBtn).toBeDisabled();

    // Wheel down & '-' key & button zoom out
    fireEvent.wheel(stage, { deltaY: 100 });
    expect(within(dialog).getByText('375%')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: '-' });
    expect(within(dialog).getByText('325%')).toBeInTheDocument();

    // Clamp at 100%
    for (let i = 0; i < 10; i += 1) {
      fireEvent.click(zoomOutBtn);
    }
    expect(within(dialog).getByText('100%')).toBeInTheDocument();
    expect(zoomOutBtn).toBeDisabled();
  });

  it('toggles zoom on double-click, drags to pan when zoomed, and resets via Đặt lại or 0 key', () => {
    render(<ImageLightbox isOpen onClose={vi.fn()} images={sampleImages} />);

    const dialog = screen.getByRole('dialog');
    const img = within(dialog).getByRole('img');
    const stage = img.parentElement;

    // Double click: 100% -> 200%
    fireEvent.doubleClick(img);
    expect(within(dialog).getByText('200%')).toBeInTheDocument();
    expect(img.style.transform).toContain('scale(2)');

    // Pointer drag when scale > 1 updates translate3d (use MouseEvent-backed pointer events in jsdom)
    const dispatchPointer = (type, coords) => {
      const evt = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, ...coords });
      Object.defineProperty(evt, 'pointerId', { value: 1 });
      Object.defineProperty(evt, 'pointerType', { value: 'mouse' });
      fireEvent(stage, evt);
    };
    dispatchPointer('pointerdown', { clientX: 100, clientY: 100 });
    dispatchPointer('pointermove', { clientX: 145, clientY: 130 });
    dispatchPointer('pointerup', { clientX: 145, clientY: 130 });
    expect(img.style.transform).toContain('translate3d(45px, 30px, 0) scale(2)');

    // Reset button resets scale and offset
    fireEvent.click(within(dialog).getByRole('button', { name: 'Đặt lại' }));
    expect(within(dialog).getByText('100%')).toBeInTheDocument();
    expect(img.style.transform).toContain('translate3d(0px, 0px, 0) scale(1)');

    // Double click -> 200%, then '0' key resets
    fireEvent.doubleClick(img);
    expect(within(dialog).getByText('200%')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: '0' });
    expect(within(dialog).getByText('100%')).toBeInTheDocument();
  });

  it('navigates multiple images via buttons, arrow keys, and thumbnail strip, resetting zoom', () => {
    render(<ImageLightbox isOpen onClose={vi.fn()} images={sampleImages} />);

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Phóng to' }));
    expect(within(dialog).getByText('150%')).toBeInTheDocument();

    // Next button -> image 2, zoom resets to 100%
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ảnh sau' }));
    expect(within(dialog).getByText('Ảnh 2 / 3')).toBeInTheDocument();
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', sampleImages[1]);
    expect(within(dialog).getByText('100%')).toBeInTheDocument();

    // ArrowRight -> image 3
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(within(dialog).getByText('Ảnh 3 / 3')).toBeInTheDocument();
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', sampleImages[2]);

    // Next wraps around to image 1
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ảnh sau' }));
    expect(within(dialog).getByText('Ảnh 1 / 3')).toBeInTheDocument();

    // Prev wraps around to image 3
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(within(dialog).getByText('Ảnh 3 / 3')).toBeInTheDocument();

    // Thumbnail strip jumps directly to image 2
    fireEvent.click(within(dialog).getByRole('button', { name: 'Chuyển tới ảnh 2' }));
    expect(within(dialog).getByText('Ảnh 2 / 3')).toBeInTheDocument();
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', sampleImages[1]);
  });

  it('closes via Đóng button, Escape key, and backdrop click', () => {
    const onClose = vi.fn();
    render(<ImageLightbox isOpen onClose={onClose} images={sampleImages} />);

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Đóng' }));
    fireEvent.keyDown(window, { key: 'Escape' });

    const stage = within(dialog).getByRole('img').parentElement;
    fireEvent.click(stage);

    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('closes only ImageLightbox on Escape when nested inside an open Modal', () => {
    const onModalClose = vi.fn();
    function NestedHarness() {
      const [lightboxOpen, setLightboxOpen] = useState(true);
      return (
        <Modal isOpen onClose={onModalClose} title="Chi tiết">
          <button type="button" onClick={() => setLightboxOpen(true)}>
            Mở ảnh
          </button>
          <ImageLightbox
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            images={sampleImages}
          />
        </Modal>
      );
    }

    render(<NestedHarness />);
    expect(screen.getAllByRole('dialog')).toHaveLength(2);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onModalClose).not.toHaveBeenCalled();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByText('Chi tiết')).toBeInTheDocument();
  });

  it('Photos (InventoryDetailPage Ảnh sản phẩm lưu kho) opens ImageLightbox at clicked index with zoom & navigation', () => {
    render(
      <Photos
        photos={[
          { photoId: 'p1', url: sampleImages[0], status: 'DONE' },
          { photoId: 'p2', url: sampleImages[1], status: 'RAW' },
        ]}
        title="Ảnh sản phẩm lưu kho"
      />
    );

    const img2 = screen.getByAltText('Ảnh sản phẩm 2');
    fireEvent.click(img2.closest('button'));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Ảnh sản phẩm lưu kho')).toBeInTheDocument();
    expect(within(dialog).getByText('Ảnh 2 / 2')).toBeInTheDocument();
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', sampleImages[1]);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Phóng to' }));
    expect(within(dialog).getByText('150%')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Ảnh trước' }));
    expect(within(dialog).getByText('Ảnh 1 / 2')).toBeInTheDocument();
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', sampleImages[0]);
  });

  it('ConsignmentPhotoViewer opens ImageLightbox at active index with multi-photo navigation', () => {
    render(
      <ConsignmentPhotoViewer
        photos={sampleImages}
        activePhotoIdx={1}
        photoUrl={sampleImages[1]}
        setActivePhotoIdx={vi.fn()}
      />
    );

    fireEvent.click(screen.getByAltText('Ảnh sản phẩm ký gửi').closest('button'));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Ảnh sản phẩm ký gửi')).toBeInTheDocument();
    expect(within(dialog).getByText('Ảnh 2 / 3')).toBeInTheDocument();
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', sampleImages[1]);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Ảnh sau' }));
    expect(within(dialog).getByText('Ảnh 3 / 3')).toBeInTheDocument();
  });

  it('ProductEditModal opens ImageLightbox on existing photo click even when status is not ON_SALE', () => {
    const soldItem = {
      id: 'Q7-AK-000100',
      sku: 'Q7-AK-000100',
      status: 'SOLD',
      name: 'Áo sơ mi',
      currentPrice: 150000,
      photos: [sampleImages[0], sampleImages[1]],
    };

    render(
      <Phase2Provider>
        <ProductEditModal isOpen item={soldItem} onClose={vi.fn()} onUpdated={vi.fn()} />
      </Phase2Provider>
    );

    fireEvent.click(screen.getByAltText('Ảnh 1').closest('button'));
    const dialogs = screen.getAllByRole('dialog');
    const lightbox = dialogs[dialogs.length - 1];
    expect(within(lightbox).getByText('Ảnh bán hàng')).toBeInTheDocument();
    expect(within(lightbox).getByText('Ảnh 1 / 2')).toBeInTheDocument();
    expect(within(lightbox).getByRole('button', { name: 'Phóng to' })).toBeInTheDocument();
  });

  it('DonationsPage opens zoomable ImageLightbox when clicking donation photos', async () => {
    vi.spyOn(donationService, 'myWarehouses').mockResolvedValue([{ id: 'wh-1', name: 'Kho Q7' }]);
    vi.spyOn(donationService, 'warehouseCampaigns').mockResolvedValue({
      items: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    });
    vi.spyOn(donationService, 'listDonations').mockResolvedValue([
      {
        id: 'don-1',
        warehouseId: 'wh-1',
        campaignId: 'camp-1',
        campaignTitle: 'Áo ấm mùa đông',
        organizationName: 'Quỹ Hy Vọng',
        donorName: 'Nguyễn An',
        photoUrls: [sampleImages[0], sampleImages[1]],
        status: 'PENDING_PICKUP',
        createdAt: '2026-11-20T09:00:00Z',
      },
    ]);

    render(
      <MemoryRouter>
        <Phase2Provider>
          <DonationsPage />
        </Phase2Provider>
      </MemoryRouter>
    );

    const thumb = await screen.findByAltText('Hiện vật 1');
    fireEvent.click(thumb.closest('a'));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Ảnh 1 / 2')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Phóng to' })).toBeInTheDocument();
  });

  it('WarehouseInboxPage opens zoomable ImageLightbox when clicking chat message attachment', async () => {
    vi.spyOn(warehouseInboxService, 'getConversations').mockResolvedValue({
      data: [{ id: 'conv-1', memberName: 'Trần An', status: 'UNANSWERED', lastMessage: 'Gửi ảnh' }],
      total: 1,
    });
    vi.spyOn(warehouseInboxService, 'getMessages').mockResolvedValue({
      data: [
        {
          id: 'm1',
          senderId: 'mb-1',
          content: 'Xem giúp mình ảnh này',
          imageUrls: [sampleImages[0], sampleImages[1]],
          createdAt: '2026-11-20T10:00:00Z',
          isMine: false,
        },
      ],
      total: 1,
    });

    render(
      <MemoryRouter>
        <WarehouseInboxPage />
      </MemoryRouter>
    );

    const chatImg = await screen.findByAltText('Ảnh đính kèm 1');
    fireEvent.click(chatImg.closest('button'));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Ảnh đính kèm tin nhắn')).toBeInTheDocument();
    expect(within(dialog).getByText('Ảnh 1 / 2')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Phóng to' })).toBeInTheDocument();
  });

  it('ViolationReportsPage opens zoomable ImageLightbox when clicking post photo', async () => {
    vi.spyOn(violationReportService, 'list').mockResolvedValue({
      data: [
        {
          id: 'REP-1',
          targetType: 'POST',
          targetId: 'POST-1',
          reportCount: 3,
          oldestReportedAt: '2026-11-20T08:00:00Z',
          latestReportedAt: '2026-11-20T09:00:00Z',
        },
      ],
      total: 1,
    });
    vi.spyOn(violationReportService, 'getDetail').mockResolvedValue({
      id: 'REP-1',
      targetType: 'POST',
      targetId: 'POST-1',
      status: 'PENDING',
      reason: 'Nội dung vi phạm',
      createdAt: '2026-11-20T08:00:00Z',
      targetSnapshot: {
        targetType: 'POST',
        targetId: 'POST-1',
        postContent: 'Bài viết test',
        postPhotoUrls: [sampleImages[0], sampleImages[1]],
        postStatus: 'VISIBLE',
      },
      otherReports: [],
    });

    render(
      <MemoryRouter>
        <ViolationReportsPage />
      </MemoryRouter>
    );

    const detailBtn = await screen.findByRole('button', { name: 'Xem chi tiết' });
    fireEvent.click(detailBtn);

    const photo = await screen.findByAltText('Ảnh 1');
    fireEvent.click(photo.closest('button'));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Hình ảnh bài viết bị báo cáo')).toBeInTheDocument();
    expect(within(dialog).getByText('Ảnh 1 / 2')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Phóng to' })).toBeInTheDocument();
  });
});
