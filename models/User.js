// ====== models/User.js ======
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    resetOTP: { type: String, select: false },
    resetOTPExpires: { type: Date, select: false },
    resetAttempts: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
);

// Mongoose 9: pre-hook async KHÔNG dùng next() - await xong là tự tiếp tục
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);