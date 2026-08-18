// controllers/revenueController.js
const { dayjs, VN_TZ } = require('../utils/dateVN');
const { getDailyRevenueSeries } = require('../services/revenueService');

const RANGE_DAYS = { today: 1, '7d': 7, '30d': 30, '3m': 90 };

async function getRevenueDashboard(req, res) {
  const { range = '7d' } = req.query;
  const numDays = RANGE_DAYS[range];
  if (!numDays) return res.status(400).json({ error: 'range không hợp lệ' });

  const endDateStr = dayjs().tz(VN_TZ).format('YYYY-MM-DD');
  const startDateStr = dayjs().tz(VN_TZ).subtract(numDays - 1, 'day').format('YYYY-MM-DD');

  const prevEndStr = dayjs(startDateStr).subtract(1, 'day').format('YYYY-MM-DD');
  const prevStartStr = dayjs(prevEndStr).subtract(numDays - 1, 'day').format('YYYY-MM-DD');

  const [currentSeries, prevSeries] = await Promise.all([
    getDailyRevenueSeries(startDateStr, endDateStr),
    getDailyRevenueSeries(prevStartStr, prevEndStr),
  ]);

  const currentTotal = currentSeries.reduce((s, d) => s + d.revenue, 0);
  const prevTotal = prevSeries.reduce((s, d) => s + d.revenue, 0);

  const percentChange = prevTotal > 0
    ? Number((((currentTotal - prevTotal) / prevTotal) * 100).toFixed(1))
    : null; // null -> frontend hiện "N/A", tránh Infinity

  res.json({ totalRevenue: currentTotal, percentChange, series: currentSeries });
}

module.exports = { getRevenueDashboard };