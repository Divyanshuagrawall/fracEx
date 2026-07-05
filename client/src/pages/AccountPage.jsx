import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const STATUS_TABS = ['all', 'pending', 'partial', 'filled', 'cancelled'];

const AccountPage = () => {
  const { token } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [orders, setOrders] = useState([]);
  const [assets, setAssets] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  const fetchWallet = async () => {
    const res = await api.get('/wallet');
    setWallet(res.data);
  };

  const fetchOrders = async () => {
    const res = await api.get('/orders');
    setOrders(res.data);
  };

  const fetchAssets = async () => {
    const res = await api.get('/assets');
    setAssets(res.data);
  };

  useEffect(() => {
    fetchWallet();
    fetchOrders();
    fetchAssets();
  }, []);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { 
      auth: { token },
      transports: ['polling', 'websocket'],
    });
    socket.on('orderFilled', () => {
      fetchWallet();
      fetchOrders();
    });
    socket.on('priceUpdate', ({ symbol, price }) => {
      setAssets((prev) =>
        prev.map((a) => (a.symbol === symbol ? { ...a, currentPrice: price } : a))
      );
    });
    return () => socket.disconnect();
  }, [token]);

  const handleCancel = async (orderId) => {
    await api.delete(`/orders/${orderId}`);
    fetchOrders();
  };

  const filteredOrders = activeTab === 'all'
    ? orders
    : orders.filter((o) => o.status === activeTab);

  const getPrice = (symbol) => {
    const asset = assets.find((a) => a.symbol === symbol);
    return asset ? asset.currentPrice : null;
  };

  const holdingsValue = wallet
    ? wallet.holdings.reduce((sum, h) => {
        const price = getPrice(h.asset);
        return price != null ? sum + h.quantity * price : sum;
      }, 0)
    : 0;

  const totalPortfolioValue = wallet ? wallet.cashBalance + holdingsValue : 0;

  const pricesReady = assets.length > 0;

  return (
    <div className="bg-[#0a0e14] min-h-screen p-8">
      <h2 className="text-xl font-semibold text-white mb-4">Wallet</h2>
      {wallet && (
        <div className="bg-[#0f141b] rounded-xl border border-gray-800 p-6 mb-10">
          <div className="flex gap-8 mb-4">
            <div>
              <p className="text-gray-500 text-xs mb-1">Available Cash</p>
              <p className="text-white text-lg font-semibold">
                ${(wallet.cashBalance - wallet.reservedCash).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Locked in Orders</p>
              <p className="text-yellow-400 text-lg font-semibold">
                ${wallet.reservedCash.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Total Cash</p>
              <p className="text-gray-400 text-lg font-semibold">
                ${wallet.cashBalance.toFixed(2)}
              </p>
            </div>
          </div>

          <ul className="space-y-1">
            {wallet.holdings.map((h) => (
              <li key={h.asset} className="text-gray-400 text-sm">
                <span className="text-white">{h.asset}</span>: {h.quantity - (h.reservedQuantity || 0)} available
                {h.reservedQuantity > 0 && (
                  <span className="text-yellow-400"> ({h.reservedQuantity} locked)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {wallet && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Portfolio Valuation</h2>
          <div className="bg-[#0f141b] rounded-xl border border-gray-800 p-6">
            <div className="mb-4">
              <p className="text-gray-500 text-xs mb-1">Total Portfolio Value</p>
              <p className="text-emerald-400 text-2xl font-semibold">
                {pricesReady ? `$${totalPortfolioValue.toFixed(2)}` : 'Loading...'}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Cash (${wallet.cashBalance.toFixed(2)}) + Holdings ($
                {pricesReady ? holdingsValue.toFixed(2) : '...'})
              </p>
            </div>

            {wallet.holdings.length > 0 && (
              <table className="w-full text-left mt-4">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-sm">
                    <th className="py-2 font-medium">Asset</th>
                    <th className="py-2 font-medium">Qty</th>
                    <th className="py-2 font-medium">Price</th>
                    <th className="py-2 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {wallet.holdings.map((h) => {
                    const price = getPrice(h.asset);
                    const value = price != null ? h.quantity * price : null;
                    return (
                      <tr key={h.asset} className="border-b border-gray-800 last:border-0">
                        <td className="py-2 text-white">{h.asset}</td>
                        <td className="py-2 text-gray-400">{h.quantity}</td>
                        <td className="py-2 text-gray-400">
                          {price != null ? `$${price.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2 text-gray-400">
                          {value != null ? `$${value.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold text-white mb-4">Orders</h2>
      <div className="flex gap-2 mb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-sm px-4 py-2 rounded-lg capitalize transition-colors ${activeTab === tab
                ? 'bg-emerald-400 text-[#0a0e14] font-semibold'
                : 'bg-[#151a23] text-gray-400 hover:text-white'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-[#0f141b] rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-sm">
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Order Type</th>
              <th className="px-6 py-4 font-medium">Price</th>
              <th className="px-6 py-4 font-medium">Qty</th>
              <th className="px-6 py-4 font-medium">Remaining</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o) => (
              <tr
                key={o._id}
                className="border-b border-gray-800 last:border-0 hover:bg-[#151a23] transition-colors"
              >
                <td className="px-6 py-4 text-white capitalize">{o.type}</td>
                <td className="px-6 py-4 text-gray-400 capitalize">{o.orderType}</td>
                <td className="px-6 py-4 text-gray-400">{o.price ?? '—'}</td>
                <td className="px-6 py-4 text-gray-400">{o.quantity}</td>
                <td className="px-6 py-4 text-gray-400">{o.remainingQuantity}</td>
                <td className="px-6 py-4 text-gray-400 capitalize">{o.status}</td>
                <td className="px-6 py-4">
                  {['pending', 'partial'].includes(o.status) && (
                    <button
                      onClick={() => handleCancel(o._id)}
                      className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccountPage;