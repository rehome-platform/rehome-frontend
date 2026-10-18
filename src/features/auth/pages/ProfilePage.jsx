import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext.jsx';
import Header from '../../../components/header.jsx';
import Badge from '../../../components/common/Badge.jsx';
import authService from '../services/auth.service.js';
import { validatePhone, validatePassword, validateConfirmPassword } from '../../../utils/validators.js';

/**
 * Trang Hồ Sơ Cá Nhân & Quản Trị Tài Khoản Nhân Sự
 * Phase 1 — Auth & Hồ sơ (F-008: Đổi mật khẩu, F-009: Xem hồ sơ, F-010: Cập nhật hồ sơ)
 * Dành cho Admin & Moderator nội bộ trên Web
 * Kết nối hoàn toàn với Backend API thật tại https://re-backend-9a98.onrender.com
 */
export default function ProfilePage() {
  const { user, updateProfile, changePassword, logout } = useAuth();

  // Tab: 'profile' | 'security' | 'sessions'
  const [activeTab, setActiveTab] = useState('profile');

  // Profile Form state
  const [name, setName] = useState(user?.fullName || user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatarUrl || user?.avatar || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passSuccessMsg, setPassSuccessMsg] = useState('');
  const [passErrorMsg, setPassErrorMsg] = useState('');

  // Sample avatars for quick selection
  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  ];

  // Đồng bộ form khi user thay đổi
  useEffect(() => {
    if (user) {
      setName(user.fullName || user.name || '');
      setPhone(user.phone || '');
      setAvatar(user.avatarUrl || user.avatar || '');
    }
  }, [user]);

  // Tải thông tin hồ sơ mới nhất từ backend API
  useEffect(() => {
    let isMounted = true;
    const fetchLatestProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const freshUser = await authService.getCurrentUser();
        if (isMounted && freshUser) {
          setName(freshUser.fullName || freshUser.name || '');
          setPhone(freshUser.phone || '');
          setAvatar(freshUser.avatarUrl || freshUser.avatar || '');
        }
      } catch (err) {
        console.warn('Lỗi khi tải hồ sơ từ backend:', err);
      } finally {
        if (isMounted) setIsLoadingProfile(false);
      }
    };

    fetchLatestProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // Xử lý lưu hồ sơ qua PATCH /members/me
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    if (!name.trim()) {
      setProfileErrorMsg('Vui lòng nhập họ và tên nhân sự.');
      return;
    }

    if (phone) {
      const phoneErr = validatePhone(phone);
      if (phoneErr) {
        setProfileErrorMsg(phoneErr);
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      await updateProfile({
        fullName: name.trim(),
        name: name.trim(),
        phone: phone.trim(),
        avatarUrl: avatar,
        avatar: avatar,
      });
      setProfileSuccessMsg('Cập nhật thông tin hồ sơ trên máy chủ thành công!');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } catch (err) {
      setProfileErrorMsg(err.message || 'Không thể cập nhật hồ sơ lúc này.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Xử lý đổi mật khẩu qua POST /api/auth/password/change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassSuccessMsg('');
    setPassErrorMsg('');

    if (!currentPassword) {
      setPassErrorMsg('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    const passErr = validatePassword(newPassword);
    if (passErr) {
      setPassErrorMsg(passErr);
      return;
    }

    const confirmErr = validateConfirmPassword(confirmPassword, newPassword);
    if (confirmErr) {
      setPassErrorMsg(confirmErr);
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await changePassword({
        oldPassword: currentPassword,
        newPassword: newPassword,
        newPasswordRepeat: confirmPassword,
      });
      setPassSuccessMsg(res?.message || 'Đổi mật khẩu thành công! Mật khẩu mới đã được cập nhật.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccessMsg(''), 5000);
    } catch (err) {
      setPassErrorMsg(err.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu cũ.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F9F4] text-[#1F2A37] font-sans antialiased">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#5B6776] mb-1">
              <span>Hệ thống nội bộ</span>
              <span>/</span>
              <span className="text-[#006B2C] font-semibold">Hồ sơ tài khoản</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#1F2A37] tracking-tight">
              Hồ Sơ & Bảo Mật Tài Khoản
            </h1>
          </div>

          <button
            type="button"
            onClick={logout}
            className="self-start sm:self-auto px-4 py-2 text-xs font-bold text-[#D92D20] bg-white border border-[#DDE5D9] hover:bg-[#FFF5F5] hover:border-[#D92D20]/40 rounded-xl transition-colors flex items-center gap-2 shadow-xs"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            <span>Đăng xuất phiên</span>
          </button>
        </div>

        {/* Grid Layout: User summary card on left, details on right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card Thông tin tóm tắt bên trái */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-[#DDE5D9] p-6 shadow-card flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative group mb-4">
                <img
                  src={avatar || user?.avatarUrl || user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                  alt={user?.name || 'Avatar'}
                  className="w-28 h-28 rounded-2xl object-cover border-2 border-[#006B2C]/20 shadow-md"
                />
                <div
                  onClick={() => setActiveTab('profile')}
                  className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium cursor-pointer"
                >
                  Đổi ảnh
                </div>
              </div>

              {/* Tên & vai trò */}
              <h2 className="text-lg font-bold text-[#1F2A37]">
                {user?.fullName || user?.name || 'Nhân sự ReHome'}
              </h2>
              <p className="text-xs text-[#5B6776] mt-0.5">{user?.email}</p>

              <div className="mt-3 flex items-center gap-2">
                {isAdmin ? (
                  <Badge variant="info" className="bg-[#E0F2F1] text-[#00685F] border-[#80CBC4] font-bold">
                    Quản trị viên (Admin)
                  </Badge>
                ) : (
                  <Badge variant="success" className="bg-[#E8F5E9] text-[#006B2C] border-[#A5D6A7] font-bold">
                    Nhân viên Kho (Moderator)
                  </Badge>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F5E9] text-[#006B2C]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#006B2C] animate-pulse"></span>
                  Đang hoạt động
                </span>
              </div>

              {/* Thông tin chi tiết xác thực từ Backend */}
              <div className="w-full mt-6 pt-6 border-t border-[#DDE5D9] space-y-3 text-left text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#5B6776]">Mã tài khoản (Code):</span>
                  <span className="font-mono font-bold text-[#1F2A37]">
                    {user?.memberCode || (isAdmin ? 'ADM-OFFICIAL' : 'MOD-OFFICIAL')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#5B6776]">Quyền hạn (Authority):</span>
                  <span className="font-mono text-[11px] font-semibold text-[#006B2C]">
                    {user?.authorities || user?.rawRole || (isAdmin ? 'ROLE_ADMIN' : 'ROLE_MODERATOR')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#5B6776]">Số điện thoại:</span>
                  <span className="font-semibold text-[#1F2A37]">{user?.phone || 'Chưa cập nhật'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#5B6776]">Xác thực Email:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-[#006B2C]">
                    <span className="material-symbols-outlined text-sm">verified</span>
                    <span>{user?.emailVerified ? 'Đã xác thực' : 'Đang kích hoạt'}</span>
                  </span>
                </div>
                {user?.accountId && (
                  <div className="flex justify-between items-start pt-1 border-t border-[#DDE5D9]/50">
                    <span className="text-[#5B6776]">ID tài khoản:</span>
                    <span className="font-mono text-[10px] text-[#717971] truncate max-w-[150px]">
                      {user.accountId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-[#EBF1E8] rounded-2xl p-4 border border-[#DDE5D9] text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-[#006B2C]">
                <span className="material-symbols-outlined text-base">verified_user</span>
                <span>Quy chuẩn bảo mật nội bộ</span>
              </div>
              <p className="text-[#5B6776] leading-relaxed text-[11px]">
                Theo chính sách bảo mật hệ thống ReHome, nhân sự bắt buộc đổi mật khẩu định kỳ và không chia sẻ token xác thực cho bên thứ ba.
              </p>
            </div>
          </div>

          {/* Cột Chi tiết bên phải (Tabs: Profile / Password / Sessions) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs Header */}
            <div className="bg-white rounded-2xl border border-[#DDE5D9] p-1.5 flex gap-1 shadow-xs text-xs font-bold">
              <button
                type="button"
                id="tab-profile-info"
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'profile'
                    ? 'bg-[#006B2C] text-white shadow-xs'
                    : 'text-[#5B6776] hover:text-[#1F2A37] hover:bg-[#F6F9F4]'
                }`}
              >
                <span className="material-symbols-outlined text-base">badge</span>
                <span>Thông tin cá nhân</span>
              </button>
              <button
                type="button"
                id="tab-profile-security"
                onClick={() => setActiveTab('security')}
                className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'security'
                    ? 'bg-[#006B2C] text-white shadow-xs'
                    : 'text-[#5B6776] hover:text-[#1F2A37] hover:bg-[#F6F9F4]'
                }`}
              >
                <span className="material-symbols-outlined text-base">lock_reset</span>
                <span>Đổi mật khẩu</span>
              </button>
              <button
                type="button"
                id="tab-profile-sessions"
                onClick={() => setActiveTab('sessions')}
                className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'sessions'
                    ? 'bg-[#006B2C] text-white shadow-xs'
                    : 'text-[#5B6776] hover:text-[#1F2A37] hover:bg-[#F6F9F4]'
                }`}
              >
                <span className="material-symbols-outlined text-base">devices</span>
                <span>Phiên làm việc</span>
              </button>
            </div>

            {/* TAB 1: THÔNG TIN CÁ NHÂN (F-010) */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-2xl border border-[#DDE5D9] p-6 sm:p-8 shadow-card space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#1F2A37]">Cập nhật thông tin tài khoản</h3>
                    <p className="text-xs text-[#5B6776] mt-0.5">
                      Dữ liệu được lưu trữ và đồng bộ trực tiếp qua Backend API (PATCH /members/me).
                    </p>
                  </div>
                  {isLoadingProfile && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#006B2C] font-semibold">
                      <span className="w-3.5 h-3.5 border-2 border-[#006B2C] border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang tải...</span>
                    </span>
                  )}
                </div>

                {profileSuccessMsg && (
                  <div className="p-3.5 rounded-xl bg-[#E8F5E9] border border-[#006B2C]/30 text-[#006B2C] text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>{profileSuccessMsg}</span>
                  </div>
                )}

                {profileErrorMsg && (
                  <div className="p-3.5 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/30 text-[#D92D20] text-xs font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span>{profileErrorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {/* Chọn Avatar mẫu */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2A37] mb-2">
                      Chọn ảnh đại diện nhân sự:
                    </label>
                    <div className="flex items-center gap-3 overflow-x-auto pb-2">
                      {avatarPresets.map((imgUrl, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setAvatar(imgUrl)}
                          className={`relative rounded-xl overflow-hidden shrink-0 transition-transform ${
                            avatar === imgUrl ? 'ring-2 ring-[#006B2C] scale-105' : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={imgUrl} alt="preset" className="w-12 h-12 object-cover rounded-xl" />
                          {avatar === imgUrl && (
                            <span className="absolute bottom-1 right-1 w-4 h-4 bg-[#006B2C] text-white rounded-full flex items-center justify-center text-[10px]">
                              ✓
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Họ tên */}
                  <div>
                    <label htmlFor="user-name-input" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
                      Họ và tên nhân sự <span className="text-[#D92D20]">*</span>
                    </label>
                    <input
                      id="user-name-input"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#DDE5D9] bg-white focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15 outline-none text-[#1F2A37]"
                    />
                  </div>

                  {/* Email (Disabled) */}
                  <div>
                    <label htmlFor="user-email-input" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
                      Email đăng nhập (Cố định theo hệ thống xác thực)
                    </label>
                    <input
                      id="user-email-input"
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#DDE5D9] bg-[#F6F9F4] text-[#5B6776] cursor-not-allowed outline-none font-mono"
                    />
                  </div>

                  {/* Số điện thoại */}
                  <div>
                    <label htmlFor="user-phone-input" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
                      Số điện thoại liên hệ (Định dạng: 0xxxxxxxxx)
                    </label>
                    <input
                      id="user-phone-input"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912345678"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#DDE5D9] bg-white focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15 outline-none text-[#1F2A37]"
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      id="btn-save-profile"
                      disabled={isSavingProfile}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#006B2C] hover:bg-[#005523] active:scale-[0.99] transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      {isSavingProfile ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base">save</span>
                          <span>Lưu thông tin hồ sơ</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: ĐỔI MẬT KHẨU (F-008) */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-2xl border border-[#DDE5D9] p-6 sm:p-8 shadow-card space-y-6">
                <div>
                  <h3 className="text-base font-bold text-[#1F2A37]">Đổi mật khẩu tài khoản</h3>
                  <p className="text-xs text-[#5B6776] mt-0.5">
                    Gửi yêu cầu đổi mật khẩu bảo mật qua Backend API (POST /api/auth/password/change). Mật khẩu mới tối thiểu 6 ký tự.
                  </p>
                </div>

                {passSuccessMsg && (
                  <div className="p-3.5 rounded-xl bg-[#E8F5E9] border border-[#006B2C]/30 text-[#006B2C] text-xs font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>{passSuccessMsg}</span>
                  </div>
                )}

                {passErrorMsg && (
                  <div className="p-3.5 rounded-xl bg-[#FFF5F5] border border-[#D92D20]/30 text-[#D92D20] text-xs font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span>{passErrorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Mật khẩu hiện tại */}
                  <div>
                    <label htmlFor="current-pass-input" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
                      Mật khẩu hiện tại <span className="text-[#D92D20]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="current-pass-input"
                        type={showCurrentPass ? 'text' : 'password'}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-[#DDE5D9] bg-white focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15 outline-none text-[#1F2A37]"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6776] hover:text-[#1F2A37]"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {showCurrentPass ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Mật khẩu mới */}
                  <div>
                    <label htmlFor="new-pass-input" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
                      Mật khẩu mới <span className="text-[#D92D20]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="new-pass-input"
                        type={showNewPass ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
                        className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-[#DDE5D9] bg-white focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15 outline-none text-[#1F2A37]"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6776] hover:text-[#1F2A37]"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {showNewPass ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Xác nhận mật khẩu mới */}
                  <div>
                    <label htmlFor="confirm-pass-input" className="block text-xs font-semibold text-[#1F2A37] mb-1.5">
                      Xác nhận mật khẩu mới <span className="text-[#D92D20]">*</span>
                    </label>
                    <input
                      id="confirm-pass-input"
                      type={showNewPass ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#DDE5D9] bg-white focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15 outline-none text-[#1F2A37]"
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      id="btn-submit-change-pass"
                      disabled={isChangingPass}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#006B2C] hover:bg-[#005523] active:scale-[0.99] transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      {isChangingPass ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Đang cập nhật...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base">lock_reset</span>
                          <span>Cập nhật mật khẩu mới</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: PHIÊN LÀM VIỆC & THIẾT BỊ */}
            {activeTab === 'sessions' && (
              <div className="bg-white rounded-2xl border border-[#DDE5D9] p-6 sm:p-8 shadow-card space-y-6">
                <div>
                  <h3 className="text-base font-bold text-[#1F2A37]">Lịch sử phiên đăng nhập nội bộ</h3>
                  <p className="text-xs text-[#5B6776] mt-0.5">
                    Quản lý phiên xác thực hiện tại được ký số bằng JWT Token trên máy chủ ReHome.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Current Session */}
                  <div className="p-4 rounded-xl border border-[#006B2C]/30 bg-[#E8F5E9]/40 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#006B2C] text-white flex items-center justify-center">
                        <span className="material-symbols-outlined text-xl">laptop_chromebook</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#1F2A37]">Phiên hoạt động hiện tại</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#006B2C] text-white">
                            Active Session
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5B6776] mt-0.5">
                          Tài khoản: {user?.email} • Vai trò: {user?.authorities || user?.role}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center text-xs text-[#5B6776] border-t border-[#DDE5D9]">
                  <span>Đăng xuất khỏi hệ thống:</span>
                  <button
                    type="button"
                    onClick={logout}
                    className="px-4 py-2 font-bold text-xs rounded-xl bg-[#FFF5F5] text-[#D92D20] border border-[#D92D20]/20 hover:bg-[#FEE4E2] transition-colors"
                  >
                    Đăng xuất phiên này
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

    </div>
  );
}
