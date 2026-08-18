// ====== utils/mailer.js ======
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD, // App Password, KHÔNG dùng mật khẩu Gmail thật
  },
});

async function sendOTPEmail(toEmail, otp) {
  await transporter.sendMail({
    from: `"Your App" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Mã khôi phục mật khẩu',
    html: `
      <p>Mã xác thực của bạn là:</p>
      <h2 style="letter-spacing: 4px;">${otp}</h2>
      <p>Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    `,
  });
}

module.exports = { sendOTPEmail };