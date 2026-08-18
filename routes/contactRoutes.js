// ====== routes/contactRoutes.js ======
const express = require('express');
const router = express.Router();
const { submitContactMessage } = require('../controllers/contactController');

// Không cần đăng nhập - ai cũng có thể gửi tin nhắn liên hệ
router.post('/api/contact', submitContactMessage);

module.exports = router;