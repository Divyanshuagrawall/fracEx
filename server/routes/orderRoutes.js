const express = require('express');
const router = express.Router();
const { placeOrder , cancelOrder , getMyOrders } = require('../controllers/orderController');
const protect = require('../middleware/authMiddleware');

router.post('/', protect, placeOrder);
router.delete('/:id', protect, cancelOrder);
router.get('/', protect, getMyOrders);

module.exports = router;