import { useEffect, useRef, useState } from 'react';
import { DASHBOARD_STALE_TIME_MS, useAdminCache } from './useAdminQuery.jsx';

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
export default function usePreviousTotal(fetchTotal, range, extraDeps = [], cacheKey = null) {
  const cache = useAdminCache();
  const [previousTotal, setPreviousTotal] = useState(() => {
    const cached = cache && cacheKey ? cache.read(cacheKey) : null;
    return cached ? cached.data : null;
  });
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const reqSeqRef = useRef(0);

  useEffect(() => {
    if (!range) {
      setPreviousTotal(null);
      setLoadingPrevious(false);
      return;
    }

    const cached = cache && cacheKey ? cache.read(cacheKey) : null;
    if (cached && cache.isFresh(cached, DASHBOARD_STALE_TIME_MS)) {
      setPreviousTotal(cached.data);
      setLoadingPrevious(false);
      return;
    }

    if (cached) {
      setPreviousTotal(cached.data);
      setLoadingPrevious(false);
    } else {
      setLoadingPrevious(true);
    }

    const reqId = ++reqSeqRef.current;
    fetchTotal(range)
      .then((value) => {
        if (reqId !== reqSeqRef.current) return;
        const num = Number(value) || 0;
        if (cache && cacheKey) {
          cache.write(cacheKey, num);
        }
        setPreviousTotal(num);
      })
      .catch((err) => {
        if (reqId === reqSeqRef.current) {
          console.error('Lỗi tải số liệu kỳ trước để so sánh:', err);
          if (!cached) {
            setPreviousTotal(null);
          }
        }
      })
      .finally(() => {
        if (reqId === reqSeqRef.current) setLoadingPrevious(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache, cacheKey, range?.apiFrom, range?.apiTo, ...extraDeps]);

  return { previousTotal, loadingPrevious };
}
