const express = require('express');
const router = express.Router();
// trong route xử lý trang chủ (routes/index.js)
const Product = require('../models/Product');

router.get('/', async (req, res) => {
  const featuredProducts = await Product.find({ badge: 'best-seller', isActive: true }).limit(6).lean();
  res.render('index', { featuredProducts });
});

// Trang chủ
router.get('/', (req, res) => {
    res.render('pages/index');
});

// About
router.get('/about', (req, res) => {
    res.render('pages/about');
});

// Cart
router.get('/cart', (req, res) => {
    res.render('pages/cart');
});

// Login
router.get('/login', (req, res) => {
    res.render('pages/login');
});

// Contact
router.get('/contact', (req, res) => {
    res.render('pages/contact');
});

// Menu
router.get('/menu', (req, res) => {
    res.render('pages/menu');
});

module.exports = router;