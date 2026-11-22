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

  it('renders live stats, 2 AI modes, horizontal products, inspection/warehouses, charity, about section, VIP plans, and 4 APK install steps', async () => {
    vi.spyOn(landingApi, 'fetchLandingData').mockResolvedValue(MOCK_LANDING_DATA);

    const { container } = render(
      <MemoryRouter initialEntries={['/landing']}>
        <LandingPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Ký gửi thời trang tuần hoàn/i,
      })
    ).toBeInTheDocument();

    // Live stats
    const statsBlock = await screen.findByTestId('landing-live-stats');
    expect(within(statsBlock).getByText('128')).toBeInTheDocument();
    expect(within(statsBlock).getByText('2')).toBeInTheDocument();
    expect(within(statsBlock).getByText('5')).toBeInTheDocument();
    expect(within(statsBlock).getByText('3')).toBeInTheDocument();

    // #ai-studio (2 AI modes + About section)
    expect(container.querySelector('#ai-studio')).toBeInTheDocument();
    expect(screen.getAllByText(/LIVE TRY-ON REALTIME/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/TRỢ LÝ AI PHỐI ĐỒ/i).length).toBeGreaterThan(0);
    expect(container.querySelector('#about')).toBeInTheDocument();
    expect(screen.getByText(/Một nền tảng — Lợi ích trọn vẹn cho cả 3 phía/i)).toBeInTheDocument();

    // Products, campaigns, organizations, warehouses
    expect(screen.getAllByText('Áo khoác denim cổ điển').length).toBeGreaterThan(0);
    expect(screen.getByText('Nổi bật')).toBeInTheDocument();
    expect(screen.getAllByText('Tủ đồ ấm áp mùa đông').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Quỹ Hy Vọng Xanh').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kho ReHome Quận 1').length).toBeGreaterThan(0);

    // Membership plans with null limit rendered as "Không giới hạn"
    expect(screen.getByText('Gói Bạc')).toBeInTheDocument();
    expect(screen.getByText('Gói Vàng')).toBeInTheDocument();
    expect(screen.getAllByText(/Không giới hạn/i).length).toBeGreaterThan(0);

    // APK CTA links point to the Google Drive folder URL
    const heroCta = screen.getByTestId('hero-apk-cta');
    const installCta = screen.getByTestId('install-apk-cta');
    expect(heroCta).toHaveAttribute('href', APK_DOWNLOAD_URL);
    expect(heroCta).toHaveAttribute('target', '_blank');
    expect(installCta).toHaveAttribute('href', APK_DOWNLOAD_URL);
    expect(installCta).toHaveAttribute('target', '_blank');

    // 4 Android APK install steps
    expect(
      screen.getByRole('heading', { level: 4, name: 'Tải tệp APK từ Google Drive' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 4, name: 'Mở tệp vừa tải về' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 4, name: 'Cấp quyền cài đặt nguồn ngoài' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 4, name: 'Nhấn Cài đặt & trải nghiệm' })
    ).toBeInTheDocument();

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

  it('switches interactive AI outfit combos in #ai-studio and sorts nearby warehouses in #warehouses', async () => {
    vi.spyOn(landingApi, 'fetchLandingData').mockResolvedValue(MOCK_LANDING_DATA);

    const { container } = render(
      <MemoryRouter initialEntries={['/landing']}>
        <LandingPage />
      </MemoryRouter>
    );

    const styleGroup = await screen.findByRole('group', {
      name: /Chọn phong cách phối đồ AI/i,
    });
    fireEvent.click(within(styleGroup).getByRole('button', { name: 'Năng động' }));

    const aiSection = container.querySelector('#ai-studio');
    expect(within(aiSection).getByText('Độ hợp gu: 94%')).toBeInTheDocument();
    expect(within(aiSection).getByText('Quần jeans Levi’s 501 ống đứng')).toBeInTheDocument();

    // Consignor earnings calculator & nearest warehouse finder
    const warehousesSection = container.querySelector('#warehouses');
    fireEvent.click(within(warehousesSection).getByRole('button', { name: /1\.000\.000/ }));
    expect(within(warehousesSection).getByText(/900\.000/)).toBeInTheDocument();

    fireEvent.click(within(warehousesSection).getByRole('button', { name: 'Hà Nội' }));
    expect(within(warehousesSection).getByText('Gần bạn nhất')).toBeInTheDocument();
    const warehouseHeadings = within(warehousesSection).getAllByRole('heading', { level: 4 });
    expect(warehouseHeadings[0]).toHaveTextContent('Kho ReHome Cầu Giấy');
  });

  it('filters products by categoryId when clicking a category chip', async () => {
    vi.spyOn(landingApi, 'fetchLandingData').mockResolvedValue(MOCK_LANDING_DATA);
    const productsSpy = vi.spyOn(landingApi, 'fetchPublicProducts').mockResolvedValue({
      items: [MOCK_LANDING_DATA.products[1]],
      totalElements: 1,
      totalPages: 1,
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/landing']}>
        <LandingPage />
      </MemoryRouter>
    );

    const filterGroup = await screen.findByRole('group', {
      name: /Lọc sản phẩm theo danh mục/i,
    });
    const dressBtn = within(filterGroup).getByRole('button', { name: 'Đầm' });
    fireEvent.click(dressBtn);

    await waitFor(() => {
      expect(productsSpy).toHaveBeenCalledWith({
        page: 0,
        size: 6,
        categoryId: 'cat-2',
      });
    });

    const marketplace = container.querySelector('#marketplace');
    expect(within(marketplace).getByText('Đầm midi lụa xanh lá')).toBeInTheDocument();
    expect(within(marketplace).queryByText('Áo khoác denim cổ điển')).toBeNull();
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
        name: /Ký gửi thời trang tuần hoàn/i,
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
