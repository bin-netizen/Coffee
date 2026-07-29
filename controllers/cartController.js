// ====== controllers/cartController.js ======
const Cart = require('../models/Cart');

// ---------- POST /cart/add ----------
// Yêu cầu: đã đăng nhập (đi qua middleware isAuthenticated trước)
async function addToCart(req, res) {
  try {
    const userId = req.session.userId;
    const { productId, name, price, quantity } = req.body;

    if (!productId || !name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin sản phẩm.' });
    }

    const qtyToAdd = quantity && quantity > 0 ? quantity : 1;

    // Tìm giỏ hàng của user, nếu chưa có thì tạo mới
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // Nếu sản phẩm đã có trong giỏ -> tăng số lượng, chưa có -> thêm mới
    const existingItem = cart.items.find((item) => item.productId === productId);

    if (existingItem) {
      existingItem.quantity += qtyToAdd;
    } else {
      cart.items.push({ productId, name, price, quantity: qtyToAdd });
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      message: `Đã thêm "${name}" vào giỏ hàng.`,
      totalQuantity: cart.getTotalQuantity(),
      items: cart.items
    });

  } catch (error) {
    console.error('Lỗi thêm vào giỏ hàng:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra, vui lòng thử lại.' });
  }
}

// ---------- GET /api/cart ----------
// Trả JSON cho AJAX (đặt ở /api/cart để không đụng route trang /cart render view)
async function getCartData(req, res) {
  try {
    const userId = req.session.userId;
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.json({ success: true, items: [], totalQuantity: 0 });
    }

    return res.json({
      success: true,
      items: cart.items,
      totalQuantity: cart.getTotalQuantity()
    });

  } catch (error) {
    console.error('Lỗi lấy giỏ hàng:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra.' });
  }
}

// ---------- Dùng nội bộ: lấy số lượng giỏ hàng để hiển thị badge ở mọi trang ----------
// (được gọi trong middleware cartCount ở app.js, không phải 1 route)
async function getCartQuantityByUserId(userId) {
  if (!userId) return 0;
  const cart = await Cart.findOne({ user: userId });
  return cart ? cart.getTotalQuantity() : 0;
}

// ---------- GET /cart (render trang giỏ hàng với dữ liệu thật) ----------
async function showCartPage(req, res) {
  try {
    const userId = req.session.userId;
    const cart = await Cart.findOne({ user: userId });

    const items = cart ? cart.items : [];
    const SHIPPING_FEE = items.length > 0 ? 2.0 : 0;

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal + SHIPPING_FEE;

    res.render('cart', {
      activePage: 'cart',
      cartItems: items,
      isEmpty: items.length === 0,
      subtotal: subtotal.toFixed(2),
      shipping: SHIPPING_FEE.toFixed(2),
      total: total.toFixed(2)
    });

  } catch (error) {
    console.error('Lỗi hiển thị giỏ hàng:', error);
    res.render('cart', { activePage: 'cart', cartItems: [], isEmpty: true });
  }
}

// ---------- POST /cart/update (tăng/giảm số lượng, lưu DB ngay) ----------
async function updateQuantity(req, res) {
  try {
    const userId = req.session.userId;
    const { productId, action } = req.body; // action: 'increase' | 'decrease'

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: 'Giỏ hàng không tồn tại.' });

    const item = cart.items.find((i) => i.productId === productId);
    if (!item) return res.status(404).json({ success: false, message: 'Sản phẩm không có trong giỏ.' });

    if (action === 'increase') {
      item.quantity += 1;
    } else if (action === 'decrease') {
      item.quantity = Math.max(1, item.quantity - 1); // không cho xuống dưới 1
    }

    await cart.save();

    const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shipping = cart.items.length > 0 ? 2.0 : 0;

    return res.json({
      success: true,
      quantity: item.quantity,
      itemTotal: (item.price * item.quantity).toFixed(2),
      subtotal: subtotal.toFixed(2),
      shipping: shipping.toFixed(2),
      total: (subtotal + shipping).toFixed(2),
      totalQuantity: cart.getTotalQuantity()
    });

  } catch (error) {
    console.error('Lỗi cập nhật số lượng:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra.' });
  }
}

// ---------- POST /cart/remove (xóa 1 sản phẩm khỏi giỏ) ----------
async function removeItem(req, res) {
  try {
    const userId = req.session.userId;
    const { productId } = req.body;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: 'Giỏ hàng không tồn tại.' });

    cart.items = cart.items.filter((i) => i.productId !== productId);
    await cart.save();

    const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shipping = cart.items.length > 0 ? 2.0 : 0;

    return res.json({
      success: true,
      isEmpty: cart.items.length === 0,
      subtotal: subtotal.toFixed(2),
      shipping: shipping.toFixed(2),
      total: (subtotal + shipping).toFixed(2),
      totalQuantity: cart.getTotalQuantity()
    });

  } catch (error) {
    console.error('Lỗi xóa sản phẩm:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra.' });
  }
}

// ---------- Dùng nội bộ: xóa sạch giỏ hàng sau khi đặt hàng thành công ----------
async function clearCart(userId) {
  await Cart.findOneAndUpdate({ user: userId }, { items: [] });
}

module.exports = {
  addToCart,
  getCartData,
  getCartQuantityByUserId,
  showCartPage,
  updateQuantity,
  removeItem,
  clearCart
};