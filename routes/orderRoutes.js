// ====== routes/orderRoutes.js ======
const express = require('express');
const router = express.Router();
const { listMyOrders, cancelOrder } = require('../controllers/orderController');
const { isAuthenticated } = require('../middleware/auth');

router.get('/orders', isAuthenticated, listMyOrders);
router.post('/orders/:id/cancel', isAuthenticated, cancelOrder);

module.exports = router;