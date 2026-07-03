const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  type: { type: String, enum: ['buy', 'sell'], required: true },
  orderType: { type: String, enum: ['limit', 'market'], required: true },
  price: { type: Number },
  quantity: { type: Number, required: true },
  remainingQuantity: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'partial', 'filled', 'cancelled'], default: 'pending' },
  reservedAmount: { type: Number, default: 0 },
}, { timestamps: true, optimisticConcurrency: true });

module.exports = mongoose.model('Order', orderSchema);