// ====== routes/cartRoutes.js ======
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { isAuthenticated } = require('../middleware/auth');

// Trang giỏ hàng (render view với dữ liệu thật từ MongoDB) -> cần đăng nhập
router.get('/cart', isAuthenticated, cartController.showCartPage);

// Thêm sản phẩm vào giỏ hàng -> BẮT BUỘC đăng nhập
router.post('/cart/add', isAuthenticated, cartController.addToCart);

// Tăng/giảm số lượng 1 sản phẩm trong giỏ -> lưu DB ngay lập tức
router.post('/cart/update', isAuthenticated, cartController.updateQuantity);

// Xóa 1 sản phẩm khỏi giỏ hàng
router.post('/cart/remove', isAuthenticated, cartController.removeItem);

// Áp / gỡ mã giảm giá (chỉ preview trên giỏ hàng, chưa trừ lượt dùng thật)
router.post('/cart/apply-coupon', isAuthenticated, cartController.applyDiscount);
router.post('/cart/remove-coupon', isAuthenticated, cartController.removeDiscount);
router.get('/cart/coupons', isAuthenticated, cartController.listAvailableCoupons);

// Lấy dữ liệu giỏ hàng dạng JSON (dùng cho AJAX)
router.get('/api/cart', isAuthenticated, cartController.getCartData);

module.exports = router;