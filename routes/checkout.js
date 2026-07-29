// ====== routes/checkout.js ======
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { isAuthenticated } = require('../middleware/auth');
const { clearCart } = require('../controllers/cartController');

function generateOrderId() {
  const random = Math.floor(Math.random() * 90000) + 10000;
  return 'CW' + random;
}

// ⚠️ Thêm isAuthenticated: chỉ cho phép checkout khi đã đăng nhập,
// vì giờ giỏ hàng gắn liền với user, cần biết user nào để xóa cart sau khi đặt hàng
router.post('/api/checkout', isAuthenticated, async (req, res) => {
  try {
    const { customer, paymentMethod, items, subtotal, shipping, discount, total } = req.body;

    if (!customer || !customer.fullname || !customer.phone || !customer.address) {
      return res.status(400).json({ error: 'Thiếu thông tin khách hàng.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Giỏ hàng trống.' });
    }

    const orderId = generateOrderId();

    const newOrder = await Order.create({
      orderId,
      user: req.session.userId, // gắn đơn hàng với user đã đăng nhập
      customer,
      paymentMethod,
      items,
      subtotal,
      shipping,
      discount,
      total
    });

    // Xóa sạch giỏ hàng trong DB sau khi đặt hàng thành công
    await clearCart(req.session.userId);

    console.log('✅ Đơn hàng mới đã lưu vào MongoDB:', newOrder.orderId);

    return res.status(201).json({
      success: true,
      orderId: newOrder.orderId,
      message: 'Đặt hàng thành công'
    });

  } catch (error) {
    console.error('❌ Lỗi khi tạo đơn hàng:', error.message);
    return res.status(500).json({ error: 'Có lỗi xảy ra, vui lòng thử lại.' });
  }
});

router.get('/api/orders', isAuthenticated, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.session.userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Không thể tải danh sách đơn hàng.' });
  }
});

module.exports = router;