import React from 'react';
import { CONDITION_MAP } from '../../../utils/conditionMapping.js';

export default function CriteriaTable({ selectedCondition, onSelectCondition }) {
  return (
    <div className="overflow-hidden border border-outline-variant rounded-xl bg-surface-container-lowest">
      <div className="bg-surface-container px-4 py-3 border-b border-outline-variant">
        <h4 className="text-sm font-semibold text-on-surface">Bảng Tiêu Chuẩn Kiểm Hàng Quần Áo (4 Mức Độ)</h4>
        <p className="text-xs text-outline mt-0.5">Quy chuẩn đối soát bắt buộc khi nhân viên shop lập biên nhận tại quầy</p>
      </div>
      <div className="divide-y divide-outline-variant">
        {Object.entries(CONDITION_MAP).map(([key, item]) => {
          const isSelected = Number(selectedCondition) === Number(key);
          return (
            <div
              key={key}
              onClick={() => onSelectCondition && onSelectCondition(Number(key))}
              className={`p-3.5 flex items-start space-x-3 cursor-pointer transition-colors ${
                isSelected ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-surface-container-low'
              }`}
            >
              <input
                type="radio"
                name="itemCondition"
                checked={isSelected}
                onChange={() => onSelectCondition && onSelectCondition(Number(key))}
                className="mt-1 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-on-surface">{item.label}</span>
                  <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">
                    {item.percentage}%
                  </span>
                </div>
                <p className="text-xs text-outline mt-1">
                  {key === '1' && 'Áo quần mới nguyên vẹn, còn tem mác thương hiệu gốc, không có bất kỳ tì vết nào.'}
                  {key === '2' && 'Đồ đã cắt mác hoặc mặc 1-2 lần, form áo nguyên bản, màu sắc tươi mới 99%.'}
                  {key === '3' && 'Chất liệu vải mềm tự nhiên, không sờn chỉ, không ố vàng, khóa kéo hoạt động trơn tru.'}
                  {key === '4' && 'Hao mòn nhỏ ở viền, nút áo hơi lỏng hoặc mất nút phụ, bắt buộc chụp cận cảnh.'}
                  {key === '5' && 'Cũ nhiều, chỉ tiếp nhận phân loại chuyển quyên góp từ thiện hoặc tái chế.'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
