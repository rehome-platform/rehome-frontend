import React, { useState } from 'react';
import { Button, Badge, Modal, Input } from '../../../components/common/index.js';

/**
 * View Quản lý Chi Nhánh Kho ReHome (Admin)
 * Chuẩn hóa theo F-152..F-155 và UC-82..UC-85:
 * - Xem danh sách kho kèm nhân sự Moderator và số lượng hàng tồn
 * - Tạo chi nhánh kho mới (địa chỉ, tọa độ, giờ mở cửa)
 * - Sửa thông tin kho
 * - Ẩn kho không còn hoạt động (chặn ẩn nếu kho vẫn còn hàng tồn - UC-85 Unhappy path)
 */
export default function AdminWarehousesView({ onLogAction }) {
  const [warehouses, setWarehouses] = useState([
    {
      id: 'WH-01',
      name: 'Kho Quận 7 (Tổng kho phía Nam)',
      address: 'Số 12 Nguyễn Thị Thập, P. Tân Phú, Q. 7, TP.HCM',
      coordinates: '10.7329, 106.7214',
      openingHours: '08:00 - 18:00 (Thứ 2 - Chủ Nhật)',
      moderatorCount: 4,
      inventoryCount: 420,
      activeOrders: 14,
      status: 'ACTIVE',
    },
    {
      id: 'WH-02',
      name: 'Kho Bình Thạnh (Chi nhánh Trung tâm)',
      address: 'Số 88 Điện Biên Phủ, P. 15, Q. Bình Thạnh, TP.HCM',
      coordinates: '10.8012, 106.7089',
      openingHours: '08:30 - 17:30 (Thứ 2 - Thứ 7)',
      moderatorCount: 2,
      inventoryCount: 185,
      activeOrders: 6,
      status: 'ACTIVE',
    },
    {
      id: 'WH-03',
      name: 'Kho Cầu Giấy (Chi nhánh miền Bắc)',
      address: 'Số 21 Duy Tân, P. Dịch Vọng Hậu, Q. Cầu Giấy, Hà Nội',
      coordinates: '21.0315, 105.7834',
      openingHours: '08:00 - 18:00 (Thứ 2 - Thứ 7)',
      moderatorCount: 3,
      inventoryCount: 260,
      activeOrders: 9,
      status: 'ACTIVE',
    },
    {
      id: 'WH-04',
      name: 'Kho Thủ Đức (Chi nhánh phụ trợ)',
      address: 'Số 45 Võ Văn Ngân, TP. Thủ Đức, TP.HCM',
      coordinates: '10.8512, 106.7621',
      openingHours: '08:00 - 17:00 (Đã ngừng hoạt động)',
      moderatorCount: 0,
      inventoryCount: 0,
      activeOrders: 0,
      status: 'HIDDEN',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    coordinates: '',
    openingHours: '08:00 - 18:00',
  });

  const filteredWarehouses = warehouses.filter((w) =>
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

  const handleSave = (e) => {
    e.preventDefault();
    if (editingWarehouse) {
      setWarehouses(warehouses.map((w) =>
        w.id === editingWarehouse.id
          ? { ...w, ...formData }
          : w
      ));
      if (onLogAction) {
        onLogAction({
          time: new Date().toLocaleString('vi-VN'),
          user: 'Admin',
          role: 'Admin',
          roleColor: 'bg-[#E8F5E9] text-[#006B2C]',
          action: `Cập nhật thông tin chi nhánh "${formData.name}"`,
        });
      }
    } else {
      const newWh = {
        id: `WH-0${warehouses.length + 1}`,
        ...formData,
        moderatorCount: 0,
        inventoryCount: 0,
        activeOrders: 0,
        status: 'ACTIVE',
      };
      setWarehouses([newWh, ...warehouses]);
      if (onLogAction) {
        onLogAction({
          time: new Date().toLocaleString('vi-VN'),
          user: 'Admin',
          role: 'Admin',
          roleColor: 'bg-[#E8F5E9] text-[#006B2C]',
          action: `Tạo mới chi nhánh kho "${formData.name}"`,
        });
      }
    }
    setIsModalOpen(false);
  };

  const handleToggleHide = (w) => {
    // Unhappy path: Ẩn kho đang còn tồn -> Chặn, yêu cầu xử lý tồn trước (Mục 6 L-11, F-155)
    if (w.status === 'ACTIVE' && w.inventoryCount > 0) {
      alert(`⚠️ Không thể ẩn kho "${w.name}" vì hiện đang còn ${w.inventoryCount} sản phẩm tồn trong kho! Vui lòng điều chuyển hoặc xử lý hết tồn kho trước khi đóng.`);
      return;
    }

    const nextStatus = w.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';
    setWarehouses(warehouses.map((item) =>
      item.id === w.id ? { ...item, status: nextStatus } : item
    ));

    if (onLogAction) {
      onLogAction({
        time: new Date().toLocaleString('vi-VN'),
        user: 'Admin',
        role: 'Admin',
        roleColor: 'bg-[#E8F5E9] text-[#006B2C]',
        action: `${nextStatus === 'HIDDEN' ? 'Ẩn' : 'Mở lại'} chi nhánh kho "${w.name}"`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717971] text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm kho theo tên, địa chỉ chi nhánh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#DDE5D9] bg-white text-xs text-[#191C19] focus:outline-none focus:border-[#006B2C]"
          />
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-[#006B2C] hover:bg-[#005221] text-white text-xs shrink-0"
        >
          <span className="material-symbols-outlined text-[18px] mr-1.5">add_location_alt</span>
          Thêm chi nhánh kho mới
        </Button>
      </div>

      {/* Warehouse Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredWarehouses.map((w) => (
          <div
            key={w.id}
            className={`p-6 rounded-2xl border bg-white shadow-sm flex flex-col justify-between transition-all ${
              w.status === 'HIDDEN' ? 'border-[#E2E8E0] bg-[#FAFAF9] opacity-80' : 'border-[#DDE5D9] hover:border-[#006B2C]/50'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#F0F5EE] text-[#006B2C] border border-[#DDE5D9]">
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
                  <span className="material-symbols-outlined text-sm text-[#717971] shrink-0 mt-0.5">location_on</span>
                  <span>{w.address}</span>
                </p>
                <p className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-sm text-[#717971] shrink-0">schedule</span>
                  <span>{w.openingHours}</span>
                </p>
                <p className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-sm text-[#717971] shrink-0">pin_drop</span>
                  <span className="font-mono text-[11px] text-[#717971]">{w.coordinates}</span>
                </p>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#F0F4EE] text-center">
                <div className="p-2 rounded-xl bg-[#F8FAF8]">
                  <p className="text-[10px] text-[#717971]">Nhân sự Mod</p>
                  <p className="text-sm font-bold text-[#191C19] mt-0.5">{w.moderatorCount} người</p>
                </div>
                <div className="p-2 rounded-xl bg-[#F8FAF8]">
                  <p className="text-[10px] text-[#717971]">Sản phẩm tồn</p>
                  <p className="text-sm font-bold text-[#006B2C] mt-0.5">{w.inventoryCount} món</p>
                </div>
                <div className="p-2 rounded-xl bg-[#F8FAF8]">
                  <p className="text-[10px] text-[#717971]">Đơn đang xử lý</p>
                  <p className="text-sm font-bold text-[#D97706] mt-0.5">{w.activeOrders} đơn</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 mt-5 pt-3 border-t border-[#F0F4EE]">
              <Button size="sm" variant="outline" onClick={() => handleOpenEdit(w)}>
                Sửa thông tin
              </Button>
              <Button
                size="sm"
                variant={w.status === 'ACTIVE' ? 'danger' : 'outline'}
                onClick={() => handleToggleHide(w)}
              >
                {w.status === 'ACTIVE' ? 'Ẩn chi nhánh' : 'Mở hoạt động'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Thêm / Sửa kho */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingWarehouse ? 'Chỉnh sửa thông tin chi nhánh kho' : 'Mở chi nhánh kho mới'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Tên chi nhánh kho"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ví dụ: Kho Tân Bình - Chi nhánh số 5"
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
            helperText="Dùng để hiển thị gợi ý kho gần nhất cho Member trên Mobile"
          />
          <Input
            label="Giờ mở cửa phục vụ tại quầy"
            required
            value={formData.openingHours}
            onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
            placeholder="08:00 - 18:00 (Thứ 2 - Thứ 7)"
          />
          <div className="flex justify-end space-x-2 pt-3 border-t border-[#DDE5D9]">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" className="bg-[#006B2C] text-white">
              {editingWarehouse ? 'Lưu cập nhật' : 'Tạo kho mới'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
