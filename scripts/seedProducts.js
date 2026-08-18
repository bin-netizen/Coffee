// ====== scripts/seedProducts.js ======
// Chạy 1 lần để đưa 12 sản phẩm mẫu vào MongoDB: node scripts/seedProducts.js
// Sau khi seed xong, quản lý sản phẩm hoàn toàn qua trang /admin/products

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const seedData = [
  { productId: 'espresso', name: 'Espresso', category: 'coffee', basePrice: 3.0, flavor: 'Đậm đà, hương cà phê rang cháy nhẹ, hậu vị đắng thanh, lớp crema mịn màng.', badge: 'best-seller' },
  { productId: 'latte', name: 'Latte', category: 'coffee', basePrice: 4.0, flavor: 'Cà phê hoà quyện cùng sữa tươi béo mịn, uống êm và thơm mùi sữa nướng nhẹ.', badge: 'new' },
  { productId: 'cappuccino', name: 'Cappuccino', category: 'coffee', basePrice: 4.5, flavor: 'Cân bằng giữa espresso đậm và lớp bọt sữa dày mịn, thoảng hương caramel.', badge: 'none' },
  { productId: 'mocha', name: 'Mocha', category: 'coffee', basePrice: 4.8, flavor: 'Kết hợp cà phê và socola, ngọt dịu, hậu vị đắng nhẹ đầy quyến rũ.', badge: 'none' },
  { productId: 'americano', name: 'Americano', category: 'coffee', basePrice: 3.5, flavor: 'Vị cà phê nguyên bản, nhẹ nhàng, thanh mát, hợp người thích cà phê loãng.', badge: 'best-seller' },
  { productId: 'green-tea', name: 'Green Tea', category: 'tea', basePrice: 3.2, flavor: 'Trà xanh thanh mát, hơi chát nhẹ đầu lưỡi, hậu ngọt dịu tự nhiên.', badge: 'none' },
  { productId: 'milk-tea', name: 'Milk Tea', category: 'tea', basePrice: 3.8, flavor: 'Trà sữa béo ngậy, thơm mùi trà đen rang, vị ngọt hài hoà.', badge: 'new' },
  { productId: 'peach-tea', name: 'Peach Tea', category: 'tea', basePrice: 3.6, flavor: 'Trà đào chua ngọt hài hoà, hương đào tươi mát, giải khát tuyệt vời.', badge: 'none' },
  { productId: 'tiramisu', name: 'Tiramisu', category: 'dessert', basePrice: 5.5, flavor: 'Lớp kem mascarpone béo mịn hoà cùng cà phê đậm, phủ cacao đắng nhẹ.', badge: 'best-seller' },
  { productId: 'cheesecake', name: 'Cheesecake', category: 'dessert', basePrice: 5.0, flavor: 'Vị béo ngậy của phô mai kem, đế bánh giòn nhẹ, ngọt thanh.', badge: 'none' },
  { productId: 'chocolate-cake', name: 'Chocolate Cake', category: 'dessert', basePrice: 6.0, flavor: 'Socola đậm đà, ẩm mềm, ngọt vừa phải, tan chảy trong miệng.', badge: 'new' },
  { productId: 'croissant', name: 'Croissant', category: 'dessert', basePrice: 3.9, flavor: 'Bánh sừng bò giòn xốp nhiều lớp, thơm bơ, ăn kèm cà phê rất hợp.', badge: 'none' }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Đã kết nối MongoDB');

    for (const item of seedData) {
      await Product.findOneAndUpdate(
        { productId: item.productId },
        item,
        { upsert: true, new: true } // đã có thì update, chưa có thì tạo mới - chạy lại nhiều lần vẫn an toàn
      );
      console.log(`  → Đã thêm/cập nhật: ${item.name}`);
    }

    console.log('🎉 Seed dữ liệu sản phẩm hoàn tất!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Lỗi seed dữ liệu:', error);
    process.exit(1);
  }
}

seed();