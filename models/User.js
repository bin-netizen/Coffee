// ====== models/User.js ======
// ⚠️ Lưu ý: project dùng Mongoose v9 - pre-hook KHÔNG còn nhận tham số next()
// Với hàm async, chỉ cần return/kết thúc hàm là Mongoose tự hiểu đã xong.

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true } // lưu bản đã hash, KHÔNG lưu plain text
  },
  { timestamps: true }
);

// Tự động hash password TRƯỚC khi lưu vào DB (chỉ hash khi password mới/bị thay đổi)
// Mongoose 9: pre-hook async KHÔNG dùng next() - cứ await xong là Mongoose tự tiếp tục
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method so sánh password nhập vào với password đã hash trong DB
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);