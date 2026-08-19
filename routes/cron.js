// routes/cron.js
const router = require('express').Router();

// Middleware riêng — KHÔNG dùng chung với isLoggedIn
function verifyCronSecret(req, res, next) {
  const secret = req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.post('/cron/close-daily-revenue', verifyCronSecret, async (req, res) => {
  try {
    const result = await closeDailyRevenue(); // logic thật của bạn
    // Trả JSON ngắn gọn, không render HTML
    res.status(200).json({ ok: true, closed: result.total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;