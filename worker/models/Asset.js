const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  currentPrice: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Asset', assetSchema);