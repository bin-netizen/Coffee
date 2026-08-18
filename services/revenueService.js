// services/revenueService.js
const Order = require('../models/Order');
const { dayjs, VN_TZ, vnDateRange } = require('../utils/dateVN');

async function calculateRevenueForDate(dateStr) {
  const { start, end } = vnDateRange(dateStr, dateStr);

  const [salesData, refundData] = await Promise.all([
    Order.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          gross: { $sum: { $subtract: ['$subtotal', '$discount'] } },
          count: { $sum: 1 }
        }
      }
    ]),
    Order.aggregate([
      { $match: { isRefunded: true, refundedAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          refund: { $sum: { $subtract: ['$refundAmount', '$shipping'] } },
          refundCount: { $sum: 1 }
        }
      }
    ])
  ]);

  const grossRevenue = salesData[0]?.gross || 0;
  const orderCount = salesData[0]?.count || 0;
  const refundAmount = refundData[0]?.refund || 0;
  const refundCount = refundData[0]?.refundCount || 0;

  return {
    date: dateStr,
    grossRevenue,
    refundAmount,
    netRevenue: grossRevenue - refundAmount,
    orderCount,
    refundCount,
    closedAt: new Date()
  };
}

async function getDailyRevenueSeries(startDateStr, endDateStr) {
  const { start, end } = vnDateRange(startDateStr, endDateStr);
  const startDate = dayjs(startDateStr, 'YYYY-MM-DD');
  const endDate = dayjs(endDateStr, 'YYYY-MM-DD');
  const numDays = endDate.diff(startDate, 'day') + 1;

  const [salesData, refundData] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt', timezone: VN_TZ } },
          gross: { $sum: { $subtract: ['$subtotal', '$discount'] } },
          count: { $sum: 1 }
        }
      }
    ]),
    Order.aggregate([
      {
        $match: {
          isRefunded: true,
          refundedAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$refundedAt', timezone: VN_TZ } },
          refund: { $sum: { $subtract: ['$refundAmount', '$shipping'] } },
          refundCount: { $sum: 1 }
        }
      }
    ])
  ]);

  const salesMap = Object.fromEntries(salesData.map((d) => [d._id, d]));
  const refundMap = Object.fromEntries(refundData.map((d) => [d._id, d]));

  return Array.from({ length: numDays }, (_, i) => {
    const date = startDate.clone().add(i, 'day').format('YYYY-MM-DD');
    const gross = salesMap[date]?.gross || 0;
    const refund = refundMap[date]?.refund || 0;

    return {
      date,
      revenue: gross - refund,
      orderCount: salesMap[date]?.count || 0,
      grossRevenue: gross,
      refundAmount: refund,
      source: 'live'
    };
  });
}

module.exports = { getDailyRevenueSeries, calculateRevenueForDate };