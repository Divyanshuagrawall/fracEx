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

    for (const restingOrder of restingOrders) {
    if (order.remainingQuantity <= 0) break;

    let attempts = 0;
    const maxAttempts = 3;
    let success = false;

    while (attempts < maxAttempts && !success) {
      attempts++;

      const freshOrder = await Order.findById(order._id);
      const freshRestingOrder = await Order.findById(restingOrder._id);
      const freshAsset = await Asset.findById(order.asset);

      if (!freshOrder || !freshRestingOrder || freshOrder.remainingQuantity <= 0 || freshRestingOrder.remainingQuantity <= 0) {
        success = true;
        break;
      }

      const tradedQty = Math.min(freshOrder.remainingQuantity, freshRestingOrder.remainingQuantity);
      const executionPrice = freshRestingOrder.price;
      const buyOrder = freshOrder.type === 'buy' ? freshOrder : freshRestingOrder;
      const sellOrder = freshOrder.type === 'sell' ? freshOrder : freshRestingOrder;

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const buyReservePrice = buyOrder.price ?? freshAsset.currentPrice;

          freshOrder.remainingQuantity -= tradedQty;
          freshOrder.status = freshOrder.remainingQuantity === 0 ? 'filled' : 'partial';
          freshRestingOrder.remainingQuantity -= tradedQty;
          freshRestingOrder.status = freshRestingOrder.remainingQuantity === 0 ? 'filled' : 'partial';

          if (freshOrder.type === 'buy') {
            freshOrder.reservedAmount = Math.max(0, freshOrder.reservedAmount - (buyReservePrice * tradedQty));
          }
          if (freshRestingOrder.type === 'buy') {
            freshRestingOrder.reservedAmount = Math.max(0, freshRestingOrder.reservedAmount - (buyReservePrice * tradedQty));
          }

          await freshOrder.save({ session });
          await freshRestingOrder.save({ session });

          freshAsset.currentPrice = executionPrice;
          await freshAsset.save({ session });

          const buyerWallet = await Wallet.findOne({ user: buyOrder.user }).session(session);
          const sellerWallet = await Wallet.findOne({ user: sellOrder.user }).session(session);

          if (!buyerWallet || !sellerWallet) {
            throw new Error(`Wallet missing — buyer: ${!!buyerWallet}, seller: ${!!sellerWallet}`);
          }

          const releasedReservation = buyReservePrice * tradedQty;
          buyerWallet.reservedCash = Math.max(0, buyerWallet.reservedCash - releasedReservation);

          buyerWallet.cashBalance -= tradedQty * executionPrice;
          const buyerHolding = buyerWallet.holdings.find(h => h.asset === freshAsset.symbol);
          if (buyerHolding) buyerHolding.quantity += tradedQty;
          else buyerWallet.holdings.push({ asset: freshAsset.symbol, quantity: tradedQty, reservedQuantity: 0 });

          sellerWallet.cashBalance += tradedQty * executionPrice;
          const sellerHolding = sellerWallet.holdings.find(h => h.asset === freshAsset.symbol);
          sellerHolding.quantity -= tradedQty;
          sellerHolding.reservedQuantity = Math.max(0, (sellerHolding.reservedQuantity || 0) - tradedQty);

          await buyerWallet.save({ session });
          await sellerWallet.save({ session });
        });

        console.log(`Matched ${tradedQty} @ ${executionPrice}. Incoming now ${freshOrder.status}, resting now ${freshRestingOrder.status}`);

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

        emitter.emit('priceUpdate', {
          assetId: freshAsset._id,
          symbol: freshAsset.symbol,
          price: executionPrice,
        });

        order.remainingQuantity = freshOrder.remainingQuantity;
        success = true;

      } catch (error) {
        if (error.name === 'VersionError') {
          console.warn(`Version conflict on attempt ${attempts}, retrying...`);
        } else {
          console.error('Transaction failed:', error.message);
          break;
        }
      } finally {
        await session.endSession();
      }
    }

    if (!success) {
      console.error(`Failed to match order ${order._id} against ${restingOrder._id} after ${maxAttempts} attempts`);
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