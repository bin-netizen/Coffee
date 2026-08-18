// models/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: {
    type: Number, required: true, min: 0,
    validate: { validator: Number.isInteger, message: 'Giá item phải là số nguyên VND' }
  },
  quantity: { type: Number, required: true, min: 1 }
});

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customer: {
      fullname: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true }
    },
    paymentMethod: { type: String, enum: ['cod', 'bank'], default: 'cod' },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'],
      default: 'pending'
    },
    // ── Field mới cho tính năng doanh thu ──
    completedAt: Date,
    isRefunded: { type: Boolean, default: false },
    refundedAt: Date,
    refundAmount: Number
  },
  { timestamps: true }
);

// Mongoose 9: pre-hook async KHÔNG dùng next(); hook tự tự động tiếp tục sau khi resolve.
// Tự động set completedAt khi status chuyển sang 'completed', dù update qua
// findOneAndUpdate hay save() — không phụ thuộc admin sửa status ở đâu.
orderSchema.pre('findOneAndUpdate', async function () {
  const update = this.getUpdate() || {};
  if (update.status === 'completed' && !update.completedAt) {
    update.completedAt = new Date();
  }
});
orderSchema.pre('save', async function () {
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
});

orderSchema.index({ status: 1, completedAt: 1 });
orderSchema.index({ isRefunded: 1, refundedAt: 1 });

module.exports = mongoose.model('Order', orderSchema);