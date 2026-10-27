import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import { consignmentService } from '../services/warehouseApi.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { canStockIn } from '../models/warehouseModel.js';
import { Card, ResourceState, DocumentLink, money, date } from './WarehouseUi.jsx';
import StockInForm from './StockInForm.jsx';

export default function ReceiptPanel({ receiptId, allowStockIn = false, onStocked }) {
  const receipt = useResource(
    (options) => consignmentService.receipt(receiptId, options),
    [receiptId],
    { poll: true, done: (value) => !!value?.confirmedAt },
  );
  const data = receipt.data;
  const snapshot = data?.snapshot;

  const [downloadingPdf, setDownloadingPdf] = React.useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = React.useState(null);

  const agreedPrice = data?.agreedPrice ?? snapshot?.agreedPrice;
  const floorPrice = data?.floorPrice ?? snapshot?.floorPrice;
  const termDays = data?.termLengthDays ?? snapshot?.termLengthDays;
  const commission = data?.commissionRateTerm1 ?? snapshot?.commissionRate;
  const fee = data?.withdrawalFee ?? snapshot?.fee;

  const handleOpenPdf = async () => {
    if (pdfBlobUrl) {
      window.open(pdfBlobUrl, '_blank');
      return;
    }
    if (data?.pdfUrl) {
      window.open(data.pdfUrl, '_blank');
      return;
    }
    try {
      setDownloadingPdf(true);
      const res = await consignmentService.pdf(receiptId);
      if (res?.pdfUrl) {
        setPdfBlobUrl(res.pdfUrl);
        window.open(res.pdfUrl, '_blank');
      }
    } catch (err) {
      console.error('Không thể tải PDF biên nhận:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <Card title="Biên nhận ký gửi">
      <ResourceState resource={receipt} />
      <Button variant="outline" onClick={receipt.refresh}>
        Tải lại biên nhận
      </Button>
      {data && (
        <>
          <p>Mã biên nhận: {data.receiptNo || data.receiptId || data.id}</p>
          <p role="status">
            {data.confirmedAt
              ? `Member đã xác nhận: ${date(data.confirmedAt)}`
              : 'Đang chờ Member xác nhận trên ứng dụng. Chưa thể nhập kho.'}
          </p>
          {(snapshot || agreedPrice != null) && (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>Giá chốt: {money(agreedPrice)}</div>
              <div>Giá sàn: {money(floorPrice)}</div>
              <div>
                Hoa hồng:{' '}
                {commission == null ? '—' : `${Number(commission) * 100}%`}
              </div>
              <div>Độ dài kỳ: {termDays ?? '—'} ngày</div>
              {fee != null && <div>Phí rút: {money(fee)}</div>}
              {snapshot?.terms && (
                <div className="sm:col-span-2 whitespace-pre-wrap">{snapshot.terms}</div>
              )}
            </dl>
          )}

          <div className="pt-2">
            {data.pdfUrl ? (
              <DocumentLink url={data.pdfUrl}>Mở PDF biên nhận</DocumentLink>
            ) : data.confirmedAt ? (
              <Button
                variant="outline"
                loading={downloadingPdf}
                onClick={handleOpenPdf}
                className="text-xs font-bold"
              >
                Mở PDF biên nhận
              </Button>
            ) : null}
          </div>

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
