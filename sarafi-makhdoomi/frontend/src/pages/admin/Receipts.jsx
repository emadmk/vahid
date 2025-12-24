import { useState, useEffect } from 'react';
import {
  FaReceipt, FaFilter, FaEye, FaCheck, FaTimes, FaDownload,
  FaFile, FaImage, FaFilePdf
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AdminReceipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sarafis, setSarafis] = useState([]);
  const [filters, setFilters] = useState({
    sarafiId: '',
    type: '',
    status: ''
  });
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [stats, setStats] = useState({});

  const collectionMethods = {
    bank_transfer: 'انتقال بانکی',
    cash: 'نقدی',
    hawala: 'حواله',
    check: 'چک',
    barter: 'تهاتر',
    swift: 'سوئیفت',
    internal_transfer: 'انتقال داخلی',
    other: 'سایر'
  };

  const statusLabels = {
    draft: { label: 'پیش‌نویس', class: 'bg-gray-500/20 text-gray-400' },
    submitted: { label: 'ثبت شده', class: 'bg-blue-500/20 text-blue-500' },
    pending: { label: 'در انتظار', class: 'bg-yellow-500/20 text-yellow-500' },
    confirmed: { label: 'تایید شده', class: 'bg-green-500/20 text-green-500' },
    rejected: { label: 'رد شده', class: 'bg-red-500/20 text-red-500' },
    final: { label: 'نهایی', class: 'bg-gold/20 text-gold' }
  };

  useEffect(() => {
    fetchSarafis();
    fetchReceipts();
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [filters]);

  const fetchSarafis = async () => {
    try {
      const res = await api.get('/admin/sarafis');
      setSarafis(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const params = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v));
      const res = await api.get('/admin/receipts', { params });
      setReceipts(res.data.data || []);

      // محاسبه آمار
      const receipts = res.data.data || [];
      setStats({
        total: receipts.length,
        rial: receipts.filter(r => r.type === 'rial').length,
        currency: receipts.filter(r => r.type === 'currency').length,
        pending: receipts.filter(r => r.status === 'pending').length,
        confirmed: receipts.filter(r => r.status === 'confirmed').length
      });
    } catch (error) {
      toast.error('خطا در دریافت رسیدها');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => new Intl.NumberFormat('fa-IR').format(num || 0);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return FaImage;
    if (ext === 'pdf') return FaFilePdf;
    return FaFile;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaReceipt className="text-gold" />
            مدیریت رسیدها
          </h1>
          <p className="text-dark-400 text-sm mt-1">نظارت بر رسیدهای همه صرافی‌ها</p>
        </div>
      </div>

      {/* آمار */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card p-4 text-center">
          <p className="text-dark-400 text-sm mb-1">کل رسیدها</p>
          <p className="text-white text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-green-500">
          <p className="text-dark-400 text-sm mb-1">ریالی</p>
          <p className="text-green-500 text-2xl font-bold">{stats.rial}</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-blue-500">
          <p className="text-dark-400 text-sm mb-1">ارزی</p>
          <p className="text-blue-500 text-2xl font-bold">{stats.currency}</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-yellow-500">
          <p className="text-dark-400 text-sm mb-1">در انتظار</p>
          <p className="text-yellow-500 text-2xl font-bold">{stats.pending}</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-gold">
          <p className="text-dark-400 text-sm mb-1">تایید شده</p>
          <p className="text-gold text-2xl font-bold">{stats.confirmed}</p>
        </div>
      </div>

      {/* فیلترها */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-dark-400 text-sm mb-2">صرافی</label>
            <select
              value={filters.sarafiId}
              onChange={(e) => setFilters({ ...filters, sarafiId: e.target.value })}
              className="input w-full"
            >
              <option value="">همه صرافی‌ها</option>
              {sarafis.map(s => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-dark-400 text-sm mb-2">نوع</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="input w-full"
            >
              <option value="">همه</option>
              <option value="rial">ریالی</option>
              <option value="currency">ارزی</option>
            </select>
          </div>

          <div>
            <label className="block text-dark-400 text-sm mb-2">وضعیت</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input w-full"
            >
              <option value="">همه</option>
              {Object.entries(statusLabels).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* لیست رسیدها */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-800">
              <tr>
                <th className="text-right p-4 text-dark-400">شماره رسید</th>
                <th className="text-right p-4 text-dark-400">صرافی</th>
                <th className="text-right p-4 text-dark-400">معامله</th>
                <th className="text-right p-4 text-dark-400">نوع</th>
                <th className="text-right p-4 text-dark-400">روش</th>
                <th className="text-right p-4 text-dark-400">مبلغ</th>
                <th className="text-right p-4 text-dark-400">صاحب حساب</th>
                <th className="text-center p-4 text-dark-400">فایل‌ها</th>
                <th className="text-center p-4 text-dark-400">وضعیت</th>
                <th className="text-center p-4 text-dark-400">جزئیات</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center p-8 text-dark-500">
                    رسیدی وجود ندارد
                  </td>
                </tr>
              ) : (
                receipts.map((receipt) => {
                  const status = statusLabels[receipt.status] || statusLabels.draft;
                  return (
                    <tr key={receipt._id} className="border-t border-dark-800 hover:bg-dark-800/50">
                      <td className="p-4">
                        <span className="text-gold font-mono text-sm">{receipt.receiptNumber}</span>
                      </td>
                      <td className="p-4 text-white text-sm">
                        {receipt.sarafi?.firstName} {receipt.sarafi?.lastName}
                      </td>
                      <td className="p-4 text-dark-300 text-sm">
                        {receipt.trade?.tradeNumber}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          receipt.type === 'rial' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'
                        }`}>
                          {receipt.type === 'rial' ? 'ریالی' : 'ارزی'}
                        </span>
                      </td>
                      <td className="p-4 text-dark-300 text-sm">
                        {collectionMethods[receipt.collectionMethod]}
                      </td>
                      <td className="p-4 text-white font-medium">
                        {formatNumber(receipt.amount)}
                      </td>
                      <td className="p-4 text-dark-300 text-sm">
                        {receipt.accountHolder?.name}
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-dark-800 px-2 py-1 rounded text-sm">
                          {receipt.files?.length || 0}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs ${status.class}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedReceipt(receipt)}
                          className="p-2 rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                        >
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال جزئیات */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">جزئیات رسید</h2>
              <button onClick={() => setSelectedReceipt(null)} className="text-dark-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-500 text-sm">شماره رسید</label>
                  <p className="text-gold font-mono">{selectedReceipt.receiptNumber}</p>
                </div>
                <div>
                  <label className="text-dark-500 text-sm">وضعیت</label>
                  <p>
                    <span className={`px-3 py-1 rounded-full text-xs ${statusLabels[selectedReceipt.status]?.class}`}>
                      {statusLabels[selectedReceipt.status]?.label}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-500 text-sm">صرافی</label>
                  <p className="text-white">{selectedReceipt.sarafi?.firstName} {selectedReceipt.sarafi?.lastName}</p>
                </div>
                <div>
                  <label className="text-dark-500 text-sm">نوع</label>
                  <p className="text-white">{selectedReceipt.type === 'rial' ? 'ریالی' : 'ارزی'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-500 text-sm">مبلغ</label>
                  <p className="text-white font-bold text-lg">{formatNumber(selectedReceipt.amount)}</p>
                </div>
                <div>
                  <label className="text-dark-500 text-sm">روش وصول</label>
                  <p className="text-white">{collectionMethods[selectedReceipt.collectionMethod]}</p>
                </div>
              </div>

              <div className="bg-dark-800 rounded-xl p-4">
                <h4 className="text-white font-medium mb-2">صاحب حساب</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-dark-500">نام: </span>
                    <span className="text-white">{selectedReceipt.accountHolder?.name}</span>
                  </div>
                  <div>
                    <span className="text-dark-500">بانک: </span>
                    <span className="text-white">{selectedReceipt.accountHolder?.bank}</span>
                  </div>
                  <div>
                    <span className="text-dark-500">حساب: </span>
                    <span className="text-white">{selectedReceipt.accountHolder?.accountNumber}</span>
                  </div>
                  <div>
                    <span className="text-dark-500">شبا: </span>
                    <span className="text-white">{selectedReceipt.accountHolder?.iban}</span>
                  </div>
                </div>
              </div>

              {selectedReceipt.bankTrackingNumber && (
                <div>
                  <label className="text-dark-500 text-sm">شماره پیگیری</label>
                  <p className="text-white font-mono">{selectedReceipt.bankTrackingNumber}</p>
                </div>
              )}

              {selectedReceipt.files?.length > 0 && (
                <div>
                  <label className="text-dark-500 text-sm mb-2 block">فایل‌های پیوست</label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedReceipt.files.map((file, idx) => {
                      const Icon = getFileIcon(file.filename);
                      return (
                        <a
                          key={idx}
                          href={`/uploads/receipts/${file.filename}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-dark-800 rounded-lg p-3 hover:bg-dark-700"
                        >
                          <Icon className="text-gold" />
                          <span className="text-white text-sm truncate flex-1">{file.originalName}</span>
                          <FaDownload className="text-dark-500" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-dark-500">تاریخ ایجاد</label>
                  <p className="text-white">{formatDate(selectedReceipt.createdAt)}</p>
                </div>
                <div>
                  <label className="text-dark-500">ایجاد کننده</label>
                  <p className="text-white">
                    {selectedReceipt.createdBy?.firstName} {selectedReceipt.createdBy?.lastName}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedReceipt(null)}
              className="btn-outline w-full mt-6"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReceipts;
