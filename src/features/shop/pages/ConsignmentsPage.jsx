import React, { useState } from 'react';
import ShopLayout from '../../../layouts/ShopLayout.jsx';
import { Table, Badge, Button, Input } from '../../../components/common/index.js';
import { formatCurrencyVND, formatDate } from '../../../utils/formatters.js';

export default function ConsignmentsPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');

  // Sample data simulating consignment lifecycle: Chờ xác nhận, Chờ đăng, Đang bán, Chờ tất toán, Chờ trả đồ
  const mockData = [
    { id: 1, code: 'REC-108291', title: 'Áo blazer dạ tweed Zara', price: 450000, status: 'WAITING_APPROVAL', date: '2026-10-01', daysLeft: 60 },
    { id: 2, code: 'REC-108292', title: 'Quần jean ống rộng Levi\'s', price: 380000, status: 'READY_TO_POST', date: '2026-10-02', daysLeft: 58 },
    { id: 3, code: 'REC-108293', title: 'Váy hoa nhí dáng midi Mango', price: 290000, status: 'ON_SALE', date: '2026-10-03', daysLeft: 55 },
    { id: 4, code: 'REC-108294', title: 'Áo len dệt kim Uniqlo', price: 320000, status: 'SETTLEMENT_PENDING', date: '2026-09-28', daysLeft: 0 },
    { id: 5, code: 'REC-108295', title: 'Áo phông oversize MLB', price: 220000, status: 'RETURN_PENDING', date: '2026-09-20', daysLeft: 2 },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'WAITING_APPROVAL': return <Badge variant="warning">Chờ xác nhận</Badge>;
      case 'READY_TO_POST': return <Badge variant="info">Chờ đăng bán</Badge>;
      case 'ON_SALE': return <Badge variant="success">Đang bán</Badge>;
      case 'SETTLEMENT_PENDING': return <Badge variant="danger">Chờ tất toán</Badge>;
      case 'RETURN_PENDING': return <Badge variant="default">Chờ trả đồ</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const filteredData = mockData.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.code.toLowerCase().includes(search.toLowerCase());
    if (activeTab === 'ALL') return matchesSearch;
    return matchesSearch && item.status === activeTab;
  });

  const columns = [
    { header: 'Mã biên nhận', accessor: 'code', cellClassName: 'font-semibold' },
    { header: 'Tên món đồ', accessor: 'title' },
    {
      header: 'Giá niêm yết',
      accessor: 'price',
      render: (row) => formatCurrencyVND(row.price),
    },
    {
      header: 'Trạng thái',
      accessor: 'status',
      render: (row) => getStatusBadge(row.status),
    },
    {
      header: 'Hạn lưu kho',
      accessor: 'daysLeft',
      render: (row) => `${row.daysLeft} ngày`,
    },
    {
      header: 'Ngày lập',
      accessor: 'date',
      render: (row) => formatDate(row.date),
    },
    {
      header: 'Thao tác',
      accessor: 'actions',
      render: () => (
        <div className="flex space-x-2">
          <Button size="sm" variant="outline">Chi tiết</Button>
        </div>
      ),
    },
  ];

  return (
    <ShopLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-on-surface">Quản Lý Món Ký Gửi Tại Cửa Hàng</h1>
          <p className="text-sm text-outline">Theo dõi vòng đời sản phẩm: từ tiếp nhận, đăng bán đến hạn tất toán hoặc hoàn trả</p>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-outline-variant pb-2">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'WAITING_APPROVAL', label: 'Chờ xác nhận' },
            { id: 'READY_TO_POST', label: 'Chờ đăng' },
            { id: 'ON_SALE', label: 'Đang bán' },
            { id: 'SETTLEMENT_PENDING', label: 'Chờ tất toán' },
            { id: 'RETURN_PENDING', label: 'Chờ trả đồ' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-w-md">
          <Input
            placeholder="Tìm kiếm theo mã biên nhận hoặc tên đồ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Table columns={columns} data={filteredData} />
      </div>
    </ShopLayout>
  );
}
