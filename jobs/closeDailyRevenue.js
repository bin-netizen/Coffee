// jobs/closeDailyRevenue.js
const cron = require('node-cron');
const { dayjs } = require('../utils/dateVN');
const DailyRevenue = require('../models/DailyRevenue');
const JobLock = require('../models/JobLock');
const { calculateRevenueForDate } = require('../services/revenueService');

async function closeDailyRevenue() {
  const yesterday = dayjs().tz('Asia/Ho_Chi_Minh').subtract(1, 'day').format('YYYY-MM-DD');
  const lockId = `close-revenue-${yesterday}`;

  // upsert + new:false => nếu vừa mới tạo (chưa từng chạy) sẽ trả về null
  const existingLock = await JobLock.findOneAndUpdate(
    { _id: lockId },
    { $setOnInsert: { createdAt: new Date() } },
    { upsert: true, new: false }
  );
  if (existingLock) {
    console.log(`[closeDailyRevenue] ${yesterday} đã chốt rồi, bỏ qua.`);
    return;
  }

  const data = await calculateRevenueForDate(yesterday);
  await DailyRevenue.findOneAndUpdate(
    { date: yesterday },
    { ...data, date: yesterday, closedAt: new Date() },
    { upsert: true }
  );
  console.log(`[closeDailyRevenue] Chốt ${yesterday}: ${data.netRevenue}đ`);
}

cron.schedule('5 0 * * *', closeDailyRevenue, { timezone: 'Asia/Ho_Chi_Minh' });

module.exports = { closeDailyRevenue };