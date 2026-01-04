import { useState, useEffect, useRef } from 'react';
import {
  FaReceipt, FaPlus, FaUpload, FaCheck, FaTimes, FaFile, FaImage,
  FaFilePdf, FaDownload, FaEdit, FaEye, FaFilter, FaSearch
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';

const SarafiReceipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [filter, setFilter] = useState({ type: '', status: '' });
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef(null);

  // محدودیت‌های فایل آپلود
  const MAX_FILES = 10;
  const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
  const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg'];

  const [formData, setFormData] = useState({
    tradeId: '',
    type: 'rial',
    collectionMethod: 'bank_transfer',
    accountHolder: { name: '', bank: '', accountNumber: '', iban: '' },
    amount: '',
    bankTrackingNumber: '',
    transactionDate: '',
    description: '',
    files: []
  });

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
    pending: { label: 'در انتظار تایید', class: 'bg-yellow-500/20 text-yellow-500' },
    confirmed: { label: 'تایید شده', class: 'bg-green-500/20 text-green-500' },
    rejected: { label: 'رد شده', class: 'bg-red-500/20 text-red-500' },
    final: { label: 'نهایی', class: 'bg-gold/20 text-gold' }
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = Object.fromEntries(Object.entries(filter).filter(([_, v]) => v));
      const [receiptsRes, tradesRes] = await Promise.all([
        api.get('/receipts', { params }),
        api.get('/trades/sarafi/trades', { params: { status: 'pending,approved,pending_collection,processing,awaiting_currency,awaiting_rial' } })
      ]);
      setReceipts(receiptsRes.data.data || []);
      setTrades(tradesRes.data.data || []);
    } catch (error) {
      toast.error('خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + formData.files.length > MAX_FILES) {
      toast.error(`حداکثر ${MAX_FILES} فایل مجاز است`);
      return;
    }

    // اعتبارسنجی فایل‌ها
    const validFiles = files.filter(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        toast.error(`فرمت ${file.name} مجاز نیست. فقط PDF/JPG/JPEG`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`حجم ${file.name} بیشتر از 200MB است`);
        return false;
      }
      return true;
    });

    setFormData(prev => ({
      ...prev,
      files: [...prev.files, ...validFiles]
    }));
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.tradeId || !formData.amount || !formData.accountHolder.name) {
      toast.error('اطلاعات ناقص است');
      return;
    }
    if (formData.files.length === 0) {
      toast.error('حداقل یک فایل الزامی است');
      return;
    }

    try {
      setUploadingFiles(true);
      const data = new FormData();
      data.append('tradeId', formData.tradeId);
      data.append('type', formData.type);
      data.append('collectionMethod', formData.collectionMethod);
      data.append('accountHolder', JSON.stringify(formData.accountHolder));
      data.append('amount', formData.amount);
      data.append('bankTrackingNumber', formData.bankTrackingNumber);
      data.append('transactionDate', formData.transactionDate);
      data.append('description', formData.description);

      formData.files.forEach(file => {
        data.append('files', file);
      });

      await api.post('/receipts', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('رسید ثبت شد');
      closeModal();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ثبت');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleStatusChange = async (receiptId, action) => {
    try {
      await api.put(`/receipts/${receiptId}/status`, { action });
      toast.success('وضعیت تغییر کرد');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({
      tradeId: '',
      type: 'rial',
      collectionMethod: 'bank_transfer',
      accountHolder: { name: '', bank: '', accountNumber: '', iban: '' },
      amount: '',
      bankTrackingNumber: '',
      transactionDate: '',
      description: '',
      files: []
    });
  };

  const formatNumber = (num) => new Intl.NumberFormat('fa-IR').format(num || 0);

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
          <p className="text-dark-400 text-sm mt-1">ثبت و پیگیری رسیدهای ریالی و ارزی</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-gold flex items-center gap-2"
        >
          <FaPlus />
          رسید جدید
        </button>
      </div>

      {/* فیلترها */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            {[
              { value: '', label: 'همه' },
              { value: 'rial', label: 'ریالی' },
              { value: 'currency', label: 'ارزی' }
            ].map(t => (
              <button
                key={t.value}
                onClick={() => setFilter(prev => ({ ...prev, type: t.value }))}
                className={`px-4 py-2 rounded-lg ${
                  filter.type === t.value ? 'bg-gold text-dark-900' : 'bg-dark-800 text-dark-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {Object.entries(statusLabels).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setFilter(prev => ({ ...prev, status: prev.status === key ? '' : key }))}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter.status === key ? 'bg-gold text-dark-900' : 'bg-dark-800 text-dark-400'
                }`}
              >
                {label}
              </button>
            ))}
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
                <th className="text-right p-4 text-dark-400">معامله</th>
                <th className="text-right p-4 text-dark-400">نوع</th>
                <th className="text-right p-4 text-dark-400">روش</th>
                <th className="text-right p-4 text-dark-400">مبلغ</th>
                <th className="text-right p-4 text-dark-400">صاحب حساب</th>
                <th className="text-center p-4 text-dark-400">فایل‌ها</th>
                <th className="text-center p-4 text-dark-400">وضعیت</th>
                <th className="text-center p-4 text-dark-400">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center p-8 text-dark-500">
                    رسیدی وجود ندارد
                  </td>
                </tr>
              ) : (
                receipts.map((receipt) => {
                  const status = statusLabels[receipt.status] || statusLabels.draft;
                  return (
                    <tr key={receipt._id} className="border-t border-dark-800 hover:bg-dark-800/50">
                      <td className="p-4">
                        <span className="text-gold font-mono">{receipt.receiptNumber}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-white text-sm">{receipt.trade?.tradeNumber}</span>
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
                          {receipt.files?.length || 0} فایل
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs ${status.class}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedReceipt(receipt)}
                            className="p-2 rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                            title="مشاهده"
                          >
                            <FaEye />
                          </button>
                          {receipt.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(receipt._id, 'confirm')}
                                className="p-2 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30"
                                title="تایید"
                              >
                                <FaCheck />
                              </button>
                              <button
                                onClick={() => handleStatusChange(receipt._id, 'reject')}
                                className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30"
                                title="رد"
                              >
                                <FaTimes />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال ایجاد رسید */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">ثبت رسید جدید</h2>
              <button onClick={closeModal} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-300 mb-2">معامله مرتبط *</label>
                  <select
                    value={formData.tradeId}
                    onChange={(e) => setFormData({ ...formData, tradeId: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">انتخاب کنید</option>
                    {trades.map(trade => (
                      <option key={trade._id} value={trade._id}>
                        {trade.tradeNumber} - {trade.customer?.firstName} {trade.customer?.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-dark-300 mb-2">نوع رسید</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input w-full"
                  >
                    <option value="rial">ریالی</option>
                    <option value="currency">ارزی</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-300 mb-2">روش وصول</label>
                  <select
                    value={formData.collectionMethod}
                    onChange={(e) => setFormData({ ...formData, collectionMethod: e.target.value })}
                    className="input w-full"
                  >
                    {Object.entries(collectionMethods).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-dark-300 mb-2">مبلغ *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="input w-full"
                    placeholder={formData.type === 'rial' ? 'ریال' : 'ارز'}
                  />
                </div>
              </div>

              <div className="bg-dark-800 rounded-xl p-4">
                <h4 className="text-white font-medium mb-3">اطلاعات صاحب حساب *</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-dark-400 text-sm mb-1">نام</label>
                    <input
                      type="text"
                      value={formData.accountHolder.name}
                      onChange={(e) => setFormData({
                        ...formData,
                        accountHolder: { ...formData.accountHolder, name: e.target.value }
                      })}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-400 text-sm mb-1">بانک</label>
                    <input
                      type="text"
                      value={formData.accountHolder.bank}
                      onChange={(e) => setFormData({
                        ...formData,
                        accountHolder: { ...formData.accountHolder, bank: e.target.value }
                      })}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-400 text-sm mb-1">شماره حساب</label>
                    <input
                      type="text"
                      value={formData.accountHolder.accountNumber}
                      onChange={(e) => setFormData({
                        ...formData,
                        accountHolder: { ...formData.accountHolder, accountNumber: e.target.value }
                      })}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-400 text-sm mb-1">شبا</label>
                    <input
                      type="text"
                      value={formData.accountHolder.iban}
                      onChange={(e) => setFormData({
                        ...formData,
                        accountHolder: { ...formData.accountHolder, iban: e.target.value }
                      })}
                      className="input w-full"
                      placeholder="IR..."
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-300 mb-2">شماره پیگیری بانکی</label>
                  <input
                    type="text"
                    value={formData.bankTrackingNumber}
                    onChange={(e) => setFormData({ ...formData, bankTrackingNumber: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-dark-300 mb-2">تاریخ تراکنش</label>
                  <input
                    type="datetime-local"
                    value={formData.transactionDate}
                    onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-dark-300 mb-2">توضیحات</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full"
                  rows="2"
                />
              </div>

              {/* آپلود فایل */}
              <div>
                <label className="block text-dark-300 mb-2">
                  فایل‌های پیوست * <span className="text-dark-500 text-sm">(حداکثر 10 فایل)</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-dark-700 rounded-xl p-8 text-center cursor-pointer hover:border-gold/50 transition-colors"
                >
                  <FaUpload className="text-3xl text-dark-500 mx-auto mb-3" />
                  <p className="text-dark-400">برای آپلود کلیک کنید یا فایل‌ها را بکشید</p>
                  <p className="text-dark-500 text-sm mt-1">JPG, PNG, PDF تا 5MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {formData.files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {formData.files.map((file, idx) => {
                      const Icon = getFileIcon(file.name);
                      return (
                        <div key={idx} className="flex items-center justify-between bg-dark-800 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <Icon className="text-gold" />
                            <span className="text-white text-sm">{file.name}</span>
                            <span className="text-dark-500 text-xs">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            onClick={() => removeFile(idx)}
                            className="text-red-500 hover:text-red-400"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleSubmit}
                disabled={uploadingFiles}
                className="btn-gold flex-1 flex items-center justify-center gap-2"
              >
                {uploadingFiles ? (
                  <>
                    <div className="loading-spinner w-4 h-4"></div>
                    در حال آپلود...
                  </>
                ) : (
                  <>
                    <FaUpload />
                    ثبت رسید
                  </>
                )}
              </button>
              <button onClick={closeModal} className="btn-outline flex-1">
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال مشاهده جزئیات */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">جزئیات رسید</h2>
              <button onClick={() => setSelectedReceipt(null)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-500 text-sm">شماره رسید</label>
                  <p className="text-gold font-mono">{selectedReceipt.receiptNumber}</p>
                </div>
                <div>
                  <label className="text-dark-500 text-sm">نوع</label>
                  <p className="text-white">{selectedReceipt.type === 'rial' ? 'ریالی' : 'ارزی'}</p>
                </div>
                <div>
                  <label className="text-dark-500 text-sm">مبلغ</label>
                  <p className="text-white font-bold">{formatNumber(selectedReceipt.amount)}</p>
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

              {selectedReceipt.files?.length > 0 && (
                <div>
                  <label className="text-dark-500 text-sm mb-2 block">فایل‌های پیوست</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                          <span className="text-white text-sm truncate">{file.originalName}</span>
                          <FaDownload className="text-dark-500 mr-auto" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedReceipt.description && (
                <div>
                  <label className="text-dark-500 text-sm">توضیحات</label>
                  <p className="text-white">{selectedReceipt.description}</p>
                </div>
              )}
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

export default SarafiReceipts;
