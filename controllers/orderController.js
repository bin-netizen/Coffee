// ====== controllers/orderController.js ======
const Order = require('../models/Order');

const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã huỷ'
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipping: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700'
};

const PAYMENT_LABELS = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  bank: 'Chuyển khoản ngân hàng'
};

// ---------- GET /orders (trang "Đơn hàng của tôi") ----------
async function listMyOrders(req, res) {
  try {
    // .lean() -> trả về plain JS object thay vì Mongoose Document.
    // Bắt buộc cần khi nhồi lại document (đặc biệt mảng subdocument như "items")
    // vào object literal mới rồi render qua Handlebars — nếu không, các field
    // bên trong mảng con dễ bị "biến mất" khi template cố duyệt qua chúng.
    const orders = await Order.find({ user: req.session.userId })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = orders.map((order) => ({
      _id: order._id.toString(),
      orderId: order.orderId,
      status: order.status,
      statusLabel: STATUS_LABELS[order.status] || order.status,
      statusColor: STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700',
      paymentLabel: PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod,
      // Tính sẵn lineTotal cho từng món ở server — tránh phải nhân trong template (Handlebars
      // không có phép nhân, đây cũng là lý do cột "Thành tiền" cũ bị lặp y hệt "Đơn giá").
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        lineTotal: item.price * item.quantity
      })),
      subtotal: order.subtotal,
      shipping: order.shipping,
      discount: order.discount || 0,
      total: order.total,
      customer: order.customer,
      isCancellable: order.status === 'pending',
      createdAt: new Date(order.createdAt).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));

    res.render('orders', {
      activePage: 'orders',
      orders: formatted,
      isEmpty: formatted.length === 0
    });

  } catch (error) {
    console.error('Lỗi tải danh sách đơn hàng:', error);
    res.render('orders', { activePage: 'orders', orders: [], isEmpty: true });
  }
}

// ---------- POST /orders/:id/cancel ----------
// Khách chỉ được tự hủy đơn khi đơn đang ở trạng thái "pending" (quán chưa xác nhận).
async function cancelOrder(req, res) {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.session.userId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã được xử lý, không thể tự hủy. Vui lòng liên hệ cửa hàng.'
      });
    }

    order.status = 'cancelled';
    await order.save();

    return res.json({ success: true, message: 'Đã hủy đơn hàng.' });

  } catch (error) {
    console.error('Lỗi hủy đơn hàng:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra, vui lòng thử lại.' });
  }
}

module.exports = { listMyOrders, cancelOrder };