import { useState, useEffect } from 'react';
import { FaFilter } from 'react-icons/fa';
import { requestAPI, publicAPI } from '../../services/api';
import jalaliMoment from 'jalali-moment';

const PublicRequests = () => {
  const [requests, setRequests] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', currencyId: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    publicAPI.getRates().then(res => setCurrencies(res.data.data));
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [filter, page]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filter.type) params.type = filter.type;
      if (filter.currencyId) params.currencyId = filter.currencyId;

      const res = await requestAPI.getPublic(params);
      setRequests(res.data.data);
      setTotalPages(res.data.pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">درخواست‌های عمومی</h1>
      <p className="text-dark-400 mb-8">
        این درخواست‌ها توسط کاربران دیگر ثبت شده و برای همه قابل مشاهده است.
      </p>

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
          <p className="text-dark-500">درخواست عمومی یافت نشد</p>
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

              <div className="space-y-2 text-sm">
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

              <div className="mt-4 pt-4 border-t border-dark-700">
                <span className={`badge ${request.type === 'buy' ? 'badge-success' : 'badge-danger'}`}>
                  {request.type === 'buy' ? 'می‌خواهد بخرد' : 'می‌خواهد بفروشد'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* صفحه‌بندی */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`w-10 h-10 rounded-lg ${
                page === i + 1
                  ? 'bg-gold-500 text-dark-900'
                  : 'bg-dark-800 text-white hover:bg-dark-700'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicRequests;
