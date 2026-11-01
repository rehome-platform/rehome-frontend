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
    <Card title="Biên nhận ký gửi & Xác nhận">
      <ResourceState resource={receipt} />
      <div className="flex justify-between items-center pb-2 border-b border-[#e0e0e0]">
        <Button variant="outline" size="sm" onClick={receipt.refresh} className="text-xs">
          Tải lại biên nhận
        </Button>
        {data && (
          <span className="text-xs font-mono font-bold text-[#191C19]">
            Mã biên nhận: {data.receiptNo || data.receiptId || data.id}
          </span>
        )}
      </div>

      {data && (
        <div className="space-y-6 pt-2">
          {/* KD-07: MÀN HÌNH CHỜ MEMBER XÁC NHẬN */}
          {!data.confirmedAt ? (
            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] items-start">
              {/* CỘT TRÁI: SPINNER CHỜ XÁC NHẬN */}
              <div className="rounded-2xl border-2 border-[#2b2b2b] bg-white p-6 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-full border-4 border-[#2b2b2b] border-t-transparent animate-spin mx-auto my-2" />
                <div>
                  <h3 className="text-lg font-bold text-[#191C19]">
                    Đang chờ khách xác nhận biên nhận
                  </h3>
                  <p className="text-xs text-[#5B6776] max-w-sm mx-auto mt-1 leading-relaxed">
                    Biên nhận đã gửi vào ứng dụng của Member. Mời khách mở app, đọc kỹ điều khoản rồi bấm xác nhận.
                  </p>
                </div>

                <div className="w-full text-left p-3.5 bg-[#f4f4f4] border border-[#2b2b2b] rounded-xl text-xs space-y-1">
                  <p className="font-bold text-[#191C19]">Chưa nhập kho được cho tới khi khách xác nhận</p>
                  <p className="text-[#5f5f5f] text-[11px] leading-relaxed">
                    Đây là chốt chặn bắt buộc: hàng chỉ lên sàn sau khi khách đồng ý với giá và điều khoản. Không có đường tắt bỏ qua bước này.
                  </p>
                </div>

                <p role="status" className="text-[11px] text-[#717971]">
                  Đang chờ Member xác nhận trên ứng dụng. Chưa thể nhập kho.
                </p>

                <div className="flex gap-2 w-full pt-2">
                  <Button
                    disabled
                    className="flex-1 text-xs py-3 bg-[#e0e0e0] text-[#717971] border border-[#c4c4c4] cursor-not-allowed"
                  >
                    Nhập kho — chờ khách xác nhận
                  </Button>
                </div>
              </div>

              {/* CỘT PHẢI: TÓM TẮT BIÊN NHẬN & BƯỚC TIẾP THEO */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#8a8a8a] bg-white p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#191C19] border-b border-[#e0e0e0] pb-2">
                    Biên nhận đã gửi
                  </h4>
                  <div className="text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#5f5f5f]">Số biên nhận:</span>
                      <span className="font-bold font-mono">{data.receiptNo || data.receiptId || data.id}</span>
                    </div>
                    {agreedPrice != null && (
                      <div className="flex justify-between">
                        <span className="text-[#5f5f5f]">Giá bán thỏa thuận:</span>
                        <span className="font-bold text-[#006B2C]">{money(agreedPrice)}</span>
                      </div>
                    )}
                    {floorPrice != null && (
                      <div className="flex justify-between">
                        <span className="text-[#5f5f5f]">Giá sàn tự tính (50%):</span>
                        <span className="font-bold">{money(floorPrice)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#5f5f5f]">
                        Hoa hồng: {commission != null ? `${Math.round(commission * (commission <= 1 ? 100 : 1))}%` : '10%'}
                      </span>
                      <span className="font-bold">3 kỳ: 10% → 15% → 20%</span>
                    </div>
                    {termDays && (
                      <div className="flex justify-between">
                        <span className="text-[#5f5f5f]">Độ dài kỳ:</span>
                        <span>{termDays} ngày / kỳ</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#8a8a8a] bg-[#fafafa] p-4 space-y-2.5 text-xs">
                  <h4 className="font-bold text-[#191C19]">Tiếp theo sẽ là</h4>
                  <ul className="space-y-2 text-[#5B6776] text-[11px] list-decimal list-inside">
                    <li>Nhập thông tin sản phẩm, chụp ảnh bán hàng và tách nền</li>
                    <li>Hệ thống cấp SKU, in tem dán lên món hàng</li>
                    <li>Xếp lên kệ, ghi vị trí, sản phẩm lên sàn ngay</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            /* KD-08: MEMBER ĐÃ XÁC NHẬN - CHO PHÉP NHẬP KHO */
            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-[#006B2C] bg-[#E8F5E9] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#006B2C] text-white flex items-center justify-center font-bold">
                    ✓
                  </span>
                  <div>
                    <span className="font-bold text-[#006B2C] text-sm block">
                      MEMBER ĐÃ XÁC NHẬN
                    </span>
                    <p role="status" className="text-[#414942] text-[11px]">
                      Member đã xác nhận: {date(data.confirmedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {data.pdfUrl ? (
                    <DocumentLink url={data.pdfUrl}>Mở PDF biên nhận</DocumentLink>
                  ) : (
                    <Button
                      variant="outline"
                      loading={downloadingPdf}
                      onClick={handleOpenPdf}
                      className="text-xs font-bold border-[#006B2C] text-[#006B2C]"
                    >
                      Mở PDF biên nhận
                    </Button>
                  )}
                </div>
              </div>

              {(snapshot || agreedPrice != null) && (
                <dl className="grid gap-2 text-xs sm:grid-cols-2 p-3 bg-white border border-[#e0e0e0] rounded-xl">
                  <div>Giá chốt: <strong>{money(agreedPrice)}</strong></div>
                  <div>Giá sàn: <strong>{money(floorPrice)}</strong></div>
                  <div>
                    Hoa hồng:{' '}
                    <strong>{commission == null ? '10% → 15% → 20%' : `${Number(commission) * 100}%`}</strong>
                  </div>
                  <div>Độ dài kỳ: <strong>{termDays ?? 30} ngày</strong></div>
                  {fee != null && <div>Phí rút: {money(fee)}</div>}
                </dl>
              )}

              {data.productSku && (
                <Link
                  className="block text-primary underline font-bold text-xs"
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
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
