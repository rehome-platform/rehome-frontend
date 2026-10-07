import React, { useState } from 'react';
import AdminLayout from '../../../layouts/AdminLayout.jsx';
import { Table, Badge, Button, Modal, Input } from '../../../components/common/index.js';

export default function AccountLockPage() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [lockReason, setLockReason] = useState('');
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);

  const [users, setUsers] = useState([
    { id: 1, name: 'Shop Đồ Cũ Vintage A', role: 'shop', email: 'shopa@gmail.com', status: 'ACTIVE', strikes: 0 },
    { id: 2, name: 'Shop Thời Trang Si VIP', role: 'shop', email: 'sivip@gmail.com', status: 'LOCKED', strikes: 3, lockReason: 'Ví âm quá 72h không nạp bù' },
    { id: 3, name: 'Quỹ Từ Thiện Ánh Sáng', role: 'organization', email: 'anhsang@charity.org', status: 'ACTIVE', strikes: 0 },
    { id: 4, name: 'Kiểm duyệt viên 02', role: 'staff', email: 'mod02@rehome.vn', status: 'ACTIVE', strikes: 0 },
  ]);

  const handleToggleLock = (user) => {
    if (user.status === 'LOCKED') {
      setUsers(users.map((u) => (u.id === user.id ? { ...u, status: 'ACTIVE', lockReason: null } : u)));
      alert(`Đã mở khóa tài khoản ${user.name}`);
    } else {
      setSelectedUser(user);
      setIsLockModalOpen(true);
    }
  };

  const handleConfirmLock = () => {
    if (!lockReason) return;
    setUsers(users.map((u) => (u.id === selectedUser.id ? { ...u, status: 'LOCKED', lockReason } : u)));
    setIsLockModalOpen(false);
    setLockReason('');
    setSelectedUser(null);
  };

  const columns = [
    { header: 'Họ tên / Đơn vị', accessor: 'name', cellClassName: 'font-semibold' },
    { header: 'Email liên hệ', accessor: 'email' },
    { header: 'Vai trò', accessor: 'role', cellClassName: 'uppercase text-xs font-bold' },
    {
      header: 'Trạng thái',
      accessor: 'status',
      render: (r) => (
        <Badge variant={r.status === 'ACTIVE' ? 'success' : 'danger'}>
          {r.status === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa'}
        </Badge>
      ),
    },
    { header: 'Số lần vi phạm', accessor: 'strikes' },
    {
      header: 'Hành động',
      accessor: 'actions',
      render: (r) => (
        <Button
          size="sm"
          variant={r.status === 'ACTIVE' ? 'danger' : 'outline'}
          onClick={() => handleToggleLock(r)}
        >
          {r.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa'}
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-on-surface">Quản Trị Tài Khoản & Phân Quyền</h1>
          <p className="text-sm text-outline">Khóa hoặc mở khóa tài khoản Cửa hàng, Tổ chức và Moderator theo thẩm quyền Quản trị viên</p>
        </div>

        <Table columns={columns} data={users} />

        <Modal
          isOpen={isLockModalOpen}
          onClose={() => setIsLockModalOpen(false)}
          title={`Khóa Quyền Hoạt Động: ${selectedUser?.name}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-on-surface">
              Vui lòng nhập lý do khóa tài khoản này theo biên bản đề xuất của Moderator:
            </p>
            <Input
              required
              placeholder="Ví dụ: Vi phạm quy định hoàn tất biên nhận PayOS..."
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="ghost" onClick={() => setIsLockModalOpen(false)}>Hủy</Button>
              <Button variant="danger" onClick={handleConfirmLock}>Xác nhận Khóa</Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
