import React, { useState } from 'react';
import AdminLayout from '../../../layouts/AdminLayout.jsx';
import { Table, Badge, Button, Modal, Input } from '../../../components/common/index.js';

export default function LegalVerificationPage() {
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const [queue, setQueue] = useState([
    { id: 1, name: 'Quỹ Từ Thiện Sen Xanh', type: 'Tổ chức từ thiện', taxId: '0108928172', address: 'Hoàn Kiếm, Hà Nội', docUrl: 'https://example.com/senxanh.pdf', status: 'PENDING' },
    { id: 2, name: 'Tiệm Ký Gửi Vintage Vui Vẻ', type: 'Cửa hàng ký gửi', taxId: '0319208391', address: 'Quận 3, TP.HCM', docUrl: 'https://example.com/vintage.pdf', status: 'PENDING' },
    { id: 3, name: 'Dự Án Áo Cũ Cho Em', type: 'Tổ chức từ thiện', taxId: '4201928371', address: 'Đà Nẵng', docUrl: 'https://example.com/aocu.pdf', status: 'PENDING' },
  ]);

  const handleApprove = (id) => {
    setQueue(queue.map((item) => (item.id === id ? { ...item, status: 'APPROVED' } : item)));
    alert('Đã phê duyệt thông tin pháp lý thành công!');
  };

  const handleConfirmReject = () => {
    if (!rejectionReason) return;
    setQueue(queue.map((item) => (item.id === selectedEntity.id ? { ...item, status: 'REJECTED' } : item)));
    setIsRejectModalOpen(false);
    setRejectionReason('');
    setSelectedEntity(null);
  };

  const columns = [
    { header: 'Tên đối tác', accessor: 'name', cellClassName: 'font-semibold' },
    { header: 'Loại hình', accessor: 'type' },
    { header: 'Mã số thuế / ĐKKD', accessor: 'taxId' },
    { header: 'Địa bàn trụ sở', accessor: 'address' },
    {
      header: 'Trạng thái',
      accessor: 'status',
      render: (row) =>
        row.status === 'PENDING' ? (
          <Badge variant="warning">Chờ đối chiếu</Badge>
        ) : row.status === 'APPROVED' ? (
          <Badge variant="success">Đã xác thực</Badge>
        ) : (
          <Badge variant="danger">Từ chối</Badge>
        ),
    },
    {
      header: 'Hành động đối chiếu',
      accessor: 'actions',
      render: (row) => (
        row.status === 'PENDING' ? (
          <div className="flex space-x-2">
            <Button size="sm" onClick={() => handleApprove(row.id)}>
              Duyệt
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setSelectedEntity(row);
                setIsRejectModalOpen(true);
              }}
            >
              Từ chối
            </Button>
          </div>
        ) : (
          <span className="text-xs text-outline">Đã xử lý</span>
        )
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-on-surface">Đối Chiếu Pháp Lý Cửa Hàng & Tổ Chức</h1>
          <p className="text-sm text-outline">
            Kiểm duyệt viên kiểm tra MST và giấy phép từ nguồn công khai (Cổng thông tin quốc gia về đăng ký doanh nghiệp)
          </p>
        </div>

        <Table columns={columns} data={queue} />

        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title="Từ Chối Hồ Sơ Pháp Lý"
        >
          <div className="space-y-4">
            <p className="text-sm text-on-surface">
              Nêu rõ lý do từ chối hồ sơ của <strong>{selectedEntity?.name}</strong>:
            </p>
            <Input
              placeholder="Ví dụ: Mã số thuế không trùng khớp với tên tổ chức, giấy phép mờ..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>Hủy</Button>
              <Button variant="danger" onClick={handleConfirmReject}>Xác nhận từ chối</Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
