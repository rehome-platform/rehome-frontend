import React, { useState } from 'react';
import Header from '../../../components/header.jsx';
import Footer from '../../../components/footer.jsx';
import { Table, Badge, Button, Input, Modal } from '../../../components/common/index.js';

export default function CampaignManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [targetQuantity, setTargetQuantity] = useState('500');
  const [location, setLocation] = useState('');

  const [campaigns, setCampaigns] = useState([
    { id: 1, title: 'Áo Ấm Mùa Đông Vùng Cao 2026', target: 1000, collected: 642, status: 'ACTIVE', location: 'Hà Giang & Yên Bái' },
    { id: 2, title: 'Tủ Quần Áo 0 Đồng Cho Trẻ Em Nghèo', target: 500, collected: 500, status: 'COMPLETED', location: 'Quảng Trị' },
    { id: 3, title: 'Tái Sinh Quần Áo Cũ Tiếp Bước Đến Trường', target: 800, collected: 320, status: 'ACTIVE', location: 'Đắk Lắk' },
  ]);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!title) return;
    const newCamp = {
      id: Date.now(),
      title,
      target: Number(targetQuantity),
      collected: 0,
      status: 'ACTIVE',
      location: location || 'Toàn quốc',
    };
    setCampaigns([newCamp, ...campaigns]);
    setIsModalOpen(false);
    setTitle('');
  };

  const columns = [
    { header: 'Chiến dịch', accessor: 'title', cellClassName: 'font-semibold' },
    { header: 'Địa bàn trao tặng', accessor: 'location' },
    {
      header: 'Tiến độ tiếp nhận',
      accessor: 'collected',
      render: (row) => (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>{row.collected} / {row.target} món</span>
            <span className="font-bold">{Math.round((row.collected / row.target) * 100)}%</span>
          </div>
          <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full"
              style={{ width: `${Math.min(100, Math.round((row.collected / row.target) * 100))}%` }}
            ></div>
          </div>
        </div>
      ),
    },
    {
      header: 'Trạng thái',
      accessor: 'status',
      render: (row) =>
        row.status === 'ACTIVE' ? (
          <Badge variant="success">Đang tiếp nhận</Badge>
        ) : (
          <Badge variant="info">Đã hoàn thành</Badge>
        ),
    },
    {
      header: 'Hành động',
      accessor: 'actions',
      render: () => (
        <Button size="sm" variant="outline">
          Cập nhật tiến độ
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading text-on-surface">Quản Lý Chiến Dịch Từ Thiện</h1>
            <p className="text-sm text-outline">Kêu gọi cộng đồng quyên góp quần áo và phân phối minh bạch</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            + Tạo chiến dịch mới
          </Button>
        </div>

        <Table columns={columns} data={campaigns} />

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Khởi Tạo Chiến Dịch Quyên Góp Mới">
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Tên chiến dịch"
              required
              placeholder="Ví dụ: Áo ấm mùa đông cho trẻ em Sơn La..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              label="Số lượng món đồ mục tiêu"
              required
              type="number"
              value={targetQuantity}
              onChange={(e) => setTargetQuantity(e.target.value)}
            />
            <Input
              label="Địa bàn trao tặng"
              required
              placeholder="Tỉnh/Thành phố tiếp nhận..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit">Phát động chiến dịch</Button>
            </div>
          </form>
        </Modal>
      </main>
      <Footer />
    </div>
  );
}
