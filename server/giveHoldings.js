require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Wallet = require('./models/Wallet');

const EMAIL = 'seller@fracex.com';
const QUANTITY = 10;
const SYMBOLS = ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN', 'NVDA', 'META', 'NFLX'];

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const user = await User.findOne({ email: EMAIL });
  if (!user) {
    console.log('User not found — register this account first via the UI.');
    process.exit(1);
  }

  const wallet = await Wallet.findOne({ user: user._id });
  if (!wallet) {
    console.log('Wallet not found for this user.');
    process.exit(1);
  }

  SYMBOLS.forEach(symbol => {
    const existing = wallet.holdings.find(h => h.asset === symbol);
    if (existing) {
      existing.quantity += QUANTITY;
    } else {
      wallet.holdings.push({ asset: symbol, quantity: QUANTITY, reservedQuantity: 0 });
    }
  });

  await wallet.save();
  console.log(`Added ${QUANTITY} shares each of: ${SYMBOLS.join(', ')} to ${EMAIL}`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});