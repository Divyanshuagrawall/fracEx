import { useState } from 'react';
import api from '../api/axios';

const OrderSidebar = ({ asset, onClose, onOrderPlaced }) => {
  const [type, setType] = useState('buy');
  const [orderType, setOrderType] = useState('limit');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/orders', {
        assetSymbol: asset.symbol,
        type,
        orderType,
        price: orderType === 'limit' ? Number(price) : undefined,
        quantity: Number(quantity),
      });
      setSuccess('Order placed!');
      setPrice('');
      setQuantity('');
      if (onOrderPlaced) onOrderPlaced();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order');
    }
  };

  return (
    <div className="fixed top-0 right-0 w-80 h-full bg-[#0f141b] border-l border-gray-800 p-6 shadow-2xl overflow-y-auto">
      <button
        onClick={onClose}
        className="text-sm text-gray-400 hover:text-white transition-colors mb-4"
      >
        Close
      </button>

      <h3 className="text-lg font-semibold text-white mb-1">Trade {asset.symbol}</h3>
      <p className="text-gray-500 text-sm mb-6">Current price: ${asset.currentPrice}</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full bg-[#151a23] text-white rounded-lg px-4 py-3 border border-gray-800 focus:outline-none focus:border-emerald-400"
        >
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>

        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value)}
          className="w-full bg-[#151a23] text-white rounded-lg px-4 py-3 border border-gray-800 focus:outline-none focus:border-emerald-400"
        >
          <option value="limit">Limit</option>
          <option value="market">Market</option>
        </select>

        {orderType === 'limit' && (
          <input
            type="number"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-full bg-[#151a23] text-white placeholder-gray-500 rounded-lg px-4 py-3 border border-gray-800 focus:outline-none focus:border-emerald-400"
          />
        )}

        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          className="w-full bg-[#151a23] text-white placeholder-gray-500 rounded-lg px-4 py-3 border border-gray-800 focus:outline-none focus:border-emerald-400"
        />

        <button
          type="submit"
          className="w-full bg-emerald-400 hover:bg-emerald-300 text-[#0a0e14] font-semibold rounded-lg py-3 transition-colors"
        >
          Place Order
        </button>
      </form>

      {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      {success && <p className="text-emerald-400 text-sm mt-4">{success}</p>}
    </div>
  );
};

export default OrderSidebar;