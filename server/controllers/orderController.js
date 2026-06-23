const Order = require('../models/Order');
const Asset = require('../models/Asset');
const Wallet = require('../models/Wallet');
const orderQueue = require('../config/queue');

const placeOrder = async (req, res) => {
  try {
    const { assetSymbol, type, orderType, price, quantity } = req.body;
    const userId = req.userId;

    // validate orderType and price
    if (orderType === 'limit' && !price) {
      return res.status(400).json({ message: 'Limit orders require a price' });
    }

    const asset = await Asset.findOne({ symbol: assetSymbol });
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }
    if (type === 'sell') {
      const wallet = await Wallet.findOne({ user: userId });
      const holding = wallet.holdings.find(h => h.asset === assetSymbol);
      if (!holding || holding.quantity < quantity) {
        return res.status(400).json({ message: 'Insufficient holdings to place this sell order' });
      }
    }

    const order = await Order.create({
      user: userId,
      asset: asset._id,
      type,
      orderType,
      price: orderType === 'limit' ? price : undefined,
      quantity,
      remainingQuantity: quantity,
      status: 'pending',
    });
    await orderQueue.add('processOrder', { orderId: order._id });

    res.status(201).json({ message: 'Order placed', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    if (!['pending', 'partial'].includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel an order with status '${order.status}'` });
    }

    order.status = 'cancelled';
    await order.save();

    res.status(200).json({ message: 'Order cancelled', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.userId }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { placeOrder, cancelOrder, getMyOrders };

