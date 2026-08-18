// models/JobLock.js
const mongoose = require('mongoose');

const jobLockSchema = new mongoose.Schema({
  _id: String, // ví dụ: 'close-revenue-2026-08-15'
  createdAt: { type: Date, default: Date.now, expires: 86400 } // TTL tự xóa sau 1 ngày
});
module.exports = mongoose.model('JobLock', jobLockSchema);