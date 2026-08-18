// ====== controllers/cartController.js ======
const Cart = require('../models/Cart');
const Topping = require('../models/Topping');
const Product = require('../models/Product');
const DiscountCode = require('../models/DiscountCode');
const {
  SIZE_OPTIONS,
  ICE_OPTIONS,
  SUGAR_OPTIONS,
  calculateUnitPrice
} = require('../config/products');

// Phí giao hàng cố định — chỉ sửa ở đây, không hardcode rải rác trong các hàm bên dưới
const SHIPPING_FEE = 30000;

// Số lượng sản phẩm tối thiểu (tính theo TỔNG SỐ LƯỢNG, không phải số loại) để được dùng mã giảm giá
// Đồng thời cũng là ngưỡng để MIỄN PHÍ SHIP — dùng chung 1 hằng số, tránh lệch ngưỡng giữa 2 tính năng.
const MIN_QUANTITY_FOR_DISCOUNT = 3;

// Helper: tính phí ship dựa trên tổng số lượng sản phẩm trong giỏ.
// - Giỏ trống -> 0đ
// - Từ MIN_QUANTITY_FOR_DISCOUNT sản phẩm trở lên -> miễn phí ship
// - Còn lại -> phí cố định SHIPPING_FEE
function computeShippingFee(totalQuantity) {
  if (totalQuantity <= 0) return 0;
  if (totalQuantity >= MIN_QUANTITY_FOR_DISCOUNT) return 0;
  return SHIPPING_FEE;
}

// Helper: kiểm tra + tính số tiền được giảm từ 1 mã, dùng chung cho cả trang /cart
// và (sau này) cho bước tạo đơn hàng thật — để không bị lệch logic giữa 2 nơi.
// Không tự ý sửa cart hay session ở đây — hàm này CHỈ tính toán, không có side-effect.
async function computeDiscount(subtotal, totalQuantity, code) {
  if (!code) return { amount: 0, error: null, discount: null };

  if (totalQuantity < MIN_QUANTITY_FOR_DISCOUNT) {
    return { amount: 0, error: `Cần mua tối thiểu ${MIN_QUANTITY_FOR_DISCOUNT} sản phẩm để dùng mã giảm giá.`, discount: null };
  }

  const discount = await DiscountCode.findOne({ code: code.toUpperCase().trim(), isActive: true });

  if (!discount) {
    return { amount: 0, error: 'Mã giảm giá không tồn tại hoặc đã bị vô hiệu hoá.', discount: null };
  }
  if (discount.expiryDate < new Date()) {
    return { amount: 0, error: 'Mã giảm giá đã hết hạn.', discount: null };
  }
  if (discount.usedCount >= discount.usageLimit) {
    return { amount: 0, error: 'Mã giảm giá đã hết lượt sử dụng.', discount: null };
  }
  if (subtotal < discount.minOrderValue) {
    return {
      amount: 0,
      error: `Đơn hàng cần tối thiểu ${discount.minOrderValue.toLocaleString('vi-VN')}đ để dùng mã này.`,
      discount: null
    };
  }

  let amount = 0;
  if (discount.discountType === 'percent') {
    amount = subtotal * (discount.discountValue / 100);
    if (discount.maxDiscountAmount) amount = Math.min(amount, discount.maxDiscountAmount);
  } else {
    amount = discount.discountValue;
  }
  amount = Math.min(amount, subtotal); // không để giảm nhiều hơn tổng tiền, tránh total âm

  return { amount, error: null, discount };
}

// Helper: tra label tiếng Việt từ code (dùng khi hiển thị ở trang /cart)
function findLabel(list, value) {
  const found = list.find((item) => item.value === value);
  return found ? found.label : null;
}

function isSameVariant(item, { size, ice, sugarLevel, toppingsDetail, note }) {
  const sameSize = item.size === (size || null);
  const sameIce = item.ice === (ice || null);
  const sameSugar = item.sugarLevel === (sugarLevel || null);
  const sameNote = (item.note || '') === (note || '');

  const a = [...(item.toppings || [])].map((t) => t.toppingId.toString()).sort().join(',');
  const b = [...(toppingsDetail || [])].map((t) => t.toppingId.toString()).sort().join(',');
  const sameToppings = a === b;

  return sameSize && sameIce && sameSugar && sameNote && sameToppings;
}
// ---------- POST /cart/add ----------
async function addToCart(req, res) {
  try {
    const userId = req.session.userId;
    const { productId, size, ice, sugarLevel, toppings, note, quantity } = req.body;

    const product = await Product.findOne({ productId, isActive: true });
    if (!product) {
      return res.status(400).json({ success: false, message: 'Sản phẩm không hợp lệ hoặc đã ngừng bán.' });
    }

    const isDrink = product.category !== 'dessert';
    const qtyToAdd = quantity && quantity > 0 ? quantity : 1;

    // Chuẩn hoá dữ liệu: dessert thì không có size/đá/đường/topping
    const normalizedSize = isDrink ? (size || 'S') : null;
    const normalizedIce = isDrink ? (ice || 'normal') : null;
    const normalizedSugar = isDrink ? (sugarLevel || 'normal') : null;
const normalizedToppingIds = isDrink && Array.isArray(toppings) ? toppings : [];
    const normalizedNote = (note || '').trim().slice(0, 200);

    // Tra giá THẬT từ DB theo id — chỉ lấy topping còn active
    // (nếu admin đã ẩn/xóa topping đó, nó sẽ tự bị bỏ qua, không tính tiền)
    const toppingDocs = normalizedToppingIds.length
      ? await Topping.find({ _id: { $in: normalizedToppingIds }, isActive: true })
      : [];

    const toppingsDetail = toppingDocs.map((t) => ({
      toppingId: t._id,
      name: t.name,
      price: t.price
    }));

    const toppingsTotal = toppingsDetail.reduce((sum, t) => sum + t.price, 0);

    // Tính giá THẬT ở server (không tin giá client gửi lên)
    const unitPrice = calculateUnitPrice(product, normalizedSize, toppingsTotal);

if (typeof unitPrice !== 'number' || isNaN(unitPrice)) {
  console.error('🔥 Lỗi giá:', {
    productId,
    normalizedSize,
  });

  return res.status(400).json({
    success: false,
    message: 'Không tính được giá sản phẩm'
  });
}
    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = new Cart({ user: userId, items: [] });

    // Tìm dòng đã tồn tại với CÙNG sản phẩm + CÙNG tuỳ chọn -> gộp số lượng
    const existingItem = cart.items.find(
      (item) =>
        item.productId === productId &&
        isSameVariant(item, {
          size: normalizedSize,
          ice: normalizedIce,
          sugarLevel: normalizedSugar,
          toppingsDetail: toppingsDetail,
          note: normalizedNote
        })
    );

    if (existingItem) {
      existingItem.quantity += qtyToAdd;
    } else {
      cart.items.push({
        productId,
        name: product.name,
        category: product.category,
        image: product.image,
        size: normalizedSize,
        ice: normalizedIce,
        sugarLevel: normalizedSugar,
        toppings: toppingsDetail,
        note: normalizedNote,
        unitPrice,
        quantity: qtyToAdd
      });
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      message: `Đã thêm "${product.name}" vào giỏ hàng.`,
      totalQuantity: cart.getTotalQuantity()
    });

  } catch (error) {
    console.error('Lỗi thêm vào giỏ hàng:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra, vui lòng thử lại.' });
  }
}

// ---------- GET /cart (render trang giỏ hàng, kèm label hiển thị tiếng Việt) ----------
async function showCartPage(req, res) {
  try {
    const userId = req.session.userId;
    const cart = await Cart.findOne({ user: userId });

    // Lọc bỏ item hỏng/thiếu field (ví dụ dữ liệu cũ từ schema trước đây)
    // để KHÔNG làm crash toàn bộ trang giỏ hàng chỉ vì 1 item lỗi.
    const validItems = cart
      ? cart.items.filter((item) => typeof item.unitPrice === 'number' && item.name && item.quantity)
      : [];

    const items = validItems.map((item) => ({
      _id: item._id.toString(),
      name: item.name,
      category: item.category,
      image: item.image,
      sizeLabel: item.size ? findLabel(SIZE_OPTIONS, item.size) : null,
      iceLabel: item.ice ? findLabel(ICE_OPTIONS, item.ice) : null,
      sugarLabel: item.sugarLevel ? findLabel(SUGAR_OPTIONS, item.sugarLevel) : null,
      toppingLabels: (item.toppings || []).map((t) => t.name),
      note: item.note,
      unitPrice: item.unitPrice.toFixed(2),
      quantity: item.quantity,
      lineTotal: (item.unitPrice * item.quantity).toFixed(2)
    }));

    const subtotal = cart ? cart.getSubtotal() : 0;
    const totalQuantity = cart ? cart.getTotalQuantity() : 0;
    const shippingFee = computeShippingFee(totalQuantity);

    const appliedCode = req.session.discountCode || null;
    const { amount: discountAmount, error: discountError } = await computeDiscount(subtotal, totalQuantity, appliedCode);

    // Mã từng áp dụng nhưng giờ không còn hợp lệ (hết hạn, hết lượt, giỏ hàng thay đổi...)
    // -> tự gỡ khỏi session, không để người dùng thấy mã "áp dụng" nhưng không được giảm gì.
    if (appliedCode && discountError) {
      delete req.session.discountCode;
    }

    const total = Math.max(0, subtotal + shippingFee - discountAmount);

    res.render('cart', {
      activePage: 'cart',
      cartItems: items,
      isEmpty: items.length === 0,
      subtotal: subtotal.toFixed(2),
      shipping: shippingFee.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      appliedCode: discountError ? null : appliedCode,
      discountEligible: totalQuantity >= MIN_QUANTITY_FOR_DISCOUNT,
      total: total.toFixed(2)
    });

  } catch (error) {
    console.error('Lỗi hiển thị giỏ hàng:', error);
    res.render('cart', { activePage: 'cart', cartItems: [], isEmpty: true });
  }
}

// ---------- POST /cart/update (tăng/giảm số lượng theo item._id) ----------
async function updateQuantity(req, res) {
  try {
    const userId = req.session.userId;
    const { itemId, action } = req.body; // action: 'increase' | 'decrease'

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: 'Giỏ hàng không tồn tại.' });

    const item = cart.items.id(itemId); // Mongoose subdocument helper: tìm theo _id
    if (!item) return res.status(404).json({ success: false, message: 'Sản phẩm không có trong giỏ.' });

    if (action === 'increase') {
      item.quantity += 1;
    } else if (action === 'decrease') {
      item.quantity = Math.max(1, item.quantity - 1);
    }

    await cart.save();

    const subtotal = cart.getSubtotal();
    const totalQuantity = cart.getTotalQuantity();
    const shippingFee = computeShippingFee(totalQuantity);

    const appliedCode = req.session.discountCode || null;
    const { amount: discountAmount, error: discountError } = await computeDiscount(subtotal, totalQuantity, appliedCode);
    if (appliedCode && discountError) delete req.session.discountCode;

    const total = Math.max(0, subtotal + shippingFee - discountAmount);

    return res.json({
      success: true,
      quantity: item.quantity,
      itemTotal: (item.unitPrice * item.quantity).toFixed(2),
      subtotal: subtotal.toFixed(2),
      shipping: shippingFee.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      appliedCode: discountError ? null : appliedCode,
      discountEligible: totalQuantity >= MIN_QUANTITY_FOR_DISCOUNT,
      total: total.toFixed(2),
      totalQuantity
    });

  } catch (error) {
    console.error('Lỗi cập nhật số lượng:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra.' });
  }
}

// ---------- POST /cart/remove (xóa theo item._id) ----------
async function removeItem(req, res) {
  try {
    const userId = req.session.userId;
    const { itemId } = req.body;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: 'Giỏ hàng không tồn tại.' });

    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
    await cart.save();

    const subtotal = cart.getSubtotal();
    const totalQuantity = cart.getTotalQuantity();
    const shipping = computeShippingFee(totalQuantity);

    const appliedCode = req.session.discountCode || null;
    const { amount: discountAmount, error: discountError } = await computeDiscount(subtotal, totalQuantity, appliedCode);
    if (appliedCode && discountError) delete req.session.discountCode;

    const total = Math.max(0, subtotal + shipping - discountAmount);

    return res.json({
      success: true,
      isEmpty: cart.items.length === 0,
      subtotal: subtotal.toFixed(2),
      shipping: shipping.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      appliedCode: discountError ? null : appliedCode,
      discountEligible: totalQuantity >= MIN_QUANTITY_FOR_DISCOUNT,
      total: total.toFixed(2),
      totalQuantity
    });

  } catch (error) {
    console.error('Lỗi xóa sản phẩm:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra.' });
  }
}

// ---------- GET /cart/coupons (danh sách mã ĐANG HOẠT ĐỘNG, kèm cờ đủ/không đủ điều kiện) ----------
// Trả về TẤT CẢ mã active (chưa hết hạn, còn lượt) — không lọc bớt — để người dùng thấy cả
// những mã họ chưa đủ điều kiện (kèm lý do), thay vì chỉ hiện mã dùng được ngay.
async function listAvailableCoupons(req, res) {
  try {
    const userId = req.session.userId;
    const cart = await Cart.findOne({ user: userId });
    const subtotal = cart ? cart.getSubtotal() : 0;
    const totalQuantity = cart ? cart.getTotalQuantity() : 0;

    const now = new Date();
    const activeCoupons = await DiscountCode.find({
      isActive: true,
      expiryDate: { $gte: now },
      $expr: { $lt: ['$usedCount', '$usageLimit'] } // còn lượt dùng
    }).sort({ createdAt: -1 });

    const coupons = activeCoupons.map((c) => {
      const reasons = [];
      if (totalQuantity < MIN_QUANTITY_FOR_DISCOUNT) {
        reasons.push(`Cần mua tối thiểu ${MIN_QUANTITY_FOR_DISCOUNT} sản phẩm`);
      }
      if (subtotal < c.minOrderValue) {
        reasons.push(`Đơn tối thiểu ${c.minOrderValue.toLocaleString('vi-VN')}đ`);
      }

      return {
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        maxDiscountAmount: c.maxDiscountAmount,
        minOrderValue: c.minOrderValue,
        eligible: reasons.length === 0,
        reason: reasons.join(' · ')
      };
    });

    return res.json({ success: true, coupons });

  } catch (error) {
    console.error('Lỗi lấy danh sách mã giảm giá:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra.' });
  }
}

// ---------- POST /cart/apply-coupon ----------
async function applyDiscount(req, res) {
  try {
    const userId = req.session.userId;
    const { code } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá.' });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng đang trống.' });
    }

    const subtotal = cart.getSubtotal();
    const totalQuantity = cart.getTotalQuantity();

    const { amount: discountAmount, error } = await computeDiscount(subtotal, totalQuantity, code);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    // Chỉ lưu vào session để PREVIEW trên trang giỏ hàng — chưa trừ usageLimit ở đây.
    // usedCount thật sự chỉ tăng khi đơn hàng được tạo thành công (xử lý ở orderController).
    req.session.discountCode = code.trim().toUpperCase();

    const shippingFee = computeShippingFee(totalQuantity);
    const total = Math.max(0, subtotal + shippingFee - discountAmount);

    return res.json({
      success: true,
      message: 'Áp dụng mã giảm giá thành công!',
      appliedCode: req.session.discountCode,
      discountAmount: discountAmount.toFixed(2),
      subtotal: subtotal.toFixed(2),
      shipping: shippingFee.toFixed(2),
      total: total.toFixed(2)
    });

  } catch (error) {
    console.error('Lỗi áp mã giảm giá:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra, vui lòng thử lại.' });
  }
}

// ---------- POST /cart/remove-coupon ----------
async function removeDiscount(req, res) {
  try {
    delete req.session.discountCode;

    const userId = req.session.userId;
    const cart = await Cart.findOne({ user: userId });
    const subtotal = cart ? cart.getSubtotal() : 0;
    const totalQuantity = cart ? cart.getTotalQuantity() : 0;
    const shippingFee = computeShippingFee(totalQuantity);
    const total = subtotal + shippingFee;

    return res.json({
      success: true,
      subtotal: subtotal.toFixed(2),
      shipping: shippingFee.toFixed(2),
      total: total.toFixed(2)
    });

  } catch (error) {
    console.error('Lỗi gỡ mã giảm giá:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra.' });
  }
}

// ---------- GET /api/cart ----------
async function getCartData(req, res) {
  try {
    const cart = await Cart.findOne({ user: req.session.userId });
    if (!cart) return res.json({ success: true, items: [], totalQuantity: 0 });

    return res.json({ success: true, items: cart.items, totalQuantity: cart.getTotalQuantity() });
  } catch (error) {
    console.error('Lỗi lấy giỏ hàng:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra.' });
  }
}

// ---------- Dùng nội bộ ----------
async function getCartQuantityByUserId(userId) {
  if (!userId) return 0;
  const cart = await Cart.findOne({ user: userId });
  return cart ? cart.getTotalQuantity() : 0;
}

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
  applyDiscount,
  removeDiscount,
  listAvailableCoupons,
  clearCart,
  // Export để checkout.js dùng LẠI đúng logic này khi tạo đơn hàng thật —
  // tránh trường hợp 2 nơi tính tiền lệch nhau (như bug phí ship 20k/30k trước đây).
  SHIPPING_FEE,
  MIN_QUANTITY_FOR_DISCOUNT,
  computeShippingFee,
  computeDiscount
};