import { useState, useEffect } from 'react';
import api from '../api/axios';
import OrderSidebar from '../components/OrderSidebar';

const AssetsPage = () => {
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const fetchAssets = async () => {
    const res = await api.get('/assets');
    setAssets(res.data);
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  return (
    <div>
      <h2>Assets</h2>
      <table>
        <thead>
          <tr><th>Symbol</th><th>Name</th><th>Price</th><th></th></tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <tr key={a._id}>
              <td>{a.symbol}</td>
              <td>{a.name}</td>
              <td>${a.currentPrice}</td>
              <td><button onClick={() => setSelectedAsset(a)}>Trade</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedAsset && (
        <OrderSidebar
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onOrderPlaced={fetchAssets}
        />
      )}
    </div>
  );
};

export default AssetsPage;