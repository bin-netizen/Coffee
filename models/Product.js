// ====== models/Product.js ======
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, unique: true, trim: true }, // slug: 'espresso', 'latte'...
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ['coffee', 'tea', 'dessert'], required: true },
    basePrice: { type: Number, required: true, min: 0 },
    flavor: { type: String, default: '' },
    image: { type: String, default: '/img/latte.jpg' },
    badge: { type: String, enum: ['none', 'best-seller', 'new'], default: 'none' },
    isActive: { type: Boolean, default: true } // ẩn sản phẩm (soft-delete) thay vì xoá hẳn khỏi DB
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);