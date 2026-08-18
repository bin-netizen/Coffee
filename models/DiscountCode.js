const mongoose = require('mongoose');

const discountCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType: { type: String, enum: ['percent', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  maxDiscountAmount: { type: Number, default: null },
  usageLimit: { type: Number, required: true },
  usedCount: { type: Number, default: 0 },
  minOrderValue: { type: Number, default: 0 },
  expiryDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('DiscountCode', discountCodeSchema);