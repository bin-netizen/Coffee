const express = require('express');
const router = express.Router();

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