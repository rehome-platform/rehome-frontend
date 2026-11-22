import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { APK_DOWNLOAD_URL } from '../../src/features/landing/constants/landingConstants.js';
import * as landingApi from '../../src/features/landing/services/landingApi.js';
import LandingPage from '../../src/features/landing/pages/LandingPage.jsx';
import AppRouter from '../../src/routes/AppRouter.jsx';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    loading: false,
    login: vi.fn(),
  }),
}));

const MOCK_LANDING_DATA = {
  stats: {
    productsTotal: 128,
    warehousesTotal: 2,
    campaignsTotal: 5,
    organizationsTotal: 3,
    categoriesTotal: 2,
    brandsTotal: 2,
  },
  products: [
    {
      id: 'prod-1',
      name: 'Áo khoác denim cổ điển',
      thumbnailUrl: '',
      brandName: 'Levi Vintage',
      categoryName: 'Áo khoác',
      size: 'M',
      condition: '98%',
      originalPrice: 550000,
      currentPrice: 240000,
      featured: true,
    },
    {
      id: 'prod-2',
      name: 'Đầm midi lụa xanh lá',
      thumbnailUrl: '',
      brandName: 'ReHome Curated',
      categoryName: 'Đầm',
      size: 'S',
      condition: 'Mới 99%',
      originalPrice: 400000,
      currentPrice: 220000,
      featured: false,
    },
  ],
  warehouses: [
    {
      id: 'wh-1',
      name: 'Kho ReHome Quận 1',
      address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
      latitude: 10.775,
      longitude: 106.701,
      openingHours: '08:00 - 20:00',
    },
    {
      id: 'wh-2',
      name: 'Kho ReHome Cầu Giấy',
      address: '45 Xuân Thủy, Cầu Giấy, Hà Nội',
      latitude: 21.036,
      longitude: 105.782,
      openingHours: '08:30 - 19:30',
    },
  ],
  campaigns: [
    {
      id: 'camp-1',
      title: 'Tủ đồ ấm áp mùa đông',
      description: 'Quyên góp áo ấm cho học sinh vùng cao.',
      coverUrl: '',
      startTime: '2026-11-01T00:00:00Z',
      endTime: '2026-12-31T00:00:00Z',
      receiveAtOwnAddress: true,
      warehouses: [{ id: 'wh-1', name: 'Kho ReHome Quận 1' }],
      preferredItemTypes: ['Áo khoác', 'Khăn len'],
      organization: { id: 'org-1', displayName: 'Quỹ Hy Vọng Xanh', logoUrl: '' },
    },
  ],
  organizations: [
    {
      id: 'org-1',
      displayName: 'Quỹ Hy Vọng Xanh',
      description: 'Hỗ trợ cộng đồng khó khăn tại vùng núi.',
      logoUrl: '',
      followerCount: 1540,
      donationPointAddress: '123 Nguyễn Huệ, TP.HCM',
    },
  ],
  plans: [
    {
      id: 'plan-1',
      tier: 'SILVER',
      name: 'Gói Bạc',
      description: 'Dành cho người ký gửi thường xuyên',
      pricePerMonth: 49000,
      pricePerYear: 490000,
      yearlySavingPercent: 17,
      sortOrder: 1,
      benefits: {
        aiTryonPerDay: 10,
        aiTryonPerMonth: 150,
        liveTryonPerDay: 3,
        liveTryonPerMonth: 30,
        liveTryonMaxSeconds: 120,
        featuredListing: false,
        maxPendingConsignmentForms: 10,
      },
      vouchers: [{ name: 'Miễn phí vận chuyển', type: 'SHIPPING', quantityPerMonth: 2 }],
    },
    {
      id: 'plan-2',
      tier: 'GOLD',
      name: 'Gói Vàng',
      description: 'Trải nghiệm không giới hạn thử đồ AI',
      pricePerMonth: 99000,
      pricePerYear: 990000,
      yearlySavingPercent: 17,
      sortOrder: 2,
      benefits: {
        aiTryonPerDay: null,
        aiTryonPerMonth: null,
        liveTryonPerDay: 10,
        liveTryonPerMonth: null,
        liveTryonMaxSeconds: null,
        featuredListing: true,
        maxPendingConsignmentForms: null,
      },
      vouchers: [],
    },
  ],
  categories: [
    { id: 'cat-1', name: 'Áo khoác', tryonSlot: 'TOP', status: 'ACTIVE' },
    { id: 'cat-2', name: 'Đầm', tryonSlot: 'DRESS', status: 'ACTIVE' },
  ],
  brands: [
    { id: 'br-1', name: 'Levi Vintage', status: 'ACTIVE' },
    { id: 'br-2', name: 'ReHome Curated', status: 'ACTIVE' },
  ],
  errors: [],
  hasLiveData: true,
};

describe('landingApi helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('unwraps raw array responses like GET /warehouses as well as ApiResponse/PageResponse', () => {
    expect(landingApi.unwrapApiList([{ id: 'w1' }])).toEqual([{ id: 'w1' }]);
    expect(landingApi.unwrapApiList({ result: [{ id: 'p1' }] })).toEqual([{ id: 'p1' }]);
    expect(
      landingApi.unwrapApiPage({
        result: { content: [{ id: '1' }], totalElements: 25, totalPages: 5 },
      })
    ).toEqual({
      items: [{ id: '1' }],
      totalElements: 25,
      totalPages: 5,
    });
    expect(landingApi.isUnreachableLocalUrl('http://localhost:8080/files/products/seed.png')).toBe(
      true
    );
    expect(
      landingApi.isUnreachableLocalUrl('https://res.cloudinary.com/demo/image/upload/sample.jpg')
    ).toBe(false);
    expect(
      landingApi.isBrokenSeedAssetUrl(
        'https://cdn.dummyjson.com/product-images/mens-shirts/men-cotton-jacket/1.webp'
      )
    ).toBe(true);
    expect(
      landingApi.prioritizeVisualProducts([
        { id: '1', thumbnailUrl: 'http://localhost:8080/files/products/seed.png' },
        { id: '2', thumbnailUrl: '' },
        { id: '3', thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/real.jpg' },
      ]).map((p) => p.id)
    ).toEqual(['3', '1', '2']);
  });

  it('aggregates all 7 public endpoints via fetchLandingData and tolerates partial errors', async () => {
    const getSpy = vi.spyOn(landingApi.publicApi, 'get').mockImplementation(async (url) => {
      if (url === '/products') {
        return {
          data: {
            result: {
              content: [{ id: 'p1', name: 'Áo thun', currentPrice: 100000 }],
              totalElements: 12,
              totalPages: 2,
            },
          },
        };
      }
      if (url === '/warehouses') {
        return {
          data: [{ id: 'w1', name: 'Kho Q1', address: 'TP.HCM' }],
        };
      }
      if (url === '/campaigns') {
        throw new Error('Network error');
      }
      if (url === '/api/organizations') {
        return { data: { result: { content: [], totalElements: 3, totalPages: 1 } } };
      }
      if (url === '/memberships/plans') {
        return {
          data: {
            result: [
              { id: 'b', sortOrder: 2, name: 'Gói 2' },
              { id: 'a', sortOrder: 1, name: 'Gói 1' },
            ],
          },
        };
      }
      if (url === '/categories') {
        return {
          data: {
            result: [
              { id: 'c1', name: 'Áo', status: 'ACTIVE' },
              { id: 'c2', name: 'Ẩn', status: 'HIDDEN' },
            ],
          },
        };
      }
      if (url === '/brands') {
        return { data: { result: [{ id: 'b1', name: 'Brand A', status: 'ACTIVE' }] } };
      }
      return { data: {} };
    });

    const data = await landingApi.fetchLandingData();

    expect(getSpy).toHaveBeenCalledTimes(7);
    expect(data.hasLiveData).toBe(true);
    expect(data.errors).toEqual(['campaigns']);
    expect(data.stats).toEqual({
      productsTotal: 12,
      warehousesTotal: 1,
      campaignsTotal: 0,
      organizationsTotal: 3,
      categoriesTotal: 1,
      brandsTotal: 1,
    });
    expect(data.plans.map((p) => p.name)).toEqual(['Gói 1', 'Gói 2']);
    expect(data.categories).toHaveLength(1);
  });
});

describe('LandingPage UI & APK CTA', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Locket-inspired hero, hover-QR navbar, #drops lookbook, 4 squircle cards, no workflow/comparison tables, and zero portal links', async () => {
    vi.spyOn(landingApi, 'fetchLandingData').mockResolvedValue(MOCK_LANDING_DATA);

    const { container } = render(
      <MemoryRouter initialEntries={['/landing']}>
        <LandingPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Tủ đồ cũ của người khác/i,
      })
    ).toBeInTheDocument();

    // Navbar hover-QR trigger & popover
    const navbarTrigger = screen.getByTestId('navbar-download-trigger');
    expect(navbarTrigger).toHaveAttribute('href', APK_DOWNLOAD_URL);
    expect(navbarTrigger).toHaveAttribute('target', '_blank');
    const navbarPopover = screen.getByTestId('navbar-qr-popover');
    expect(within(navbarPopover).getByText(/Quét tải ReHome APK/i)).toBeInTheDocument();

    // Hero QR card and mobile/desktop APK CTA links point to Google Drive
    const heroQrLink = screen.getByTestId('hero-qr-link');
    expect(heroQrLink).toHaveAttribute('href', APK_DOWNLOAD_URL);
    expect(heroQrLink).toHaveAttribute('target', '_blank');

    const heroMobileCta = screen.getByTestId('hero-apk-cta');
    expect(heroMobileCta).toHaveAttribute('href', APK_DOWNLOAD_URL);
    expect(heroMobileCta).toHaveAttribute('target', '_blank');

    const heroDesktopLink = screen.getByTestId('hero-desktop-apk-link');
    expect(heroDesktopLink).toHaveAttribute('href', APK_DOWNLOAD_URL);
    expect(heroDesktopLink).toHaveAttribute('target', '_blank');

    // #drops Lookbook strip with live mock products
    const dropsSection = container.querySelector('#drops');
    expect(dropsSection).toBeInTheDocument();
    expect(within(dropsSection).getByText('Áo khoác denim cổ điển')).toBeInTheDocument();
    expect(within(dropsSection).getByText('Đầm midi lụa xanh lá')).toBeInTheDocument();

    // #explore: 4 Locket-style squircle cards
    const exploreSection = container.querySelector('#explore');
    expect(exploreSection).toBeInTheDocument();
    expect(within(exploreSection).getByText('Kiểm định 6 bước')).toBeInTheDocument();
    expect(within(exploreSection).getByText('Ký gửi nhận 90%')).toBeInTheDocument();
    expect(within(exploreSection).getByText('Cài APK trong 30 giây')).toBeInTheDocument();
    expect(within(exploreSection).getByText('Thiện nguyện & Bảo mật')).toBeInTheDocument();

    // Removed workflow and comparison blocks should not appear on the main canvas
    expect(screen.queryByText(/Cách Thức Giao Dịch Tại ReHome/i)).toBeNull();
    expect(screen.queryByText(/Tại Sao Nên Chọn ReHome\?/i)).toBeNull();

    // Landing page is strictly separated from Admin/Moderator portal links
    const allLinks = screen.getAllByRole('link');
    const portalLinks = allLinks.filter((el) => {
      const href = el.getAttribute('href');
      return (
        href === '/' ||
        href?.startsWith('/login') ||
        href?.startsWith('/admin') ||
        href?.startsWith('/moderator')
      );
    });
    expect(portalLinks).toHaveLength(0);

    const logoLinks = allLinks.filter((el) => el.getAttribute('href') === '/landing');
    expect(logoLinks.length).toBeGreaterThan(0);
  });

  it('switches Hero phone story slides between Live Try-On, Đồ kiểm định, and Nhận 90%', async () => {
    vi.spyOn(landingApi, 'fetchLandingData').mockResolvedValue(MOCK_LANDING_DATA);

    render(
      <MemoryRouter initialEntries={['/landing']}>
        <LandingPage />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { level: 1, name: /Tủ đồ cũ của người khác/i });

    fireEvent.click(screen.getByRole('button', { name: 'Đồ kiểm định' }));
    expect(screen.getByText('SKU VERIFIED')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nhận 90%' }));
    expect(screen.getByText('+450.000₫')).toBeInTheDocument();
  });

  it('opens quick QR modal when clicking a Lookbook product and closes via button or Escape', async () => {
    vi.spyOn(landingApi, 'fetchLandingData').mockResolvedValue(MOCK_LANDING_DATA);

    const { container } = render(
      <MemoryRouter initialEntries={['/landing']}>
        <LandingPage />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { level: 1, name: /Tủ đồ cũ của người khác/i });

    const dropsSection = container.querySelector('#drops');
    fireEvent.click(within(dropsSection).getByRole('button', { name: /Áo khoác denim cổ điển/i }));
    const productDialog = screen.getByRole('dialog');
    expect(within(productDialog).getByText('Áo khoác denim cổ điển')).toBeInTheDocument();
    fireEvent.click(within(productDialog).getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    // Reopen and close with Escape key
    fireEvent.click(within(dropsSection).getByRole('button', { name: /Đầm midi lụa xanh lá/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens tabbed ReHomeInfoModal from navbar, squircle card, and footer links, and copies footer email', async () => {
    vi.spyOn(landingApi, 'fetchLandingData').mockResolvedValue(MOCK_LANDING_DATA);
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/landing']}>
        <LandingPage />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { level: 1, name: /Tủ đồ cũ của người khác/i });

    // Open from navbar modal link ("Cài APK")
    const header = container.querySelector('header');
    fireEvent.click(within(header).getByRole('button', { name: 'Cài APK' }));
    const installDialog = screen.getByRole('dialog');
    expect(
      within(installDialog).getByRole('tab', { name: /Cài đặt APK/i })
    ).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(within(installDialog).getByRole('button', { name: /Đã Hiểu & Đóng/i }));
    expect(screen.queryByRole('dialog')).toBeNull();

    // Open from squircle card ("Ký gửi nhận 90%")
    const exploreSection = container.querySelector('#explore');
    fireEvent.click(within(exploreSection).getByRole('button', { name: /Ký gửi nhận 90%/i }));
    const consignDialog = screen.getByRole('dialog');
    expect(
      within(consignDialog).getByRole('tab', { name: /Quy chế ký gửi/i })
    ).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(within(consignDialog).getByRole('button', { name: /Đã Hiểu & Đóng/i }));
    expect(screen.queryByRole('dialog')).toBeNull();

    // Open from footer link ("Kiểm định 6 bước")
    const footer = container.querySelector('footer');
    fireEvent.click(within(footer).getByRole('button', { name: /Kiểm định 6 bước/i }));
    const inspectDialog = screen.getByRole('dialog');
    expect(
      within(inspectDialog).getByRole('tab', { name: /Kiểm định 6 bước/i })
    ).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(within(inspectDialog).getByRole('button', { name: /Đã Hiểu & Đóng/i }));
    expect(screen.queryByRole('dialog')).toBeNull();

    // Copy footer email
    const copyEmailBtn = within(footer).getByRole('button', { name: /support@rehome\.vn/i });
    fireEvent.click(copyEmailBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('support@rehome.vn');
      expect(screen.getByText(/Đã sao chép!/i)).toBeInTheDocument();
    });
  });

  it('hides #drops section when products list is empty while keeping hero, 4 squircle cards, and footer', async () => {
    vi.spyOn(landingApi, 'fetchLandingData').mockResolvedValue({
      ...MOCK_LANDING_DATA,
      products: [],
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/landing']}>
        <LandingPage />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { level: 1, name: /Tủ đồ cũ của người khác/i });

    const exploreSection = container.querySelector('#explore');
    expect(container.querySelector('#drops')).toBeNull();
    expect(exploreSection).toBeInTheDocument();
    expect(within(exploreSection).getByText('Kiểm định 6 bước')).toBeInTheDocument();
    expect(container.querySelector('footer')).toBeInTheDocument();
  });

  it('routes /landing to LandingPage and redirects unauthenticated / to LoginPage without cross-links', async () => {
    vi.spyOn(landingApi, 'fetchLandingData').mockResolvedValue(MOCK_LANDING_DATA);

    const landingView = render(
      <MemoryRouter initialEntries={['/landing']}>
        <AppRouter />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Tủ đồ cũ của người khác/i,
      })
    ).toBeInTheDocument();
    landingView.unmount();

    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRouter />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Đăng nhập hệ thống ReHome/i,
      })
    ).toBeInTheDocument();

    const loginViewLinks = screen.getAllByRole('link');
    const landingCrossLinks = loginViewLinks.filter((el) => {
      const href = el.getAttribute('href');
      return href === '/landing' || href === '/gioi-thieu' || href === '/download';
    });
    expect(landingCrossLinks).toHaveLength(0);
  });
});
