import React, { useState, useEffect } from 'react';
import { Button, Badge, Modal, Input } from '../../../components/common/index.js';
import adminApi from '../services/adminApi.js';

/**
 * View Quản lý Điểm Kí Gửi ReHome (Admin)
 * Chế độ Strict Real Data: 100% dữ liệu thực từ Backend API GET /api/admin/warehouses
 * Thực thi nghiêm ngặt: Hết hàng kí gửi (inventoryCount === 0) mới được ẩn kho (F-155)
 */
export default function AdminWarehousesView({ onLogAction }) {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [stockBlockModal, setStockBlockModal] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    coordinates: '',
    openingHours: '08:00 - 18:00',
  });

  // Tải danh sách điểm kí gửi từ Backend API
  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      setApiError(null);
      const res = await adminApi.getWarehouses();
      if (res && Array.isArray(res)) {
        const mapped = res.map((w, idx) => ({
          id: w.warehouseId || w.id || `WH-0${idx + 1}`,
          name: w.name,
          address: w.address,
          coordinates: w.coordinates || 'Chưa cập nhật',
          openingHours: w.openingHours || '08:00 - 18:00 (Thứ 2 - Thứ 7)',
          moderatorCount: w.moderatorCount ?? 0,
          inventoryCount: w.inventoryCount ?? 0,
          activeOrders: w.activeOrders ?? 0,
          status: w.status || 'ACTIVE',
        }));
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

  const handleOpenCreate = () => {
    setEditingWarehouse(null);
    setFormData({
      name: '',
      address: '',
      coordinates: '',
      openingHours: '08:00 - 18:00',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (w) => {
    setEditingWarehouse(w);
    setFormData({
      name: w.name,
      address: w.address,
      coordinates: w.coordinates,
      openingHours: w.openingHours,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim()) return;

    if (editingWarehouse) {
      try {
        await adminApi.updateWarehouse(editingWarehouse.id, formData);
        await fetchWarehouses();
        if (onLogAction) {
          onLogAction({
            time: new Date().toLocaleString('vi-VN'),
            user: 'Admin',
            role: 'Admin',
            action: `Cập nhật thông tin điểm kí gửi "${formData.name}"`,
          });
        }
      } catch (err) {
        console.error('Lỗi API cập nhật kho:', err);
        alert('Cập nhật điểm kí gửi thất bại.');
      }
    } else {
      try {
        await adminApi.createWarehouse(formData);
        await fetchWarehouses();
        if (onLogAction) {
          onLogAction({
            time: new Date().toLocaleString('vi-VN'),
            user: 'Admin',
            role: 'Admin',
            action: `Tạo mới điểm kí gửi "${formData.name}"`,
          });
        }
      } catch (err) {
        console.error('Lỗi API tạo kho:', err);
        alert('Tạo điểm kí gửi mới thất bại.');
      }
    }
    setIsModalOpen(false);
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
          alert(`⚠️ Không thể ẩn điểm kí gửi "${w.name}" vì kho vẫn còn sản phẩm tồn chưa xử lý (Mã lỗi: WAREHOUSE_HAS_STOCK)!`);
          return;
        }
        alert('Không thể thực hiện thao tác ẩn điểm kí gửi.');
      }
    } else {
      // Mở lại kho nếu đang bị ẩn
      try {
        await adminApi.updateWarehouse(w.id, { ...w, status: 'ACTIVE' });
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
        title={editingWarehouse ? 'Chỉnh sửa thông tin điểm kí gửi' : 'Mở điểm kí gửi mới'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Tên điểm kí gửi"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ví dụ: Điểm kí gửi Tân Bình - Chi nhánh số 5"
          />
          <Input
            label="Địa chỉ chi tiết"
            required
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
          />
          <Input
            label="Tọa độ bản đồ (Latitude, Longitude)"
            required
            value={formData.coordinates}
            onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
            placeholder="Ví dụ: 10.7769, 106.7009"
          />
          <Input
            label="Giờ mở cửa phục vụ tại quầy"
            required
            value={formData.openingHours}
            onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
            placeholder="08:00 - 18:00 (Thứ 2 - Thứ 7)"
          />
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
