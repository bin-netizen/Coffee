// ====== routes/chatRoutes.js ======
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { isAuthenticated } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');

// Khách hàng: lấy lịch sử chat của chính mình (dùng để load tin cũ khi mở trang, tin mới sau đó qua Socket.io)
router.get('/chat/history', isAuthenticated, chatController.getMyConversation);

// Admin: hộp thư kiểu Messenger
router.get('/admin/chat/conversations', isAuthenticated, isAdmin, chatController.listConversations);
router.get('/admin/chat/conversations/:userId', isAuthenticated, isAdmin, chatController.getConversationMessages);

module.exports = router;