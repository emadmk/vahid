import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaUsers, FaKey, FaCopy, FaTrash, FaCog, FaSpinner, FaTimes, FaUserPlus, FaSignInAlt, FaShareAlt, FaToggleOn, FaToggleOff, FaExchangeAlt, FaHandshake } from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';
import jalaliMoment from 'jalali-moment';

const Groups = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(null);
  const [showSharingModal, setShowSharingModal] = useState(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [togglingSharing, setTogglingSharing] = useState(null);

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    privacy: {
      membersVisible: false,
      canViewMemberList: 'admins',
      showGroupName: true
    }
  });

  const [inviteCode, setInviteCode] = useState('');

  const [sharingSettings, setSharingSettings] = useState({
    enabled: false,
    activationMode: 'manual',
    schedule: {
      startTime: '09:00',
      endTime: '17:00',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
    },
    offlineSettings: {
      inactiveMinutes: 10
    },
    spreadSettings: {
      executorAddsSpread: true,
      maxExecutorSpread: 5
    }
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sarafi-groups/my-groups');
      setGroups(res.data.data);
    } catch (e) {
      toast.error('خطا در دریافت گروه‌ها');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroup.name) {
      toast.error('نام گروه الزامی است');
      return;
    }

    setCreating(true);
    try {
      await api.post('/sarafi-groups', newGroup);
      toast.success('گروه با موفقیت ایجاد شد');
      setShowCreateModal(false);
      setNewGroup({
        name: '',
        description: '',
        privacy: { membersVisible: false, canViewMemberList: 'admins', showGroupName: true }
      });
      fetchGroups();
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا در ایجاد گروه');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    if (!inviteCode) {
      toast.error('کد دعوت الزامی است');
      return;
    }

    setJoining(true);
    try {
      const res = await api.post('/sarafi-groups/join', { inviteCode });
      toast.success(`به گروه "${res.data.data.name}" پیوستید`);
      setShowJoinModal(false);
      setInviteCode('');
      fetchGroups();
    } catch (e) {
      toast.error(e.response?.data?.message || 'کد دعوت نامعتبر است');
    } finally {
      setJoining(false);
    }
  };

  // کپی به کلیپ‌بورد با fallback برای HTTP
  const copyToClipboardSafe = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      console.warn('Clipboard API failed, using fallback');
    }

    // Fallback برای HTTP
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch (e) {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const handleGenerateInviteCode = async (groupId) => {
    try {
      const res = await api.post(`/sarafi-groups/${groupId}/invite-code`);
      const inviteCode = res.data?.data?.inviteCode;
      if (inviteCode) {
        const copied = await copyToClipboardSafe(inviteCode);
        if (copied) {
          toast.success(`کد دعوت کپی شد: ${inviteCode}`, { duration: 10000 });
        } else {
          toast.success(`کد دعوت: ${inviteCode}`, { duration: 15000 });
        }
        fetchGroups();
      } else {
        toast.error('کد دعوت دریافت نشد');
      }
    } catch (e) {
      console.error('Invite code error:', e);
      toast.error(e.response?.data?.message || 'خطا در تولید کد دعوت');
    }
  };

  const handleLeaveGroup = async (groupId) => {
    if (!confirm('آیا از خروج از این گروه اطمینان دارید؟')) return;

    try {
      await api.delete(`/sarafi-groups/${groupId}/members/me`);
      toast.success('از گروه خارج شدید');
      fetchGroups();
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('آیا از حذف این گروه اطمینان دارید؟ این عمل غیرقابل برگشت است.')) return;

    try {
      await api.delete(`/sarafi-groups/${groupId}`);
      toast.success('گروه حذف شد');
      fetchGroups();
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('کپی شد');
  };

  // دریافت تنظیمات اشتراک‌گذاری
  const fetchSharingSettings = async (groupId) => {
    try {
      const res = await api.get(`/sarafi-groups/${groupId}/sharing-settings`);
      setSharingSettings(res.data.data.groupSettings || sharingSettings);
      setShowSharingModal(groupId);
    } catch (e) {
      toast.error('خطا در دریافت تنظیمات');
    }
  };

  // ذخیره تنظیمات اشتراک‌گذاری
  const saveSharingSettings = async () => {
    try {
      await api.put(`/sarafi-groups/${showSharingModal}/sharing-settings`, sharingSettings);
      toast.success('تنظیمات ذخیره شد');
      setShowSharingModal(null);
      fetchGroups();
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا در ذخیره تنظیمات');
    }
  };

  // فعال/غیرفعال کردن اشتراک‌گذاری
  const handleToggleSharing = async (groupId, currentState) => {
    setTogglingSharing(groupId);
    try {
      await api.post(`/sarafi-groups/${groupId}/sharing/toggle`, {
        isEnabled: !currentState
      });
      toast.success(currentState ? 'اشتراک‌گذاری غیرفعال شد' : 'اشتراک‌گذاری فعال شد');
      fetchGroups();
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا');
    } finally {
      setTogglingSharing(null);
    }
  };

  // رفتن به صفحه مشتریان اشتراکی
  const goToSharedCustomers = (groupId) => {
    navigate(`/sarafi/groups/${groupId}/shared-customers`);
  };

  // رفتن به صفحه تسویه‌ها
  const goToSettlements = () => {
    navigate('/sarafi/group-settlements');
  };

  const getRoleBadge = (role) => {
    const map = {
      owner: { label: 'مالک', class: 'badge-gold' },
      admin: { label: 'ادمین', class: 'badge-success' },
      member: { label: 'عضو', class: 'badge-info' }
    };
    const r = map[role] || { label: role, class: 'badge-info' };
    return <span className={`badge ${r.class}`}>{r.label}</span>;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">گروه‌های صراف</h1>
        <div className="flex gap-2">
          <button
            onClick={goToSettlements}
            className="btn-dark flex items-center gap-2"
          >
            <FaHandshake />
            تسویه‌ها
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="btn-dark flex items-center gap-2"
          >
            <FaSignInAlt />
            پیوستن به گروه
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-gold flex items-center gap-2"
          >
            <FaPlus />
            ایجاد گروه جدید
          </button>
        </div>
      </div>

      {/* توضیحات */}
      <div className="card-dark mb-6">
        <p className="text-dark-400 text-sm">
          با ایجاد گروه‌های صراف می‌توانید درخواست‌ها را با سایر صراف‌ها به اشتراک بگذارید.
          اعضای گروه به هویت یکدیگر دسترسی ندارند و فقط درخواست‌های گروهی را می‌بینند.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="loading-spinner"></div>
        </div>
      ) : groups.length === 0 ? (
        <div className="card-dark text-center py-12">
          <FaUsers className="text-4xl text-dark-600 mx-auto mb-4" />
          <p className="text-dark-500">هنوز عضو هیچ گروهی نیستید</p>
          <p className="text-dark-600 text-sm mt-2">یک گروه جدید بسازید یا با کد دعوت به گروه دیگران بپیوندید</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div key={group._id} className="card-dark">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500 text-xl">
                    <FaUsers />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{group.name}</h3>
                    <p className="text-dark-500 text-xs">{group.memberCount} عضو</p>
                  </div>
                </div>
                {getRoleBadge(group.myRole)}
              </div>

              {group.description && (
                <p className="text-dark-400 text-sm mb-4">{group.description}</p>
              )}

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-dark-500">اشتراک‌گذاری نرخ:</span>
                  <span className="text-white">{group.rateSharing?.enabled ? 'فعال' : 'غیرفعال'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">اشتراک‌گذاری درخواست:</span>
                  <span className="text-white">{group.requestSharing?.enabled ? 'فعال' : 'غیرفعال'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">تاریخ ایجاد:</span>
                  <span className="text-white">{jalaliMoment(group.createdAt).format('jYYYY/jMM/jDD')}</span>
                </div>
              </div>

              {/* دکمه‌های اشتراک‌گذاری */}
              <div className="flex gap-2 pt-4 border-t border-dark-700">
                <button
                  onClick={() => goToSharedCustomers(group._id)}
                  className="flex-1 btn-dark text-sm py-2 flex items-center justify-center gap-1"
                  title="مشتریان اشتراکی"
                >
                  <FaShareAlt />
                  مشتریان
                </button>
                {(group.isOwner || group.isAdmin) && (
                  <button
                    onClick={() => handleToggleSharing(group._id, group.customerSharing?.isActive)}
                    disabled={togglingSharing === group._id}
                    className={`btn-dark text-sm py-2 px-3 flex items-center gap-1 ${
                      group.customerSharing?.isActive ? 'text-green-400' : 'text-dark-400'
                    }`}
                    title={group.customerSharing?.isActive ? 'اشتراک‌گذاری فعال' : 'اشتراک‌گذاری غیرفعال'}
                  >
                    {togglingSharing === group._id ? (
                      <FaSpinner className="animate-spin" />
                    ) : group.customerSharing?.isActive ? (
                      <FaToggleOn />
                    ) : (
                      <FaToggleOff />
                    )}
                  </button>
                )}
              </div>

              {/* دکمه‌های مدیریت */}
              <div className="flex gap-2 pt-2">
                {group.isOwner || group.isAdmin ? (
                  <>
                    <button
                      onClick={() => handleGenerateInviteCode(group._id)}
                      className="flex-1 btn-dark text-sm py-2 flex items-center justify-center gap-1"
                      title="تولید کد دعوت"
                    >
                      <FaKey />
                      کد دعوت
                    </button>
                    {group.isOwner && (
                      <>
                        <button
                          onClick={() => fetchSharingSettings(group._id)}
                          className="btn-dark text-sm py-2 px-3"
                          title="تنظیمات اشتراک‌گذاری"
                        >
                          <FaCog />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group._id)}
                          className="btn-dark text-red-500 hover:bg-red-500/10 text-sm py-2 px-3"
                          title="حذف گروه"
                        >
                          <FaTrash />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => handleLeaveGroup(group._id)}
                    className="flex-1 btn-dark text-red-400 text-sm py-2"
                  >
                    خروج از گروه
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* مودال ایجاد گروه */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card-dark w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">ایجاد گروه جدید</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">نام گروه *</label>
                <input
                  type="text"
                  className="input-dark"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                  placeholder="مثال: گروه صراف‌های تهران"
                  required
                />
              </div>

              <div>
                <label className="block text-dark-400 text-sm mb-2">توضیحات</label>
                <textarea
                  className="input-dark"
                  rows={3}
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                  placeholder="توضیحات گروه (اختیاری)"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-dark-400 text-sm">تنظیمات حریم خصوصی</label>

                <label className="flex items-center gap-2 text-dark-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newGroup.privacy.membersVisible}
                    onChange={(e) => setNewGroup({
                      ...newGroup,
                      privacy: {...newGroup.privacy, membersVisible: e.target.checked}
                    })}
                    className="rounded bg-dark-700 border-dark-600"
                  />
                  <span className="text-sm">اعضا بتوانند همدیگر را ببینند</span>
                </label>

                <label className="flex items-center gap-2 text-dark-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newGroup.privacy.showGroupName}
                    onChange={(e) => setNewGroup({
                      ...newGroup,
                      privacy: {...newGroup.privacy, showGroupName: e.target.checked}
                    })}
                    className="rounded bg-dark-700 border-dark-600"
                  />
                  <span className="text-sm">نام گروه برای اعضا نمایش داده شود</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn-dark"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 btn-gold flex items-center justify-center gap-2"
                >
                  {creating ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                  {creating ? 'در حال ایجاد...' : 'ایجاد گروه'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال پیوستن به گروه */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card-dark w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">پیوستن به گروه</h2>
              <button onClick={() => setShowJoinModal(false)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleJoinGroup} className="space-y-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">کد دعوت</label>
                <input
                  type="text"
                  className="input-dark text-center text-xl tracking-widest font-mono"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  required
                />
                <p className="text-dark-500 text-xs mt-2 text-center">
                  کد دعوت 8 کاراکتری را از مالک گروه دریافت کنید
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 btn-dark"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="flex-1 btn-gold flex items-center justify-center gap-2"
                >
                  {joining ? <FaSpinner className="animate-spin" /> : <FaSignInAlt />}
                  {joining ? 'در حال پیوستن...' : 'پیوستن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال تنظیمات اشتراک‌گذاری */}
      {showSharingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card-dark w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">تنظیمات اشتراک‌گذاری مشتری</h2>
              <button onClick={() => setShowSharingModal(null)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-6">
              {/* فعال/غیرفعال */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sharingSettings.enabled}
                    onChange={(e) => setSharingSettings({ ...sharingSettings, enabled: e.target.checked })}
                    className="w-5 h-5 rounded bg-dark-700 border-dark-600"
                  />
                  <span className="text-white">فعال‌سازی اشتراک‌گذاری مشتری در این گروه</span>
                </label>
                <p className="text-dark-500 text-xs mt-1 mr-8">
                  با فعال‌سازی این گزینه، اعضا می‌توانند مشتریان خود را با گروه به اشتراک بگذارند
                </p>
              </div>

              {sharingSettings.enabled && (
                <>
                  {/* حالت فعال‌سازی */}
                  <div>
                    <label className="block text-dark-400 text-sm mb-2">حالت فعال‌سازی اشتراک‌گذاری</label>
                    <select
                      className="input-dark"
                      value={sharingSettings.activationMode}
                      onChange={(e) => setSharingSettings({ ...sharingSettings, activationMode: e.target.value })}
                    >
                      <option value="manual">دستی - صراف خودش فعال می‌کند</option>
                      <option value="always">همیشه فعال</option>
                      <option value="scheduled">زمان‌بندی شده</option>
                      <option value="offline">وقتی آفلاین می‌شود</option>
                    </select>
                  </div>

                  {/* تنظیمات زمان‌بندی */}
                  {sharingSettings.activationMode === 'scheduled' && (
                    <div className="bg-dark-800 p-4 rounded-lg space-y-3">
                      <label className="block text-dark-400 text-sm">زمان‌بندی</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-dark-500 text-xs mb-1">از ساعت</label>
                          <input
                            type="time"
                            className="input-dark"
                            value={sharingSettings.schedule?.startTime || '09:00'}
                            onChange={(e) => setSharingSettings({
                              ...sharingSettings,
                              schedule: { ...sharingSettings.schedule, startTime: e.target.value }
                            })}
                          />
                        </div>
                        <div>
                          <label className="block text-dark-500 text-xs mb-1">تا ساعت</label>
                          <input
                            type="time"
                            className="input-dark"
                            value={sharingSettings.schedule?.endTime || '17:00'}
                            onChange={(e) => setSharingSettings({
                              ...sharingSettings,
                              schedule: { ...sharingSettings.schedule, endTime: e.target.value }
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* تنظیمات آفلاین */}
                  {sharingSettings.activationMode === 'offline' && (
                    <div className="bg-dark-800 p-4 rounded-lg">
                      <label className="block text-dark-400 text-sm mb-2">
                        فعال‌سازی بعد از چند دقیقه غیرفعالی
                      </label>
                      <input
                        type="number"
                        className="input-dark"
                        min={1}
                        max={120}
                        value={sharingSettings.offlineSettings?.inactiveMinutes || 10}
                        onChange={(e) => setSharingSettings({
                          ...sharingSettings,
                          offlineSettings: { inactiveMinutes: parseInt(e.target.value) || 10 }
                        })}
                      />
                    </div>
                  )}

                  {/* تنظیمات اسپرد */}
                  <div className="bg-dark-800 p-4 rounded-lg space-y-3">
                    <label className="block text-dark-400 text-sm">تنظیمات اسپرد</label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sharingSettings.spreadSettings?.executorAddsSpread !== false}
                        onChange={(e) => setSharingSettings({
                          ...sharingSettings,
                          spreadSettings: { ...sharingSettings.spreadSettings, executorAddsSpread: e.target.checked }
                        })}
                        className="rounded bg-dark-700 border-dark-600"
                      />
                      <span className="text-dark-400 text-sm">صراف اجراکننده می‌تواند اسپرد اضافه کند</span>
                    </label>
                    {sharingSettings.spreadSettings?.executorAddsSpread !== false && (
                      <div>
                        <label className="block text-dark-500 text-xs mb-1">حداکثر اسپرد مجاز (%)</label>
                        <input
                          type="number"
                          className="input-dark"
                          min={0}
                          max={20}
                          step={0.5}
                          value={sharingSettings.spreadSettings?.maxExecutorSpread || 5}
                          onChange={(e) => setSharingSettings({
                            ...sharingSettings,
                            spreadSettings: { ...sharingSettings.spreadSettings, maxExecutorSpread: parseFloat(e.target.value) || 5 }
                          })}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSharingModal(null)}
                  className="flex-1 btn-dark"
                >
                  انصراف
                </button>
                <button
                  onClick={saveSharingSettings}
                  className="flex-1 btn-gold"
                >
                  ذخیره تنظیمات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
