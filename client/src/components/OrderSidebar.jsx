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
    <div style={sidebarStyle}>
      <button onClick={onClose}>Close</button>
      <h3>Trade {asset.symbol}</h3>
      <p>Current price: ${asset.currentPrice}</p>
      <form onSubmit={handleSubmit}>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
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
          />
        )}
        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
        <button type="submit">Place Order</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
    </div>
  );
};

const sidebarStyle = {
  position: 'fixed',
  top: 0,
  right: 0,
  width: '320px',
  height: '100%',
  background: 'white',
  borderLeft: '1px solid #ccc',
  padding: '1rem',
  boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
};

export default OrderSidebar;