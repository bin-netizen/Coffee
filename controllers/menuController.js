const Product = require('../models/Product');
const Topping = require('../models/Topping');

async function showMenuPage(req, res) {
  try {
    const [products, toppings] = await Promise.all([
      Product.find({ isActive: true }).sort({ category: 1, name: 1 }).lean(),
      Topping.find({ isActive: true }).sort({ name: 1 }).lean()
    ]);

    res.render('menu', { activePage: 'menu', products, toppings });
  } catch (error) {
    console.error('Lỗi tải trang menu:', error);
    res.render('menu', { activePage: 'menu', products: [], toppings: [] });
  }
}

module.exports = { showMenuPage };