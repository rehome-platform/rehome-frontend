import React, { useState, useEffect } from 'react';
import { Button, Badge, Modal, Input } from '../../../components/common/index.js';
import adminApi from '../services/adminApi.js';
import { useToast } from '../../../context/ToastContext.jsx';
import OpeningHoursPicker from './OpeningHoursPicker.jsx';

/**
 * View Quản lý Điểm Kí Gửi ReHome (Admin)
 * Chế độ Strict Real Data: 100% dữ liệu thực từ Backend API GET /api/admin/warehouses
 * Thực thi nghiêm ngặt: Hết hàng kí gửi (inventoryCount === 0) mới được ẩn kho (F-155)
 */
export default function AdminWarehousesView({ onLogAction }) {
  const toast = useToast();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [stockBlockModal, setStockBlockModal] = useState(null);

  // Danh mục hành chính 2 cấp GHN
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

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
    try {
      setLoadingProvinces(true);
      const res = await adminApi.getProvinces();
      const list = Array.isArray(res) ? res : res?.result || [];
      setProvinces(list);
      return list;
    } catch (err) {
      console.error('Lỗi tải danh mục tỉnh thành:', err);
      return [];
    } finally {
      setLoadingProvinces(false);
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
      setWards(list);
      return list;
    } catch (err) {
      console.error('Lỗi tải danh mục phường xã:', err);
      setWards([]);
      return [];
    } finally {
      setLoadingWards(false);
    }
  };

  // Tải danh sách điểm kí gửi từ Backend API
  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      setApiError(null);
      const res = await adminApi.getWarehouses();
      const rawList = Array.isArray(res) ? res : res?.content || res?.result || [];
      if (rawList && rawList.length > 0) {
        const mapped = rawList.map((w, idx) => {
          const lat = w.latitude;
          const lng = w.longitude;
          const coordsStr =
            lat != null && lng != null
              ? `${lat}, ${lng}`
              : w.coordinates || 'Chưa cập nhật';

          return {
            id: w.warehouseId || w.id || `WH-0${idx + 1}`,
            name: w.name,
            address: w.address,
            latitude: lat,
            longitude: lng,
            coordinates: coordsStr,
            openingHours: w.openingHours || '08:00 - 20:00 (Thứ 2 - Chủ nhật)',
            wardName: w.wardName,
            provinceName: w.provinceName,
            moderatorCount: w.moderatorCount ?? 0,
            inventoryCount: w.inventoryCount ?? 0,
            activeOrders: w.activeOrders ?? 0,
            status: w.status || 'ACTIVE',
          };
        });
        setWarehouses(mapped);
      } else {
        setWarehouses([]);
      }
    } catch (err) {
      console.error('Lỗi kết nối API kho:', err);
      setApiError('Không thể kết nối máy chủ điểm kí gửi. Vui lòng kiểm tra lại dịch vụ backend.');
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

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
    const selectedProv = provinces.find((p) => p.code === selectedId);
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
    const selectedWard = wards.find((w) => w.code === selectedCode);
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

  // Chọn nhanh tọa độ thành phố lớn
  const setCityPreset = (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      latitude: String(lat),
      longitude: String(lng),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên điểm kí gửi.');
      return;
    }
    if (!formData.streetAddress.trim()) {
      toast.error('Vui lòng nhập số nhà, tên đường chi tiết.');
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

    if (editingWarehouse) {
      try {
        await adminApi.updateWarehouse(editingWarehouse.id, payload);
        await fetchWarehouses();
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
      } catch (err) {
        console.error('Lỗi API cập nhật kho:', err);
        const errMsg =
          err.response?.data?.message || err.message || 'Cập nhật điểm kí gửi thất bại.';
        toast.error(`Cập nhật thất bại: ${errMsg}`);
      }
    } else {
      try {
        await adminApi.createWarehouse(payload);
        await fetchWarehouses();
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
      } catch (err) {
        console.error('Lỗi API tạo kho:', err);
        const errMsg =
          err.response?.data?.message || err.message || 'Tạo điểm kí gửi mới thất bại.';
        toast.error(`Tạo kho thất bại: ${errMsg}`);
      }
    }
  };

  // Ẩn / Mở lại điểm kí gửi (Quy tắc F-155: Hết hàng kí gửi rồi mới được ẩn)
  const handleToggleHide = async (w) => {
    if (w.status === 'ACTIVE') {
      if (w.inventoryCount > 0) {
        setStockBlockModal(w);
        return;
      }

      try {
        await adminApi.hideWarehouse(w.id);
        await fetchWarehouses();
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
            `Không thể ẩn điểm kí gửi "${w.name}" vì kho vẫn còn sản phẩm tồn chưa xử lý (Mã lỗi: WAREHOUSE_HAS_STOCK)!`
          );
          return;
        }
        toast.error('Không thể thực hiện thao tác ẩn điểm kí gửi.');
      }
    } else {
      // Mở lại kho nếu đang bị ẩn
      try {
        await adminApi.updateWarehouse(w.id, {
          name: w.name,
          address: w.address,
          latitude: w.latitude,
          longitude: w.longitude,
          openingHours: w.openingHours,
          status: 'ACTIVE',
        });
        await fetchWarehouses();
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
      }
    }
  };

  const parsedLat = parseFloat(formData.latitude);
  const parsedLng = parseFloat(formData.longitude);
  const hasValidCoords =
    !isNaN(parsedLat) &&
    !isNaN(parsedLng) &&
    parsedLat >= -90 &&
    parsedLat <= 90 &&
    parsedLng >= -180 &&
    parsedLng <= 180;

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#191C19] font-heading">
            Quản Lý Điểm Kí Gửi
          </h1>
          <p className="text-xs text-[#717971] mt-0.5">
            Dữ liệu mạng lưới kho thực tế từ hệ thống ReHome. Kiểm soát nhân sự và quản lý hàng tồn kho.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchWarehouses}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#E2E8E0] bg-white text-xs font-semibold text-[#414942] hover:bg-[#F8FAF8] hover:text-[#006B2C] transition-colors"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Làm mới</span>
          </button>
          <Button
            onClick={handleOpenCreate}
            className="bg-[#006B2C] hover:bg-[#005221] text-white text-xs shrink-0 rounded-xl px-4 py-2.5"
          >
            <span className="material-symbols-outlined text-[18px] mr-1.5">add_location_alt</span>
            Thêm điểm kí gửi mới
          </Button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative max-w-md w-full">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717971] text-[20px]">
          search
        </span>
        <input
          type="text"
          placeholder="Tìm kiếm điểm kí gửi theo tên, địa chỉ chi nhánh..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E8E0] bg-white text-xs text-[#191C19] focus:outline-none focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15 transition-all shadow-xs"
        />
      </div>

      {/* Loading & Error States */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E2E8E0] p-12 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#006B2C] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-[#717971]">Đang tải danh sách điểm kí gửi từ hệ thống...</p>
        </div>
      ) : apiError ? (
        <div className="bg-white rounded-2xl border border-[#FEE2E2] p-8 text-center space-y-3">
          <span className="material-symbols-outlined text-3xl text-[#DC2626]">error</span>
          <p className="text-sm font-bold text-[#191C19]">{apiError}</p>
          <button
            onClick={fetchWarehouses}
            className="px-4 py-2 bg-[#006B2C] text-white text-xs font-semibold rounded-xl"
          >
            Thử kết nối lại
          </button>
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8E0] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F0F5EE] text-[#006B2C] flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-2xl">warehouse</span>
          </div>
          <h3 className="text-base font-bold text-[#191C19]">Chưa có điểm kí gửi nào</h3>
          <p className="text-xs text-[#717971] max-w-sm mx-auto">
            Hệ thống chưa ghi nhận điểm kí gửi nào phù hợp. Vui lòng thêm điểm kí gửi mới.
          </p>
          <Button onClick={handleOpenCreate} className="bg-[#006B2C] text-white text-xs mt-2">
            Thêm điểm kí gửi đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredWarehouses.map((w) => (
            <div
              key={w.id}
              className={`p-6 rounded-2xl border bg-white shadow-xs flex flex-col justify-between transition-all ${
                w.status === 'HIDDEN'
                  ? 'border-[#E2E8E0] bg-[#FAFAF9] opacity-80'
                  : 'border-[#E2E8E0] hover:border-[#006B2C]/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#E8F5E9] text-[#006B2C] border border-[#C8E6C9]">
                      {w.id}
                    </span>
                    <h3 className="font-bold text-sm text-[#191C19]">{w.name}</h3>
                  </div>
                  {w.status === 'ACTIVE' ? (
                    <Badge variant="success">Đang hoạt động</Badge>
                  ) : (
                    <Badge variant="danger">Đã tạm ẩn</Badge>
                  )}
                </div>

                <div className="space-y-2 text-xs text-[#414942]">
                  <p className="flex items-start space-x-2">
                    <span className="material-symbols-outlined text-sm text-[#717971] shrink-0 mt-0.5">
                      location_on
                    </span>
                    <span>{w.address}</span>
                  </p>
                  <p className="flex items-center space-x-2">
                    <span className="material-symbols-outlined text-sm text-[#717971] shrink-0">
                      schedule
                    </span>
                    <span>{w.openingHours}</span>
                  </p>
                  <p className="flex items-center space-x-2">
                    <span className="material-symbols-outlined text-sm text-[#717971] shrink-0">
                      pin_drop
                    </span>
                    <span className="font-mono text-[11px] text-[#717971]">{w.coordinates}</span>
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#F0F4EE] text-center">
                  <div className="p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0]">
                    <p className="text-[10px] text-[#717971]">Nhân sự Mod</p>
                    <p className="text-sm font-bold text-[#191C19] mt-0.5">{w.moderatorCount} người</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0]">
                    <p className="text-[10px] text-[#717971]">Sản phẩm tồn</p>
                    <p
                      className={`text-sm font-bold mt-0.5 ${
                        w.inventoryCount > 0 ? 'text-[#006B2C]' : 'text-[#717971]'
                      }`}
                    >
                      {w.inventoryCount} món
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0]">
                    <p className="text-[10px] text-[#717971]">Đơn đang xử lý</p>
                    <p className="text-sm font-bold text-[#D97706] mt-0.5">{w.activeOrders} đơn</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-5 pt-3 border-t border-[#F0F4EE]">
                {w.status === 'ACTIVE' && w.inventoryCount > 0 && (
                  <span className="text-[11px] text-[#D97706] flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    <span>Còn tồn kho ({w.inventoryCount})</span>
                  </span>
                )}
                {(!w.inventoryCount || w.inventoryCount === 0) && <div></div>}

                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" onClick={() => handleOpenEdit(w)}>
                    Sửa thông tin
                  </Button>
                  <Button
                    size="sm"
                    variant={w.status === 'ACTIVE' ? 'danger' : 'outline'}
                    onClick={() => handleToggleHide(w)}
                  >
                    {w.status === 'ACTIVE' ? 'Ẩn điểm kí gửi' : 'Mở hoạt động'}
                  </Button>
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
        size="lg"
        title={editingWarehouse ? 'Chỉnh sửa thông tin điểm kí gửi' : 'Mở điểm kí gửi mới'}
      >
        <form onSubmit={handleSave} className="space-y-4 max-h-[80vh] overflow-y-auto px-1 py-1">
          {/* Tên kho */}
          <Input
            label="Tên điểm kí gửi"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ví dụ: Điểm kí gửi Tân Bình - Chi nhánh số 5"
          />

          {/* Địa chỉ 2 cấp GHN */}
          <div className="p-3.5 rounded-xl border border-[#E2E8E0] bg-[#FBFDFB] space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#191C19]">
                Địa chỉ chi tiết chuẩn hóa (2 cấp GHN) <span className="text-[#BA1A1A]">*</span>
              </label>
              <span className="text-[11px] text-[#717971]">Hệ thống hành chính sau 01/07/2025</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Dropdown Tỉnh/Thành */}
              <div>
                <label htmlFor="warehouse-province-select" className="text-[11px] font-medium text-[#414942] block mb-1">
                  Tỉnh / Thành phố
                </label>
                <select
                  id="warehouse-province-select"
                  aria-label="Tỉnh / Thành phố"
                  value={formData.provinceId}
                  onChange={handleProvinceChange}
                  disabled={loadingProvinces}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8E0] bg-white text-[#191C19] focus:outline-none focus:border-[#006B2C]"
                >
                  <option value="">-- Chọn Tỉnh / Thành phố --</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown Phường/Xã */}
              <div>
                <label htmlFor="warehouse-ward-select" className="text-[11px] font-medium text-[#414942] block mb-1">
                  Phường / Xã
                </label>
                <select
                  id="warehouse-ward-select"
                  aria-label="Phường / Xã"
                  value={formData.wardCode}
                  onChange={handleWardChange}
                  disabled={loadingWards || !formData.provinceId}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8E0] bg-white text-[#191C19] focus:outline-none focus:border-[#006B2C] disabled:bg-[#F5F5F5] disabled:text-[#9E9E9E]"
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
            </div>

            {/* Ô nhập số nhà / tên đường */}
            <div>
              <label htmlFor="warehouse-street-address-input" className="text-[11px] font-medium text-[#414942] block mb-1">
                Số nhà, tên đường cụ thể <span className="text-[#BA1A1A]">*</span>
              </label>
              <input
                id="warehouse-street-address-input"
                type="text"
                required
                value={formData.streetAddress}
                onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                placeholder="Số nhà, tên đường (ví dụ: 123 Nguyễn Thị Thập)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8E0] bg-white text-[#191C19] focus:outline-none focus:border-[#006B2C]"
              />
            </div>

            {/* Preview địa chỉ ghép hoàn chỉnh */}
            {(formData.streetAddress || formData.wardName || formData.provinceName) && (
              <div className="text-[11px] text-[#414942] bg-white p-2.5 rounded-lg border border-[#E2E8E0] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#006B2C]">pin_drop</span>
                <span className="font-medium text-[#191C19]">Địa chỉ đầy đủ:</span>
                <span>
                  {[formData.streetAddress.trim(), formData.wardName, formData.provinceName]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Giờ mở cửa trực quan */}
          <OpeningHoursPicker
            value={formData.openingHours}
            onChange={(val) => setFormData({ ...formData, openingHours: val })}
          />

          {/* Tọa độ bản đồ (Latitude, Longitude) & Geolocation */}
          <div className="p-3.5 rounded-xl border border-[#E2E8E0] bg-[#FBFDFB] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-[#191C19]">
                Tọa độ bản đồ (Latitude, Longitude) <span className="text-[#BA1A1A]">*</span>
              </label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={geoLoading}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006B2C] hover:text-[#005221] bg-[#E8F5E9] hover:bg-[#C8E6C9] px-2.5 py-1 rounded-lg transition-colors border border-[#C8E6C9] self-start sm:self-auto"
              >
                <span className={`material-symbols-outlined text-[16px] ${geoLoading ? 'animate-spin' : ''}`}>
                  {geoLoading ? 'progress_activity' : 'my_location'}
                </span>
                <span>{geoLoading ? 'Đang định vị...' : 'Lấy vị trí hiện tại'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-[#414942] block mb-1">
                  Vĩ độ (Latitude) [-90 đến 90]
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="10.7769"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#E2E8E0] bg-white text-[#191C19] focus:outline-none focus:border-[#006B2C]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#414942] block mb-1">
                  Kinh độ (Longitude) [-180 đến 180]
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="106.7009"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#E2E8E0] bg-white text-[#191C19] focus:outline-none focus:border-[#006B2C]"
                />
              </div>
            </div>

            {/* Nút chọn nhanh tọa độ */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-[#717971]">
              <span>Gợi ý nhanh:</span>
              <button
                type="button"
                onClick={() => setCityPreset(10.7769, 106.7009)}
                className="px-2 py-0.5 rounded bg-white border border-[#E2E8E0] hover:bg-[#F0F5EE] text-[#414942]"
              >
                TP.HCM (10.7769, 106.7009)
              </button>
              <button
                type="button"
                onClick={() => setCityPreset(21.0285, 105.8542)}
                className="px-2 py-0.5 rounded bg-white border border-[#E2E8E0] hover:bg-[#F0F5EE] text-[#414942]"
              >
                Hà Nội (21.0285, 105.8542)
              </button>
              <button
                type="button"
                onClick={() => setCityPreset(16.0544, 108.2022)}
                className="px-2 py-0.5 rounded bg-white border border-[#E2E8E0] hover:bg-[#F0F5EE] text-[#414942]"
              >
                Đà Nẵng (16.0544, 108.2022)
              </button>
            </div>

            {/* Bản đồ preview nhúng trực quan */}
            {hasValidCoords && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5 text-[11px] text-[#717971]">
                  <span>Xem trước vị trí trên bản đồ:</span>
                  <a
                    href={`https://www.google.com/maps?q=${parsedLat},${parsedLng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#006B2C] hover:underline flex items-center gap-0.5"
                  >
                    <span>Mở Google Maps</span>
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                  </a>
                </div>
                <iframe
                  title="Bản đồ vị trí kho"
                  width="100%"
                  height="160"
                  className="rounded-xl border border-[#E2E8E0] bg-white shadow-2xs"
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${parsedLng - 0.005}%2C${parsedLat - 0.005}%2C${parsedLng + 0.005}%2C${parsedLat + 0.005}&layer=mapnik&marker=${parsedLat}%2C${parsedLng}`}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#E2E8E0]">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" className="bg-[#006B2C] text-white">
              {editingWarehouse ? 'Lưu cập nhật' : 'Tạo điểm kí gửi mới'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Cảnh Báo: Chặn ẩn kho khi còn tồn kho (Nghiệp vụ F-155 / L-11) */}
      {stockBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E2E8E0] shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#FFF3E0] text-[#D97706] flex items-center justify-center shrink-0 border border-[#FFE0B2]">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-[#191C19] font-heading">
                  Chưa thể ẩn điểm kí gửi này!
                </h3>
                <p className="text-xs text-[#717971] mt-1 leading-relaxed">
                  Theo quy định vận hành của ReHome, chỉ được phép ẩn điểm kí gửi khi{' '}
                  <strong className="text-[#191C19]">hết toàn bộ hàng kí gửi</strong> lưu kho.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-[#F8FAF8] rounded-xl border border-[#E2E8E0] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#717971]">Điểm kí gửi:</span>
                <span className="font-bold text-[#191C19]">{stockBlockModal.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717971]">Số sản phẩm còn tồn:</span>
                <span className="font-black text-[#BA1A1A]">
                  {stockBlockModal.inventoryCount} món
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717971]">Đơn hàng đang xử lý:</span>
                <span className="font-bold text-[#D97706]">
                  {stockBlockModal.activeOrders} đơn
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#717971] italic">
              Vui lòng điều chuyển sản phẩm sang điểm kí gửi khác hoặc hoàn tất thanh lý toàn bộ hàng hóa
              trước khi tiến hành đóng hoặc ẩn kho.
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
