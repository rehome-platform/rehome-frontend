import React from 'react';
import AdminLayout from '../../../layouts/AdminLayout.jsx';
import { Table, Badge, Button } from '../../../components/common/index.js';

export default function ReportsPage() {
  const reports = [
    { id: 101, reportedUser: 'Shop Thời Trang ABC', reporter: 'Người mua ẩn danh', reason: 'Nâng giá ảo vượt trần 2 triệu', date: '2026-10-05', status: 'PENDING' },
    { id: 102, reportedUser: 'Thành viên 0981xxx', reporter: 'Tiệm SecondHand 99', reason: 'Gửi đồ ẩm mốc không đúng khai báo', date: '2026-10-06', status: 'INVESTIGATING' },
  ];

  const columns = [
    { header: 'Mã báo cáo', accessor: 'id', cellClassName: 'font-semibold' },
    { header: 'Đối tượng bị tố cáo', accessor: 'reportedUser' },
    { header: 'Người gửi tố cáo', accessor: 'reporter' },
    { header: 'Lý do vi phạm', accessor: 'reason' },
    { header: 'Ngày gửi', accessor: 'date' },
    {
      header: 'Trạng thái',
      accessor: 'status',
      render: (r) => (
        <Badge variant={r.status === 'PENDING' ? 'warning' : 'info'}>
          {r.status === 'PENDING' ? 'Chờ kiểm tra' : 'Đang xác minh'}
        </Badge>
      ),
    },
    {
      header: 'Thao tác',
      accessor: 'actions',
      render: () => <Button size="sm" variant="outline">Xử lý</Button>,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-on-surface">Báo Cáo & Xử Lý Vi Phạm</h1>
          <p className="text-sm text-outline">Giám sát các hành vi vi phạm chính sách niêm yết và quy chuẩn ký gửi ReHome</p>
        </div>
        <Table columns={columns} data={reports} />
      </div>
    </AdminLayout>
  );
}
