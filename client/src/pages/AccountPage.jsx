import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const STATUS_TABS = ['all', 'pending', 'partial', 'filled', 'cancelled'];

const AccountPage = () => {
  const { token } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  const fetchWallet = async () => {
    const res = await api.get('/wallet');
    setWallet(res.data);
  };

  const fetchOrders = async () => {
    const res = await api.get('/orders');
    setOrders(res.data);
  };

  useEffect(() => {
    fetchWallet();
    fetchOrders();
  }, []);

  useEffect(() => {
    const socket = io('http://localhost:5000', { auth: { token } });
    socket.on('orderFilled', () => {
      fetchWallet();
      fetchOrders();
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

  return (
    <div>
      <h2>Wallet</h2>
      {wallet && (
        <div>
          <p>Cash: {wallet.cashBalance}</p>
          <ul>
            {wallet.holdings.map((h) => (
              <li key={h.asset}>{h.asset}: {h.quantity}</li>
            ))}
          </ul>
        </div>
      )}

      <h2>Orders</h2>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ fontWeight: activeTab === tab ? 'bold' : 'normal' }}
          >
            {tab}
          </button>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th>Type</th><th>Order Type</th><th>Price</th><th>Qty</th><th>Remaining</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((o) => (
            <tr key={o._id}>
              <td>{o.type}</td>
              <td>{o.orderType}</td>
              <td>{o.price ?? '—'}</td>
              <td>{o.quantity}</td>
              <td>{o.remainingQuantity}</td>
              <td>{o.status}</td>
              <td>
                {['pending', 'partial'].includes(o.status) && (
                  <button onClick={() => handleCancel(o._id)}>Cancel</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AccountPage;