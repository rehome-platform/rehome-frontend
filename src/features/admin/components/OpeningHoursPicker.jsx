import React, { useEffect, useState } from 'react';
import {
  DAYS_OF_WEEK,
  DAY_SHORT_LABELS,
  formatOpeningHours,
  parseOpeningHours,
} from '../utils/openingHoursUtils.js';

/**
 * Component chọn Giờ mở cửa trực quan dành cho Admin Warehouse Form
 * Props:
 * - value: string (ví dụ "08:00 - 20:00 (Thứ 2 - Chủ nhật)")
 * - onChange: function(formattedString)
 */
export default function OpeningHoursPicker({ value, onChange }) {
  const initial = parseOpeningHours(value);
  const [openTime, setOpenTime] = useState(initial.openTime);
  const [closeTime, setCloseTime] = useState(initial.closeTime);
  const [selectedDays, setSelectedDays] = useState(initial.selectedDays);

  // Đồng bộ khi value từ cha thay đổi (chẳng hạn khi chuyển giữa các kho khi edit)
  useEffect(() => {
    const parsed = parseOpeningHours(value);
    setOpenTime(parsed.openTime);
    setCloseTime(parsed.closeTime);
    setSelectedDays(parsed.selectedDays);
  }, [value]);

  const updateHours = (newOpen, newClose, newDays) => {
    const formatted = formatOpeningHours(newOpen, newClose, newDays);
    if (onChange) {
      onChange(formatted);
    }
  };

  const handleOpenTimeChange = (e) => {
    const newOpen = e.target.value;
    setOpenTime(newOpen);
    updateHours(newOpen, closeTime, selectedDays);
  };

  const handleCloseTimeChange = (e) => {
    const newClose = e.target.value;
    setCloseTime(newClose);
    updateHours(openTime, newClose, selectedDays);
  };

  const toggleDay = (day) => {
    let newDays;
    if (selectedDays.includes(day)) {
      // Không cho bỏ chọn hết tất cả các ngày
      if (selectedDays.length <= 1) return;
      newDays = selectedDays.filter((d) => d !== day);
    } else {
      newDays = [...selectedDays, day];
    }
    setSelectedDays(newDays);
    updateHours(openTime, closeTime, newDays);
  };

  const applyPreset = (preset) => {
    let newDays;
    if (preset === 'ALL') {
      newDays = [...DAYS_OF_WEEK];
    } else if (preset === 'MON_SAT') {
      newDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    } else if (preset === 'MON_FRI') {
      newDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6'];
    }
    setSelectedDays(newDays);
    updateHours(openTime, closeTime, newDays);
  };

  return (
    <div className="space-y-3 p-3.5 rounded-xl border border-[#E2E8E0] bg-[#FBFDFB]">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-[#191C19]">
          Giờ mở cửa phục vụ tại quầy <span className="text-[#BA1A1A]">*</span>
        </label>
        <span className="text-[11px] font-medium text-[#006B2C] bg-[#E8F5E9] px-2 py-0.5 rounded-md">
          {formatOpeningHours(openTime, closeTime, selectedDays)}
        </span>
      </div>

      {/* Chọn khung giờ */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[11px] text-[#717971] block mb-1">Giờ mở cửa</span>
          <div className="relative">
            <input
              type="time"
              value={openTime}
              onChange={handleOpenTimeChange}
              className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-[#E2E8E0] bg-white text-[#191C19] focus:outline-none focus:border-[#006B2C]"
            />
          </div>
        </div>
        <div>
          <span className="text-[11px] text-[#717971] block mb-1">Giờ đóng cửa</span>
          <div className="relative">
            <input
              type="time"
              value={closeTime}
              onChange={handleCloseTimeChange}
              className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-[#E2E8E0] bg-white text-[#191C19] focus:outline-none focus:border-[#006B2C]"
            />
          </div>
        </div>
      </div>

      {/* Preset nhanh */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        <span className="text-[11px] text-[#717971] mr-1">Chọn nhanh:</span>
        <button
          type="button"
          onClick={() => applyPreset('ALL')}
          className={`px-2 py-1 text-[11px] font-medium rounded-md border transition-colors ${
            selectedDays.length === 7
              ? 'bg-[#006B2C] text-white border-[#006B2C]'
              : 'bg-white text-[#414942] border-[#E2E8E0] hover:bg-[#F0F5EE]'
          }`}
        >
          Cả tuần (T2 - CN)
        </button>
        <button
          type="button"
          onClick={() => applyPreset('MON_SAT')}
          className={`px-2 py-1 text-[11px] font-medium rounded-md border transition-colors ${
            selectedDays.length === 6 && !selectedDays.includes('Chủ nhật')
              ? 'bg-[#006B2C] text-white border-[#006B2C]'
              : 'bg-white text-[#414942] border-[#E2E8E0] hover:bg-[#F0F5EE]'
          }`}
        >
          Thứ 2 - Thứ 7
        </button>
        <button
          type="button"
          onClick={() => applyPreset('MON_FRI')}
          className={`px-2 py-1 text-[11px] font-medium rounded-md border transition-colors ${
            selectedDays.length === 5 &&
            !selectedDays.includes('Thứ 7') &&
            !selectedDays.includes('Chủ nhật')
              ? 'bg-[#006B2C] text-white border-[#006B2C]'
              : 'bg-white text-[#414942] border-[#E2E8E0] hover:bg-[#F0F5EE]'
          }`}
        >
          Thứ 2 - Thứ 6
        </button>
      </div>

      {/* Chọn các ngày trong tuần */}
      <div>
        <span className="text-[11px] text-[#717971] block mb-1.5">Các ngày làm việc trong tuần:</span>
        <div className="grid grid-cols-7 gap-1">
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = selectedDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`py-1.5 text-center text-xs font-semibold rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-[#006B2C] text-white border-[#006B2C] shadow-xs'
                    : 'bg-white text-[#717971] border-[#E2E8E0] hover:border-[#006B2C]/50'
                }`}
                title={day}
              >
                {DAY_SHORT_LABELS[day]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

