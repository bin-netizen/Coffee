const Topping = require('../models/Topping');

exports.listToppings = async (req, res) => {
  const toppings = await Topping.find().sort({ createdAt: -1 }).lean();
  res.render('admin/toppings', {
    layout: 'admin',
    activeAdminPage: 'toppings',
    toppings,
  });
};

exports.createTopping = async (req, res) => {
  const { name, price } = req.body;
  await Topping.create({ name, price: Number(price) });
  res.redirect('/admin/toppings');
};

exports.updateTopping = async (req, res) => {
  const { name, price } = req.body;
  await Topping.findByIdAndUpdate(req.params.id, { name, price: Number(price) });
  res.redirect('/admin/toppings');
};

exports.toggleActive = async (req, res) => {
  const topping = await Topping.findById(req.params.id);
  topping.isActive = !topping.isActive;
  await topping.save();
  res.redirect('/admin/toppings');
};

exports.deleteTopping = async (req, res) => {
  await Topping.findByIdAndDelete(req.params.id);
  res.redirect('/admin/toppings');
};