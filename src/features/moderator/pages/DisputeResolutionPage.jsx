import React, { useState } from 'react';
import AdminLayout from '../../../layouts/AdminLayout.jsx';
import { Table, Badge, Button, Modal } from '../../../components/common/index.js';
import { formatCurrencyVND } from '../../../utils/formatters.js';

export default function DisputeResolutionPage() {
  const [activeTab, setActiveTab] = useState('LEVEL_1'); // LEVEL_1 (Buyer vs Shop) | LEVEL_2 (Consigner vs Shop Compensation)
  const [selectedDispute, setSelectedDispute] = useState(null);

  const disputesL1 = [
    { id: 'DSP-01', orderCode: 'ORD-9912', buyer: 'Lê Thu Trang', shop: 'Tiệm Vintage Vui Vẻ', reason: 'Áo có vết rách không đúng mô tả', amount: 350000, status: 'OPEN' },
    { id: 'DSP-02', orderCode: 'ORD-9884', buyer: 'Phạm Hoàng', shop: 'Mây Boutique', reason: 'Giao nhầm size L thành size S', amount: 220000, status: 'RESOLVED' },
  ];

  const disputesL2 = [
    { id: 'CMP-01', receiptCode: 'REC-108291', consigner: 'Trần Văn Cường', shop: 'Tiệm Cũ Mới', reason: 'Mất đồ ký gửi trong thời hạn lưu kho', amount: 450000, compensation: 360000, status: 'OPEN' },
    { id: 'CMP-02', receiptCode: 'REC-108110', consigner: 'Nguyễn Bích Ngọc', shop: 'Second Chance', reason: 'Đồ bị ố màu nặng do bảo quản ẩm mốc', amount: 500000, compensation: 400000, status: 'OPEN' },
  ];

  const columnsL1 = [
    { header: 'Mã khiếu nại', accessor: 'id', cellClassName: 'font-semibold' },
    { header: 'Mã đơn hàng', accessor: 'orderCode' },
    { header: 'Người mua', accessor: 'buyer' },
    { header: 'Cửa hàng liên quan', accessor: 'shop' },
    { header: 'Lý do tranh chấp', accessor: 'reason' },
    { header: 'Giá trị', accessor: 'amount', render: (r) => formatCurrencyVND(r.amount) },
    {
      header: 'Trạng thái',
      accessor: 'status',
      render: (r) => r.status === 'OPEN' ? <Badge variant="warning">Đang xử lý</Badge> : <Badge variant="success">Đã phân xử</Badge>,
    },
    {
      header: 'Hành động',
      accessor: 'action',
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedDispute({ ...r, level: 1 })}>
          Phân xử
        </Button>
      ),
    },
  ];

  const columnsL2 = [
    { header: 'Mã hồ sơ', accessor: 'id', cellClassName: 'font-semibold' },
    { header: 'Mã biên nhận', accessor: 'receiptCode' },
    { header: 'Người ký gửi', accessor: 'consigner' },
    { header: 'Cửa hàng ký gửi', accessor: 'shop' },
    { header: 'Lý do đền bù', accessor: 'reason' },
    { header: 'Mức đền bù đề xuất', accessor: 'compensation', render: (r) => formatCurrencyVND(r.compensation) },
    {
      header: 'Trạng thái',
      accessor: 'status',
      render: (r) => r.status === 'OPEN' ? <Badge variant="danger">Cần can thiệp</Badge> : <Badge variant="success">Đã bồi hoàn</Badge>,
    },
    {
      header: 'Hành động',
      accessor: 'action',
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedDispute({ ...r, level: 2 })}>
          Xem xét bồi hoàn
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-on-surface">Phân Xử Khiếu Nại & Tranh Chấp 2 Tầng</h1>
          <p className="text-sm text-outline">
            Cơ chế bảo vệ người tiêu dùng và thành viên ký gửi quần áo theo quy chuẩn ReHome
          </p>
        </div>

        {/* Tab switch between 2 levels */}
        <div className="flex space-x-3 border-b border-outline-variant pb-2">
          <button
            onClick={() => setActiveTab('LEVEL_1')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === 'LEVEL_1' ? 'bg-primary text-white' : 'text-on-surface hover:bg-surface-container'
            }`}
          >
            Tầng 1: Tranh chấp Đơn hàng (Người mua & Shop)
          </button>
          <button
            onClick={() => setActiveTab('LEVEL_2')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === 'LEVEL_2' ? 'bg-primary text-white' : 'text-on-surface hover:bg-surface-container'
            }`}
          >
            Tầng 2: Khiếu nại Đền bù (Mất/Hỏng đồ ký gửi)
          </button>
        </div>

        {activeTab === 'LEVEL_1' ? (
          <Table columns={columnsL1} data={disputesL1} />
        ) : (
          <Table columns={columnsL2} data={disputesL2} />
        )}

        <Modal
          isOpen={!!selectedDispute}
          onClose={() => setSelectedDispute(null)}
          title={`Phân Xử Khiếu Nại: #${selectedDispute?.id}`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-surface-container rounded-xl text-xs space-y-1">
              <p>Đối tượng: <strong>{selectedDispute?.buyer || selectedDispute?.consigner}</strong></p>
              <p>Cửa hàng: <strong>{selectedDispute?.shop}</strong></p>
              <p>Nội dung: {selectedDispute?.reason}</p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="ghost" onClick={() => setSelectedDispute(null)}>Đóng</Button>
              <Button
                onClick={() => {
                  alert('Quyết định phân xử đã được ban hành và cập nhật số dư ví.');
                  setSelectedDispute(null);
                }}
              >
                Chấp thuận bồi hoàn
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
