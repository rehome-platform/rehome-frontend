import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import { consignmentService } from './api.js';
import { useResource } from './hooks.jsx';
import { canStockIn } from './model.js';
import { Card, ResourceState, DocumentLink, money, date } from './ui.jsx';
import StockInForm from './StockInForm.jsx';

export default function ReceiptPanel({ receiptId, allowStockIn = false, onStocked }) {
  const receipt = useResource(
    (options) => consignmentService.receipt(receiptId, options),
    [receiptId],
    { poll: true, done: (value) => !!value?.confirmedAt },
  );
  const data = receipt.data,
    snapshot = data?.snapshot;
  return (
    <Card title="Biên nhận ký gửi">
      <ResourceState resource={receipt} />
      <Button variant="outline" onClick={receipt.refresh}>
        Tải lại biên nhận
      </Button>
      {data && (
        <>
          <p>Mã biên nhận: {data.receiptId}</p>
          <p role="status">
            {data.confirmedAt
              ? `Member đã xác nhận: ${date(data.confirmedAt)}`
              : 'Đang chờ Member xác nhận trên ứng dụng. Chưa thể nhập kho.'}
          </p>
          {snapshot && (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>Giá chốt: {money(snapshot.agreedPrice)}</div>
              <div>Giá sàn: {money(snapshot.floorPrice)}</div>
              <div>
                Hoa hồng:{' '}
                {snapshot.commissionRate == null ? '—' : `${snapshot.commissionRate * 100}%`}
              </div>
              <div>Độ dài kỳ: {snapshot.termLengthDays ?? '—'} ngày</div>
              <div>Phí: {money(snapshot.fee)}</div>
              <div className="sm:col-span-2 whitespace-pre-wrap">{snapshot.terms}</div>
            </dl>
          )}
          <DocumentLink url={data.pdfUrl}>Mở PDF biên nhận</DocumentLink>
          {data.productSku && (
            <Link
              className="block text-primary underline"
              to={`/moderator/inventory/${encodeURIComponent(data.productSku)}`}
            >
              Đã nhập kho · {data.productSku}
            </Link>
          )}
          {allowStockIn && canStockIn(data) && (
            <StockInForm
              key={receiptId}
              receipt={data}
              onSuccess={() => {
                receipt.refresh();
                onStocked?.();
              }}
            />
          )}
        </>
      )}
    </Card>
  );
}
