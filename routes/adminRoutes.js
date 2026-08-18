// ====== routes/adminRoutes.js ======
const revenueController = require('../controllers/revenueController');
const discountController = require('../controllers/discountController');
const toppingController = require('../controllers/toppingController');
const chatController = require('../controllers/chatController');
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const Product = require('../models/Product');
const { isAuthenticated } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');

// ⚠️ MỌI route trong file này đều yêu cầu: đã đăng nhập (isAuthenticated) VÀ có role admin (isAdmin)
router.use(isAuthenticated, isAdmin);

// ---------- Dashboard ----------
router.get('/admin', adminController.showDashboard);
router.get('/admin/api/revenue', revenueController.getRevenueDashboard);

// ---------- Products ----------
router.get('/admin/products', adminController.listProducts);
router.get('/admin/products/new', adminController.showProductForm);
router.post('/admin/products', adminController.createProduct);

// Middleware nhỏ: load sẵn product theo :id, gán vào req.product để controller dùng chung cho form edit
async function loadProduct(req, res, next) {
  req.product = await Product.findById(req.params.id).lean();
  next();
}

router.get('/admin/products/:id/edit', loadProduct, adminController.showProductForm);
router.post('/admin/products/:id', adminController.updateProduct);
router.post('/admin/products/:id/delete', adminController.deleteProduct);
router.post('/admin/products/:id/restore', adminController.restoreProduct);

// ---------- Orders ----------
router.get('/admin/orders', adminController.listOrders);
router.post('/admin/orders/:id/refund', adminController.refundOrder);
router.post('/admin/orders/:id/status', adminController.updateOrderStatus);

// ---------- Users ----------
router.get('/admin/users', adminController.listUsers);
router.post('/admin/users/:id/toggle-role', adminController.toggleUserRole);

// ---------- Disscount ----------
router.get('/admin/discounts', discountController.listDiscounts);
router.post('/admin/discounts', discountController.createDiscount);
router.post('/admin/discounts/:id/toggle', discountController.toggleActive);
router.post('/admin/discounts/:id/delete', discountController.deleteDiscount);
// ---------- Toppings ----------
router.get('/admin/toppings', toppingController.listToppings);
router.post('/admin/toppings', toppingController.createTopping);
router.post('/admin/toppings/:id', toppingController.updateTopping);
router.post('/admin/toppings/:id/toggle', toppingController.toggleActive);
router.post('/admin/toppings/:id/delete', toppingController.deleteTopping);

// ---------- Messages ----------
router.get('/admin/messages', adminController.listMessages);
router.post('/admin/messages/:id/read', adminController.markMessageRead);

// ---------- Live Chat ----------
router.get('/admin/chat', chatController.showAdminChatPage);

module.exports = router;