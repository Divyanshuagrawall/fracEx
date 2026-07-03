import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
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

  useEffect(()=>{
    const socket = io('http://localhost:5000');
    socket.on('priceUpdate', ({symbol, price})=>{
      setAssets((prev)=>
      prev.map((a)=>(a.symbol === symbol ? {...a, currentPrice: price} : a))
      );
    });
    return ()=>socket.disconnect();
  }, []);

  return (
    <div className="bg-[#0a0e14] min-h-screen p-8">
      <h2 className="text-xl font-semibold text-white mb-6">Assets</h2>

      <div className="bg-[#0f141b] rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-sm">
              <th className="px-6 py-4 font-medium">Symbol</th>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Price</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr
                key={a._id}
                className="border-b border-gray-800 last:border-0 hover:bg-[#151a23] transition-colors"
              >
                <td className="px-6 py-4 text-white font-medium">{a.symbol}</td>
                <td className="px-6 py-4 text-gray-400">{a.name}</td>
                <td className="px-6 py-4 text-white">${a.currentPrice}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setSelectedAsset(a)}
                    className="bg-emerald-400 hover:bg-emerald-300 text-[#0a0e14] font-semibold text-sm rounded-lg px-4 py-2 transition-colors"
                  >
                    Trade
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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