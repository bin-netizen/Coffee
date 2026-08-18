// ====== controllers/contactController.js ======
const ContactMessage = require('../models/ContactMessage');

// ---------- POST /api/contact ----------
async function submitContactMessage(req, res) {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ họ tên, email và nội dung.' });
    }

    await ContactMessage.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: (subject || '').trim(),
      message: message.trim()
    });

    return res.status(201).json({
      success: true,
      message: 'Cảm ơn bạn đã liên hệ! Chúng tôi đã ghi nhận tin nhắn và sẽ phản hồi sớm nhất.'
    });

  } catch (error) {
    console.error('Lỗi gửi tin nhắn liên hệ:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra, vui lòng thử lại sau.' });
  }
}

module.exports = { submitContactMessage };