import React from 'react';
import Table from '../../../components/common/Table.jsx';
import Badge from '../../../components/common/Badge.jsx';
import { formatCurrencyVND, formatDateTime } from '../../../utils/formatters.js';

export default function BalanceHistoryTable({ transactions = [] }) {
  const columns = [
    { header: 'Mã GD', accessor: 'id', cellClassName: 'font-semibold text-xs' },
    {
      header: 'Thời gian',
      accessor: 'createdAt',
      render: (r) => formatDateTime(r.createdAt),
    },
    { header: 'Nội dung biến động', accessor: 'description' },
    {
      header: 'Số tiền',
      accessor: 'amount',
      render: (r) => {
        const isPositive = r.amount > 0;
        return (
          <span className={`font-bold ${isPositive ? 'text-primary' : 'text-error'}`}>
            {isPositive ? `+${formatCurrencyVND(r.amount)}` : formatCurrencyVND(r.amount)}
          </span>
        );
      },
    },
    {
      header: 'Số dư sau GD',
      accessor: 'postBalance',
      render: (r) => formatCurrencyVND(r.postBalance),
    },
    {
      header: 'Trạng thái',
      accessor: 'status',
      render: (r) => (
        <Badge variant={r.status === 'SUCCESS' ? 'success' : 'warning'}>
          {r.status === 'SUCCESS' ? 'Thành công' : 'Chờ xử lý'}
        </Badge>
      ),
    },
  ];

  return <Table columns={columns} data={transactions} />;
}
