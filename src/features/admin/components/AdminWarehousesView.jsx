import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Badge, Modal, Input, Spinner, TableActionButton } from '../../../components/common/index.js';
import adminApi from '../services/adminApi.js';
import { useToast } from '../../../context/ToastContext.jsx';
import OpeningHoursPicker from './OpeningHoursPicker.jsx';
import {
  DASHBOARD_STALE_TIME_MS,
  STATIC_STALE_TIME_MS,
  useAdminCache,
  useAdminCacheActions,
} from '../hooks/useAdminQuery.jsx';

/**
 * View Quản lý Điểm Kí Gửi ReHome (Admin)
 * Chế độ Strict Real Data: 100% dữ liệu thực từ Backend API GET /api/admin/warehouses
 * Thực thi nghiêm ngặt: Hết hàng kí gửi (inventoryCount === 0) mới được ẩn kho (F-155)
 */
const PROVINCES_CACHE_KEY = 'admin:geo:provinces';

export default function AdminWarehousesView({ onLogAction }) {
  const toast = useToast();
  const cache = useAdminCache();
  const cacheActions = useAdminCacheActions();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const warehouseCacheKey = `admin:warehouses:list:${statusFilter}`;
  const initialCachedWarehouses = cache?.read(warehouseCacheKey)?.data || null;

  const [warehouses, setWarehouses] = useState(() => initialCachedWarehouses ?? []);
  const [loading, setLoading] = useState(() => !initialCachedWarehouses);
  const [apiError, setApiError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [stockBlockModal, setStockBlockModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // Danh mục hành chính 2 cấp GHN
  const [provinces, setProvinces] = useState(() => cache?.read(PROVINCES_CACHE_KEY)?.data ?? []);
  const [wards, setWards] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const reqSeqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Form State chuẩn hóa theo hợp đồng Backend
  const [formData, setFormData] = useState({
    name: '',
    streetAddress: '',
    provinceId: '',
    provinceName: '',
    wardCode: '',
    wardName: '',
    latitude: '10.7769',
    longitude: '106.7009',
    openingHours: '08:00 - 20:00 (Thứ 2 - Chủ nhật)',
  });

  // Tải danh mục Tỉnh / Thành phố từ Backend GHN
  const loadProvinces = async () => {
    const cached = cache?.read(PROVINCES_CACHE_KEY) || null;
    if (cached && cache.isFresh(cached, STATIC_STALE_TIME_MS)) {
      setProvinces(cached.data || []);
      return cached.data || [];
    }
    try {
      setLoadingProvinces(true);
      const res = await adminApi.getProvinces();
      const list = Array.isArray(res) ? res : res?.result || [];
      cache?.write(PROVINCES_CACHE_KEY, list);
      if (mountedRef.current) setProvinces(list);
      return list;
    } catch (err) {
      console.error('Lỗi tải danh mục tỉnh thành:', err);
      return [];
    } finally {
      if (mountedRef.current) setLoadingProvinces(false);
    }
  };

  // Tải danh mục Phường / Xã khi người dùng chọn Tỉnh / Thành phố
  const loadWards = async (provinceId) => {
    if (!provinceId) {
      setWards([]);
      return [];
    }
    try {
      setLoadingWards(true);
      const res = await adminApi.getWards(provinceId);
      const list = Array.isArray(res) ? res : res?.result || [];
      if (mountedRef.current) setWards(list);
      return list;
    } catch (err) {
      console.error('Lỗi tải danh mục phường xã:', err);
      if (mountedRef.current) setWards([]);
      return [];
    } finally {
      if (mountedRef.current) setLoadingWards(false);
    }
  };

  // Tải danh sách điểm kí gửi từ Backend API
  const fetchWarehouses = useCallback(async (nextStatus = statusFilter, { force = false } = {}) => {
    const activeStatus = typeof nextStatus === 'string' ? nextStatus : statusFilter;
    const key = `admin:warehouses:list:${activeStatus}`;
    const cachedEntry = cache?.read(key) || null;

    if (!force && cachedEntry && cache.isFresh(cachedEntry, DASHBOARD_STALE_TIME_MS)) {
      setWarehouses(cachedEntry.data ?? []);
      setApiError(null);
      setLoading(false);
      return;
    }

    const reqId = ++reqSeqRef.current;
    const hasCached = Boolean(cachedEntry?.data);
    if (hasCached) {
      setWarehouses(cachedEntry.data);
      setApiError(null);
      setLoading(false);
    } else {
      setLoading(true);
      setApiError(null);
    }

    try {
      const res = await adminApi.getWarehouses(activeStatus === 'ALL' ? undefined : activeStatus);
      if (!mountedRef.current || reqId !== reqSeqRef.current) return;
      const rawList = Array.isArray(res) ? res : res?.content || res?.result || [];
      const mapped = rawList.length > 0
        ? rawList.map((w, idx) => {
            const lat = w.latitude;
            const lng = w.longitude;
            const coordsStr =
              lat != null && lng != null
                ? `${lat}, ${lng}`
                : w.coordinates || 'Chưa cập nhật';

            return {
              id: w.warehouseId || w.id || `WH-0${idx + 1}`,
              code: w.code,
              name: w.name,
              address: w.address,
              latitude: lat,
              longitude: lng,
              coordinates: coordsStr,
              openingHours: w.openingHours || '08:00 - 20:00 (Thứ 2 - Chủ nhật)',
              wardName: w.wardName,
              provinceName: w.provinceName,
              provinceId: w.provinceId,
              wardCode: w.wardCode,
              isNewAddress: w.isNewAddress,
              moderatorCount: w.moderatorCount ?? 0,
              inventoryCount: w.inventoryCount ?? 0,
              activeOrders: w.activeOrders ?? 0,
              status: w.status || 'ACTIVE',
            };
          })
        : [];
      cache?.write(key, mapped);
      setWarehouses(mapped);
    } catch (err) {
      if (!mountedRef.current || reqId !== reqSeqRef.current) return;
      console.error('Lỗi kết nối API kho:', err);
      if (!hasCached || force) {
        setApiError('Không thể kết nối máy chủ điểm kí gửi. Vui lòng kiểm tra lại dịch vụ backend.');
        setWarehouses([]);
      }
    } finally {
      if (mountedRef.current && reqId === reqSeqRef.current) {
        setLoading(false);
      }
    }
  }, [cache, statusFilter]);

  useEffect(() => {
    fetchWarehouses(statusFilter);
  }, [fetchWarehouses, statusFilter]);

  const filteredWarehouses = warehouses.filter(
    (w) =>
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = async () => {
    setEditingWarehouse(null);
    setWards([]);
    setFormData({
      name: '',
      streetAddress: '',
      provinceId: '',
      provinceName: '',
      wardCode: '',
      wardName: '',
      latitude: '10.7769',
      longitude: '106.7009',
      openingHours: '08:00 - 20:00 (Thứ 2 - Chủ nhật)',
    });
    setIsModalOpen(true);
    if (provinces.length === 0) {
      await loadProvinces();
    }
  };

  const handleOpenEdit = async (w) => {
    setEditingWarehouse(w);
    setIsModalOpen(true);

    let currentProvinces = provinces;
    if (currentProvinces.length === 0) {
      currentProvinces = await loadProvinces();
    }

    let provId = '';
    let provName = w.provinceName || '';
    let wCode = '';
    let wName = w.wardName || '';
    let street = w.address || '';

    // Khớp Tỉnh/Thành
    if (provName && currentProvinces.length > 0) {
      const foundProv = currentProvinces.find(
        (p) => p.name.toLowerCase() === provName.toLowerCase() || provName.includes(p.name)
      );
      if (foundProv) {
        provId = foundProv.code;
        provName = foundProv.name;
        const loadedWards = await loadWards(foundProv.code);
        if (wName && loadedWards.length > 0) {
          const foundWard = loadedWards.find(
            (wd) => wd.name.toLowerCase() === wName.toLowerCase() || wName.includes(wd.name)
          );
          if (foundWard) {
            wCode = foundWard.code;
            wName = foundWard.name;
          }
        }
      }
    }

    // Tách số nhà/tên đường nếu address chứa wardName và provinceName
    if (wName && street.includes(wName)) {
      street = street.replace(`, ${wName}`, '').replace(wName, '');
    }
    if (provName && street.includes(provName)) {
      street = street.replace(`, ${provName}`, '').replace(provName, '');
    }
    street = street.replace(/,\s*$/, '').trim();

    setFormData({
      name: w.name,
      streetAddress: street,
      provinceId: provId,
      provinceName: provName,
      wardCode: wCode,
      wardName: wName,
      latitude: w.latitude != null ? String(w.latitude) : '10.7769',
      longitude: w.longitude != null ? String(w.longitude) : '106.7009',
      openingHours: w.openingHours || '08:00 - 20:00 (Thứ 2 - Chủ nhật)',
    });
  };

  // Khi chọn Tỉnh/Thành
  const handleProvinceChange = async (e) => {
    const selectedId = e.target.value;
    const selectedProv = provinces.find((p) => String(p.code) === selectedId);
    setFormData((prev) => ({
      ...prev,
      provinceId: selectedId,
      provinceName: selectedProv ? selectedProv.name : '',
      wardCode: '',
      wardName: '',
    }));
    if (selectedId) {
      await loadWards(selectedId);
    } else {
      setWards([]);
    }
  };

  // Khi chọn Phường/Xã
  const handleWardChange = (e) => {
    const selectedCode = e.target.value;
    const selectedWard = wards.find((w) => String(w.code) === selectedCode);
    setFormData((prev) => ({
      ...prev,
      wardCode: selectedCode,
      wardName: selectedWard ? selectedWard.name : '',
    }));
  };

  // Lấy vị trí hiện tại qua Geolocation API
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Trình duyệt của bạn không hỗ trợ định vị GPS (Geolocation).');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        setGeoLoading(false);
        toast.success(`Đã lấy vị trí hiện tại: ${lat}, ${lng}`);
      },
      (error) => {
        setGeoLoading(false);
        console.warn('Geolocation error:', error);
        let msg = 'Không thể lấy vị trí hiện tại.';
        if (error.code === 1) {
          msg = 'Bạn đã từ chối cấp quyền truy cập vị trí trên trình duyệt.';
        } else if (error.code === 2) {
          msg = 'Thông tin vị trí hiện không khả dụng.';
        } else if (error.code === 3) {
          msg = 'Yêu cầu định vị đã hết thời gian chờ.';
        }
        toast.error(msg);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên điểm kí gửi.');
      return;
    }
    if (!formData.streetAddress.trim()) {
      toast.error('Vui lòng nhập số nhà, tên đường chi tiết.');
      return;
    }

    if (!formData.provinceId || !formData.provinceName || !formData.wardCode || !formData.wardName) {
      toast.error('Vui lòng chọn đầy đủ Tỉnh / Thành phố và Phường / Xã.');
      return;
    }

    const latNum = parseFloat(formData.latitude);
    const lngNum = parseFloat(formData.longitude);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      toast.error('Vĩ độ (Latitude) không hợp lệ (phải trong khoảng -90 đến 90).');
      return;
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      toast.error('Kinh độ (Longitude) không hợp lệ (phải trong khoảng -180 đến 180).');
      return;
    }

    // Ghép địa chỉ đầy đủ chuẩn hóa
    const addressParts = [formData.streetAddress.trim()];
    if (formData.wardName) addressParts.push(formData.wardName);
    if (formData.provinceName) addressParts.push(formData.provinceName);
    const fullAddress = addressParts.join(', ');

    const payload = {
      name: formData.name.trim(),
      address: fullAddress,
      latitude: latNum,
      longitude: lngNum,
      openingHours: formData.openingHours.trim(),
      wardName: formData.wardName || undefined,
      provinceName: formData.provinceName || undefined,
      provinceId: formData.provinceId ? parseInt(formData.provinceId, 10) : undefined,
      wardCode: formData.wardCode || undefined,
      isNewAddress: true,
    };

    try {
      setIsSubmitting(true);
      if (editingWarehouse) {
        await adminApi.updateWarehouse(editingWarehouse.id, payload);
        cacheActions?.invalidate(['admin:warehouses:', 'admin:dashboard:warehouse:', 'admin:audit-logs:', 'admin:moderators:']);
        await fetchWarehouses(statusFilter, { force: true });
        toast.success(`Cập nhật thông tin điểm kí gửi "${formData.name}" thành công!`);
        if (onLogAction) {
          onLogAction({
            time: new Date().toLocaleString('vi-VN'),
            user: 'Admin',
            role: 'Admin',
            action: `Cập nhật thông tin điểm kí gửi "${formData.name}"`,
          });
        }
        setIsModalOpen(false);
      } else {
        await adminApi.createWarehouse(payload);
        cacheActions?.invalidate(['admin:warehouses:', 'admin:dashboard:warehouse:', 'admin:audit-logs:', 'admin:moderators:']);
        await fetchWarehouses(statusFilter, { force: true });
        toast.success(`Tạo mới điểm kí gửi "${formData.name}" thành công!`);
        if (onLogAction) {
          onLogAction({
            time: new Date().toLocaleString('vi-VN'),
            user: 'Admin',
            role: 'Admin',
            action: `Tạo mới điểm kí gửi "${formData.name}"`,
          });
        }
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Lỗi API kho:', err);
      const errMsg =
        err.response?.data?.message || err.message || (editingWarehouse ? 'Cập nhật điểm kí gửi thất bại.' : 'Tạo điểm kí gửi mới thất bại.');
      toast.error(`${editingWarehouse ? 'Cập nhật' : 'Tạo địa điểm'} thất bại: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ẩn / Mở lại điểm kí gửi (Quy tắc F-155: Hết hàng kí gửi rồi mới được ẩn)
  const handleToggleHide = async (w) => {
    if (togglingId) return;

    if (w.status === 'ACTIVE') {
      if (w.inventoryCount > 0) {
        setStockBlockModal(w);
        return;
      }

      try {
        setTogglingId(w.id);
        await adminApi.hideWarehouse(w.id);
        cacheActions?.invalidate(['admin:warehouses:', 'admin:dashboard:warehouse:', 'admin:audit-logs:', 'admin:moderators:']);
        await fetchWarehouses(statusFilter, { force: true });
        toast.success(`Đã ẩn điểm kí gửi "${w.name}".`);
        if (onLogAction) {
          onLogAction({
            time: new Date().toLocaleString('vi-VN'),
            user: 'Admin',
            role: 'Admin',
            action: `Ẩn điểm kí gửi "${w.name}"`,
          });
        }
      } catch (err) {
        if (err.response?.status === 409 || err.response?.data?.code === 'WAREHOUSE_HAS_STOCK') {
          toast.error(
            `Không thể ẩn điểm kí gửi "${w.name}" vì vẫn còn sản phẩm ký gửi chưa xử lý!`
          );
          return;
        }
        toast.error('Không thể thực hiện thao tác ẩn điểm kí gửi.');
      } finally {
        setTogglingId(null);
      }
    } else {
      // Mở lại kho đang ẩn: gọi đúng API unhide (chỉ đổi status, không đụng thông tin kho)
      try {
        setTogglingId(w.id);
        await adminApi.unhideWarehouse(w.id);
        cacheActions?.invalidate(['admin:warehouses:', 'admin:dashboard:warehouse:', 'admin:audit-logs:', 'admin:moderators:']);
        await fetchWarehouses(statusFilter, { force: true });
        toast.success(`Đã mở hoạt động lại điểm kí gửi "${w.name}".`);
        if (onLogAction) {
          onLogAction({
            time: new Date().toLocaleString('vi-VN'),
            user: 'Admin',
            role: 'Admin',
            action: `Mở hoạt động lại điểm kí gửi "${w.name}"`,
          });
        }
      } catch (err) {
        console.error('Lỗi mở lại kho:', err);
        const errMsg = err.response?.data?.message || err.message || 'Mở hoạt động điểm kí gửi thất bại.';
        toast.error(`Mở địa điểm ký gửi thất bại: ${errMsg}`);
      } finally {
        setTogglingId(null);
      }
    }
  };


  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={loading}
            onClick={() => fetchWarehouses(statusFilter, { force: true })}
            className="gap-1.5 whitespace-nowrap"
          >
            <span aria-hidden="true" className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Làm mới</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleOpenCreate}
            className="gap-1.5 shrink-0 whitespace-nowrap"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">add_location_alt</span>
            <span>Thêm điểm kí gửi mới</span>
          </Button>
        </div>
      </div>

      {/* Search & Status Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative max-w-md w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6776] text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm điểm kí gửi theo tên, địa chỉ chi nhánh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#DDE5D9] bg-white text-xs text-[#1F2A37] focus:outline-none focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15 transition-all shadow-xs"
          />
        </div>
        <select
          aria-label="Lọc trạng thái địa điểm ký gửi"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-[#DDE5D9] bg-white text-xs font-medium text-[#1F2A37] focus:outline-none focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15 shadow-xs"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="HIDDEN">Đã tạm ẩn</option>
        </select>
      </div>

      {/* Loading & Error States */}
      {loading && warehouses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#DDE5D9] p-12 text-center flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs font-semibold text-[#5B6776]">Đang tải danh sách điểm kí gửi từ hệ thống...</p>
        </div>
      ) : apiError ? (
        <div className="bg-white rounded-2xl border border-[#FEE2E2] p-8 text-center space-y-3">
          <span className="material-symbols-outlined text-3xl text-[#DC2626]">error</span>
          <p className="text-sm font-bold text-[#1F2A37]">{apiError}</p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => fetchWarehouses(statusFilter, { force: true })}
          >
            Thử kết nối lại
          </Button>
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#DDE5D9] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F6F9F4] text-[#006B2C] flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-2xl">warehouse</span>
          </div>
          <h3 className="text-base font-bold text-[#1F2A37]">Chưa có điểm kí gửi nào</h3>
          <p className="text-xs text-[#5B6776] max-w-sm mx-auto">
            Hệ thống chưa ghi nhận điểm kí gửi nào phù hợp. Vui lòng thêm điểm kí gửi mới.
          </p>
          <Button variant="primary" size="sm" onClick={handleOpenCreate} className="mt-2">
            Thêm điểm kí gửi đầu tiên
          </Button>
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-5 transition-opacity duration-150 ${
            loading ? 'opacity-60 pointer-events-none' : ''
          }`}
        >
          {filteredWarehouses.map((w) => (
            <div
              key={w.id}
              className={`p-6 rounded-2xl border bg-white shadow-xs flex flex-col justify-between transition-all ${
                w.status === 'HIDDEN'
                  ? 'border-[#DDE5D9] bg-[#FAFAF9] opacity-80'
                  : 'border-[#DDE5D9] hover:border-[#006B2C]/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#E8F5E9] text-[#006B2C] border border-[#C8E6C9]">
                      {w.code || w.id}
                    </span>
                    <h3 className="font-bold text-sm text-[#1F2A37]">{w.name}</h3>
                  </div>
                  {w.status === 'ACTIVE' ? (
                    <Badge variant="success">Đang hoạt động</Badge>
                  ) : (
                    <Badge variant="danger">Đã tạm ẩn</Badge>
                  )}
                </div>

                <div className="space-y-2 text-xs text-[#5B6776]">
                  <p className="flex items-start space-x-2">
                    <span className="material-symbols-outlined text-sm text-[#5B6776] shrink-0 mt-0.5">
                      location_on
                    </span>
                    <span>{w.address}</span>
                  </p>
                  <p className="flex items-center space-x-2">
                    <span className="material-symbols-outlined text-sm text-[#5B6776] shrink-0">
                      schedule
                    </span>
                    <span>{w.openingHours}</span>
                  </p>
                  <p className="flex items-center space-x-2">
                    <span className="material-symbols-outlined text-sm text-[#5B6776] shrink-0">
                      pin_drop
                    </span>
                    <span className="font-mono text-[11px] text-[#5B6776]">{w.coordinates}</span>
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#F0F4EE] text-center">
                  <div className="p-2.5 rounded-xl bg-[#F6F9F4] border border-[#DDE5D9]">
                    <p className="text-[10px] text-[#5B6776]">Nhân sự</p>
                    <p className="text-sm font-bold text-[#1F2A37] mt-0.5">{w.moderatorCount} người</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F6F9F4] border border-[#DDE5D9]">
                    <p className="text-[10px] text-[#5B6776]">Sản phẩm tồn</p>
                    <p
                      className={`text-sm font-bold mt-0.5 ${
                        w.inventoryCount > 0 ? 'text-[#006B2C]' : 'text-[#5B6776]'
                      }`}
                    >
                      {w.inventoryCount} món
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F6F9F4] border border-[#DDE5D9]">
                    <p className="text-[10px] text-[#5B6776]">Đơn đang xử lý</p>
                    <p className="text-sm font-bold text-[#D97706] mt-0.5">{w.activeOrders} đơn</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-5 pt-3 border-t border-[#F0F4EE]">
                {w.status === 'ACTIVE' && w.inventoryCount > 0 && (
                  <span className="text-[11px] text-[#D97706] flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    <span>Còn hàng ký gửi ({w.inventoryCount})</span>
                  </span>
                )}
                {(!w.inventoryCount || w.inventoryCount === 0) && <div></div>}

                <div className="flex items-center gap-2">
                  <TableActionButton
                    action="edit"
                    label="Sửa thông tin"
                    onClick={() => handleOpenEdit(w)}
                  />
                  {w.status === 'ACTIVE' ? (
                    <TableActionButton
                      action="view"
                      icon="visibility_off"
                      label={togglingId === w.id ? 'Đang xử lý...' : 'Ẩn điểm kí gửi'}
                      loading={togglingId === w.id}
                      disabled={togglingId === w.id}
                      onClick={() => handleToggleHide(w)}
                      className="border-[#FECDCA] text-[#B42318] hover:bg-[#FEF3F2] hover:border-[#D92D20] hover:text-[#B42318]"
                    />
                  ) : (
                    <TableActionButton
                      action="view"
                      icon="visibility"
                      label={togglingId === w.id ? 'Đang xử lý...' : 'Mở hoạt động'}
                      loading={togglingId === w.id}
                      disabled={togglingId === w.id}
                      onClick={() => handleToggleHide(w)}
                      className="border-[#ABEFC6] text-[#006B2C] hover:bg-[#ECFDF3] hover:border-[#006B2C] hover:text-[#006B2C]"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Thêm / Sửa điểm kí gửi */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="xl"
        title={editingWarehouse ? 'Chỉnh sửa thông tin điểm kí gửi' : 'Mở điểm kí gửi mới'}
      >
        <form onSubmit={handleSave} className="space-y-5">
          {/* ===== Tên điểm kí gửi (full width) ===== */}
          <div className="p-4 rounded-2xl border border-[#DDE5D9] bg-[#FBFDFB] space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1F2A37]">
              <span className="material-symbols-outlined text-[18px] text-[#006B2C]">store</span>
              <span>Thông tin điểm kí gửi</span>
            </div>
            <Input
              label="Tên điểm kí gửi"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ví dụ: Điểm kí gửi Tân Bình - Chi nhánh số 5"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ===== Cột trái: Địa chỉ ===== */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-[#DDE5D9] bg-[#FBFDFB] space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1F2A37]">
                    <span className="material-symbols-outlined text-[18px] text-[#006B2C]">location_city</span>
                    <span>Địa chỉ <span className="text-[#D92D20]">*</span></span>
                  </div>
                  <span className="text-[11px] text-[#5B6776]">Hành chính 2 cấp sau 01/07/2025</span>
                </div>

                <div>
                  <label htmlFor="warehouse-province-select" className="text-[11px] font-medium text-[#5B6776] block mb-1">
                    Tỉnh / Thành phố
                  </label>
                  <select
                    id="warehouse-province-select"
                    aria-label="Tỉnh / Thành phố"
                    value={formData.provinceId}
                    onChange={handleProvinceChange}
                    disabled={loadingProvinces}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#DDE5D9] bg-white text-[#1F2A37] focus:outline-none focus:border-[#006B2C]"
                  >
                    <option value="">-- Chọn Tỉnh / Thành phố --</option>
                    {provinces.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="warehouse-ward-select" className="text-[11px] font-medium text-[#5B6776] block mb-1">
                    Phường / Xã
                  </label>
                  <select
                    id="warehouse-ward-select"
                    aria-label="Phường / Xã"
                    value={formData.wardCode}
                    onChange={handleWardChange}
                    disabled={loadingWards || !formData.provinceId}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#DDE5D9] bg-white text-[#1F2A37] focus:outline-none focus:border-[#006B2C] disabled:bg-[#F5F5F5] disabled:text-[#9E9E9E]"
                  >
                    <option value="">
                      {loadingWards
                        ? 'Đang tải danh sách phường/xã...'
                        : !formData.provinceId
                        ? '-- Vui lòng chọn Tỉnh/Thành trước --'
                        : '-- Chọn Phường / Xã --'}
                    </option>
                    {wards.map((w) => (
                      <option key={w.code} value={w.code}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="warehouse-street-address-input" className="text-[11px] font-medium text-[#5B6776] block mb-1">
                    Số nhà, tên đường <span className="text-[#D92D20]">*</span>
                  </label>
                  <input
                    id="warehouse-street-address-input"
                    type="text"
                    required
                    value={formData.streetAddress}
                    onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                    placeholder="Ví dụ: 123 Nguyễn Thị Thập"
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#DDE5D9] bg-white text-[#1F2A37] focus:outline-none focus:border-[#006B2C]"
                  />
                </div>

                {(formData.streetAddress || formData.wardName || formData.provinceName) && (
                  <div className="text-[11px] text-[#5B6776] bg-white p-2.5 rounded-xl border border-[#DDE5D9] flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#006B2C] shrink-0">pin_drop</span>
                    <span>
                      <span className="font-medium text-[#1F2A37]">Địa chỉ đầy đủ: </span>
                      {[formData.streetAddress.trim(), formData.wardName, formData.provinceName]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ===== Cột phải: Tọa độ & Giờ mở cửa ===== */}
            <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-[#DDE5D9] bg-[#FBFDFB] space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1F2A37]">
                  <span className="material-symbols-outlined text-[18px] text-[#006B2C]">map</span>
                  <span>Tọa độ bản đồ <span className="text-[#D92D20]">*</span></span>
                </div>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={geoLoading}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006B2C] hover:text-[#005221] bg-[#E8F5E9] hover:bg-[#C8E6C9] px-2.5 py-1 rounded-xl transition-colors border border-[#C8E6C9]"
                >
                  <span className={`material-symbols-outlined text-[16px] ${geoLoading ? 'animate-spin' : ''}`}>
                    {geoLoading ? 'progress_activity' : 'my_location'}
                  </span>
                  <span>{geoLoading ? 'Đang định vị...' : 'Lấy vị trí hiện tại'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#5B6776] block mb-1">
                    Vĩ độ (Latitude)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="10.7769"
                    className="w-full px-3 py-2.5 text-xs font-mono rounded-xl border border-[#DDE5D9] bg-white text-[#1F2A37] focus:outline-none focus:border-[#006B2C]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#5B6776] block mb-1">
                    Kinh độ (Longitude)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="106.7009"
                    className="w-full px-3 py-2.5 text-xs font-mono rounded-xl border border-[#DDE5D9] bg-white text-[#1F2A37] focus:outline-none focus:border-[#006B2C]"
                  />
                </div>
              </div>
            </div>

              <OpeningHoursPicker
                value={formData.openingHours}
                onChange={(val) => setFormData({ ...formData, openingHours: val })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#DDE5D9]">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setIsModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang lưu...' : (editingWarehouse ? 'Lưu cập nhật' : 'Tạo điểm kí gửi mới')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Cảnh Báo: Chặn ẩn kho khi còn tồn kho (Nghiệp vụ F-155 / L-11) */}
      {stockBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#DDE5D9] shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#FFF3E0] text-[#D97706] flex items-center justify-center shrink-0 border border-[#FFE0B2]">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-[#1F2A37] font-heading">
                  Chưa thể ẩn điểm kí gửi này!
                </h3>
                <p className="text-xs text-[#5B6776] mt-1 leading-relaxed">
                  Theo quy định vận hành của ReHome, chỉ được phép ẩn điểm kí gửi khi{' '}
                  <strong className="text-[#1F2A37]">hết toàn bộ hàng kí gửi</strong> đang lưu giữ.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-[#F6F9F4] rounded-xl border border-[#DDE5D9] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#5B6776]">Điểm kí gửi:</span>
                <span className="font-bold text-[#1F2A37]">{stockBlockModal.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5B6776]">Số sản phẩm còn tồn:</span>
                <span className="font-black text-[#D92D20]">
                  {stockBlockModal.inventoryCount} món
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5B6776]">Đơn hàng đang xử lý:</span>
                <span className="font-bold text-[#D97706]">
                  {stockBlockModal.activeOrders} đơn
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#5B6776] italic">
              Vui lòng điều chuyển sản phẩm sang điểm kí gửi khác hoặc hoàn tất thanh lý toàn bộ hàng hóa
              trước khi tiến hành đóng hoặc ẩn địa điểm ký gửi.
            </p>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setStockBlockModal(null)}
                className="bg-[#006B2C] text-white text-xs px-5 py-2 rounded-xl"
              >
                Đã hiểu
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
