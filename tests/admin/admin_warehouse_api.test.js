import { describe, it, expect, vi, beforeEach } from 'vitest';
import { API_ENDPOINTS } from '../../src/configs/api.config.js';
import baseApi from '../../src/services/baseApi.js';
import { adminApi } from '../../src/features/admin/services/adminApi.js';

vi.mock('../../src/services/baseApi.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('Admin Warehouse API and Address Units config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defines address units endpoints in API_ENDPOINTS', () => {
    expect(API_ENDPOINTS.ADDRESS_UNITS).toBeDefined();
    expect(API_ENDPOINTS.ADDRESS_UNITS.PROVINCES).toBe('/address-units/provinces');
    expect(API_ENDPOINTS.ADDRESS_UNITS.WARDS).toBe('/address-units/wards');
    expect(API_ENDPOINTS.ADMIN.CREATE_WAREHOUSE).toBe('/warehouses');
    expect(API_ENDPOINTS.ADMIN.UPDATE_WAREHOUSE('w-123')).toBe('/warehouses/w-123');
  });

  it('calls getProvinces and unwrap results correctly', async () => {
    const mockProvinces = [
      { code: '201', name: 'Hà Nội' },
      { code: '202', name: 'Hồ Chí Minh' },
    ];
    baseApi.get.mockResolvedValueOnce({
      data: {
        result: mockProvinces,
        isSuccess: true,
      },
    });

    const res = await adminApi.getProvinces();
    expect(baseApi.get).toHaveBeenCalledWith('/address-units/provinces');
    expect(res).toEqual(mockProvinces);
  });

  it('calls getWards with provinceId query param and unwraps result', async () => {
    const mockWards = [
      { code: '1A01', name: 'Phường Bến Nghé' },
      { code: '1A02', name: 'Phường Bến Thành' },
    ];
    baseApi.get.mockResolvedValueOnce({
      data: {
        result: mockWards,
        isSuccess: true,
      },
    });

    const res = await adminApi.getWards(202);
    expect(baseApi.get).toHaveBeenCalledWith('/address-units/wards', {
      params: { provinceId: 202 },
    });
    expect(res).toEqual(mockWards);
  });

  it('calls createWarehouse with payload', async () => {
    const payload = {
      name: 'Kho Tân Bình',
      address: '123 Cộng Hòa, Phường 4, Hồ Chí Minh',
      latitude: 10.8,
      longitude: 106.65,
      provinceId: 202,
      wardCode: '1A01',
      provinceName: 'Hồ Chí Minh',
      wardName: 'Phường 4',
      isNewAddress: true,
      openingHours: '08:00 - 20:00 (Thứ 2 - Chủ nhật)',
    };
    baseApi.post.mockResolvedValueOnce({
      data: {
        result: { id: 'w-1', ...payload },
        isSuccess: true,
      },
    });

    const res = await adminApi.createWarehouse(payload);
    expect(baseApi.post).toHaveBeenCalledWith('/warehouses', payload);
    expect(res.id).toBe('w-1');
    expect(res).toMatchObject(payload);
  });

  it('updates warehouse addresses through the short alias and preserves response fields', async () => {
    const payload = { name: 'Kho mới', address: '12 ABC', provinceId: 202, wardCode: '1A01', provinceName: 'Hồ Chí Minh', wardName: 'Phường 4', isNewAddress: true };
    baseApi.put.mockResolvedValueOnce({ data: { result: { id: 'w-1', ...payload } } });
    await expect(adminApi.updateWarehouse('w-1', payload)).resolves.toMatchObject(payload);
    expect(baseApi.put).toHaveBeenCalledWith('/warehouses/w-1', payload);
  });
});

