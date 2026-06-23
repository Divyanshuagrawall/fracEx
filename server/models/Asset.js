const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true }, // e.g. "AAPL"
  name: { type: String, required: true },                  // e.g. "Apple Inc."
  currentPrice: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Asset', assetSchema);