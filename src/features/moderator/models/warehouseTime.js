export function warehouseDateTime(value) {
  if (!value) return 'Chưa có thông tin';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Chưa có thông tin';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short',
  }).format(date);
}

export function waitingDuration(value) {
  if (value == null || !Number.isFinite(Number(value))) return 'Chưa có thông tin';
  const minutes = Math.max(0, Math.floor(Number(value)));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ''}` : `${minutes} phút`;
}
