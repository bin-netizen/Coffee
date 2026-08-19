// routes/jobRoutes.js
const express = require('express');
const router = express.Router();
const { closeDailyRevenue } = require('../jobs/closeDailyRevenue');

router.post('/jobs/close-daily-revenue', async (req, res) => {
  const secret = req.headers['x-cron-secret'];

  if (!process.env.CRON_SECRET) {
    console.error('[jobRoutes] ⚠️ CRON_SECRET chưa được set trong biến môi trường — từ chối toàn bộ request.');
    return res.status(500).json({ success: false, message: 'Server chưa cấu hình CRON_SECRET.' });
  }

  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ success: false, message: 'Sai hoặc thiếu secret key.' });
  }

  try {
    await closeDailyRevenue();
    res.json({ success: true, message: 'Đã chạy closeDailyRevenue.' });
  } catch (err) {
    console.error('[jobRoutes] ❌ Lỗi khi chạy closeDailyRevenue qua route ngoài:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = router;