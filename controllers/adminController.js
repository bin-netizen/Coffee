// ====== controllers/adminController.js ======
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const ContactMessage = require('../models/ContactMessage');

// ========== DASHBOARD ==========
async function showDashboard(req, res) {
  try {
    const [totalProducts, totalUsers, totalOrders, orders] = await Promise.all([
      Product.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      Order.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(5).lean()
    ]);

    const totalRevenueResult = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: { $subtract: ['$subtotal', '$discount'] } } } }
    ]);
    const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

    res.render('admin/dashboard', {
      layout: 'admin',
      activeAdminPage: 'dashboard',
      totalProducts,
      totalUsers,
      totalOrders,
      totalRevenue: totalRevenue.toFixed(2),
      recentOrders: orders
    });

  } catch (error) {
    console.error('Lỗi dashboard:', error);
    res.render('admin/dashboard', { layout: 'admin', activeAdminPage: 'dashboard' });
  }
}

// ========== PRODUCTS CRUD ==========
async function listProducts(req, res) {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).lean();
    res.render('admin/products', { layout: 'admin', activeAdminPage: 'products', products });
  } catch (error) {
    console.error('Lỗi tải danh sách sản phẩm:', error);
    res.render('admin/products', { layout: 'admin', activeAdminPage: 'products', products: [] });
  }
}

function showProductForm(req, res) {
  // req.product được middleware/route gán sẵn nếu là edit (xem routes/adminRoutes.js)
  res.render('admin/product-form', {
    layout: 'admin',
    activeAdminPage: 'products',
    product: req.product || null,
    isEdit: !!req.product
  });
}

async function createProduct(req, res) {
  try {
    const { productId, name, category, basePrice, flavor, image, badge } = req.body;

    await Product.create({
      productId: productId.trim().toLowerCase().replace(/\s+/g, '-'),
      name,
      category,
      basePrice: parseFloat(basePrice),
      flavor,
      image: image || '/img/latte.png',
      badge: badge || 'none'
    });

    res.redirect('/admin/products');

  } catch (error) {
    console.error('Lỗi tạo sản phẩm:', error);
    res.render('admin/product-form', {
      layout: 'admin',
      activeAdminPage: 'products',
      isEdit: false,
      error: error.code === 11000 ? 'Mã sản phẩm (productId) đã tồn tại.' : 'Có lỗi xảy ra.'
    });
  }
}

async function updateProduct(req, res) {
  try {
    const { name, category, basePrice, flavor, image, badge, isActive } = req.body;

    await Product.findByIdAndUpdate(req.params.id, {
      name,
      category,
      basePrice: parseFloat(basePrice),
      flavor,
      image,
      badge,
      isActive: isActive === 'on' // checkbox HTML gửi 'on' khi được tick
    });

    res.redirect('/admin/products');

  } catch (error) {
    console.error('Lỗi cập nhật sản phẩm:', error);
    res.redirect('/admin/products');
  }
}

async function deleteProduct(req, res) {
  try {
    // Soft-delete: chỉ ẩn khỏi menu, KHÔNG xoá hẳn khỏi DB
    // (giữ lại vì các đơn hàng cũ vẫn tham chiếu tới sản phẩm này)
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Lỗi xoá sản phẩm:', error);
    res.redirect('/admin/products');
  }
}

async function restoreProduct(req, res) {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: true });
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Lỗi khôi phục sản phẩm:', error);
    res.redirect('/admin/products');
  }
}

// ========== ORDERS ==========
async function listOrders(req, res) {
  try {
    const statusFilter = req.query.status;
    const query = statusFilter ? { status: statusFilter } : {};

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate('user', 'email') // cần để hiện email khách trong modal chi tiết
      .lean();

    // Tính sẵn lineTotal cho từng món (Handlebars không có phép nhân),
    // và tách email ra field riêng cho dễ dùng trong template.
    const formatted = orders.map((order) => ({
      ...order,
      customerEmail: order.user && order.user.email ? order.user.email : null,
      items: (order.items || []).map((item) => ({
        ...item,
        lineTotal: item.price * item.quantity
      })),
      createdAtFormatted: new Date(order.createdAt).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));

    res.render('admin/orders', {
      layout: 'admin',
      activeAdminPage: 'orders',
      orders: formatted,
      currentFilter: statusFilter || 'all'
    });

  } catch (error) {
    console.error('Lỗi tải danh sách đơn hàng:', error);
    res.render('admin/orders', { layout: 'admin', activeAdminPage: 'orders', orders: [] });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { status } = req.body;
    await Order.findByIdAndUpdate(req.params.id, { status });
    res.redirect('/admin/orders');
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái đơn hàng:', error);
    res.redirect('/admin/orders');
  }
}

// ========== USERS ==========
async function listUsers(req, res) {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    res.render('admin/users', { layout: 'admin', activeAdminPage: 'users', users });
  } catch (error) {
    console.error('Lỗi tải danh sách người dùng:', error);
    res.render('admin/users', { layout: 'admin', activeAdminPage: 'users', users: [] });
  }
}

async function toggleUserRole(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.redirect('/admin/users');

    user.role = user.role === 'admin' ? 'customer' : 'admin';
    await user.save();

    res.redirect('/admin/users');
  } catch (error) {
    console.error('Lỗi đổi quyền người dùng:', error);
    res.redirect('/admin/users');
  }
}

// ========== MESSAGES (tin nhắn liên hệ) ==========
async function listMessages(req, res) {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 }).lean();
    res.render('admin/messages', { layout: 'admin', activeAdminPage: 'messages', messages });
  } catch (error) {
    console.error('Lỗi tải danh sách tin nhắn:', error);
    res.render('admin/messages', { layout: 'admin', activeAdminPage: 'messages', messages: [] });
  }
}

async function markMessageRead(req, res) {
  try {
    await ContactMessage.findByIdAndUpdate(req.params.id, { isRead: true });
    res.redirect('/admin/messages');
  } catch (error) {
    console.error('Lỗi đánh dấu đã đọc:', error);
    res.redirect('/admin/messages');
  }
}
// controllers/adminController.js — thêm hàm mới, và nhớ thêm refundOrder vào module.exports ở cuối file
async function refundOrder(req, res) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.redirect('/admin/orders');

    // Chỉ hoàn được đơn đã completed — chặn hoàn đơn pending/cancelled (không hợp lý nghiệp vụ)
    if (order.status !== 'completed') return res.redirect('/admin/orders');
    // Chặn hoàn 2 lần — tránh refundAmount cộng dồn sai, trừ doanh thu nhiều hơn thực tế
    if (order.isRefunded) return res.redirect('/admin/orders');

    order.isRefunded = true;
    order.refundedAt = new Date();
    order.refundAmount = Math.max(0, (order.subtotal || 0) - (order.discount || 0));
    await order.save();

    res.redirect('/admin/orders');
  } catch (error) {
    console.error('Lỗi hoàn tiền đơn hàng:', error);
    res.redirect('/admin/orders');
  }
}
module.exports = {
  showDashboard,
  listProducts,
  showProductForm,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  listOrders,
  updateOrderStatus,
  listUsers,
  toggleUserRole,
  listMessages,
  markMessageRead,
  refundOrder
};