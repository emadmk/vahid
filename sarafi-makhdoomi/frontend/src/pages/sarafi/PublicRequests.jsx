import { useState, useEffect } from 'react';
import { FaCheck } from 'react-icons/fa';
import { requestAPI, publicAPI } from '../../services/api';
import toast from 'react-hot-toast';
import jalaliMoment from 'jalali-moment';

const SarafiPublicRequests = () => {
  const [requests, setRequests] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', currencyId: '' });

  useEffect(() => {
    publicAPI.getRates().then(res => setCurrencies(res.data.data));
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await requestAPI.getPublic(filter);
      setRequests(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    if (!confirm('آیا این درخواست را می‌پذیرید؟')) return;
    try {
      await requestAPI.accept(id);
      toast.success('درخواست پذیرفته شد');
      fetchRequests();
    } catch (e) {
      toast.error('خطا');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">درخواست‌های عمومی</h1>
      <p className="text-dark-400 mb-6">این درخواست‌ها از سایر کاربران است و می‌توانید آنها را بپذیرید.</p>

      {/* فیلترها */}
      <div className="card-dark mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            className="input-dark w-auto"
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
          >
            <option value="">همه انواع</option>
            <option value="buy">خرید</option>
            <option value="sell">فروش</option>
          </select>
          <select
            className="input-dark w-auto"
            value={filter.currencyId}
            onChange={(e) => setFilter({ ...filter, currencyId: e.target.value })}
          >
            <option value="">همه ارزها</option>
            {currencies.map((c) => (
              <option key={c._id} value={c._id}>{c.nameFa}</option>
            ))}
          </select>
        </div>
      </div>

      {/* لیست */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="loading-spinner"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="card-dark text-center py-12">
          <p className="text-dark-500">درخواست عمومی موجود نیست</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((request) => (
            <div key={request._id} className="card-dark hover:border-gold-500/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{request.currency?.symbol}</span>
                <div>
                  <p className="text-white font-bold">
                    {request.type === 'buy' ? 'خرید' : 'فروش'} {request.currency?.nameFa}
                  </p>
                  <p className="text-dark-500 text-sm">
                    {jalaliMoment(request.createdAt).fromNow()}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-dark-500">مقدار:</span>
                  <span className="text-white font-bold">{request.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">نرخ:</span>
                  <span className="text-white">{request.rate?.toLocaleString()} تومان</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">مبلغ کل:</span>
                  <span className="text-gold-500 font-bold">{request.finalPrice?.toLocaleString()} تومان</span>
                </div>
              </div>

              <button
                onClick={() => handleAccept(request._id)}
                className="btn-gold w-full flex items-center justify-center gap-2"
              >
                <FaCheck /> پذیرش درخواست
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SarafiPublicRequests;
