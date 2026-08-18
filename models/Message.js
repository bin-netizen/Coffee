// ====== models/Message.js ======
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    // Định danh cuộc trò chuyện = ID của khách hàng — 1 khách chỉ có DUY NHẤT 1 khung chat
    // với cửa hàng (không tách theo từng đơn), nên đây chính là "conversation ID".
    // Chú ý: lưu dưới dạng string để tránh mismatch khi userId là ObjectId chuẩn
    // hoặc là ID dạng tuỳ ý (ví dụ "123" trong môi trường test/seed/dev).
    conversationUser: {
      type: String,
      required: true
    },
    // Ai là người GỬI tin nhắn này thực sự (khách, hoặc 1 tài khoản admin cụ thể nếu có nhiều admin)
    sender: {
      type: String,
      required: true
    },
    senderRole: { type: String, enum: ['customer', 'admin'], required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },

    // Đơn hàng được TỰ ĐỘNG đính kèm khi khách gửi tin (nếu có đơn "pending" trong 24h gần nhất).
    // Lưu SNAPSHOT ngay lúc gửi (không dùng ref sống tới Order) — vì đơn có thể đổi trạng thái
    // sau đó (đã xác nhận/hủy...), nhưng tin nhắn cũ vẫn phải hiển thị đúng thông tin lúc gửi.
    attachedOrder: {
      orderId: String,
      itemsSummary: String,
      total: Number
    },

    // Đánh dấu admin đã xem tin này chưa — dùng để hiện số tin chưa đọc trong hộp thư admin
    readByAdmin: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Query phổ biến nhất: lấy toàn bộ tin của 1 cuộc trò chuyện, sắp theo thời gian
messageSchema.index({ conversationUser: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);