// ====== socket/chatSocket.js ======
const Message = require('../models/Message');
const Order = require('../models/Order');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Mỗi đơn đang ở trạng thái "pending" chỉ được đính kèm 1 lần trong 1 cuộc hội thoại.
// Sau lần đầu, các tin nhắn sau sẽ không gắn lại mã + thông tin đơn hàng nữa.
async function findAttachableOrder(userId, explicitOrderId = null) {
  let orderQuery = { user: userId, status: 'pending' };

  if (explicitOrderId) {
    orderQuery = { _id: explicitOrderId, user: userId, status: 'pending' };
  }

  const order = await Order.findOne(orderQuery).sort({ createdAt: -1 });
  if (!order) return null;

  const alreadyAttached = await Message.exists({
    conversationUser: userId,
    'attachedOrder.orderId': order.orderId
  });

  if (alreadyAttached) return null;

  return {
    orderId: order.orderId,
    total: order.total,
    itemsSummary: order.items.map((i) => `${i.name} x${i.quantity}`).join(', ')
  };
}

function initChatSocket(io) {
  io.on('connection', (socket) => {
    // Lấy session từ socket.handshake.auth (được set bởi middleware)
    const auth = socket.handshake.auth || {};
    const userId = auth.userId;
    const userRole = auth.userRole;

    console.log('[Chat] 🔌 Socket kết nối, ID:', socket.id, 'Auth:', { userId, userRole });

    // Không có session hợp lệ (chưa đăng nhập) -> ngắt kết nối ngay
    if (!userId) {
      console.log('[Chat] ❌ Socket kết nối không có userId, ngắt kết nối');
      socket.disconnect(true);
      return;
    }

    const userIdStr = String(userId);
    const isAdmin = userRole === 'admin';

    console.log(`[Chat] ✅ User ${userIdStr} (${isAdmin ? 'admin' : 'customer'}) kết nối thành công`);

    if (isAdmin) {
      socket.join('admin-room');
      console.log(`[Chat] 👨‍💼 Admin ${userIdStr} joined admin-room`);
    } else {
      socket.join(`chat:${userIdStr}`);
      console.log(`[Chat] 👤 Customer ${userIdStr} joined chat:${userIdStr}`);
    }

    // ---------- Khách gửi tin nhắn ----------
    socket.on('chat:customer-send', async (payload, callback) => {
      try {
        if (isAdmin) return; // admin không dùng event này, tránh giả mạo vai trò

        const content = ((payload && payload.content) || '').trim().slice(0, 2000);
        const explicitOrderId = payload && payload.orderId ? String(payload.orderId) : null;
        if (!content) return;

        console.log(`[Chat] 💬 Customer ${userIdStr} gửi tin: "${content.substring(0, 50)}..."`);

        // Chỉ đính kèm đơn hàng khi điều kiện rõ ràng: khách đã chọn nút chat ở /orders
        // với 1 đơn đang ở trạng thái pending. Không gắn đơn hàng theo mặc định.
        const attachedOrder = await findAttachableOrder(userIdStr, explicitOrderId);

        const message = await Message.create({
          conversationUser: userIdStr,
          sender: userIdStr,
          senderRole: 'customer',
          content,
          attachedOrder
        });

        console.log(`[Chat] 💾 Lưu tin nhắn vào DB, _id: ${message._id}`);

        const outgoing = {
          _id: message._id.toString(),
          conversationUser: userIdStr,
          senderRole: 'customer',
          content: message.content,
          attachedOrder: message.attachedOrder || null,
          createdAt: message.createdAt
        };

        // Gửi cho chính khách (đồng bộ nếu mở nhiều tab/thiết bị) + toàn bộ admin đang online
        io.to(`chat:${userIdStr}`).emit('chat:new-message', outgoing);
        io.to('admin-room').emit('chat:new-message', outgoing);

        console.log(`[Chat] 📤 Phát tin nhắn đến chat:${userIdStr} và admin-room`);

        if (typeof callback === 'function') callback({ success: true });
      } catch (error) {
        console.error('[Chat] ❌ Lỗi gửi tin nhắn (khách):', error);
        if (typeof callback === 'function') callback({ success: false, message: 'Có lỗi xảy ra.' });
      }
    });

    // ---------- Admin trả lời 1 khách cụ thể ----------
    socket.on('chat:admin-send', async (payload, callback) => {
      try {
        if (!isAdmin) return; // khách không dùng event này

        const targetUserId = payload && payload.toUserId ? String(payload.toUserId) : null;
        const content = ((payload && payload.content) || '').trim().slice(0, 2000);
        if (!targetUserId || !content) {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Thiếu dữ liệu hoặc chưa chọn hội thoại' });
          }
          return;
        }

        console.log(`[Chat] 💬 Admin ${userIdStr} gửi tin tới ${targetUserId}: "${content.substring(0, 50)}..."`);

        const message = await Message.create({
          conversationUser: targetUserId,
          sender: userIdStr, // id của admin đang gửi
          senderRole: 'admin',
          content
        });

        console.log(`[Chat] 💾 Lưu tin nhắn vào DB, _id: ${message._id}`);

        const outgoing = {
          _id: message._id.toString(),
          conversationUser: targetUserId,
          senderRole: 'admin',
          content: message.content,
          createdAt: message.createdAt
        };

        io.to(`chat:${targetUserId}`).emit('chat:new-message', outgoing);
        io.to('admin-room').emit('chat:new-message', outgoing);

        console.log(`[Chat] 📤 Phát tin nhắn đến chat:${targetUserId} và admin-room`);

        if (typeof callback === 'function') callback({ success: true });
      } catch (error) {
        console.error('[Chat] ❌ Lỗi gửi tin nhắn (admin):', error);
        if (typeof callback === 'function') callback({ success: false, message: 'Có lỗi xảy ra.' });
      }
    });

    // ---------- Disconnect handler ----------
    socket.on('disconnect', function () {
      console.log(`[Chat] 🔌 User ${userIdStr} (${isAdmin ? 'admin' : 'customer'}) ngắt kết nối`);
    });
  });
}

module.exports = { initChatSocket };