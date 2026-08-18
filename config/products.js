// ====== config/products.js ======
// Chỉ giữ lại config TĨNH (size/đá/đường/topping - hiếm khi đổi).
// Danh sách SẢN PHẨM giờ nằm trong MongoDB (models/Product.js) để admin CRUD được.

const SIZE_OPTIONS = [
  { value: 'S', label: 'S (Small - 240-300ml)', priceModifier: 0 },
  { value: 'M', label: 'M (Medium - 360-450ml)', priceModifier: 10000 },
  { value: 'L', label: 'L (Large - 500-600ml)', priceModifier: 20000 }
];

const ICE_OPTIONS = [
  { value: 'normal', label: 'Đá bình thường' },
  { value: 'none', label: 'Không đá' },
  { value: 'separate', label: 'Đá riêng' }
];

const SUGAR_OPTIONS = [
  { value: 'normal', label: '100% đường' },
  { value: 'less50', label: 'Giảm 50% đường' },
  { value: 'less70', label: 'Giảm 70% đường' },
  { value: 'none', label: 'Không đường' },
  { value: 'extra', label: 'Thêm đường' }
];

const TOPPINGS = [
  { value: 'coffee-jelly', label: 'Thạch cà phê', price: 10000 },
  { value: 'salted-cream', label: 'Kem muối', price: 15000 },
  { value: 'black-pearl', label: 'Trân châu đen', price: 10000 },
  { value: 'egg-cream', label: 'Kem trứng', price: 15000 }
];

/**
 * Tính giá 1 đơn vị sản phẩm dựa trên size + topping đã chọn.
 * @param {Object} product - document Product từ MongoDB (có basePrice, category)
 * @param {String} size - 'S' | 'M' | 'L'
 * @param {String[]} toppings - mảng mã topping
 */
function calculateUnitPrice(product, size, toppingsTotal = 0) {
  let price = Number(product.basePrice) || 0;

  if (product.category !== 'dessert') {
    const sizeOption = SIZE_OPTIONS.find((s) => s.value === size) || SIZE_OPTIONS[0];
    price += Number(sizeOption.priceModifier) || 0;
    price += Number(toppingsTotal) || 0;
  }

  return Math.round(price);
}
module.exports = {
  SIZE_OPTIONS,
  ICE_OPTIONS,
  SUGAR_OPTIONS,
  calculateUnitPrice
};