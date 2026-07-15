const express = require('express');
const router = express.Router();
const { placeOrder , cancelOrder , getMyOrders } = require('../controllers/orderController');
const protect = require('../middleware/authMiddleware');
const { tokenBucketLimiter } = require('../middleware/rateLimiter');

router.post('/', tokenBucketLimiter({ capacity: 10, refillRate: 2 }), protect, placeOrder);
router.delete('/:id', protect, cancelOrder);
router.get('/', protect, getMyOrders);
module.exports = router;