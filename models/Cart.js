// ====== models/Cart.js ======
const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: { type: String, required: true }, // slug/id sản phẩm, ví dụ: "latte", "espresso"
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 }
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true // mỗi user chỉ có 1 giỏ hàng duy nhất
    },
    items: [cartItemSchema]
  },
  { timestamps: true }
);

// Method tiện ích: tính tổng số lượng sản phẩm trong giỏ (dùng cho badge)
cartSchema.methods.getTotalQuantity = function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
};

module.exports = mongoose.model('Cart', cartSchema);