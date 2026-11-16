import { useEffect, useRef, useState } from 'react';

/**
 * Tải tổng của kỳ liền trước để so sánh tăng trưởng % (xem ComparisonBadge và getPreviousPeriodRange).
 *
 * `fetchTotal(range)` nhận { apiFrom, apiTo } và trả về một Promise<number>. `range` là null khi không
 * có kỳ trước để so sánh (period = "Toàn thời gian") hoặc bộ lọc đang lỗi - hook bỏ qua, không gọi API.
 * `extraDeps` là các giá trị khác ngoài range cũng cần tải lại khi đổi (ví dụ granularity, vai trò lọc);
 * cố định số lượng ở mỗi nơi gọi hook, không đổi độ dài giữa các lần render.
 *
 * Bỏ qua kết quả đến muộn của một khoảng đã cũ, giống cách các hook tải dữ liệu khác trong trang xử lý.
 */
export default function usePreviousTotal(fetchTotal, range, extraDeps = []) {
  const [previousTotal, setPreviousTotal] = useState(null);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const reqSeqRef = useRef(0);

  useEffect(() => {
    if (!range) {
      setPreviousTotal(null);
      setLoadingPrevious(false);
      return;
    }
    const reqId = ++reqSeqRef.current;
    setLoadingPrevious(true);
    fetchTotal(range)
      .then((value) => {
        if (reqId === reqSeqRef.current) setPreviousTotal(Number(value) || 0);
      })
      .catch((err) => {
        if (reqId === reqSeqRef.current) {
          console.error('Lỗi tải số liệu kỳ trước để so sánh:', err);
          setPreviousTotal(null);
        }
      })
      .finally(() => {
        if (reqId === reqSeqRef.current) setLoadingPrevious(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range?.apiFrom, range?.apiTo, ...extraDeps]);

  return { previousTotal, loadingPrevious };
}
