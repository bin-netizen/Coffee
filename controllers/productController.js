const products = [
  { id: 1, name: "Espresso", price: 35000, image: "/img/espresso.png" },
  { id: 2, name: "Latte", price: 40000, image: "/img/latte.png" },
  { id: 3, name: "Cappuccino", price: 45000, image: "/img/cappuccino.png" },
  { id: 4, name: "Mocha", price: 50000, image: "/img/coffee.png" }
];

exports.list = (req, res) => {
  res.render('pages/menu', { products });
};

exports.detail = (req, res) => {
  const product = products.find(p => p.id == req.params.id);
  res.render('pages/product', { product });
};

// API JSON cho frontend
exports.apiList = (req, res) => {
  res.json(products);
};
