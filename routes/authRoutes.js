// ====== routes/authRoutes.js ======
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/forgot-password', authController.showForgotPasswordPage);
router.post('/forgot-password', authController.forgotPassword);

router.get('/reset-password', authController.showResetPasswordPage);
router.post('/reset-password', authController.resetPassword);


router.get('/login', authController.showLoginPage);
router.post('/login', authController.login);

router.get('/register', authController.showRegisterPage);
router.post('/register', authController.register);

router.post('/logout', authController.logout);

module.exports = router;