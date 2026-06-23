require('dotenv').config();
const mongoose = require('mongoose');
const { Worker } = require('bullmq');
const Order = require('./models/Order');
const Asset = require('./models/Asset');
const Wallet = require('./models/Wallet');
const { Emitter } = require('@socket.io/redis-emitter');
const Redis = require('ioredis');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Worker: MongoDB connected'))
  .catch((err) => console.error('Worker: MongoDB connection error:', err.message));

const connection = {
    host:process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
};

const emitterRedisClient = new Redis({ host: process.env.REDIS_HOST, port: process.env.REDIS_PORT });
const emitter = new Emitter(emitterRedisClient);

const worker = new Worker('orders', async(job)=>{
    const { orderId } = job.data;
    const order = await Order.findById(orderId);
    if (!order || order.remainingQuantity <= 0) return;
    console.log('Fetched order:', order);

    const asset = await Asset.findById(order.asset)
    const oppositeType = order.type === 'buy' ? 'sell' : 'buy';

    const priceFilter = {};
    if(order.orderType === 'limit'){
      priceFilter.price = order.type === 'buy'
      ? {$lte : order.price}
      : {$gte : order.price};
    }

    const priceSortDirection = order.type === 'buy' ? 1 : -1;
    const restingOrders = await Order.find({
      asset:order.asset,
      type:oppositeType,
      status:{$in: ['pending', 'partial']}, 
      user: { $ne: order.user },
      ...priceFilter,
    }).sort({ price:priceSortDirection, createdAt:1});

    for(const restingOrder of restingOrders) {
      if (order.remainingQuantity <= 0) break;
      const tradedQty = Math.min(order.remainingQuantity, restingOrder.remainingQuantity);
      const executionPrice = restingOrder.price;
      const buyOrder = order.type === 'buy' ? order : restingOrder;
      const sellOrder = order.type === 'sell' ? order : restingOrder;

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async()=>{
          order.remainingQuantity -= tradedQty;
          order.status = order.remainingQuantity === 0 ? 'filled' : 'partial';
          restingOrder.remainingQuantity -= tradedQty;
          restingOrder.status = restingOrder.remainingQuantity === 0 ? 'filled' : 'partial';
          await order.save({ session });
          await restingOrder.save({ session });

          asset.currentPrice = executionPrice;
          await asset.save({ session });

          const buyerWallet = await Wallet.findOne({ user: buyOrder.user }).session(session);
          const sellerWallet = await Wallet.findOne({ user: sellOrder.user }).session(session);
          buyerWallet.cashBalance -= tradedQty * executionPrice;
          const buyerHolding = buyerWallet.holdings.find(h => h.asset === asset.symbol);
          if (buyerHolding) buyerHolding.quantity += tradedQty;
          else buyerWallet.holdings.push({ asset: asset.symbol, quantity: tradedQty });

          sellerWallet.cashBalance += tradedQty * executionPrice;
          const sellerHolding = sellerWallet.holdings.find(h => h.asset === asset.symbol);
          sellerHolding.quantity -= tradedQty;
          await buyerWallet.save({ session });
          await sellerWallet.save({ session });
        });
        console.log(`Matched ${tradedQty} @ ${executionPrice}. Incoming now ${order.status}, resting now ${restingOrder.status}`);

        emitter.to(buyOrder.user.toString()).emit('orderFilled', {
          orderId: buyOrder._id,
          tradedQty,
          executionPrice,
          side: 'buy',
        });

        emitter.to(sellOrder.user.toString()).emit('orderFilled', {
          orderId: sellOrder._id,
          tradedQty,
          executionPrice,
          side: 'sell',
        });

      } catch (error) {
        console.error('Transaction failed:', error.message);
        break;
      } finally {
        await session.endSession();
      }
    }
    




}, {connection});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

console.log('Worker process started, listening on "orders" queue...');