const Order = require('../models/Order');
const Asset = require('../models/Asset');
const Wallet = require('../models/Wallet');
const orderQueue = require('../config/queue');

const placeOrder = async (req, res) => {
  try {
    const { assetSymbol, type, orderType, price, quantity } = req.body;
    const userId = req.userId;

    if (orderType === 'limit' && !price) {
      return res.status(400).json({ message: 'Limit orders require a price' });
    }

    const asset = await Asset.findOne({ symbol: assetSymbol });
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    const wallet = await Wallet.findOne({ user: userId });

    if (orderType === 'limit' && !price) {
      return res.status(400).json({ message: 'Limit orders require a price' });
    }

    if (orderType === 'limit' && price <= 0) {
      return res.status(400).json({ message: 'Price must be greater than zero' });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than zero' });
    }

    if (!Number.isInteger(quantity)) {
      return res.status(400).json({ message: 'Quantity must be a whole number' });
    }

    if (type === 'sell') {
      const holding = wallet.holdings.find(h => h.asset === assetSymbol);
      const availableQty = holding ? holding.quantity - (holding.reservedQuantity || 0) : 0;

      if (availableQty < quantity) {
        return res.status(400).json({ message: 'Insufficient available holdings to place this sell order' });
      }

      holding.reservedQuantity = (holding.reservedQuantity || 0) + quantity;
      await wallet.save();
    }

    let reservedAmount = 0;
    if (type === 'buy') {
      const reservePrice = orderType === 'limit' ? price : asset.currentPrice;
      reservedAmount = reservePrice * quantity;
      const availableCash = wallet.cashBalance - wallet.reservedCash;

      if (availableCash < reservedAmount) {
        return res.status(400).json({ message: 'Insufficient available funds to place this buy order' });
      }

      wallet.reservedCash += reservedAmount;
      await wallet.save();
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
      reservedAmount,
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

    const wallet = await Wallet.findOne({ user: order.user });

    if (order.type === 'buy') {
      wallet.reservedCash = Math.max(0, wallet.reservedCash - order.reservedAmount);
      order.reservedAmount = 0;
    } else {
      const asset = await Asset.findById(order.asset);
      const holding = wallet.holdings.find(h => h.asset === asset.symbol);
      if (holding) {
        holding.reservedQuantity = Math.max(0, (holding.reservedQuantity || 0) - order.remainingQuantity);
      }
    }
    await wallet.save();

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