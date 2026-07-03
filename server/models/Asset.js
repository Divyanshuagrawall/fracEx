const mongoose = require('mongoose');
const assetSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  currentPrice: { type: Number, required: true },
}, { timestamps: true, optimisticConcurrency: true });

module.exports = mongoose.model('asset', assetSchema);