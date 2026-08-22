// ====== controllers/chatController.js ======
const Message = require('../models/Message');
const User = require('../models/User');

// ---------- GET /chat/history (khách hàng: lấy toàn bộ lịch sử chat của chính mình) ----------
async function getMyConversation(req, res) {
  try {
    const userId = String(req.session.userId);

    const messages = await Message.find({ conversationUser: userId })
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      success: true,
      messages: messages.map((m) => ({
        _id: m._id.toString(),
        senderRole: m.senderRole,
        content: m.content,
        attachedOrder: m.attachedOrder || null,
        createdAt: m.createdAt
      }))
    });

  } catch (error) {
    console.error('Lỗi tải lịch sử chat:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra.' });
  }
}

// ---------- GET /admin/chat/conversations (admin: hộp thư kiểu Messenger) ----------
async function listConversations(req, res) {
  try {
    // Gom theo từng khách (conversationUser), lấy tin nhắn mới nhất của mỗi cuộc trò chuyện
    const conversations = await Message.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationUser',
          lastMessage: { $first: '$content' },
          lastMessageAt: { $first: '$createdAt' },
          lastSenderRole: { $first: '$senderRole' }
        }
      },
      { $sort: { lastMessageAt: -1 } }
    ]);

    // Đếm riêng số tin CHƯA ĐỌC (từ khách gửi, admin chưa xem) cho từng cuộc trò chuyện
    const unreadCounts = await Message.aggregate([
      { $match: { senderRole: 'customer', readByAdmin: false } },
      { $group: { _id: '$conversationUser', count: { $sum: 1 } } }
    ]);
    const unreadMap = {};
    unreadCounts.forEach((u) => { unreadMap[u._id.toString()] = u.count; });

    const userIds = conversations.map((c) => c._id);
    const users = await User.find({ _id: { $in: userIds } }).select('fullname email').lean();
    const userMap = {};
    users.forEach((u) => { userMap[u._id.toString()] = u; });

    const result = conversations.map((c) => {
      const uid = c._id.toString();
      const user = userMap[uid];
      return {
        userId: uid,
        fullname: user ? user.fullname : 'Người dùng đã xoá',
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
        lastSenderRole: c.lastSenderRole,
        unreadCount: unreadMap[uid] || 0
      };
    });

    return res.json({ success: true, conversations: result });

  } catch (error) {
    console.error('Lỗi tải danh sách hội thoại:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra.' });
  }
}

// ---------- GET /admin/chat/conversations/:userId (admin: xem chi tiết 1 hội thoại + đánh dấu đã đọc) ----------
async function getConversationMessages(req, res) {
  try {
    const targetUserId = String(req.params.userId);

    const messages = await Message.find({ conversationUser: targetUserId })
      .sort({ createdAt: 1 })
      .lean();

    // Đánh dấu toàn bộ tin từ khách trong hội thoại này là đã đọc, vì admin vừa mở xem
    await Message.updateMany(
      { conversationUser: targetUserId, senderRole: 'customer', readByAdmin: false },
      { $set: { readByAdmin: true } }
    );

    return res.json({
      success: true,
      messages: messages.map((m) => ({
        _id: m._id.toString(),
        senderRole: m.senderRole,
        content: m.content,
        attachedOrder: m.attachedOrder || null,
        createdAt: m.createdAt
      }))
    });

  } catch (error) {
    console.error('Lỗi tải chi tiết hội thoại:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra.' });
  }
}

// ---------- GET /admin/chat (render trang Live Chat, dữ liệu load qua AJAX sau) ----------
function showAdminChatPage(req, res) {
  res.render('admin/chat', {
    layout: 'admin',
    activeAdminPage: 'chat'
  });
}

async function searchUsers(req, res) {
  try {
    const q = (req.query.q || '').trim();

    if (!q) {
      return res.json({ success: true, users: [] });
    }

    const users = await User.find({
      role: 'customer', 
      $or: [
        { fullname: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
      .select('_id fullname email')
      .limit(20);

    return res.json({
      success: true,
      users: users.map((u) => ({
        userId: u._id.toString(),
        fullname: u.fullname,
        email: u.email
      }))
    });
  } catch (error) {
    console.error('[Chat] Lỗi tìm kiếm user:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi tìm kiếm.' });
  }
}

module.exports = { getMyConversation, listConversations, getConversationMessages, showAdminChatPage, searchUsers };