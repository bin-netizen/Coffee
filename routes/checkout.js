// ====== routes/checkout.js ======
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const DiscountCode = require('../models/DiscountCode');
const { isAuthenticated } = require('../middleware/auth');
const { clearCart, computeShippingFee, computeDiscount } = require('../controllers/cartController');

// Regex số điện thoại Việt Nam — PHẢI khớp với pattern ở cart.hbs.
// Bắt buộc kiểm tra lại ở đây vì JS phía client có thể bị bypass (gọi thẳng API qua Postman).
const PHONE_REGEX = /^(03|05|07|08|09)[0-9]{8}$/;

function generateOrderId() {
  const random = Math.floor(Math.random() * 90000) + 10000;
  return 'CW' + random;
}

router.post('/api/checkout', isAuthenticated, async (req, res) => {
  try {
    const { customer, paymentMethod } = req.body;
    // ❌ KHÔNG lấy items/subtotal/shipping/discount/total từ req.body nữa

    if (!customer || !customer.fullname || !customer.phone || !customer.address) {
      return res.status(400).json({ error: 'Thiếu thông tin khách hàng.' });
    }

    // Validate SĐT ở server — bắt buộc, vì pattern HTML/JS ở form có thể bị bypass
    if (!PHONE_REGEX.test(customer.phone.trim())) {
      return res.status(400).json({ error: 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03/05/07/08/09).' });
    }

    // ✅ Lấy giỏ hàng THẬT từ DB, không tin dữ liệu client
    const cart = await Cart.findOne({ user: req.session.userId });
    const validItems = cart ? cart.getValidItems() : [];

    if (validItems.length === 0) {
      return res.status(400).json({ error: 'Giỏ hàng trống.' });
    }

    // ✅ Build lại items từ dữ liệu server, KHÔNG copy nguyên item client gửi
    // Giữ lại productId/size/toppings (đã có sẵn cấu trúc chuẩn trong Cart) để phục vụ
    // thống kê bán hàng theo sản phẩm/size/topping sau này — không cần parse chuỗi name.
    const orderItems = validItems.map((item) => ({
      name: item.name,
      price: item.unitPrice,   // giá đã được tính đúng ở bước addToCart (server-side)
      quantity: item.quantity,
      productId: item.productId,
      size: item.size,
      toppings: item.toppings
    }));

    const subtotal = cart.getSubtotal();
    const totalQuantity = cart.getTotalQuantity();
    const shipping = computeShippingFee(totalQuantity);

    // ✅ Tính lại discount TỪ ĐẦU ở server bằng đúng hàm dùng ở trang /cart —
    // KHÔNG nhận discountAmount client gửi lên (dễ bị sửa tay qua DevTools/Postman).
    const appliedCode = req.session.discountCode || null;
    const { amount: discountAmount, discount } = await computeDiscount(subtotal, totalQuantity, appliedCode);
    // Nếu mã không còn hợp lệ nữa (vd hết lượt đúng lúc này) -> discountAmount tự động = 0,
    // đơn hàng vẫn được tạo bình thường, chỉ là không được giảm giá — không chặn khách đặt hàng.

    const total = Math.max(0, subtotal + shipping - discountAmount);

    const orderId = generateOrderId();

    const newOrder = await Order.create({
      orderId,
      user: req.session.userId,
      customer,
      paymentMethod,
      items: orderItems,
      subtotal,
      shipping,
      discount: discountAmount,
      total
    });

    // Chỉ trừ lượt dùng khi mã THẬT SỰ có hiệu lực và đã được áp dụng vào đơn này
    if (discount && discountAmount > 0) {
      await DiscountCode.findByIdAndUpdate(discount._id, { $inc: { usedCount: 1 } });
    }

    // Dọn mã giảm giá khỏi session dù đơn có dùng mã hay không — tránh mã "dính" sang lần mua sau
    delete req.session.discountCode;

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