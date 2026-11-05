import React, { useState, useEffect } from 'react';
import { Button, Badge, Modal, Input } from '../../../components/common/index.js';
import adminApi from '../services/adminApi.js';

/**
 * View Quản lý Thư Viện Từ Vựng Vi Phạm ReHome (Admin)
 * Quản lý danh mục các từ cấm, từ ngữ thù ghét, hàng cấm hoặc hành vi gian lận
 * Được dùng để kiểm duyệt tự động bài viết, bình luận và mô tả sản phẩm ký gửi
 */
export default function AdminViolationWordsView({ onLogAction }) {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');

  // Modal Thêm / Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [deleteConfirmWord, setDeleteConfirmWord] = useState(null);

  const [formData, setFormData] = useState({
    word: '',
    category: 'PROFANITY',
    severity: 'BLOCKED',
    action: 'Chặn tự động',
    reason: '',
    isActive: true,
  });

  const categories = [
    { value: 'PROFANITY', label: 'Ngôn từ xúc phạm / Tục tĩu' },
    { value: 'FRAUD', label: 'Lừa đảo & Chiếm đoạt' },
    { value: 'OFF_PLATFORM', label: 'Giao dịch ngoài sàn' },
    { value: 'COUNTERFEIT', label: 'Hàng giả & Nhái nhãn hiệu' },
    { value: 'ILLEGAL', label: 'Hàng cấm theo luật định' },
    { value: 'SPAM', label: 'Spam & Quảng cáo rác' },
  ];

  // Tải danh sách từ backend hoặc adapter
  const loadWords = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getViolationWords();
      setWords(data || []);
    } catch (err) {
      console.warn('Lỗi tải từ vựng vi phạm:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWords();
  }, []);

  const filteredWords = words.filter((w) => {
    const matchSearch =
      w.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.reason && w.reason.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchCategory =
      selectedCategory === 'ALL' || w.category === selectedCategory;

    const matchSeverity =
      selectedSeverity === 'ALL' || w.severity === selectedSeverity;

    return matchSearch && matchCategory && matchSeverity;
  });

  const handleOpenCreate = () => {
    setEditingWord(null);
    setFormData({
      word: '',
      category: 'PROFANITY',
      severity: 'BLOCKED',
      action: 'Chặn tự động',
      reason: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingWord(item);
    setFormData({
      word: item.word,
      category: item.category,
      severity: item.severity,
      action: item.action,
      reason: item.reason || '',
      isActive: item.isActive ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.word.trim()) return;

    let updatedList;
    const catObj = categories.find((c) => c.value === formData.category);
    const categoryLabel = catObj ? catObj.label : formData.category;

    if (editingWord) {
      updatedList = words.map((w) =>
        w.id === editingWord.id
          ? {
              ...w,
              ...formData,
              categoryLabel,
              word: formData.word.trim().toLowerCase(),
              updatedAt: new Date().toISOString(),
            }
          : w
      );
    } else {
      const newEntry = {
        id: `VW-${Date.now().toString().slice(-4)}`,
        ...formData,
        categoryLabel,
        word: formData.word.trim().toLowerCase(),
        updatedAt: new Date().toISOString(),
      };
      updatedList = [newEntry, ...words];
    }

    setWords(updatedList);
    await adminApi.saveViolationWords(updatedList);

    if (onLogAction) {
      onLogAction({
        time: new Date().toLocaleString('vi-VN'),
        user: 'Admin',
        role: 'Admin',
        action: `${editingWord ? 'Cập nhật' : 'Thêm mới'} từ khóa vi phạm "${formData.word.trim()}"`,
      });
    }

    setIsModalOpen(false);
  };

  // Bật / Tắt trạng thái áp dụng
  const handleToggleActive = async (item) => {
    const updatedList = words.map((w) =>
      w.id === item.id ? { ...w, isActive: !w.isActive, updatedAt: new Date().toISOString() } : w
    );
    setWords(updatedList);
    await adminApi.saveViolationWords(updatedList);

    if (onLogAction) {
      onLogAction({
        time: new Date().toLocaleString('vi-VN'),
        user: 'Admin',
        role: 'Admin',
        action: `${!item.isActive ? 'Kích hoạt' : 'Tạm dừng'} kiểm duyệt từ "${item.word}"`,
      });
    }
  };

  // Xóa từ vựng
  const handleConfirmDelete = async () => {
    if (!deleteConfirmWord) return;
    const updatedList = words.filter((w) => w.id !== deleteConfirmWord.id);
    setWords(updatedList);
    await adminApi.saveViolationWords(updatedList);

    if (onLogAction) {
      onLogAction({
        time: new Date().toLocaleString('vi-VN'),
        user: 'Admin',
        role: 'Admin',
        action: `Xóa từ khóa vi phạm "${deleteConfirmWord.word}" khỏi thư viện`,
      });
    }

    setDeleteConfirmWord(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#191C19] font-heading">
            Thư Viện Từ Vựng Vi Phạm
          </h1>
          <p className="text-xs text-[#717971] mt-0.5">
            Cấu hình danh mục từ khóa cấm, ngôn từ độc hại và hành vi gian lận phục vụ kiểm duyệt tự động.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-[#006B2C] hover:bg-[#005221] text-white text-xs shrink-0 rounded-xl px-4 py-2.5"
        >
          <span className="material-symbols-outlined text-[18px] mr-1.5">add_circle</span>
          Thêm từ vựng vi phạm
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8E0] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717971] text-lg">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm từ khóa vi phạm hoặc lý do..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#E2E8E0] bg-[#F8FAF8]/50 focus:bg-white focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15 outline-none transition-all"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-[#E2E8E0] bg-white text-[#414942] font-medium outline-none hover:border-[#006B2C]/50 transition-colors"
          >
            <option value="ALL">Phân loại: Tất cả</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-[#E2E8E0] bg-white text-[#414942] font-medium outline-none hover:border-[#006B2C]/50 transition-colors"
          >
            <option value="ALL">Mức độ: Tất cả</option>
            <option value="BLOCKED">Chặn tự động</option>
            <option value="WARNING">Cảnh báo / Kiểm duyệt</option>
          </select>

          {(searchTerm || selectedCategory !== 'ALL' || selectedSeverity !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('ALL');
                setSelectedSeverity('ALL');
              }}
              className="px-3 py-2 text-xs font-semibold text-[#006B2C] hover:text-[#005523] hover:bg-[#E8F5E9] rounded-xl transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      {filteredWords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8E0] p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#F0F5EE] text-[#006B2C] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">spellcheck</span>
          </div>
          <h3 className="text-base font-bold text-[#191C19] font-heading">
            Chưa có từ khóa vi phạm nào
          </h3>
          <p className="text-xs text-[#717971] max-w-sm mt-1 mb-5">
            Thư viện từ vựng vi phạm hiện chưa có mục phù hợp với bộ lọc hoặc chưa được thêm mới.
          </p>
          <Button onClick={handleOpenCreate} className="bg-[#006B2C] text-white text-xs">
            Thêm từ khóa đầu tiên
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8E0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF8] text-[#717971] uppercase tracking-wider font-semibold border-b border-[#E2E8E0]">
                <tr>
                  <th className="py-3 px-6">Từ ngữ / Cụm từ vi phạm</th>
                  <th className="py-3 px-6">Nhóm vi phạm</th>
                  <th className="py-3 px-6 text-center">Mức độ xử lý</th>
                  <th className="py-3 px-6">Mô tả / Căn cứ</th>
                  <th className="py-3 px-6 text-center">Trạng thái áp dụng</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E0]">
                {filteredWords.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAF8] transition-colors">
                    {/* Word */}
                    <td className="py-3.5 px-6 font-bold text-[#191C19]">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-[#FEE2E2] text-[#DC2626] font-mono text-xs">
                        "{item.word}"
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-6 font-medium text-[#414942]">
                      {item.categoryLabel || item.category}
                    </td>

                    {/* Severity / Action */}
                    <td className="py-3.5 px-6 text-center whitespace-nowrap">
                      {item.severity === 'BLOCKED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#DC2626]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
                          <span>Chặn tự động</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF3E0] text-[#D97706]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
                          <span>Cảnh báo & Đưa hàng đợi</span>
                        </span>
                      )}
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 px-6 text-[#717971] max-w-xs truncate">
                      {item.reason || '—'}
                    </td>

                    {/* Active Toggle Switch */}
                    <td className="py-3.5 px-6 text-center">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                          item.isActive
                            ? 'bg-[#E8F5E9] text-[#006B2C] border border-[#C8E6C9]'
                            : 'bg-[#F4F4F4] text-[#717971] border border-[#E2E8E0]'
                        }`}
                        title="Click để bật hoặc tắt áp dụng"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.isActive ? 'bg-[#006B2C]' : 'bg-[#717971]'
                          }`}
                        ></span>
                        <span>{item.isActive ? 'Đang bật' : 'Tạm dừng'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-[#717971] hover:text-[#006B2C] hover:bg-[#F0F5EE] rounded-lg transition-colors"
                          title="Sửa từ vựng"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmWord(item)}
                          className="p-1.5 text-[#717971] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-lg transition-colors"
                          title="Xóa từ vựng"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-[#E2E8E0] text-xs text-[#717971] flex justify-between items-center">
            <span>Tổng cộng: {filteredWords.length} từ khóa được thiết lập</span>
            <span className="italic">Áp dụng quét tự động khi tạo bài viết & mô tả ký gửi</span>
          </div>
        </div>
      )}

      {/* Modal Thêm / Sửa từ vựng vi phạm */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingWord ? 'Chỉnh sửa từ khóa vi phạm' : 'Thêm từ khóa vi phạm mới'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Từ ngữ hoặc cụm từ vi phạm"
            required
            value={formData.word}
            onChange={(e) => setFormData({ ...formData, word: e.target.value })}
            placeholder="Ví dụ: hàng fake, lừa đảo, chuyển khoản ngoài..."
          />

          <div>
            <label className="block text-xs font-semibold text-[#191C19] mb-1.5">
              Nhóm phân loại vi phạm <span className="text-[#DC2626]">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full p-2.5 text-xs rounded-xl border border-[#E2E8E0] bg-white outline-none focus:border-[#006B2C]"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#191C19] mb-1.5">
              Mức độ xử lý tự động <span className="text-[#DC2626]">*</span>
            </label>
            <select
              value={formData.severity}
              onChange={(e) => {
                const sev = e.target.value;
                setFormData({
                  ...formData,
                  severity: sev,
                  action: sev === 'BLOCKED' ? 'Chặn tự động' : 'Cảnh báo & Đưa vào hàng đợi',
                });
              }}
              className="w-full p-2.5 text-xs rounded-xl border border-[#E2E8E0] bg-white outline-none focus:border-[#006B2C]"
            >
              <option value="BLOCKED">Chặn đăng tải ngay lập tức (Block)</option>
              <option value="WARNING">Cảnh báo & Đưa vào hàng đợi duyệt vi phạm (Warning)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#191C19] mb-1.5">
              Căn cứ hoặc lý do kiểm duyệt
            </label>
            <textarea
              rows="3"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Giải thích lý do hạn chế từ ngữ này theo tiêu chuẩn cộng đồng ReHome..."
              className="w-full p-2.5 text-xs rounded-xl border border-[#E2E8E0] outline-none focus:border-[#006B2C]"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="accent-[#006B2C] w-4 h-4 rounded"
            />
            <label htmlFor="isActiveCheck" className="text-xs text-[#191C19] font-medium">
              Kích hoạt áp dụng từ khóa này ngay sau khi lưu
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#E2E8E0]">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" className="bg-[#006B2C] text-white">
              {editingWord ? 'Lưu cập nhật' : 'Thêm từ khóa'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal xác nhận xóa */}
      {deleteConfirmWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-[#E2E8E0] shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">delete_forever</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#191C19]">Xóa từ khóa vi phạm?</h3>
                <p className="text-xs text-[#717971]">
                  Bạn có chắc muốn xóa từ "{deleteConfirmWord.word}" khỏi thư viện kiểm duyệt?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDeleteConfirmWord(null)}>
                Hủy
              </Button>
              <Button onClick={handleConfirmDelete} className="bg-[#DC2626] text-white text-xs">
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

