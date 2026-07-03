const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cashBalance: { type: Number, default: 10000 },
  reservedCash: { type: Number, default: 0 },
  holdings: [
    {
      asset: { type: String, required: true },
      quantity: { type: Number, default: 0 },
      reservedQuantity: { type: Number, default: 0 },
    }
  ]
}, { timestamps: true, optimisticConcurrency: true });

module.exports = mongoose.model('Wallet', walletSchema);

