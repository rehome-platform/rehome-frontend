import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import Logo from '../../../components/common/Logo.jsx';

const STATUS_VIEW = {
  SUCCESS: {
    title: 'Thanh toán thành công',
    desc: 'Đơn hàng của bạn đã được xác nhận thanh toán. Cảm ơn bạn đã mua sắm cùng ReHome!',
    color: '#006B2C',
    bg: '#EAF7EF',
  },
  FAILED: {
    title: 'Thanh toán thất bại',
    desc: 'Giao dịch không thành công hoặc đã bị hủy. Bạn có thể quay lại ứng dụng để thử thanh toán lại.',
    color: '#DC2626',
    bg: '#FDECEC',
  },
  PENDING: {
    title: 'Đang xử lý thanh toán',
    desc: 'Chúng tôi vẫn đang chờ xác nhận từ MoMo. Vui lòng kiểm tra lại đơn hàng trong ứng dụng sau ít phút.',
    color: '#B45309',
    bg: '#FEF6E7',
  },
};

function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

/**
 * Trang hiển thị kết quả sau khi MoMo redirect browser/WebView về đây.
 * Không tin resultCode trên URL (có thể bị sửa qua client) - chỉ dùng để hiện UI tạm,
 * trạng thái cuối cùng luôn lấy từ backend (api/momo/return-info), nơi verify lại
 * signature và đọc trạng thái Payment thật trong DB (do IPN xác nhận).
 */
export default function MomoReturnPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!searchParams.get('orderId') || !searchParams.get('signature')) {
      setLoading(false);
      setError('Thiếu thông tin kết quả thanh toán trên đường dẫn.');
      return;
    }

    const params = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    let cancelled = false;
    baseApi
      .get(API_ENDPOINTS.MOMO.RETURN_INFO, { params })
      .then((res) => {
        if (cancelled) return;
        setResult(res.data?.result || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err.response?.data?.message ||
            'Không thể xác nhận trạng thái thanh toán. Vui lòng kiểm tra lại đơn hàng trong ứng dụng.'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const view = result ? STATUS_VIEW[result.status] || STATUS_VIEW.PENDING : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F6F9F4] px-4 py-10">
      <Logo size="lg" className="mb-6" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#E5EAE7] p-8 text-center">
        {loading && (
          <>
            <div className="w-10 h-10 border-4 border-[#006B2C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-[#5B6776]">Đang xác nhận kết quả thanh toán...</p>
          </>
        )}

        {!loading && error && (
          <>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold"
              style={{ backgroundColor: '#FDECEC', color: '#DC2626' }}
            >
              !
            </div>
            <h1 className="text-lg font-bold text-[#1F2A37] mb-2">Không thể xác nhận thanh toán</h1>
            <p className="text-sm text-[#5B6776] mb-6">{error}</p>
          </>
        )}

        {!loading && !error && result && (
          <>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold"
              style={{ backgroundColor: view.bg, color: view.color }}
            >
              {result.status === 'SUCCESS' ? '✓' : result.status === 'FAILED' ? '✕' : '…'}
            </div>
            <h1 className="text-lg font-bold mb-2" style={{ color: view.color }}>
              {view.title}
            </h1>
            <p className="text-sm text-[#5B6776] mb-6">{view.desc}</p>

            <div className="text-left bg-[#F6F9F4] rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#5B6776]">Mã đơn hàng</span>
                <span className="font-semibold text-[#1F2A37]">{result.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5B6776]">Số tiền</span>
                <span className="font-semibold text-[#1F2A37]">{formatCurrency(result.amount)}</span>
              </div>
              {result.momoTransactionId && (
                <div className="flex justify-between">
                  <span className="text-[#5B6776]">Mã giao dịch MoMo</span>
                  <span className="font-semibold text-[#1F2A37]">{result.momoTransactionId}</span>
                </div>
              )}
              {result.paidAt && (
                <div className="flex justify-between">
                  <span className="text-[#5B6776]">Thời gian</span>
                  <span className="font-semibold text-[#1F2A37]">{formatDate(result.paidAt)}</span>
                </div>
              )}
            </div>
          </>
        )}

        <p className="text-xs text-[#9AA5B1] mt-6">
          Bạn có thể đóng trang này và quay lại ứng dụng ReHome để xem chi tiết đơn hàng.
        </p>
      </div>

      <Link to="/login" className="text-xs text-[#006B2C] font-semibold mt-6 hover:underline">
        Về trang đăng nhập ReHome Web
      </Link>
    </div>
  );
}
