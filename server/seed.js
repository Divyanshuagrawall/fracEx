require('dotenv').config();
const mongoose = require('mongoose');
const Asset = require('./models/Asset');

const assets = [
  { symbol: 'AAPL', name: 'Apple Inc.', currentPrice: 185 },
  { symbol: 'TSLA', name: 'Tesla Inc.', currentPrice: 250 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', currentPrice: 140 },
];

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await Asset.deleteMany({}); // clear existing assets
  await Asset.insertMany(assets);
  console.log('Assets seeded successfully');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});