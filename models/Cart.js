// ====== models/Cart.js ======
const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  image: { type: String, default: '/img/latte.jpg' }, // 'coffee' | 'tea' | 'dessert'

  // Chỉ áp dụng cho coffee/tea, null với dessert
  size: { type: String, default: null },        // 'S' | 'M' | 'L'
  ice: { type: String, default: null },          // 'normal' | 'none' | 'separate'
  sugarLevel: { type: String, default: null },   // 'normal' | 'less50' | 'less70' | 'none' | 'extra'
  toppings: [{
  toppingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topping' },
  name: { type: String },
  price: { type: Number }
}],

  note: { type: String, default: '', maxlength: 200 },

  unitPrice: { type: Number, required: true }, // giá 1 đơn vị ĐÃ tính gồm size + topping
  quantity: { type: Number, required: true, min: 1, default: 1 }
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    items: [cartItemSchema]
  },
  { timestamps: true }
);

// Chỉ tính trên item hợp lệ (có unitPrice hợp lệ) - khớp với bộ lọc ở cartController.showCartPage,
// tránh trường hợp badge và trang /cart hiển thị số liệu lệch nhau vì dữ liệu cũ/hỏng.
cartSchema.methods.getValidItems = function () {
  return this.items.filter((item) => typeof item.unitPrice === 'number' && item.name && item.quantity);
};

cartSchema.methods.getTotalQuantity = function () {
  return this.getValidItems().reduce((sum, item) => sum + item.quantity, 0);
};

cartSchema.methods.getSubtotal = function () {
  return this.getValidItems().reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
};

module.exports = mongoose.model('Cart', cartSchema);