// models/DailyRevenue.js — snapshot đã chốt
const mongoose = require('mongoose');

const dailyRevenueSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // 'YYYY-MM-DD' theo giờ VN
  grossRevenue: { type: Number, default: 0 },
  refundAmount: { type: Number, default: 0 },
  netRevenue: { type: Number, default: 0 },
  orderCount: { type: Number, default: 0 },
  refundCount: { type: Number, default: 0 },
  closedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('DailyRevenue', dailyRevenueSchema);