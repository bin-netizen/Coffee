// ====== scripts/createAdmin.js ======
// Chạy 1 lần để tạo tài khoản admin đầu tiên: node scripts/createAdmin.js
// (Không có cách nào khác để tạo admin đầu tiên, vì trang /register chỉ tạo role 'customer')

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const ADMIN_EMAIL = 'admin@Coffee.com';
const ADMIN_PASSWORD = 'Admin@123'; // ⚠️ ĐỔI mật khẩu này sau khi đăng nhập lần đầu
const ADMIN_FULLNAME = 'Quản trị viên';

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Đã kết nối MongoDB');

    const existing = await User.findOne({ email: ADMIN_EMAIL });

    if (existing) {
      existing.role = 'admin';
      await existing.save();
      console.log(`ℹ️  Tài khoản ${ADMIN_EMAIL} đã tồn tại -> đã nâng lên quyền admin.`);
    } else {
      await User.create({
        fullname: ADMIN_FULLNAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin'
      });
      console.log(`🎉 Đã tạo tài khoản admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Lỗi tạo admin:', error);
    process.exit(1);
  }
}

createAdmin();