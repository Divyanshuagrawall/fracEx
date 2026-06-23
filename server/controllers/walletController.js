const Wallet = require('../models/Wallet');

const getMyWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.userId });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    res.status(200).json(wallet);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getMyWallet };